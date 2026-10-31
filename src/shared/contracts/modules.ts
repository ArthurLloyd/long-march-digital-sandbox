import type { HistoryEvent, RouteFeature, SourceReference } from './data';

export interface SceneError {
  code: 'webgl_unavailable' | 'asset_load_failed' | 'render_failed';
  message: string;
}

/** Inputs contain only published records. Progress is normalized to [0, 1]. */
export interface LongMarchSceneProps {
  events: readonly HistoryEvent[];
  routes: readonly RouteFeature[];
  activeEventId: string | null;
  playbackProgress: number;
  onEventSelect: (eventId: string) => void;
  onSceneReady: () => void;
  onSceneError: (error: SceneError) => void;
}

export interface TeachingInteractionState {
  mode: 'observe' | 'teaching_simulation';
  stepId: string | null;
}

export interface HistoryEventPanelProps {
  event: HistoryEvent | null;
  sources: readonly SourceReference[];
  onClose: () => void;
  teachingState: TeachingInteractionState;
}
