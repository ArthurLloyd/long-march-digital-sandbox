import type { CompletionRecord } from '../../shared/contracts';
import type { ExperienceBundle } from './historical-experience-routing';
import type { ExperienceModules } from './experience-modules';

export function replayOptions(
  bundle: ExperienceBundle,
  modules: ExperienceModules,
  reducedMotion: boolean,
) {
  const rendererMode: CompletionRecord['completionMode'] =
    bundle.segments.some((s) => s.presentation === 'video') &&
    bundle.segments.every((s) => ['video', 'text'].includes(s.presentation))
      ? 'video'
      : '3d';
  return {
    rendererMode,
    immersive: Boolean(modules.Renderer && modules.Teaching && !reducedMotion),
    equivalent: Boolean(modules.Equivalent && modules.Teaching),
  };
}
