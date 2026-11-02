/** Both displays share one modern scene-local coordinate frame. */
export const PANORAMA_SCENE = 'long-march-modern-panorama';
export const RUIJIN_SCENE = 'long-march-ruijin-relief';
export type PanoramaSceneId = typeof PANORAMA_SCENE | typeof RUIJIN_SCENE;
export function isPanoramaSceneId(value: string): value is PanoramaSceneId {
  return value === PANORAMA_SCENE || value === RUIJIN_SCENE;
}
