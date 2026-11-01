import { z } from 'zod';
import type { AssetReference } from './assets';
import type { HistoryDatasetV2 } from './dataset';
import type { HistoryEvent, RouteFeature, SourceReference } from './data';
import type { HistoricalPerson, HistoricalPlace } from './entities';
import type { ExperienceId, InteractionId } from './experience-catalog';
import type {
  EquivalentExperienceContent,
  ExperienceManifest,
  ExperienceSegment,
} from './experiences';
import type { ForceSnapshot, ForceTrack } from './forces';
import type {
  InteractionDefinition,
  InteractionResponse,
} from './interactions';
import type { LongMarchSceneProps } from './modules';
import type { HistoricalPhase } from './phases';
import { nonempty } from './primitives';
import type { Topic } from './topics';

export const historicalObjectSelectionSchema = z.strictObject({
  kind: z.enum(['event', 'person', 'place', 'topic']),
  id: nonempty,
});
export type HistoricalObjectSelection = z.infer<
  typeof historicalObjectSelectionSchema
>;
const vectorSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
export const cameraBookmarkSchema = z.strictObject({
  sceneId: nonempty,
  coordinateSystem: z.literal('scene-local'),
  position: vectorSchema,
  target: vectorSchema,
  zoom: z.number().finite().positive(),
  phaseId: nonempty.nullable(),
});
export type CameraBookmark = z.infer<typeof cameraBookmarkSchema>;
export interface HistoricalPhaseControllerProps {
  phases: readonly HistoricalPhase[];
  activePhaseId: string | null;
  playing: boolean;
  onPhaseChange: (phaseId: string) => void;
  onPlayingChange: (playing: boolean) => void;
}
export interface ForceLayerProps {
  tracks: readonly ForceTrack[];
  snapshots: readonly ForceSnapshot[];
  routes: readonly RouteFeature[];
  activePhaseId: string | null;
}
export interface LongMarchSceneV2Props extends LongMarchSceneProps {
  dataset: Readonly<HistoryDatasetV2>;
  phaseId: string | null;
  selection: HistoricalObjectSelection | null;
  cameraBookmark: CameraBookmark | null;
  onObjectSelect: (selection: HistoricalObjectSelection) => void;
  onCameraBookmark: (bookmark: CameraBookmark) => void;
}
export interface RendererRun {
  experienceId: ExperienceId;
  scriptVersion: string;
  runId: string;
}
export interface SegmentReached extends RendererRun {
  segmentId: string;
}
export interface InteractionCue extends SegmentReached {
  interactionId: InteractionId;
}
export interface ExperienceError {
  code:
    | 'webgl_unavailable'
    | 'asset_load_failed'
    | 'render_failed'
    | 'media_unavailable';
  message: string;
  retryable: boolean;
}
export interface ImmersiveRendererCallbacks {
  onReady: (run: RendererRun) => void;
  onError: (report: RendererRun & { error: ExperienceError }) => void;
  onSegmentReached: (report: SegmentReached) => void;
  onInteractionCue: (report: InteractionCue) => void;
  onTerminalReached: (report: SegmentReached) => void;
  onExitRequested: (run: RendererRun) => void;
  onCameraBookmark: (
    report: RendererRun & { bookmark: CameraBookmark },
  ) => void;
}
export interface ImmersiveExperienceProps extends ImmersiveRendererCallbacks {
  manifest: Readonly<ExperienceManifest>;
  segments: readonly ExperienceSegment[];
  assets: readonly AssetReference[];
  command: {
    runId: string;
    segmentId: string;
    playback: 'playing' | 'paused';
    muted: boolean;
    quality: 'low' | 'medium' | 'high';
    reducedMotion: boolean;
  };
  cameraBookmark: CameraBookmark | null;
}
export interface TeachingInteractionProps {
  interaction: Readonly<InteractionDefinition>;
  response: InteractionResponse | null;
  explanationAcknowledged: boolean;
  onResponse: (
    interactionId: InteractionId,
    response: InteractionResponse,
  ) => void;
  onExplanationAcknowledged: (interactionId: InteractionId) => void;
}
export type ExperienceNavigationRequest =
  | { type: 'open_object'; selection: HistoricalObjectSelection }
  | { type: 'replay_experience'; experienceId: ExperienceId }
  | { type: 'open_source'; sourceId: string };
export type HistoricalDetail =
  | { kind: 'event'; record: HistoryEvent }
  | { kind: 'person'; record: HistoricalPerson }
  | { kind: 'place'; record: HistoricalPlace }
  | { kind: 'topic'; record: Topic };
export interface HistoricalDetailProps {
  detail: HistoricalDetail;
  sources: readonly SourceReference[];
  assets: readonly AssetReference[];
  onNavigate: (request: ExperienceNavigationRequest) => void;
  onClose: () => void;
}
export interface EquivalentExperienceProps {
  content: Readonly<EquivalentExperienceContent>;
  activeStepId: string | null;
  onStepViewed: (stepId: string) => void;
}
