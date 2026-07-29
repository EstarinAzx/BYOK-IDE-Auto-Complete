// ---------------- antigravity.ts — Wisp: Antigravity Provider pure cores (envelope, schemas, signatures, 429, SSE) ---------------- //

/*
 * Depends on:
 *   - ./shared — the provider kernel: ToolSpec / AssembledToolCall / BridgeUsage.
 *   - ./bridge — BridgeStreamEvent, the door-neutral stream vocabulary (import TYPE only, erased at runtime,
 *     so bridge -> catalog stays the sole runtime edge and the graph never cycles — the xai.ts pattern).
 *   - node crypto (createHash) — the content-derived session id only.
 *
 * Data shapes:
 *   - AntigravityEnvelope: the Cloud Code envelope. Antigravity is a THIRD wire, neither OpenAI- nor
 *     Anthropic-shaped: a Gemini generateContent payload nested under `request`, wrapped in a bespoke
 *     envelope carrying model / userAgent / requestType / project / requestId.
 *   - Antigravity429Decision: the pure verdict on a 429 body. Parsing only, no state — the cooldown ledger
 *     and the retry loop that consume it are #190's, not this layer's.
 *
 * THE BINDING RULE (spec #185): this port NEVER mints opaque provider-side tool ids. The upstream's own
 * functionCall.id passes through untouched. Two-thirds of the reference's 1,980-line reasoning-replay
 * subsystem exists to service ids that are content-hash lookup keys into a replay ledger; minting them
 * without building that ledger makes every one a dangling pointer. This single rule is what makes omitting
 * that subsystem safe, and nothing fails at compile time when it is broken — the damage surfaces as mangled
 * tool history several turns later. antigravity.test.ts pins it.
 */

import { createHash } from 'crypto';
import type { BridgeStreamEvent } from './bridge';
import type { ToolSpec, BridgeUsage } from './shared';
import type { AnthropicTruncationReason } from './anthropic';

// ----------------------------- Small JSON helpers ----------------------------- //

type Json = Record<string, any>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const clone = <T,>(v: T): T => structuredClone(v);
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// ----------------------------- The request envelope ----------------------------- //

// The literal userAgent FIELD the envelope carries (not the HTTP header). The upstream keys behaviour off it.
export const ANTIGRAVITY_USER_AGENT_FIELD = 'antigravity';

// Request-id formats, as pure functions of an injected uuid/clock — #189 owns the minting, this layer owns
// the shape. (These are envelope metadata, NOT tool ids; the binding rule is untouched.)
export const antigravityRequestId = (uuid: string): string => `agent-${uuid}`;
export const antigravityImageRequestId = (nowMs: number, uuid: string): string => `image_gen/${nowMs}/${uuid}/12`;

export type AntigravityEnvelopeOpts = { projectId?: string; requestId: string; sessionId?: string };

// The content-derived session id: sha256 of the FIRST user turn's leading text, folded to a positive 63-bit
// integer and negated in string form. Deliberately NOT a nonce — it is upstream cache behaviour, so a
// random-per-request implementation looks fine and silently loses cache hits. undefined when the payload
// carries no anchor text; #189 supplies a random fallback there (the reference's `generateSessionID`),
// because a random value cannot live in a pure layer.
export const antigravityStableSessionId = (payload: unknown): string | undefined => {
  const contents = (payload as Json)?.request?.contents;
  if (!Array.isArray(contents)) return undefined;
  for (const content of contents) {
    if (content?.role !== 'user') continue;
    const anchor = content?.parts?.[0]?.text;
    if (typeof anchor !== 'string' || !anchor) continue;
    const digest = createHash('sha256').update(anchor).digest('hex').slice(0, 16);
    return `-${(BigInt(`0x${digest}`) & 0x7fffffffffffffffn).toString()}`;
  }
  return undefined;
};

// Wrap a Gemini payload in the Cloud Code envelope. Pure: the caller injects the request id (and may pin a
// session id). Safety settings are stripped — the upstream rejects them — and a top-level toolConfig is
// relocated inside `request`, where this wire expects it.
export const buildAntigravityEnvelope = (modelName: string, payload: unknown, opts: AntigravityEnvelopeOpts): Json => {
  const env: Json = clone(isObj(payload) ? payload : {});
  env.model = modelName;
  env.userAgent = ANTIGRAVITY_USER_AGENT_FIELD;

  const isImageModel = modelName.includes('image');
  let requestType = text(env.requestType);
  if (!requestType) {
    requestType = isImageModel ? 'image_gen' : 'agent';
    env.requestType = requestType;
  }

  if (opts.projectId) env.project = opts.projectId; else delete env.project;
  env.requestId = opts.requestId;

  if (!isObj(env.request)) env.request = {};

  // An image turn and a web_search turn carry no session id — only conversational ones do.
  if (!isImageModel && requestType !== 'web_search') {
    const sessionId = text(env.request.sessionId) || text(opts.sessionId) || antigravityStableSessionId(payload);
    if (sessionId) env.request.sessionId = sessionId;
  }

  delete env.request.safetySettings;
  // Only relocated when the destination is free; an existing request.toolConfig wins and the stale
  // top-level copy is left exactly where the reference leaves it.
  if (env.toolConfig !== undefined && env.request.toolConfig === undefined) {
    env.request.toolConfig = env.toolConfig;
    delete env.toolConfig;
  }
  return env;
};

