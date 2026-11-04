import * as THREE from 'three';

/** One keyed strip per supplied polyline. Its centre never leaves the draped
 * path; only its projected width is in pixels. No bloom pass or wall clock. */
export function createMarchInk(
  fractions: readonly number[],
  style: 'red' | 'blue' | 'feint',
  schematic: boolean,
  staticMark?: 'blockade' | 'reported',
  lanePixels = 0,
) {
  const n = fractions.length;
  const geometry = new THREE.BufferGeometry();
  const xyz = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
  const along = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
  const side = new Float32Array(n * 2);
  const at = new Float32Array(n * 2);
  const lengths = new Float32Array(n * 2);
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    side.set([-1, 1], i * 2);
    at.fill(fractions[i]!, i * 2, i * 2 + 2);
    if (i + 1 < n) {
      const l = i * 2;
      indices.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
    }
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position', xyz);
  geometry.setAttribute('aAlong', along);
  geometry.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geometry.setAttribute('aAt', new THREE.BufferAttribute(at, 1));
  const distance = new THREE.BufferAttribute(lengths, 1);
  geometry.setAttribute('aDistance', distance);
  const viewport = { value: new THREE.Vector2(1280, 720) };
  const color = {
    value: new THREE.Color(
      style === 'red' ? 0xff632f : style === 'blue' ? 0x398cff : 0xffdb44,
    ),
  };
  const opacity = { value: 1 };
  const common = {
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    forceSinglePass: true,
  };
  const mat = new THREE.ShaderMaterial({
    ...common,
    uniforms: {
      viewport,
      opacity,
      lane: { value: lanePixels },
      ink: color,
      head: { value: 0 },
      archived: { value: 0 },
      headRun: { value: 0 },
      defense: { value: staticMark === 'blockade' ? 1 : 0 },
      wake: { value: !staticMark && style !== 'feint' ? 1 : 0 },
      pattern: { value: style === 'feint' ? 2 : schematic ? 1 : 0 },
      halfWidth: {
        value: style === 'red' ? 9.4 : style === 'blue' ? 8.2 : 6.6,
      },
      scaleAtEye: { value: 1 },
    },
    vertexShader: `
      uniform vec2 viewport;
      uniform float halfWidth, head, pattern, lane;
      attribute vec3 aAlong;
      attribute float aSide, aAt, aDistance;
      varying float edge, at, run;
      void main() {
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        vec4 q = projectionMatrix * modelViewMatrix * vec4(position + aAlong, 1.);
        vec2 delta = (q.xy / max(.0001, q.w) - p.xy / max(.0001, p.w)) * viewport;
        vec2 normal = vec2(-delta.y, delta.x) / max(.00001, length(delta));
        edge = aSide; at = aAt; run = aDistance;
        // A parallel gold stroke separates the feint from the underlying
        // red route where they overlap. Pin both ends to their actual sites.
        float split = pattern > 1.5 ? 5.5 * smoothstep(0.,.07,at) * smoothstep(0.,.07,head-at) : 0.;
        p.xy += normal * (halfWidth * aSide + split + lane) * (2. / viewport) * p.w;
        gl_Position = p;
      }`,
    fragmentShader: `
      uniform float opacity;
      uniform vec3 ink;
      uniform float head, headRun, archived, pattern, scaleAtEye, wake, defense;
      varying float edge, at, run;
      float dashInk(float cell, float limit) {
        float aperture = abs(fract(cell+.5)-.5);
        float aa = clamp(fwidth(cell)*.6,.035,.12);
        return 1. - smoothstep(limit-aa,limit+aa,aperture);
      }
      void main() {
        if (at > head) discard;
        float crossSection = abs(edge);
        float hot = (1. - smoothstep(0., .26, head - at)) * (1. - archived);
        float core = exp(-crossSection * crossSection * 71.);
        float bloom = exp(-crossSection * crossSection * 4.6);
        float body = exp(-crossSection * crossSection * 12.);
        // Switch between anchored ground scales by crossfade. Rescaling the
        // period continuously would make the dashes race during camera zooms.
        float level = log2(max(.0001,scaleAtEye));
        float coarse = exp2(floor(level));
        float cycle = run / coarse;
        float blend = smoothstep(.15,.85,fract(level));
        float dash = 1.;
        if (pattern > .5 && defense < .5) {
          float limit = pattern > 1.5 ? .20 : .375;
          dash = mix(dashInk(cycle,limit),dashInk(cycle*.5,limit),blend);
        }
        float alpha = (core * .60 + body * (.53 + .15 * hot) + bloom * (.20 + .23 * hot)) * dash;
        vec3 c = mix(ink, vec3(1., .975, .90), core * (.13 + .29 * hot));
        if (defense > .5) {
          float tooth = mix(max(0.,1.-abs(fract(cycle)-.5)*4.),max(0.,1.-abs(fract(cycle*.5)-.5)*4.),blend);
          float mark = max(0.,smoothstep(-.04,.06,edge)*(1.-smoothstep(tooth*.81-.08,tooth*.81+.08,edge)));
          alpha = max(alpha, .80 * mark);
        }
        // Tiny motes follow only the leading stretch. Their phase depends
        // on how far the army has travelled: a paused frame stays still.
        if (wake > .5 && archived < .5) {
          float behind = (headRun-run) / max(.0001,scaleAtEye);
          float band = (1.-smoothstep(.4,5.,behind))*smoothstep(0.,.32,behind);
          float cells = (run*2.4-headRun*.8)/.045;
          float seed = fract(sin(floor(cells)*19.17+6.71)*4375.53);
          vec2 grain = vec2((fract(cells)-.5)*6.8, (edge-(seed-.5)*1.65)*5.8);
          float fleck = exp(-dot(grain,grain)*1.6)*band*(.28+.33*seed);
          alpha = max(alpha,fleck);
          c = mix(c,ink*1.1,fleck);
        }
        // Behind the army, the route settles into a fine, quiet line.
        c = mix(c, ink * .54, archived);
        alpha *= mix(1., .54, archived);
        if (alpha < .009) discard;
        gl_FragColor = vec4(c, min(1., alpha) * opacity);
        #include <colorspace_fragment>
      }`,
  });
  const trail = new THREE.Mesh(geometry, mat);
  trail.visible = false;
  trail.renderOrder = 12;
  const heading = new THREE.Vector3(0, 0, 1);
  const arrowMaterial = new THREE.ShaderMaterial({
    ...common,
    uniforms: {
      viewport,
      opacity,
      ink: color,
      heading: { value: heading },
      lane: { value: lanePixels },
      emphasis: { value: 1 },
      resting: { value: 0 },
    },
    vertexShader: `
      uniform vec2 viewport;
      uniform vec3 heading;
      uniform float emphasis, lane;
      varying vec2 mark;
      void main() {
        vec4 p = projectionMatrix * modelViewMatrix * vec4(0.,0.,0.,1.);
        vec4 q = projectionMatrix * modelViewMatrix * vec4(heading,1.);
        vec2 d = (q.xy / max(.0001,q.w) - p.xy / max(.0001,p.w)) * viewport;
        d /= max(.00001,length(d));
        mark = mix(vec2(-32.,-11.), vec2(7.,11.), uv);
        vec2 normal=vec2(-d.y,d.x);
        p.xy += ((d * mark.x + normal * mark.y) * emphasis + normal * lane) * (2. / viewport) * p.w;
        gl_Position = p;
      }`,
    fragmentShader: `
      uniform float opacity;
      uniform vec3 ink;
      varying vec2 mark;
      uniform float resting;
      void main() {
        float wing = abs(mark.y);
        // The point is at the actual route endpoint (0,0), wings set behind it.
        float silhouette = max(mark.x + wing * 1.64, -mark.x - 9.2 - wing * .57);
        float nib = 1. - smoothstep(-.6,.6,silhouette);
        vec2 glowPos = (mark-vec2(-4.,0.)) / vec2(11.5,6.2);
        float light = exp(-dot(glowPos,glowPos));
        float filament = exp(-wing*wing*.38) * smoothstep(-30.,-7.,mark.x) * (1.-smoothstep(-4.,-.5,mark.x));
        float alpha = min(1., nib + light*.54 + filament*.72);
        // Turn the moving nib into a small persistent position marker as
        // the resolved action recedes into the background.
        float diamond = 1.-smoothstep(2.4,3.7,abs(mark.x)+abs(mark.y));
        alpha = mix(alpha, diamond*.9, resting);
        if (alpha < .008) discard;
        vec3 c = mix(ink, vec3(1.,.985,.93), clamp(filament*.74 + nib*.065 + light*.14, 0., 1.));
        gl_FragColor = vec4(c,alpha*opacity);
        #include <colorspace_fragment>
      }`,
  });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), arrowMaterial);
  front.frustumCulled = false;
  front.renderOrder = 15;
  front.visible = false;
  return {
    trail,
    front,
    opacity,
    resolution(width: number, height: number) {
      viewport.value.set(Math.max(1, width), Math.max(1, height));
    },
    drape(
      samples: readonly (readonly [number, number])[],
      heights: readonly number[],
    ) {
      let accumulated = 0;
      for (let i = 0; i < n; i++) {
        const [x, z] = samples[i]!,
          y = heights[i]!;
        const prev = Math.max(0, i - 1),
          next = Math.min(n - 1, i + 1);
        const a = samples[prev]!,
          b = samples[next]!;
        const dx = b[0] - a[0],
          dy = heights[next]! - heights[prev]!,
          dz = b[1] - a[1];
        if (i) accumulated += Math.hypot(x - a[0], z - a[1]);
        for (const j of [2 * i, 2 * i + 1]) {
          xyz.setXYZ(j, x, y, z);
          along.setXYZ(j, dx, dy, dz);
          distance.setX(j, accumulated);
        }
      }
      xyz.needsUpdate = along.needsUpdate = distance.needsUpdate = true;
      geometry.computeBoundingSphere();
    },
    draw(travel: number, last: number, old: boolean, viewDistance: number) {
      trail.visible = travel > 0;
      trail.renderOrder = old ? 10 : 12;
      geometry.setDrawRange(0, Math.min(Math.max(0, last), n - 1) * 6);
      const hi = Math.min(Math.max(last, 1), n - 1),
        lo = hi - 1;
      const portion = THREE.MathUtils.clamp(
        (travel - fractions[lo]!) /
          Math.max(1e-8, fractions[hi]! - fractions[lo]!),
        0,
        1,
      );
      mat.uniforms.headRun!.value = THREE.MathUtils.lerp(
        lengths[2 * lo]!,
        lengths[2 * hi]!,
        portion,
      );
      mat.uniforms.head!.value = travel;
      mat.uniforms.archived!.value = old ? 1 : 0;
      // ~15 px per dash for the normal camera; no flickering subpixel dashes on a wide shot.
      mat.uniforms.scaleAtEye!.value = Math.max(
        0.0015,
        (viewDistance * 15) / Math.max(240, viewport.value.y),
      );
    },
    tip(
      origin: THREE.Vector3,
      tangent: THREE.Vector3,
      strength: number,
      resting = 0,
    ) {
      front.position.copy(origin);
      heading.copy(tangent).multiplyScalar(0.012);
      arrowMaterial.uniforms.emphasis!.value = strength;
      arrowMaterial.uniforms.resting!.value = resting;
      front.visible = true;
    },
    // Move the label's projected anchor by the same screen-space normal as
    // the opposing direction lane. The registered world-space point stays put.
    alignLabel(
      p: THREE.Vector3,
      origin: THREE.Vector3,
      tangent: THREE.Vector3,
      camera: THREE.Camera,
      width: number,
      height: number,
    ) {
      if (!lanePixels) return;
      const next = origin
        .clone()
        .addScaledVector(tangent, 0.012)
        .project(camera);
      const dx = (next.x - p.x) * width,
        dy = (next.y - p.y) * height;
      const len = Math.hypot(dx, dy);
      if (len < 1e-8) return;
      p.x -= ((dy / len) * lanePixels * 2) / width;
      p.y += ((dx / len) * lanePixels * 2) / height;
    },
    settle(amount: number) {
      mat.uniforms.archived!.value = amount;
      trail.renderOrder = 10;
    },
    dim() {
      front.visible = false;
      trail.renderOrder = 10;
      mat.uniforms.archived!.value = 1;
    },
    hide() {
      trail.visible = front.visible = false;
    },
    dispose() {
      geometry.dispose();
      mat.dispose();
      front.geometry.dispose();
      arrowMaterial.dispose();
    },
  };
}
