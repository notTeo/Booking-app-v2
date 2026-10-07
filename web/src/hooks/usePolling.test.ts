import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPolling } from './usePolling';

// A stand-in for the tab: its visibility can be flipped and its events fired.
function fakeTab() {
  const listeners = new Map<string, Set<() => void>>();
  const on = (type: string, fn: () => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(fn);
  };
  const off = (type: string, fn: () => void) => listeners.get(type)?.delete(fn);
  const state = { visibilityState: 'visible' as DocumentVisibilityState };
  return {
    state,
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
    target: {
      doc: {
        get visibilityState() {
          return state.visibilityState;
        },
        addEventListener: on,
        removeEventListener: off,
      },
      win: {
        setInterval: (fn: () => void, ms: number) => setInterval(fn, ms) as unknown as number,
        clearInterval: (id: number) => clearInterval(id),
        addEventListener: on,
        removeEventListener: off,
      },
    } as unknown as Parameters<typeof startPolling>[2],
  };
}

describe('startPolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs on the interval while the tab is visible, not before the first interval', () => {
    const tab = fakeTab();
    const run = vi.fn();
    startPolling(run, 30_000, tab.target);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does nothing while the tab is hidden, and catches up the moment it is shown again', () => {
    const tab = fakeTab();
    const run = vi.fn();
    startPolling(run, 30_000, tab.target);
    tab.state.visibilityState = 'hidden';
    tab.fire('visibilitychange');
    vi.advanceTimersByTime(120_000);
    expect(run).not.toHaveBeenCalled();

    tab.state.visibilityState = 'visible';
    tab.fire('visibilitychange');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs when the window regains focus', () => {
    const tab = fakeTab();
    const run = vi.fn();
    startPolling(run, 30_000, tab.target);
    tab.fire('focus');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('stops for good: no timer and no listeners left', () => {
    const tab = fakeTab();
    const run = vi.fn();
    const stop = startPolling(run, 30_000, tab.target);
    stop();
    vi.advanceTimersByTime(120_000);
    tab.fire('focus');
    tab.fire('visibilitychange');
    expect(run).not.toHaveBeenCalled();
    expect(tab.count()).toBe(0);
  });
});