// ----------------------------- The model-family fork table ----------------------------- //

export const isAntigravityClaudeModel = (model: string): boolean => model.includes('claude');

// Which of the two schema cleaners a model gets. Claude and the gemini-3 pro family take the stricter one
// (it inserts the placeholder Claude's VALIDATED mode requires); everything else takes the Gemini cleaner.
export const usesAntigravitySchema = (model: string): boolean =>
  model.includes('claude') || model.includes('gemini-3-pro') || model.includes('gemini-3.1-pro');

// The three forks, in the reference's order. The output cap is CLAMPED first and only then deleted for
// non-Claude models — reversing that loses the clamp for Claude, which keeps its cap.
export const applyAntigravityFamilyForks = (envelope: Json, modelName: string, maxCompletionTokens?: number): Json => {
  const out: Json = clone(envelope);
  const generationConfig = isObj(out.request?.generationConfig) ? out.request.generationConfig : undefined;

  const cap = generationConfig?.maxOutputTokens;
  if (typeof cap === 'number' && maxCompletionTokens && cap > maxCompletionTokens) {
    generationConfig!.maxOutputTokens = maxCompletionTokens;
  }

  if (isAntigravityClaudeModel(modelName)) {
    if (!isObj(out.request)) out.request = {};
    if (!isObj(out.request.toolConfig)) out.request.toolConfig = {};
    out.request.toolConfig.functionCallingConfig = { ...(out.request.toolConfig.functionCallingConfig ?? {}), mode: 'VALIDATED' };
  } else if (generationConfig) {
    delete generationConfig.maxOutputTokens;
  }
  return out;
};

// ----------------------------- The two JSON-schema cleaners ----------------------------- //

/*
 * Pass a single SCHEMA to these — never a whole request document. Cleaning rewrites keys by name, and
 * "title" / "format" / "default" / "const" are also ordinary DATA keys inside functionCall arguments
 * replayed from conversation history. The reference records that whole-document cleaning silently mutated
 * that history: tools lost required argument fields and the model then imitated the corrupted examples.
 * sanitizeAntigravityRequestSchemas below is the only caller that walks a document, and it visits schema
 * paths exclusively.
 */

const PLACEHOLDER_REASON_DESCRIPTION = 'Brief explanation of why you are calling this tool';

const UNSUPPORTED_CONSTRAINTS = [
  'minLength', 'maxLength', 'exclusiveMinimum', 'exclusiveMaximum',
  'pattern', 'minItems', 'maxItems', 'uniqueItems', 'format',
  'default', 'examples', // Claude rejects these in VALIDATED mode
];

const UNSUPPORTED_KEYWORDS = [
  ...UNSUPPORTED_CONSTRAINTS,
  '$schema', '$defs', 'definitions', 'const', '$ref', '$id', 'additionalProperties',
  'propertyNames', 'patternProperties',
  '$comment', 'enumDescriptions', 'enumTitles', 'prefill', 'deprecated',
];

// An already-present hint is kept as-is rather than appended twice — a schema may be cleaned by a
// translator and again here, and the reference saw duplicated hints in production because of it.
const mergeHint = (existing: string, hint: string): string => {
  if (!existing) return hint;
  if (existing === hint || existing.startsWith(`${hint} (`) || existing.includes(`(${hint})`)) return existing;
  return `${existing} (${hint})`;
};

const appendHint = (node: Json, hint: string): void => {
  node.description = mergeHint(typeof node.description === 'string' ? node.description : '', hint);
};

// Walk SCHEMA positions only, children first. The keys of a `properties` object are property NAMES (data),
// never keywords — so a property called "title" is recursed into as a schema, never mistaken for the title
// keyword.
//
// ⚠ This is the SECOND protection against the history corruption above, and the stronger one: because this
// walker descends only schema positions, it cannot reach `request.contents` even if it were handed a whole
// document. The reference's cleaner walked every key generically and had path-scoping alone. Replacing this
// with a generic deep walk re-arms the production bug — verified by control 2026-07-29: generic walk +
// whole-document scope corrupts replayed functionCall arguments and fails antigravity.test.ts.
const mapSchema = (node: unknown, visit: (n: Json, depth: number) => Json, depth = 0): any => {
  if (Array.isArray(node)) return node.map((n) => mapSchema(n, visit, depth));
  if (!isObj(node)) return node;
  const out: Json = { ...node };
  if (isObj(out.properties)) {
    const props: Json = {};
    for (const [name, sub] of Object.entries(out.properties)) props[name] = mapSchema(sub, visit, depth + 1);
    out.properties = props;
  }
  if (out.items !== undefined) out.items = mapSchema(out.items, visit, depth + 1);
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    if (Array.isArray(out[key])) out[key] = out[key].map((n: unknown) => mapSchema(n, visit, depth + 1));
  }
  return visit(out, depth);
};

