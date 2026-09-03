---
type: decision
project: wisp
updated: 2026-09-04
tags: [context, decisions, antigravity, schema]
---

# The server, not the proto, says which schema fields are required

**Decision:** the Antigravity cleaner repairs exactly **one** shape — an `ARRAY` node carrying no
`items` — and nothing else. Shipped as `fillArrayItems` in `8db89a3`, released
`wisp-router@2.0.48` + vsix 1.13.3. The rule was established by **driving the wire, one tiny turn per
candidate shape**, and that method is the standing way to answer "what does this wire actually accept".

**Why:** `google/ai/generativelanguage/v1beta/content.proto` marks `Schema.type` as the message's one
`REQUIRED` field — `Type type = 1 [(google.api.field_behavior) = REQUIRED]` — and marks `items` and
`properties` `OPTIONAL`. Read as the contract, that says default a missing `type` and leave arrays
alone. It is backwards. The server enforces the opposite:

| shape | verdict |
|---|---|
| `{"type":"array"}` | **400** `…properties[where].items: missing field` |
| `{"type":"array","items":{"type":"array"}}` | **400** `…properties[where].items.items: missing field` |
| `{"type":"array","prefixItems":[…]}` | **400** `…properties[where].items: missing field` |
| `{"type":"array","items":{}}` | 200 |
| `{"description":"…"}` (typeless) | 200 |
| `{}` (empty schema) | 200 |
| `{"type":"object"}` (no properties) | 200 |

An interim commit (`efaa249`) had already shipped nothing but defaulted a missing `type` on the proto's
authority, with the user's failing tool misread as the cause. The table killed it: a typeless node is
accepted, so that pass repaired something the server never rejected, and it changed the emitted bytes of
every schema that already worked. Removed before the cut — the release carries the array fix alone.
`defaultMissingTypes` greps **0** in both shipped artifacts, which is how the removal was verified.

Three things this settles beyond the one bug:

- **`prefixItems` is invisible on this wire.** A JSON Schema 2020-12 tuple carries `prefixItems` and no
  `items`; the keyword is ignored rather than rejected, so the node arrives as a bare array and 400s.
  The same repair covers it, which is why the cleaner needs no `prefixItems` handling of its own.
- **The repair belongs after the flattening passes, not at the entry.** `flattenTypeArrays` mints
  `type:'array'` out of a `["array","null"]` list, and `flattenAnyOfOneOf` can select an `anyOf` member
  scored as an array on its declared type alone. Both produce an itemless array from input that never
  had one, so an entry-side guard would miss exactly the cases the cleaner itself creates.
- **`items: {"type":"string"}` is the honest default.** The rejected node means "array of anything", and
  this wire cannot say that. String is the lossless carrier for an unconstrained element; naming a
  better element type would take per-tool knowledge the cleaner does not have.

**Reversibility:** cheap both ways. The pass is six lines in `antigravity.ts` and self-contained. If the
server ever starts enforcing `type` for real, the removed default goes back the same way it came out —
and the probe that settles it is a throwaway script sending one tiny turn per shape, roughly two minutes
end to end. Re-probe rather than reason from the proto; the proto was wrong once already.

## Related

- [[decisions]]
- [[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
