/** Preserve more of the environment in portrait view without an extreme wide-angle lens. */
export function immersiveFieldOfView(aspect: number): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const portraitFov =
    (2 * Math.atan(Math.tan((48 * Math.PI) / 360) / safeAspect) * 180) /
    Math.PI;
  return Math.min(74, Math.max(48, portraitFov));
}