// Phase 1a — $ref becomes a description hint (the reference's "lazy hint" strategy): the node collapses to
// a bare object carrying the pointer's name, because this wire has no $ref support at all.
const convertRefsToHints = (schema: unknown): any =>
  mapSchema(schema, (node) => {
    if (typeof node.$ref !== 'string') return node;
    const name = node.$ref.slice(node.$ref.lastIndexOf('/') + 1);
    const existing = typeof node.description === 'string' ? node.description : '';
    return { type: 'object', description: mergeHint(existing, `See: ${name}`) };
  });

// Phase 1b–1f — const→enum, enum values to strings, and the hints that carry the dropped semantics.
const addHintsAndNormalizeEnums = (schema: unknown): any =>
  mapSchema(schema, (node) => {
    if (node.const !== undefined && node.enum === undefined) node.enum = [node.const];

    if (Array.isArray(node.enum)) {
      node.enum = node.enum.map((v: unknown) => (typeof v === 'string' ? v : String(v)));
      node.type = 'string'; // this wire allows enum only on STRING
      if (node.enum.length > 1 && node.enum.length <= 10) appendHint(node, `Allowed: ${node.enum.join(', ')}`);
    }

    if (node.additionalProperties === false) appendHint(node, 'No extra properties allowed');

    for (const key of UNSUPPORTED_CONSTRAINTS) {
      const value = node[key];
      if (value === undefined || isObj(value) || Array.isArray(value)) continue;
      appendHint(node, `${key}: ${String(value)}`);
    }
    return node;
  });

// Phase 2a — allOf members are merged into the parent, then the keyword is dropped.
const mergeAllOf = (schema: unknown): any =>
  mapSchema(schema, (node) => {
    if (!Array.isArray(node.allOf)) return node;
    for (const member of node.allOf) {
      if (!isObj(member)) continue;
      if (isObj(member.properties)) node.properties = { ...(node.properties ?? {}), ...member.properties };
      if (Array.isArray(member.required)) {
        const required = Array.isArray(node.required) ? [...node.required] : [];
        for (const name of member.required) if (!required.includes(name)) required.push(name);
        node.required = required;
      }
    }
    delete node.allOf;
    return node;
  });

// Phase 2b — anyOf/oneOf collapse onto their richest member (object > array > scalar > null); the discarded
// alternatives survive only as an "Accepts:" hint.
const flattenAnyOfOneOf = (schema: unknown): any =>
  mapSchema(schema, (node) => {
    for (const key of ['anyOf', 'oneOf']) {
      const members = node[key];
      if (!Array.isArray(members) || members.length === 0) continue;

      let bestIndex = 0;
      let bestScore = -1;
      const types: string[] = [];
      members.forEach((member: any, index: number) => {
        const declared = typeof member?.type === 'string' ? member.type : '';
        let score = 0;
        let label = declared;
        if (declared === 'object' || isObj(member?.properties)) { score = 3; label = declared || 'object'; }
        else if (declared === 'array' || member?.items !== undefined) { score = 2; label = declared || 'array'; }
        else if (declared && declared !== 'null') score = 1;
        else label = declared || 'null';
        if (label) types.push(label);
        if (score > bestScore) { bestScore = score; bestIndex = index; }
      });

      const parentDescription = typeof node.description === 'string' ? node.description : '';
      const selected: Json = isObj(members[bestIndex]) ? { ...members[bestIndex] } : {};
      if (parentDescription) {
        const own = typeof selected.description === 'string' ? selected.description : '';
        selected.description = !own ? parentDescription : own === parentDescription ? own : `${parentDescription} (${own})`;
      }
      if (types.length > 1) appendHint(selected, `Accepts: ${types.join(' | ')}`);
      return selected;
    }
    return node;
  });

// Phase 2c — a type ARRAY collapses to its first non-null member. A nullable property additionally leaves
// its parent's required list, which is why this pass reads a node and its properties together.
const flattenTypeArrays = (schema: unknown): any => {
  const walk = (node: unknown, depth: number): any => {
    if (Array.isArray(node)) return node.map((n) => walk(n, depth));
    if (!isObj(node)) return node;
    const out: Json = { ...node };

    const nullable: string[] = [];
    if (isObj(out.properties)) {
      const props: Json = {};
      for (const [name, sub] of Object.entries(out.properties)) {
        if (isObj(sub) && Array.isArray(sub.type) && sub.type.includes('null')) nullable.push(name);
        props[name] = walk(sub, depth + 1);
      }
      out.properties = props;
    }
    if (out.items !== undefined) out.items = walk(out.items, depth + 1);
    for (const key of ['anyOf', 'oneOf', 'allOf']) {
      if (Array.isArray(out[key])) out[key] = out[key].map((n: unknown) => walk(n, depth + 1));
    }

    if (Array.isArray(out.type)) {
      const nonNull = out.type.filter((t: unknown) => typeof t === 'string' && t && t !== 'null');
      out.type = nonNull[0] ?? 'string';
      if (nonNull.length > 1) appendHint(out, `Accepts: ${nonNull.join(' | ')}`);
    }

    for (const name of nullable) if (isObj(out.properties?.[name])) appendHint(out.properties[name], '(nullable)');
    if (nullable.length && Array.isArray(out.required)) {
      const kept = out.required.filter((name: string) => !nullable.includes(name));
      if (kept.length) out.required = kept; else delete out.required;
    }
    return out;
  };
  return walk(schema, 0);
};

