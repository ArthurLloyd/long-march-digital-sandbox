import * as THREE from 'three';

const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return n2(p)*.57+n2(p*2.03+7.)*.28+n2(p*4.11-3.)*.15;}`;

export function createAtmosphere() {
  const group = new THREE.Group();
  const time = { value: 0 };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1300, 40, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        time,
        landscapeSky: { value: null },
        landscapeMix: { value: 0 },
      },
      vertexShader:
        'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 direction;uniform float time;uniform sampler2D landscapeSky;uniform float landscapeMix;${noise}
      void main(){vec3 d=normalize(direction);float h=smoothstep(-.05,.65,d.y);
        vec3 sun=normalize(vec3(-.30,.13,-1.));float alignment=max(0.,dot(d,sun));
        vec3 color=mix(vec3(.43,.55,.59),vec3(.035,.12,.22),h);
        color+=vec3(.76,.32,.055)*pow(alignment,12.)+vec3(3.8,2.3,.8)*pow(alignment,1100.);
        vec2 cloudUv=d.xz/max(.12,d.y+.19)*1.8+vec2(time*.003,0.);
        float cloud=smoothstep(.49,.73,fbm(cloudUv));float horizon=smoothstep(.02,.22,d.y)*(1.-smoothstep(.6,.95,d.y));
        color=mix(color,mix(vec3(.29,.37,.38),vec3(.82,.72,.51),pow(alignment,8.)),cloud*horizon*.43);
        vec2 skyUv=vec2(.5+atan(d.x,-d.z)/6.2831853,.76+clamp(d.y,0.,1.)*.22);
        vec3 photographedClouds=texture2D(landscapeSky,skyUv).rgb;
        float skyBlend=landscapeMix*smoothstep(.12,.45,d.y)*(1.-smoothstep(.85,.99,d.y));
        color=mix(color,photographedClouds,skyBlend);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
  );
  group.add(sky);
  const sunGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 190),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:
        'varying vec2 vUv;void main(){float d=distance(vUv,vec2(.5));float halo=exp(-d*d*22.);float disc=1.-smoothstep(.035,.047,d);gl_FragColor=vec4(vec3(1.4,.73,.22)*halo+vec3(3.,2.,.8)*disc,halo*.17+disc*.8);}',
    }),
  );
  sunGlow.position.set(-20, 170, -600);
  group.add(sunGlow);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time },
    vertexShader: `varying vec3 world;varying float fogDepth;uniform float time;
      void main(){vec3 p=position;p.z+=sin(p.y*.32-time*1.5)*.06+cos(p.x*.75+p.y*.17-time)*.08;
      world=(modelMatrix*vec4(p,1.)).xyz;vec4 v=modelViewMatrix*vec4(p,1.);fogDepth=-v.z;gl_Position=projectionMatrix*v;}`,
    fragmentShader: `varying vec3 world;varying float fogDepth;uniform float time;${noise}
      float wave(vec2 p){return sin(p.y*.8-time*1.8+sin(p.x*.7))*.08+sin(p.x*.55+p.y*.25-time*.9)*.11+fbm(p*vec2(.5,.22)+vec2(0.,-time*.4))*.3;}
      void main(){vec2 p=world.xz;float h=wave(p);float dx=wave(p+vec2(.13,0.))-h;float dz=wave(p+vec2(0.,.13))-h;
        vec3 normal=normalize(vec3(-dx/.13,1.,-dz/.13));vec3 view=normalize(cameraPosition-world);vec3 reflection=reflect(-view,normal);
        float fresnel=.04+.5*pow(1.-max(0.,dot(normal,view)),4.);vec3 sun=normalize(vec3(-.30,.13,-1.));
        float spec=pow(max(0.,dot(reflection,sun)),140.)*.48;
        vec3 reflected=mix(vec3(.34,.48,.48),vec3(.13,.27,.34),smoothstep(0.,.7,reflection.y));
        reflected+=vec3(.24,.13,.04)*pow(max(0.,dot(reflection,sun)),20.);
        vec3 color=mix(vec3(.025,.11,.15),reflected,fresnel)+vec3(1.2,.88,.44)*spec;
        vec2 flow=p*vec2(.6,.22)+vec2(0.,-time*.6);float turbulence=fbm(flow+vec2(fbm(flow*.45)*3.,0.));
        float bank=23.+sin(p.y*.012)*2.5+sin(p.y*.043)*1.1;
        float shore=smoothstep(bank-5.,bank-1.,abs(p.x));
        float foam=smoothstep(.57,.79,turbulence)*(shore*.5+.035);
        foam+=smoothstep(.72,.84,fbm(flow*2.5))*pow(max(0.,sin(p.y*.9-time*1.9)),6.)*.06;
        color=mix(color,vec3(.61,.71,.64),min(.85,foam));
        float fog=1.-exp(-.0038*.0038*fogDepth*fogDepth);
        color=mix(color,vec3(.147,.254,.283),clamp(fog,0.,1.));gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 1700, 28, 230),
    waterMaterial,
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 7, -580);
  group.add(river);
  const effects = new THREE.Group();
  const mists: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time, seed: { value: i * 2.7 } },
      vertexShader:
        'varying vec2 uvArt;void main(){uvArt=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 uvArt;uniform float time;uniform float seed;${noise}
        void main(){vec2 p=uvArt;float fade=pow(max(0.,1.-abs(p.y*2.-1.)),2.)*smoothstep(0.,.18,p.x)*(1.-smoothstep(.82,1.,p.x));
        float cloud=fbm(p*vec2(5.,2.)+vec2(time*.018+seed,seed));gl_FragColor=vec4(.55,.66,.62,fade*cloud*.23);}`,
    });
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(145 + i * 35, 22 + i * 8),
      material,
    );
    mist.position.set(0, 18 + i * 8, -70 - i * 80);
    mists.push(mist);
    effects.add(mist);
  }
  for (let i = 0; i < 3; i++) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { time, offset: { value: i * 3.2 } },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv;uniform float time;uniform float offset;${noise}
        void main(){float edge=pow(max(0.,1.-abs(vUv.x*2.-1.)),3.);float reach=sin(vUv.y*3.14159);float dust=.6+fbm(vUv*vec2(2.,7.)+vec2(offset,time*.009))*.4;gl_FragColor=vec4(.90,.72,.42,edge*reach*dust*.11);}`,
    });
    const shaft = new THREE.Mesh(
      new THREE.PlaneGeometry(30 + i * 6, 210),
      material,
    );
    shaft.position.set(-5 + i * 24, 74, -120 - i * 45);
    shaft.rotation.z = -0.42;
    effects.add(shaft);
  }
  group.add(effects);
  return {
    group,
    sky,
    update: (seconds: number, camera: THREE.Camera) => {
      time.value = seconds;
      sunGlow.quaternion.copy(camera.quaternion);
      for (const mist of mists) mist.quaternion.copy(camera.quaternion);
    },
    setLow: (low: boolean) => {
      effects.visible = !low;
    },
  };
}
