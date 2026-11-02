import type { RegionId } from '../atlas/regions';

export interface SceneCinematic {
  enabled: boolean;
  src: string;
  poster: string;
  label: string;
}

const cinematic = (
  id: RegionId,
  label: string,
  version: 'v2' | 'v2-repair',
): SceneCinematic => ({
  enabled: true,
  src: `/assets/textures/scene-cinematics/${version}/${id}-intro.mp4`,
  poster: `/assets/textures/scene-cinematics/${version}/${id}-intro.jpg`,
  label,
});

/** Delivered clips selected after local contact-sheet and poster review. */
export const SCENE_CINEMATICS: Record<RegionId, SceneCinematic> = {
  ruijin: cinematic('ruijin', '青山行囊', 'v2'),
  zunyi: cinematic('zunyi', '城巷灯影', 'v2-repair'),
  chishui: cinematic('chishui', '赤水回环', 'v2-repair'),
  jinsha: cinematic('jinsha', '江岸待渡', 'v2-repair'),
  luding: cinematic('luding', '峡谷与桥', 'v2-repair'),
  snow: cinematic('snow', '雪岭同行', 'v2-repair'),
  grass: cinematic('grass', '旷野相伴', 'v2'),
  reunion: cinematic('reunion', '山河相望', 'v2-repair'),
};

/** Map cards use the active film's real poster; unfinished films keep the previous scene cover. */
export function getSceneCover(regionId: RegionId): string {
  const cinematic = SCENE_CINEMATICS[regionId];
  return cinematic.enabled
    ? cinematic.poster
    : `/assets/textures/scene-covers/${regionId}.jpg`;
}
