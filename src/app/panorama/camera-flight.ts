export type SceneVector = readonly [number, number, number];
export interface CameraPose {
  position: SceneVector;
  target: SceneVector;
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Scene-local camera motion only. Never interpolates or creates historical routes. */
export function sampleCameraFlight(
  from: CameraPose,
  to: CameraPose,
  progress: number,
): CameraPose {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) return from;
  if (t === 1) return to;
  const ease = smooth(t),
    targetEase = smooth(Math.min(1, t * 1.4));
  const spherical = (pose: CameraPose) => {
    const x = pose.position[0] - pose.target[0],
      y = pose.position[1] - pose.target[1],
      z = pose.position[2] - pose.target[2];
    const radius = Math.max(0.001, Math.hypot(x, y, z));
    return {
      radius,
      theta: Math.atan2(x, z),
      phi: Math.acos(Math.max(-1, Math.min(1, y / radius))),
    };
  };
  const a = spherical(from),
    b = spherical(to);
  const radius = Math.exp(mix(Math.log(a.radius), Math.log(b.radius), ease));
  const delta = Math.atan2(
    Math.sin(b.theta - a.theta),
    Math.cos(b.theta - a.theta),
  );
  const theta = a.theta + delta * ease,
    phi = mix(a.phi, b.phi, ease);
  const target: SceneVector = [
    mix(from.target[0], to.target[0], targetEase),
    mix(from.target[1], to.target[1], targetEase),
    mix(from.target[2], to.target[2], targetEase),
  ];
  return {
    target,
    position: [
      target[0] + radius * Math.sin(phi) * Math.sin(theta),
      target[1] + radius * Math.cos(phi),
      target[2] + radius * Math.sin(phi) * Math.cos(theta),
    ],
  };
}
