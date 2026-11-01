import type { ComponentType } from 'react';
import * as history from '../../features/history';
import type {
  EquivalentExperienceProps,
  HistoricalDetailProps,
  HistoryEventPanelProps,
  ImmersiveExperienceProps,
  LongMarchSceneV2Props,
  TeachingInteractionProps,
} from '../../shared/contracts';

export interface ExperienceModules {
  Renderer?: ComponentType<ImmersiveExperienceProps>;
  Teaching?: ComponentType<TeachingInteractionProps>;
  Equivalent?: ComponentType<EquivalentExperienceProps>;
  Details?: ComponentType<HistoricalDetailProps>;
  LegacyDetails?: ComponentType<HistoryEventPanelProps>;
  Map?: ComponentType<LongMarchSceneV2Props>;
}
function pick<P>(module: object, name: string): ComponentType<P> | undefined {
  const value = (module as Record<string, unknown>)[name];
  const exotic =
    value &&
    typeof value === 'object' &&
    '$$typeof' in value &&
    [
      Symbol.for('react.memo'),
      Symbol.for('react.forward_ref'),
      Symbol.for('react.lazy'),
    ].includes(value.$$typeof as symbol);
  return typeof value === 'function' || exotic
    ? (value as ComponentType<P>)
    : undefined;
}
export async function loadExperienceModules(): Promise<ExperienceModules> {
  // History is already a lightweight static dependency of the legacy reading panel.
  const scene = await import('../../features/scene');
  return {
    Renderer: pick(scene, 'ImmersiveExperienceRenderer'),
    Map: pick(scene, 'LongMarchSceneV2'),
    Teaching: pick(history, 'TeachingInteraction'),
    Equivalent: pick(history, 'EquivalentExperience'),
    Details: pick(history, 'HistoricalDetailPanel'),
    LegacyDetails: history.HistoryEventPanel,
  };
}