// Phase 3a — drop what this wire rejects outright, including every x-* extension field.
const removeUnsupportedKeywords = (schema: unknown): any =>
  mapSchema(schema, (node) => {
    for (const key of UNSUPPORTED_KEYWORDS) delete node[key];
    for (const key of Object.keys(node)) if (key.startsWith('x-')) delete node[key];
    return node;
  });

// Phase 3b (Gemini only) — nullable/title go, and the placeholders the OTHER cleaner adds are removed so a
// schema cleaned twice under different families does not keep them.
const removeGeminiOnlyKeywords = (schema: unknown): any =>
  mapSchema(schema, (node) => {
    delete node.nullable;
    delete node.title;

    const dropRequired = (name: string) => {
      if (!Array.isArray(node.required)) return;
      const kept = node.required.filter((r: string) => r !== name);
      if (kept.length) node.required = kept; else delete node.required;
    };

    if (isObj(node.properties)) {
      if (node.properties._ !== undefined) { delete node.properties._; dropRequired('_'); }
      const reason = node.properties.reason;
      if (isObj(reason) && Object.keys(node.properties).length === 1 && reason.description === PLACEHOLDER_REASON_DESCRIPTION) {
        delete node.properties.reason;
        dropRequired('reason');
      }
    }
    return node;
  });

// Phase 3c — a required entry naming no property is dropped; an empty list goes with it.
const cleanupRequiredFields = (schema: unknown): any =>
  mapSchema(schema, (node) => {
    if (!Array.isArray(node.required) || !isObj(node.properties)) return node;
    const valid = node.required.filter((name: string) => node.properties[name] !== undefined);
    if (valid.length !== node.required.length) {
      if (valid.length) node.required = valid; else delete node.required;
    }
    return node;
  });

// Phase 4 (Antigravity only) — Claude's VALIDATED mode requires every tool schema to declare at least one
// required property. `nested` is the reference's wrapper trick made explicit: cleaning a schema in place
// inside a request always saw it one level down, so the top-level skip below must not fire there.
const addEmptySchemaPlaceholder = (schema: unknown, nested: boolean): any =>
  mapSchema(schema, (node, depth) => {
    if (node.type !== 'object') return node;
    const properties = node.properties;
    const hasRequired = Array.isArray(node.required) && node.required.length > 0;

    if (properties === undefined || (isObj(properties) && Object.keys(properties).length === 0)) {
      node.properties = { reason: { type: 'string', description: PLACEHOLDER_REASON_DESCRIPTION } };
      node.required = ['reason'];
      return node;
    }
    if (isObj(properties) && !hasRequired) {
      if (depth === 0 && !nested) return node; // a top-level schema is left alone, matching the reference
      if (properties._ === undefined) node.properties = { ...properties, _: { type: 'boolean' } };
      node.required = ['_'];
    }
    return node;
  });

const cleanSchema = (schema: unknown, placeholder: boolean, nested: boolean): any => {
  let out = convertRefsToHints(clone(schema));
  out = addHintsAndNormalizeEnums(out);
  out = mergeAllOf(out);
  out = flattenAnyOfOneOf(out);
  out = flattenTypeArrays(out);
  out = removeUnsupportedKeywords(out);
  if (!placeholder) out = removeGeminiOnlyKeywords(out);
  out = cleanupRequiredFields(out);
  if (placeholder) out = addEmptySchemaPlaceholder(out, nested);
  return out;
};

// The stricter cleaner — inserts the placeholder Claude's VALIDATED mode requires.
export const cleanJsonSchemaForAntigravity = (schema: unknown, opts: { nested?: boolean } = {}): any =>
  cleanSchema(schema, true, opts.nested ?? false);

// The plain Gemini cleaner — no placeholders, and nullable/title stripped.
export const cleanJsonSchemaForGemini = (schema: unknown): any => cleanSchema(schema, false, false);

// ----------------------------- Schema cleaning, applied at schema PATHS only ----------------------------- //

// Both spellings are accepted by the proto-JSON upstream and translators forward whichever the client sent,
// so each is cleaned where it sits rather than renamed. parametersJsonSchema is the one exception — it is
// renamed onto parameters, because whole-payload cleaning did the same and the emitted body must not change.
const DECLARATION_SCHEMA_KEYS = ['parameters', 'parametersJsonSchema', 'parameters_json_schema', 'response', 'responseJsonSchema', 'response_json_schema'];
const DECLARATION_CONTAINERS = ['functionDeclarations', 'function_declarations'];
const GENERATION_CONFIG_CONTAINERS = ['generationConfig', 'generation_config'];
const GENERATION_SCHEMA_KEYS = ['responseSchema', 'responseJsonSchema', 'response_schema', 'response_json_schema'];

