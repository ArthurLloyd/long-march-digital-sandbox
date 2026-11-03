import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createJourneyTransport } from './journey-transport';
import type { JourneyPlan } from './journey-model';
const empty: JourneyPlan = {
  key: 'empty',
  chapters: [],
  tracks: [],
  sequences: [],
};
export function useJourneyTransport(
  plan: JourneyPlan | undefined,
  enabled: boolean,
) {
  const transport = useMemo(
    () => createJourneyTransport(plan ?? empty),
    [plan],
  );
  const state = useSyncExternalStore(
    transport.subscribe,
    transport.getSnapshot,
    transport.getSnapshot,
  );
  useEffect(() => {
    if (!enabled || !plan) {
      transport.pause();
      return;
    }
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      transport.advance(Math.min(0.25, (now - previous) / 1000));
      previous = now;
    }, 40);
    return () => window.clearInterval(timer);
  }, [enabled, plan, transport]);
  return { transport, state };
}
