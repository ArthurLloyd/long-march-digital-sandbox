import * as THREE from 'three';
import type { GeoBounds } from './geography';

/** Exhibition light, derived from the existing dawn artwork; not historical weather. */
export const EXHIBITION_LIGHT = {
  background: '#0b141e',
  shadow: '#19364b',
  foliage: '#426f5b',
  stone: '#8b9297',
  snow: '#cbd0cc',
  haze: '#c5b69c',
  fog: '#718492',
  sun: '#ffc77f',
  skyFill: '#9aa6b4',
  groundFill: '#111b25',
} as const;

export function createExhibitionAtmosphere(bounds: GeoBounds) {
  return {
    bounds: { value: new THREE.Vector4(...bounds) },
    origin: { value: new THREE.Vector3() },
    local: { value: 0 },
    haze: { value: new THREE.Color(EXHIBITION_LIGHT.haze) },
    regionBounds: { value: new THREE.Vector4(...bounds) },
    regionActive: { value: 0 },
    regionForest: { value: new THREE.Color(EXHIBITION_LIGHT.foliage) },
    regionGround: { value: new THREE.Color('#77816a') },
    regionRock: { value: new THREE.Color(EXHIBITION_LIGHT.stone) },
  };
}
export type ExhibitionAtmosphere = ReturnType<
  typeof createExhibitionAtmosphere
>;

export const atmosphereDeclarations = `
uniform vec4 panMapBounds;
uniform vec3 panMistOrigin;
uniform float panLocalMist;
uniform vec3 panHazeColor;
`;

export const exhibitionSky = `
vec3 panExhibitionSky(vec3 direction){
  vec3 d=normalize(direction);
  float t=smoothstep(-.2,.65,d.y);
  vec3 color=mix(vec3(.043,.078,.118),vec3(.12,.19,.26),t);
  float horizon=exp(-abs(d.y)*7.);
  color=mix(color,vec3(.51,.55,.56),horizon*.75);
  float dawn=pow(max(0.,dot(normalize(vec2(.8,-.6)),normalize(d.xz+vec2(.0001)))),8.)*horizon;
  color=mix(color,vec3(.83,.70,.50),dawn*.32);
  float cloud=panFbm(d.xz*5.+d.y*3.);
  return color+vec3(.045,.044,.039)*smoothstep(.52,.85,cloud)*horizon;
}
`;

/** Shared by land and water so the valley atmosphere has no hard shoreline seam. */
export function exhibitionAerialPerspective(world: string) {
  return `
  float panLuminance=dot(outgoingLight,vec3(.2126,.7152,.0722));
  float panShadow=1.-smoothstep(.035,.32,panLuminance);
  outgoingLight=mix(outgoingLight,outgoingLight*vec3(.65,.86,1.15)+vec3(.003,.007,.012),panShadow*.50);
  float panValleyDistance=length(${world}.xz-panMistOrigin.xz);
  float panLowMist=exp(-max(${world}.y-panMistOrigin.y-.065,0.)*8.);
  float panMist=panLowMist*smoothstep(.06,.85,panValleyDistance)*panLocalMist*.34;
  outgoingLight=mix(outgoingLight,panHazeColor,panMist);
  `;
}

/** Match the actual sky after tone mapping; do not draw a dark rectangular rim. */
export function exhibitionEdgeFade(world: string) {
  return `
  vec2 panBorder=min(${world}.xz-panMapBounds.xy,panMapBounds.zw-${world}.xz);
  float panEdge=1.;
  gl_FragColor.rgb=mix(panExhibitionSky(${world}-cameraPosition),gl_FragColor.rgb,panEdge);
  `;
}