const forEachDeclaration = (envelope: Json, fn: (declaration: Json) => void): void => {
  const tools = envelope?.request?.tools;
  if (!Array.isArray(tools)) return;
  for (const tool of tools) {
    if (!isObj(tool)) continue;
    for (const container of DECLARATION_CONTAINERS) {
      if (!Array.isArray(tool[container])) continue;
      for (const declaration of tool[container]) if (isObj(declaration)) fn(declaration);
    }
  }
};

export const antigravityNeedsSchemaSanitization = (envelope: unknown): boolean => {
  const request = (envelope as Json)?.request;
  if (Array.isArray(request?.tools) && request.tools.length > 0) return true;
  for (const container of GENERATION_CONFIG_CONTAINERS) {
    for (const key of GENERATION_SCHEMA_KEYS) if (request?.[container]?.[key] !== undefined) return true;
  }
  return false;
};

// Clean every schema the request carries — and nothing else. Omitting a location sends that schema upstream
// uncleaned (the reference found four such gaps this way); widening the scope corrupts replayed history.
export const sanitizeAntigravityRequestSchemas = (envelope: unknown, useAntigravitySchema: boolean): Json => {
  const out: Json = clone(isObj(envelope) ? envelope : {});
  const clean = (schema: unknown) =>
    useAntigravitySchema ? cleanJsonSchemaForAntigravity(schema, { nested: true }) : cleanJsonSchemaForGemini(schema);

  forEachDeclaration(out, (declaration) => {
    if (declaration.parametersJsonSchema !== undefined && declaration.parameters === undefined) {
      declaration.parameters = declaration.parametersJsonSchema;
      delete declaration.parametersJsonSchema;
    }
    for (const key of DECLARATION_SCHEMA_KEYS) if (isObj(declaration[key])) declaration[key] = clean(declaration[key]);
  });

  for (const container of GENERATION_CONFIG_CONTAINERS) {
    const config = out.request?.[container];
    if (!isObj(config)) continue;
    for (const key of GENERATION_SCHEMA_KEYS) if (isObj(config[key])) config[key] = clean(config[key]);
  }
  return out;
};

// ----------------------------- The fourth tool builder ----------------------------- //

// A function declaration may carry only these keys; anything else is rejected upstream.
const ALLOWED_DECLARATION_KEYS = ['name', 'description', 'behavior', 'parameters', 'parametersJsonSchema', 'response', 'responseJsonSchema'];

// Wisp ToolSpecs -> the upstream's functionDeclaration shape. The fourth such builder alongside the OpenAI,
// Codex and Anthropic ones. An empty list yields an empty array so no bare `tools: [{}]` rides the wire.
export const buildAntigravityTools = (tools: ToolSpec[]): Json[] => {
  const declarations = tools.map((tool) => {
    const declaration: Json = { name: tool.name, description: tool.description };
    if (tool.inputSchema !== undefined) declaration.parametersJsonSchema = cleanJsonSchemaForAntigravity(tool.inputSchema);
    for (const key of Object.keys(declaration)) if (!ALLOWED_DECLARATION_KEYS.includes(key)) delete declaration[key];
    return declaration;
  });
  return declarations.length ? [{ functionDeclarations: declarations }] : [];
};

// ----------------------------- Signatures and function-call pairing ----------------------------- //

// The synthetic signature the upstream accepts in place of a real one. It is a fixed sentinel, not a minted
// id — the binding rule is about tool ids and is untouched here.
export const ANTIGRAVITY_SYNTHETIC_SIGNATURE = 'skip_thought_signature_validator';

/*
 * Request signature sanitization + repair of an unsigned leading function call, in one pass:
 *   - a functionResponse part may never carry a thought signature — the upstream rejects the replay;
 *   - in a model turn the FIRST functionCall carries one: its own if it has a native signature, else the
 *     synthetic sentinel (repair, not rejection — an unsigned leading call is otherwise a hard 400);
 *   - every PARALLEL call after the first must stay unsigned.
 */
export const sanitizeAntigravityThoughtSignatures = (envelope: unknown): Json => {
  const out: Json = clone(isObj(envelope) ? envelope : {});
  const contents = out.request?.contents;
  if (!Array.isArray(contents)) return out;

  for (const content of contents) {
    if (!isObj(content) || !Array.isArray(content.parts)) continue;
    const isModelTurn = content.role === 'model';
    let firstCallSeen = false;

    for (const part of content.parts) {
      if (!isObj(part)) continue;
      if (part.functionResponse !== undefined) { delete part.thoughtSignature; continue; }
      if (!isModelTurn) continue;
      if (part.functionCall === undefined) continue;

      if (!firstCallSeen) {
        firstCallSeen = true;
        if (!text(part.thoughtSignature)) part.thoughtSignature = ANTIGRAVITY_SYNTHETIC_SIGNATURE;
      } else {
        delete part.thoughtSignature;
      }
    }
  }
  return out;
};

