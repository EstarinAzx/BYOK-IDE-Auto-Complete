// ---------------- modelScreens.test.tsx — real picker rendering and manual/refresh actions ---------------- //
import { test, expect } from 'bun:test';
import { act } from 'react';
import { testRender } from '@opentui/react/test-utils';
import { ModelPickScreen, EffortPickScreen } from '../src/providerScreens';
import { RouteModelPickScreen } from '../src/routingScreens';

const provider = { id: 'codex', label: 'Codex', kind: 'codex' as const, baseUrl: '', defaultModel: '', apiKeyEnv: '' };

test('provider and routing pickers show an unfamiliar model; manual and refresh never save a sentinel as a model', async () => {
  for (const route of [false, true]) {
    const actions: string[] = [];
    const props = { provider, options: ['future-family-variant'], onManual: () => actions.push('manual'), onRefresh: () => actions.push('refresh') };
    const node = route
      ? <RouteModelPickScreen {...props} row={{ kind: 'family', family: 'fable' }} onApply={() => actions.push('save')} />
      : <ModelPickScreen {...props} onDone={() => actions.push('save')} />;
    const testUI = await testRender(node, { width: 84, height: 14 });
    try {
      await testUI.renderOnce();
      expect(testUI.captureCharFrame()).toContain('future-family-variant');
      expect(testUI.captureCharFrame()).toContain('Refresh models');
      await testUI.mockInput.pressKeys(['ARROW_DOWN', 'RETURN']);
      await testUI.mockInput.pressKeys(['ARROW_DOWN', 'RETURN']);
      expect(actions).toEqual(['manual', 'refresh']);
    } finally { await act(async () => { testUI.renderer.destroy(); }); }
  }
});

test('effort picker renders provider-defined values and the effective current choice', async () => {
  const testUI = await testRender(<EffortPickScreen options={['max', 'future-depth']} current="future-depth" onDone={() => {}} />, { width: 84, height: 14 });
  try {
    await testUI.renderOnce();
    expect(testUI.captureCharFrame()).toContain('future-depth (current)');
    expect(testUI.captureCharFrame()).not.toContain('folds to xhigh');
  } finally { await act(async () => { testUI.renderer.destroy(); }); }
});
