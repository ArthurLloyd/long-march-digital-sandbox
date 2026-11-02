import { describe, expect, it } from 'vitest';
import {
  sampleCameraFlight,
  type CameraPose,
} from '../app/panorama/camera-flight';
describe('全景到局部的电影式镜头', () => {
  const from: CameraPose = { position: [0, 25, 23], target: [0, 0, 0] },
    to: CameraPose = { position: [4, 0.8, 2], target: [4, 0.3, 1.8] };
  it('保留精确起止书签，途中使用连续缩放且目标提前稳定', () => {
    expect(sampleCameraFlight(from, to, 0)).toBe(from);
    expect(sampleCameraFlight(from, to, 1)).toBe(to);
    const middle = sampleCameraFlight(from, to, 0.5);
    const radius = Math.hypot(
      ...middle.position.map((value, index) => value - middle.target[index]!),
    );
    expect(radius).toBeLessThan(10);
    expect(radius).toBeGreaterThan(0.5);
    const late = sampleCameraFlight(from, to, 0.8);
    expect(late.target).toEqual(to.target);
    const samples = Array.from({ length: 101 }, (_, index) =>
      sampleCameraFlight(from, to, index / 100),
    );
    expect(
      samples.every((sample) =>
        [...sample.position, ...sample.target].every(Number.isFinite),
      ),
    ).toBe(true);
    expect(
      samples
        .slice(1)
        .every(
          (sample, index) =>
            Math.hypot(
              ...sample.position.map(
                (v, i) => v - samples[index]!.position[i]!,
              ),
            ) < 2,
        ),
    ).toBe(true);
  });
  it('角度经过正负 π 时走短弧，退化书签不产生非数值', () => {
    const a: CameraPose = { position: [0.01, 1, -1], target: [0, 0, 0] },
      b: CameraPose = { position: [-0.01, 1, -1], target: [0, 0, 0] };
    expect(sampleCameraFlight(a, b, 0.5).position[2]).toBeLessThan(-0.9);
    expect(
      sampleCameraFlight(
        { position: [0, 0, 0], target: [0, 0, 0] },
        b,
        0.5,
      ).position.every(Number.isFinite),
    ).toBe(true);
  });
});