type FunctionRef = { id: string; name: string };

const partRefs = (parts: unknown[]) => {
  const calls: FunctionRef[] = [];
  const responses: FunctionRef[] = [];
  const responseParts: Json[] = [];
  let hasOtherPart = false;
  for (const part of parts) {
    if (!isObj(part)) { hasOtherPart = true; continue; }
    if (isObj(part.functionCall)) calls.push({ id: text(part.functionCall.id), name: text(part.functionCall.name) });
    else if (isObj(part.functionResponse)) {
      responses.push({ id: text(part.functionResponse.id), name: text(part.functionResponse.name) });
      responseParts.push(part);
    } else hasOtherPart = true;
  }
  return { calls, responses, responseParts, hasOtherPart };
};

// A response whose name was lost to compaction is repaired from the call that shares its id. Names only —
// no id is ever written here.
const repairFunctionResponseNames = (out: Json): void => {
  const contents = out.request?.contents;
  if (!Array.isArray(contents)) return;
  const nameById = new Map<string, string>();
  for (const content of contents) {
    for (const part of content?.parts ?? []) {
      const call = isObj(part) ? part.functionCall : undefined;
      if (!isObj(call)) continue;
      const id = text(call.id);
      const name = text(call.name);
      if (id && name && name !== 'unknown') nameById.set(id, name);
    }
  }
  if (!nameById.size) return;
  for (const content of contents) {
    for (const part of content?.parts ?? []) {
      const response = isObj(part) ? part.functionResponse : undefined;
      if (!isObj(response)) continue;
      const id = text(response.id);
      const name = text(response.name);
      if (id && (!name || name === 'unknown') && nameById.has(id)) response.name = nameById.get(id);
    }
  }
};

/*
 * Normalize parallel function-response ORDERING and ROLE. Two upstream quirks, both silent when wrong:
 *   - responses must arrive in the order their calls were made, matched by id (or by name when the call
 *     carried none — the binding rule means an id is often genuinely absent);
 *   - a pure-functionResponse turn rides as role "model" on this wire, not "user".
 * A content with no parts CLEARS the pending calls: responses on the far side of such a boundary are not
 * this turn's, so reordering across it would silently pair the wrong result to the wrong call.
 */
export const normalizeAntigravityFunctionResponses = (envelope: unknown): Json => {
  const out: Json = clone(isObj(envelope) ? envelope : {});
  repairFunctionResponseNames(out);
  const contents = out.request?.contents;
  if (!Array.isArray(contents)) return out;

  let pending: FunctionRef[] = [];
  for (const content of contents) {
    const parts = isObj(content) ? content.parts : undefined;
    if (!Array.isArray(parts) || parts.length === 0) { pending = []; continue; }

    const { calls, responses, responseParts, hasOtherPart } = partRefs(parts);
    if (calls.length > 0 && responses.length === 0) { pending = calls; continue; }
    if (responses.length === 0) { if (hasOtherPart) pending = []; continue; }
    if (hasOtherPart || calls.length > 0) { pending = []; continue; }

    if (pending.length === responses.length) {
      const used = new Array(responses.length).fill(false);
      const ordered: Json[] = [];
      for (const call of pending) {
        const match = responses.findIndex((response, index) =>
          !used[index] && ((call.id && response.id === call.id) || (!call.id && call.name && response.name === call.name)));
        if (match < 0) { ordered.length = 0; break; }
        used[match] = true;
        ordered.push(responseParts[match]);
      }
      if (ordered.length === responseParts.length) content.parts = ordered;
    }
    pending = [];
    if (content.role !== 'model') content.role = 'model';
  }
  return out;
};

// Pairing validation. Returns the reason a payload would be rejected upstream, or undefined when it pairs.
export const validateAntigravityFunctionCallPairing = (envelope: unknown): string | undefined => {
  const contents = (envelope as Json)?.request?.contents;
  if (!Array.isArray(contents)) return undefined;

  let pending = 0;
  for (const [index, content] of contents.entries()) {
    const parts = isObj(content) ? content.parts : undefined;
    if (!Array.isArray(parts)) {
      if (pending > 0) return `contents[${index}]: content appears before ${pending} pending functionResponse part(s)`;
      continue;
    }

    const calls: Json[] = [];
    let responses = 0;
    for (const [partIndex, part] of parts.entries()) {
      if (!isObj(part)) continue;
      if (isObj(part.functionCall)) {
        if (!text(part.functionCall.name)) return `contents[${index}].parts[${partIndex}]: missing functionCall.name`;
        calls.push(part.functionCall);
      }
      if (isObj(part.functionResponse)) responses += 1;
    }

    if (calls.length > 0 && responses > 0) return `contents[${index}]: functionCall and functionResponse parts must not be interleaved in the same content`;
    if (calls.length > 0) {
      if (pending > 0) return `contents[${index}]: functionCall appears before ${pending} pending functionResponse part(s)`;
      pending = calls.length;
      continue;
    }
    if (responses === 0) {
      if (pending > 0) return `contents[${index}]: content appears before ${pending} pending functionResponse part(s)`;
      continue;
    }
    if (responses !== pending) return `contents[${index}]: ${responses} functionResponse part(s) answer ${pending} pending functionCall(s)`;
    pending = 0;
  }
  return pending > 0 ? `contents: ${pending} functionCall(s) left unanswered` : undefined;
};

