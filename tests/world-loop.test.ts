// @vitest-environment happy-dom
// The player's world loop (4.6.0 "Routes", dom/world-loop.ts) on a game with routes: the app loads it with the game,
// and the routes' engine comes with the first room (World.ready). A new game has its state before that engine is
// there (the first `enter` awaits it): the loop must wait for it, not throw on a frame and stop the clock for good
// (the routes e2e on WebKit, PR #394).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Engine } from '@engine/core/engine';
import { FakePresenter, MemoryStore } from '@engine/core/ports';
import { startWorld } from '@engine/dom/world-loop';
import type { App } from '@engine/dom/app';
import { routesGame, routesLayouts } from './fixtures/routes';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the world loop', () => {
  it('waits for the routes’ engine: a frame before the first room neither throws nor stops the clock', async () => {
    let now = 1000;
    const frames: ((t: number) => void)[] = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => frames.push(f));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const step = () => {
      now += 100;
      for (const fn of frames.splice(0)) fn(now);
    };

    const e = new Engine(routesGame(), routesLayouts, new FakePresenter(), new MemoryStore());
    e.onError = () => {};
    const started = e.newGame();
    // The state is there, the first room waits for the routes' engine to load.
    expect(e.state).toBeDefined();
    const app = { engine: e, view: { walker: { scene: { ent: () => undefined } }, room: undefined } } as unknown as App;
    const stop = startWorld(app);
    expect(() => step()).not.toThrow();

    await started;
    await vi.waitFor(() => {
      step();
      expect(e.state.world ?? 0).toBeGreaterThan(0);
    });
    stop();
  });
});
