export { LongMarchScene } from './LongMarchScene';
export {
  geography,
  COVERAGE,
  METRES_PER_WORLD_UNIT,
  VERTICAL_EXAGGERATION,
  mercator,
  projectGeo,
  unprojectGeo,
  inCoverage,
  heightAt,
  regionCenter,
  MAP_WIDTH,
  MAP_DEPTH,
  type GeoBounds,
  type GeoPoint,
} from './atlas/geography';

export {
  createPanoramaMap,
  type PanoramaMapAdapter,
  type PanoramaBookmark,
  type MarkerProjection,
} from './atlas/map-renderer';

export { sampleCameraFlight, type CameraPose } from './atlas/camera-flight';

export { composeTerrainView } from './atlas/camera-composition';

export {
  createTerrainField,
  blendDetailHeight,
  type ModernHeightfield,
  type TerrainField,
} from './atlas/terrain-field';

export {
  riverRibbon,
  channelCarver,
  createRiverChannel,
  type RiverPoint,
} from './atlas/river-mesh';

export { createModernLandscape } from './atlas/modern-landscape';

export {
  terrainMaterial,
  waterMaterial,
  createAtmosphere,
  skyEnvironment,
} from './atlas/terrain-materials';

export { REGIONS, ATLAS_REGIONS, type RegionId } from './atlas/regions';
export { LongMarchSceneV2 } from './LongMarchSceneV2';
export { ImmersiveExperienceRenderer } from './ImmersiveExperienceRenderer';
