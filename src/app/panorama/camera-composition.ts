import type { CameraPose } from './camera-flight';

/** Scene composition only: these candidates never describe historical movement. */
export function composeTerrainView(
  anchor: { x: number; z: number; y: number },
  tangent: { x: number; z: number },
  ground: (x: number, z: number) => number,
  riverCandidates: readonly { x: number; z: number; level: number }[] = [],
): CameraPose {
  const target: [number, number, number] = [
    anchor.x,
    anchor.y + (riverCandidates.length ? 0.065 : 0.012),
    anchor.z,
  ];
  const bearing = Math.atan2(tangent.x, tangent.z);
  let best: { score: number; pose: CameraPose } | undefined;
  const riverPositions = riverCandidates.filter((p) => {
    const distance = Math.hypot(p.x - anchor.x, p.z - anchor.z);
    return distance > 0.34 && distance < 0.66;
  });
  const positions = riverPositions.length
    ? riverPositions
        .filter(
          (_, i) =>
            i % Math.max(1, Math.ceil(riverPositions.length / 24)) === 0,
        )
        .map((p) => ({ x: p.x, z: p.z, turn: 0 }))
    : [0.18, 0.25, 0.34, 0.46].flatMap((radius) =>
        [
          0,
          Math.PI,
          -0.25,
          0.25,
          Math.PI - 0.25,
          Math.PI + 0.25,
          -0.65,
          0.65,
        ].map((turn) => ({
          x: anchor.x + Math.sin(bearing + turn) * radius,
          z: anchor.z + Math.cos(bearing + turn) * radius,
          turn,
        })),
      );
  for (const { x, z, turn } of positions) {
    const radius = Math.hypot(x - anchor.x, z - anchor.z);
    let y = target[1] + radius * 0.65;
    // Keep the near camera volume clear as well as its centre ray.
    for (let j = 0; j < 12; j++)
      y = Math.max(
        y,
        ground(
          x + Math.sin((j * Math.PI) / 6) * 0.025,
          z + Math.cos((j * Math.PI) / 6) * 0.025,
        ) + 0.025,
      );
    // Solve clearance along the whole sightline, not just at the camera.
    for (let i = 2; i <= 48; i++) {
      const t = i / 48;
      const floor = ground(
        anchor.x + (x - anchor.x) * t,
        anchor.z + (z - anchor.z) * t,
      );
      y = Math.max(y, (floor + 0.008 - target[1] * (1 - t)) / t);
    }
    const slope = (y - target[1]) / radius;
    let visible = 0;
    const forward = [anchor.x - x, target[1] - y, anchor.z - z],
      length = Math.hypot(...forward);
    const f = forward.map((v) => v / length),
      right = [f[2]!, 0, -f[0]!],
      rLength = Math.hypot(...right);
    const r = right.map((v) => v / rLength),
      up = [
        r[1]! * f[2]! - r[2]! * f[1]!,
        r[2]! * f[0]! - r[0]! * f[2]!,
        r[0]! * f[1]! - r[1]! * f[0]!,
      ];
    const dot = (a: number[], b: number[]) =>
      a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    for (const p of riverCandidates.filter(
      (_, i) => i % Math.max(1, Math.ceil(riverCandidates.length / 12)) === 0,
    )) {
      const delta = [p.x - x, p.level + 0.004 - y, p.z - z],
        depth = dot(delta, f);
      if (
        depth <= 0 ||
        Math.abs(dot(delta, r)) > depth * 0.5 ||
        Math.abs(dot(delta, up)) > depth * 0.38
      )
        continue;
      let clear = true;
      for (let i = 1; i < 9; i++) {
        const t = i / 9;
        if (
          ground(x + delta[0]! * t, z + delta[2]! * t) >
          y + delta[1]! * t - 0.003
        ) {
          clear = false;
          break;
        }
      }
      if (clear) visible++;
    }
    const score =
      slope * 0.5 +
      radius * 0.2 +
      Math.abs(Math.sin(turn)) * 0.06 -
      visible * 0.13;
    if (!best || score < best.score)
      best = { score, pose: { position: [x, y, z], target } };
  }
  return best!.pose;
}
