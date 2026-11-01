import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

/** Original procedural materials; no downloaded photographs or historic surfaces. */
export function createBridgeMaterials() {
  const noise = new ImprovedNoise();
  const size = 512;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let value = 0,
        amplitude = 0.5;
      for (let octave = 0; octave < 5; octave++) {
        const frequency = 5 * 2 ** octave;
        value +=
          noise.noise((x / size) * frequency, (y / size) * frequency, 8.3) *
          amplitude;
        amplitude *= 0.5;
      }
      const i = (y * size + x) * 4;
      pixels[i] = Math.round(THREE.MathUtils.clamp(0.5 + value, 0, 1) * 255);
      pixels[i + 1] = Math.round(
        THREE.MathUtils.clamp(
          0.5 + noise.noise(x / 14, y / 14, 4) * 0.45,
          0,
          1,
        ) * 255,
      );
      pixels[i + 2] = Math.round(
        THREE.MathUtils.clamp(0.5 + noise.noise(x / 3, y / 3, 7) * 0.45, 0, 1) *
          255,
      );
      pixels[i + 3] = 255;
    }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  const prefix = `uniform sampler2D artNoise; varying vec3 artWorld; varying vec3 artLocal; varying vec3 artNormal;
    float triNoise(vec3 p) { vec3 w=pow(abs(artNormal),vec3(4.));w/=max(.001,w.x+w.y+w.z);return texture2D(artNoise,p.yz).r*w.x+texture2D(artNoise,p.xz).r*w.y+texture2D(artNoise,p.xy).r*w.z; }
    vec3 artBump(vec3 n,float h){vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);vec3 r1=cross(sy,n),r2=cross(n,sx);float det=dot(sx,r1);return normalize(abs(det)*n-sign(det)*(dFdx(h)*r1+dFdy(h)*r2));}`;
  function material(
    kind: 'rock' | 'stone' | 'wood' | 'iron',
    color: THREE.ColorRepresentation,
    roughness: number,
    metalness = 0,
  ) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.customProgramCacheKey = () => `original-canyon-${kind}-v3`;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.artNoise = { value: texture };
      shader.vertexShader = `varying vec3 artWorld; varying vec3 artLocal; varying vec3 artNormal;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 artP=vec4(transformed,1.);vec3 artN=objectNormal;
        #ifdef USE_INSTANCING
          artP=instanceMatrix*artP;artN=mat3(instanceMatrix)*artN;
        #endif
        artWorld=(modelMatrix*artP).xyz;artLocal=position;artNormal=normalize(mat3(modelMatrix)*artN);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>\n${prefix}`,
      );
      const colors = {
        rock: `float coarse=triNoise(artWorld*.035);float detail=triNoise(artWorld*.09);float fine=triNoise(artWorld*.9);
          float layers=sin(artWorld.y*.23+coarse*4.+artWorld.z*.013)*.5+.5;
          float crack=smoothstep(.37,.43,triNoise(artWorld*vec3(.12,.42,.12)));
          vec3 granite=mix(vec3(.13,.17,.18),vec3(.35,.33,.27),coarse*.7+detail*.3);
          granite*=.68+layers*.24+fine*.16;granite*=.72+crack*.28;
          float moss=smoothstep(.62,.84,coarse)*smoothstep(.15,.75,artNormal.y);
          diffuseColor.rgb*=mix(granite,vec3(.18,.24,.15),moss*.55)*1.65;`,
        stone: `float grain=triNoise(artWorld*.31);float course=artWorld.y/1.1;vec2 brick=vec2((artWorld.x+artWorld.z)*.72+mod(floor(course),2.)*.5,course);
          vec2 edge=min(fract(brick),1.-fract(brick));float mortar=1.-smoothstep(.015,.055,min(edge.x,edge.y));
          diffuseColor.rgb*=mix(vec3(.72,.70,.62)*( .72+grain*.5),vec3(.22,.25,.25),mortar*.7);`,
        wood: `vec2 grainUv=vec2(artLocal.x*2.8,artLocal.z*.018);float grain=texture2D(artNoise,grainUv).r;
          float threads=sin(artLocal.x*360.+grain*19.+sin(artLocal.z*2.5)*.8)*.5+.5;
          float worn=texture2D(artNoise,artLocal.xz*.25).g;
          diffuseColor.rgb*=mix(vec3(.35,.21,.11),vec3(.92,.69,.38),grain*.7+worn*.3)*(.82+threads*.18);
          float edge=1.-smoothstep(.22,.29,abs(artLocal.x));diffuseColor.rgb*=.67+edge*.33;`,
        iron: `float rust=triNoise(artWorld*2.2);float pits=triNoise(artWorld*13.);
          diffuseColor.rgb*=mix(vec3(.29,.35,.36),vec3(.42,.22,.10),smoothstep(.51,.74,rust))*(.8+pits*.3);`,
      };
      const bump = {
        rock: 'triNoise(artWorld*.08)*.34 + triNoise(artWorld*.9)*.06 + sin(artWorld.y*.23+triNoise(artWorld*.035)*4.)*.06',
        stone: 'triNoise(artWorld*1.2)*.14',
        wood: 'texture2D(artNoise,vec2(artLocal.x*2.8,artLocal.z*.018)).r*.035',
        iron: 'triNoise(artWorld*13.)*.012',
      };
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n${colors[kind]}`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\nnormal=artBump(normal,${bump[kind]});`,
      );
    };
    return m;
  }
  return {
    noise,
    rock: material('rock', '#c3c6bc', 0.94),
    stone: material('stone', '#c9c1ab', 0.89),
    wood: material('wood', '#e5c194', 0.79),
    iron: material('iron', '#c3c3b7', 0.52, 0.7),
    dispose: () => texture.dispose(),
  };
}