// ----------------------------- The 429 body classifier (parsing only, no state) ----------------------------- //

export const ANTIGRAVITY_INSTANT_RETRY_MS = 3_000;
export const ANTIGRAVITY_SHORT_QUOTA_COOLDOWN_MS = 5 * 60_000;

export type Antigravity429Kind = 'soft_retry' | 'instant_retry_same_auth' | 'short_cooldown_switch_auth' | 'full_quota_exhausted';
export type Antigravity429Decision = { kind: Antigravity429Kind; retryAfterMs?: number; reason?: string };

const ERROR_INFO_TYPE = 'type.googleapis.com/google.rpc.ErrorInfo';
const RETRY_INFO_TYPE = 'type.googleapis.com/google.rpc.RetryInfo';

// Go-style duration strings ("2s", "1m30s", "1h5m") — the shape the upstream's RetryInfo carries.
const parseGoDurationMs = (raw: string): number | undefined => {
  const trimmed = raw.trim().toLowerCase();
  if (!/^(\d+(\.\d+)?(h|m|s|ms))+$/.test(trimmed)) return undefined;
  const unit: Record<string, number> = { h: 3_600_000, m: 60_000, s: 1_000, ms: 1 };
  let total = 0;
  for (const [, value, , suffix] of trimmed.matchAll(/(\d+(\.\d+)?)(h|m|s|ms)/g)) total += Number(value) * unit[suffix];
  return total;
};

// RetryInfo first, then the quota reset hint, then the human-readable message — the reference's order.
export const parseAntigravityRetryDelayMs = (body: unknown): number | undefined => {
  const error = (body as Json)?.error;
  const details = Array.isArray(error?.details) ? error.details : [];

  for (const detail of details) {
    if (detail?.['@type'] !== RETRY_INFO_TYPE) continue;
    const parsed = parseGoDurationMs(text(detail.retryDelay));
    if (parsed !== undefined) return parsed;
  }
  for (const detail of details) {
    if (detail?.['@type'] !== ERROR_INFO_TYPE) continue;
    const parsed = parseGoDurationMs(text(detail.metadata?.quotaResetDelay));
    if (parsed !== undefined) return parsed;
  }

  const message = text(error?.message);
  if (!message) return undefined;
  const seconds = message.match(/after\s+(\d+)s\.?/i);
  if (seconds) return Number(seconds[1]) * 1_000;
  const human = message.toLowerCase().match(/after\s+((?:\d+h)?(?:\d+m)?(?:\d+s)?)\.?/);
  return human?.[1] ? parseGoDurationMs(human[1]) : undefined;
};

// The pure verdict. No state, no clock, no ledger — #190 wires the cooldown horizon this returns.
export const decideAntigravity429 = (body: unknown): Antigravity429Decision => {
  const decision: Antigravity429Decision = { kind: 'soft_retry' };
  if (!isObj(body)) return decision;

  const retryAfterMs = parseAntigravityRetryDelayMs(body);
  if (retryAfterMs !== undefined) decision.retryAfterMs = retryAfterMs;

  if (text(body.error?.status).toUpperCase() !== 'RESOURCE_EXHAUSTED') return decision;

  for (const detail of Array.isArray(body.error?.details) ? body.error.details : []) {
    if (detail?.['@type'] !== ERROR_INFO_TYPE) continue;
    const reason = text(detail.reason).toUpperCase();
    decision.reason = text(detail.reason);
    if (reason === 'QUOTA_EXHAUSTED') { decision.kind = 'full_quota_exhausted'; return decision; }
    if (reason === 'RATE_LIMIT_EXCEEDED') {
      if (decision.retryAfterMs === undefined) return decision; // no horizon to act on
      decision.kind = decision.retryAfterMs < ANTIGRAVITY_INSTANT_RETRY_MS ? 'instant_retry_same_auth'
        : decision.retryAfterMs < ANTIGRAVITY_SHORT_QUOTA_COOLDOWN_MS ? 'short_cooldown_switch_auth'
        : 'full_quota_exhausted';
      return decision;
    }
  }

  // Last resort: a body that says quota exhausted in words but carries no ErrorInfo detail.
  const lowered = JSON.stringify(body).toLowerCase();
  if (lowered.includes('quota_exhausted') || lowered.includes('quota exhausted')) {
    decision.kind = 'full_quota_exhausted';
    decision.reason = 'quota_exhausted';
  }
  return decision;
};

