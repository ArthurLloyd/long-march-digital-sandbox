import type { PhaseModel } from './historical-phase-selectors';

export interface HistoricalPhaseState {
  selectedTopicId: string | null;
  activePhaseId: string | null;
  playing: boolean;
  modelKey: string;
  revision: number;
}
export type HistoricalPhaseAction =
  | {
      type:
        'sync' | 'play' | 'pause' | 'next' | 'previous' | 'restart' | 'reset';
    }
  | { type: 'topic'; topicId: string }
  | { type: 'phase'; phaseId: string }
  | { type: 'restore'; topicId: string | null; phaseId: string | null }
  | { type: 'tick'; revision: number; modelKey: string };

export function initialPhaseState(model: PhaseModel): HistoricalPhaseState {
  const topic =
    model.topics.find((t) => model.orders.get(t.topicId)?.length) ??
    model.topics[0];
  return {
    selectedTopicId: topic?.topicId ?? null,
    activePhaseId: topic
      ? (model.orders.get(topic.topicId)?.[0]?.phaseId ?? null)
      : null,
    playing: false,
    modelKey: model.key,
    revision: 0,
  };
}

export function reconcilePhaseState(
  state: HistoricalPhaseState,
  model: PhaseModel,
): HistoricalPhaseState {
  if (state.modelKey === model.key) return state;
  const topic = model.topics.find((t) => t.topicId === state.selectedTopicId);
  const phases = topic ? (model.orders.get(topic.topicId) ?? []) : [];
  return {
    ...state,
    selectedTopicId: topic?.topicId ?? null,
    activePhaseId:
      phases.find((p) => p.phaseId === state.activePhaseId)?.phaseId ??
      phases[0]?.phaseId ??
      null,
    playing: false,
    modelKey: model.key,
    revision: state.revision + 1,
  };
}

export function historicalPhaseReducer(
  raw: HistoricalPhaseState,
  action: HistoricalPhaseAction,
  model: PhaseModel,
): HistoricalPhaseState {
  const state = reconcilePhaseState(raw, model);
  const phases = model.orders.get(state.selectedTopicId ?? '') ?? [];
  const index = phases.findIndex((p) => p.phaseId === state.activePhaseId);
  const change = (values: Partial<HistoricalPhaseState>) => ({
    ...state,
    ...values,
    revision: state.revision + 1,
  });
  switch (action.type) {
    case 'sync':
      return state;
    case 'reset':
      return { ...initialPhaseState(model), revision: state.revision + 1 };
    case 'pause':
      return state.playing ? change({ playing: false }) : state;
    case 'topic': {
      if (!model.topics.some((t) => t.topicId === action.topicId)) return state;
      const order = model.orders.get(action.topicId) ?? [];
      return change({
        selectedTopicId: action.topicId,
        activePhaseId:
          action.topicId === state.selectedTopicId
            ? state.activePhaseId
            : (order[0]?.phaseId ?? null),
        playing: false,
      });
    }
    case 'phase':
      return phases.some((p) => p.phaseId === action.phaseId)
        ? change({ activePhaseId: action.phaseId, playing: false })
        : state;
    case 'restore': {
      if (action.topicId === null && action.phaseId === null)
        return change({
          selectedTopicId: null,
          activePhaseId: null,
          playing: false,
        });
      if (!model.topics.some((t) => t.topicId === action.topicId))
        return change({ playing: false });
      const order = model.orders.get(action.topicId!) ?? [];
      if (
        action.phaseId !== null &&
        !order.some((p) => p.phaseId === action.phaseId)
      )
        return change({ playing: false });
      return change({
        selectedTopicId: action.topicId,
        activePhaseId: action.phaseId,
        playing: false,
      });
    }
    case 'play':
      return !model.error &&
        phases.length > 1 &&
        index >= 0 &&
        index < phases.length - 1
        ? change({ playing: true })
        : state;
    case 'restart':
      return phases.length
        ? change({
            activePhaseId: phases[0]!.phaseId,
            playing: phases.length > 1 && !model.error,
          })
        : state;
    case 'previous':
      return index > 0
        ? change({ activePhaseId: phases[index - 1]!.phaseId, playing: false })
        : state;
    case 'next':
      return index >= 0 && index < phases.length - 1
        ? change({ activePhaseId: phases[index + 1]!.phaseId, playing: false })
        : state;
    case 'tick':
      if (
        !state.playing ||
        action.revision !== state.revision ||
        action.modelKey !== model.key
      )
        return state;
      return index >= 0 && index < phases.length - 1
        ? change({
            activePhaseId: phases[index + 1]!.phaseId,
            playing: index + 1 < phases.length - 1,
          })
        : change({ playing: false });
  }
}
