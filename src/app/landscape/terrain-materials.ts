import * as THREE from 'three';
import rockAlbedoUrl from './assets/rock/albedo.jpg';
import rockHeightUrl from './assets/rock/height.jpg';
import {
  EXHIBITION_LIGHT,
  atmosphereDeclarations,
  exhibitionAerialPerspective,
  exhibitionEdgeFade,
  exhibitionSky,
  type ExhibitionAtmosphere,
} from './exhibition-atmosphere';

const noise = `
float panHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float panNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(panHash(i),panHash(i+vec2(1.,0.)),f.x),mix(panHash(i+vec2(0.,1.)),panHash(i+vec2(1.)),f.x),f.y);}
float panFbm(vec2 p){return .55*panNoise(p)+.28*panNoise(p*2.04)+.17*panNoise(p*4.13);}
`;
export function terrainMaterial(atmosphere: ExhibitionAtmosphere) {
  const loader = new THREE.TextureLoader(),
    ready = { value: 0 };
  let loaded = 0,
    disposed = false;
  const complete = () => {
    if (!disposed && ++loaded === 2) ready.value = 1;
  };
  const albedo = loader.load(rockAlbedoUrl, complete, undefined, () => {
    ready.value = 0;
  });
  const relief = loader.load(rockHeightUrl, complete, undefined, () => {
    ready.value = 0;
  });
  albedo.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [albedo, relief]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
  }
  const material = new THREE.MeshStandardMaterial({
    color: EXHIBITION_LIGHT.foliage,
    roughness: 0.88,
    metalness: 0.02,
  });
  material.addEventListener('dispose', () => {
    disposed = true;
    albedo.dispose();
    relief.dispose();
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.panRockAlbedo = { value: albedo };
    shader.uniforms.panRockHeight = { value: relief };
    shader.uniforms.panRockReady = ready;
    shader.uniforms.panMapBounds = atmosphere.bounds;
    shader.uniforms.panMistOrigin = atmosphere.origin;
    shader.uniforms.panLocalMist = atmosphere.local;
    shader.uniforms.panHazeColor = atmosphere.haze;
    shader.uniforms.panInkShadow = {
      value: new THREE.Color(EXHIBITION_LIGHT.shadow),
    };
    shader.uniforms.panFoliage = {
      value: new THREE.Color(EXHIBITION_LIGHT.foliage),
    };
    shader.uniforms.panStone = {
      value: new THREE.Color(EXHIBITION_LIGHT.stone),
    };
    shader.uniforms.panSnow = { value: new THREE.Color(EXHIBITION_LIGHT.snow) };
    shader.vertexShader =
      'attribute float panElevation; varying vec3 panWorld; varying vec3 panTerrainNormal; varying float panMetres; varying float panSlope;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\npanWorld=(modelMatrix*vec4(transformed,1.)).xyz;panTerrainNormal=normalize(mat3(modelMatrix)*normal);panMetres=panElevation;panSlope=1.-abs(normalize(normal).y);',
    );
    shader.fragmentShader =
      'uniform sampler2D panRockAlbedo;uniform sampler2D panRockHeight;uniform float panRockReady;uniform vec3 panInkShadow;uniform vec3 panFoliage;uniform vec3 panStone;uniform vec3 panSnow;varying vec3 panWorld; varying vec3 panTerrainNormal; varying float panMetres; varying float panSlope;\n' +
      atmosphereDeclarations +
      noise +
      exhibitionSky +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 weights=pow(abs(normalize(panTerrainNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
      float broad=panFbm(panWorld.xz*13.);
      float grain=dot(vec3(panFbm(panWorld.zy*340.),panFbm(panWorld.xz*340.),panFbm(panWorld.xy*340.)),weights);
      float fracture=dot(vec3(panNoise(panWorld.zy*1300.),panNoise(panWorld.xz*1300.),panNoise(panWorld.xy*1300.)),weights);
      float footprint=max(length(dFdx(panWorld)),length(dFdy(panWorld)));
      float detail=1.-smoothstep(.0004,.002,footprint);
      grain=mix(.5,grain,detail);
      fracture=mix(.5,fracture,detail);
      vec3 scannedRock=texture2D(panRockAlbedo,panWorld.zy*45.).rgb*weights.x+texture2D(panRockAlbedo,panWorld.xz*45.).rgb*weights.y+texture2D(panRockAlbedo,panWorld.xy*45.).rgb*weights.z;
      float surfaceLight=clamp(dot(scannedRock,vec3(.3,.55,.15))*1.5,.18,1.3);
      vec3 forest=mix(panInkShadow,panFoliage,broad);
      forest*=mix(1.,.72+surfaceLight*.52,panRockReady*detail);
      float earth=smoothstep(.54,.8,panFbm(panWorld.xz*110.));
      forest=mix(forest,panStone*.45*(.7+surfaceLight),earth*detail*.18);
      float rockLuminance=dot(scannedRock,vec3(.2126,.7152,.0722));
      vec3 rock=panStone*(.48+.6*grain)*(.72+.5*fracture);
      rock*=mix(1.,.58+rockLuminance*1.35,panRockReady*.85);
      float exposed=clamp(smoothstep(2100.,4400.,panMetres)*.55+smoothstep(.15,.65,panSlope)*.82,0.,.91);
      vec3 ground=mix(forest,rock,exposed);
      // Height colors describe modern relief artistically, never historic areas.
      vec3 hill=mix(vec3(.16,.27,.19),vec3(.39,.43,.25),smoothstep(120.,850.,panMetres));
      hill=mix(hill,vec3(.57,.47,.31),smoothstep(650.,1600.,panMetres)*.72);
      ground=mix(ground,hill,.48*(1.-smoothstep(1800.,2800.,panMetres)));
      ground=mix(ground,panSnow,smoothstep(4400.,5700.,panMetres)*.82);
      diffuseColor.rgb=ground*(.92+.15*grain);
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
      vec3 w=pow(abs(normalize(panTerrainNormal)),vec3(4.));w/=max(.001,w.x+w.y+w.z);
      float foot=max(length(dFdx(panWorld)),length(dFdy(panWorld)));
      float panBump=dot(vec3(panFbm(panWorld.zy*1000.),panFbm(panWorld.xz*1000.),panFbm(panWorld.xy*1000.)),w)*.00012*(1.-smoothstep(.0004,.002,foot));
      float scannedHeight=texture2D(panRockHeight,panWorld.zy*45.).r*w.x+texture2D(panRockHeight,panWorld.xz*45.).r*w.y+texture2D(panRockHeight,panWorld.xy*45.).r*w.z;
      panBump+=scannedHeight*.0003*panRockReady*(1.-smoothstep(.0004,.002,foot));
      vec3 panDx=dFdx(-vViewPosition),panDy=dFdy(-vViewPosition);
      vec3 panR1=cross(panDy,normal),panR2=cross(normal,panDx);
      float panDet=dot(panDx,panR1);
      normal=normalize(abs(panDet)*normal-sign(panDet)*(dFdx(panBump)*panR1+dFdy(panBump)*panR2)*.4);
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      exhibitionAerialPerspective('panWorld') + '\n#include <opaque_fragment>',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      '#include <fog_fragment>\n' + exhibitionEdgeFade('panWorld'),
    );
  };
  material.customProgramCacheKey = () => 'panorama-exhibition-land-v9';
  return material;
}
export function waterMaterial(
  atmosphere: ExhibitionAtmosphere,
  environment: THREE.Texture,
) {
  const time = { value: 0 };
  const material = new THREE.MeshPhysicalMaterial({
    color: '#445d6b',
    roughness: 0.18,
    metalness: 0.24,
    // Explicit map: Three otherwise substitutes scene.environmentIntensity,
    // which is intentionally lower for the terrain than for the water.
    envMap: environment,
    envMapIntensity: 1.45,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.panTime = time;
    shader.uniforms.panMapBounds = atmosphere.bounds;
    shader.uniforms.panMistOrigin = atmosphere.origin;
    shader.uniforms.panLocalMist = atmosphere.local;
    shader.uniforms.panHazeColor = atmosphere.haze;
    shader.vertexShader =
      'varying vec3 panWaterWorld;varying vec2 panWaterUv;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\npanWaterWorld=(modelMatrix*vec4(transformed,1.)).xyz;panWaterUv=uv;',
    );
    shader.fragmentShader =
      'uniform float panTime;varying vec3 panWaterWorld;varying vec2 panWaterUv;\n' +
      atmosphereDeclarations +
      noise +
      exhibitionSky +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float bank=pow(abs(panWaterUv.x*2.-1.),2.2);
      float ripple=sin(panWaterUv.y*620.-panTime*1.3+panWaterUv.x*5.)*sin(panWaterUv.y*290.+panWaterUv.x*9.-panTime*.8);
      vec3 deep=vec3(.045,.072,.095),shallow=vec3(.16,.21,.21);
      float silver=pow(max(0.,ripple),7.);
      diffuseColor.rgb=mix(deep,shallow,bank*.65)+vec3(.065,.052,.03)*silver;
      diffuseColor.a*=mix(1.,.80,smoothstep(.8,1.,bank));
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
      normal=normalize(normal+vec3(sin(panWaterUv.y*540.-panTime)*.028,0.,cos(panWaterUv.y*310.-panTime*.7)*.022));
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      exhibitionAerialPerspective('panWaterWorld') +
        '\n#include <opaque_fragment>',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      '#include <fog_fragment>\n' + exhibitionEdgeFade('panWaterWorld'),
    );
  };
  material.customProgramCacheKey = () => 'panorama-exhibition-water-v5';
  return { material, time };
}
export function createAtmosphere() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader:
      'varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 skyDirection;${noise}${exhibitionSky}
      void main(){gl_FragColor=vec4(panExhibitionSky(skyDirection),1.);}
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), material);
  sky.renderOrder = -10;
  return sky;
}

/** Original procedural illumination; not an external image or historical sky. */
export function skyEnvironment(renderer: THREE.WebGLRenderer) {
  const width = 512,
    height = 256,
    data = new Uint8Array(width * height * 4);
  const top = new THREE.Color('#526d86'),
    horizon = new THREE.Color('#d8c7a7'),
    bottom = new THREE.Color('#1b2a37'),
    sun = new THREE.Color('#ffcf86');
  for (let row = 0; row < height; row++)
    for (let col = 0; col < width; col++) {
      const v = row / (height - 1),
        u = col / (width - 1);
      const color =
        v < 0.55
          ? top.clone().lerp(horizon, Math.pow(v / 0.55, 0.75))
          : horizon.clone().lerp(bottom, (v - 0.55) / 0.45);
      color
        .lerp(sun, Math.exp(-((u - 0.4) ** 2 + (v - 0.32) ** 2) / 0.006) * 0.8)
        .convertLinearToSRGB();
      const index = (row * width + col) * 4;
      data[index] = Math.round(color.r * 255);
      data[index + 1] = Math.round(color.g * 255);
      data[index + 2] = Math.round(color.b * 255);
      data[index + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  generator.dispose();
  texture.dispose();
  return target;
}