/*
 * The classified error, or undefined when this layer declines. Below the instant-retry threshold the caller
 * should simply retry the same credential, so nothing is classified.
 *
 * ⚠ The message shape is load-bearing: isTransientProviderError regexes String(err) for
 * "API error (429|500|502|503|504)". A client that throws any other shape silently receives ZERO retries,
 * and nobody notices until a blip becomes a user-visible failure.
 */
export const antigravity429Error = (body: unknown): { status: number; message: string } | undefined => {
  const decision = decideAntigravity429(body);
  if (decision.kind === 'soft_retry' || decision.kind === 'instant_retry_same_auth') return undefined;
  const detail = decision.reason ?? decision.kind;
  return { status: 429, message: `Antigravity API error 429: ${detail}` };
};

// ----------------------------- The SSE mapper ----------------------------- //

// Gemini finish reasons that mean the turn was CUT SHORT, folded onto the shared truncation vocabulary.
const truncationFor = (finishReason: unknown): AnthropicTruncationReason | undefined => {
  switch (text(finishReason).toUpperCase()) {
    case 'MAX_TOKENS': return 'max_tokens';
    case 'SAFETY': case 'PROHIBITED_CONTENT': case 'BLOCKLIST': case 'RECITATION': case 'SPII': return 'content_filter';
    default: return undefined;
  }
};

/*
 * Gemini usage -> the door-neutral counts. Two conventions, both load-bearing:
 *
 *  - promptTokenCount INCLUDES the cached read, so the uncached input gives them up (floored at 0) — the
 *    #165 convention every Wisp usage reader shares.
 *  - output = candidatesTokenCount + thoughtsTokenCount. Thinking tokens are BILLED OUTPUT and this wire
 *    reports them in a separate field, so reading candidates alone under-reports enormously. Measured on
 *    the #186 spike's live captures: candidates 10 vs thoughts 215, and candidates 1 vs thoughts 1123 —
 *    a ~100x under-report on a reasoning turn. The upstream's own totalTokenCount confirms the sum
 *    (3 + 10 + 215 = 228; 1092 + 1 + 1123 = 2216).
 */
const antigravityUsage = (metadata: unknown): BridgeUsage | undefined => {
  if (!isObj(metadata)) return undefined;
  const prompt = Number(metadata.promptTokenCount ?? 0);
  const cached = Number(metadata.cachedContentTokenCount ?? 0);
  const candidates = Number(metadata.candidatesTokenCount ?? 0);
  const thoughts = Number(metadata.thoughtsTokenCount ?? 0);
  if (!prompt && !cached && !candidates && !thoughts) return undefined;
  return {
    input_tokens: Math.max(0, prompt - cached),
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: cached,
    output_tokens: candidates + thoughts,
  };
};

/*
 * Upstream chunks -> BridgeStreamEvent. Three properties the wire forces:
 *   - every event nests its payload under a `response` key, which is unwrapped here;
 *   - usage metadata repeats on EVERY chunk, so it is retained only on the terminal one — forwarding each
 *     copy would multiply the client's meter;
 *   - the upstream sends no [DONE] sentinel, so the terminating flush is synthesised: when the iterable
 *     ends, buffered tool calls are emitted and the generator completes. A mapper that waits for a sentinel
 *     this wire never sends would hang the turn.
 *
 * THE BINDING RULE: `call.id` is the upstream's own functionCall.id, passed through untouched — absent
 * upstream means an EMPTY id here, never a minted or content-hashed one.
 */
export const antigravityStreamEvents = async function* (upstream: AsyncIterable<unknown>): AsyncGenerator<BridgeStreamEvent> {
  const pendingCalls: { id: string; name: string; argsJson: string }[] = [];

  for await (const raw of upstream) {
    if (!isObj(raw)) continue;
    const payload = isObj(raw.response) ? raw.response : raw;
    const candidate = Array.isArray(payload.candidates) ? payload.candidates[0] : undefined;
    if (!isObj(candidate)) continue;

    for (const part of Array.isArray(candidate.content?.parts) ? candidate.content.parts : []) {
      if (!isObj(part)) continue;
      if (part.thought) continue; // reasoning text, not answer text — the doors render answers only
      if (typeof part.text === 'string' && part.text) yield { type: 'text', text: part.text };
      if (isObj(part.functionCall)) {
        pendingCalls.push({
          id: typeof part.functionCall.id === 'string' ? part.functionCall.id : '',
          name: typeof part.functionCall.name === 'string' ? part.functionCall.name : '',
          argsJson: JSON.stringify(part.functionCall.args ?? {}),
        });
      }
    }

    const truncation = truncationFor(candidate.finishReason);
    if (truncation) yield { type: 'truncation', reason: truncation };

    // Terminal chunk only. A chunk with no finishReason is mid-stream, and its usage copy is dropped.
    if (text(candidate.finishReason)) {
      const usage = antigravityUsage(payload.usageMetadata);
      if (usage) yield { type: 'usage', usage };
    }
  }

  for (const call of pendingCalls) yield { type: 'tool_call', call };
};
