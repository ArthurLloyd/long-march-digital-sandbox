export interface MapSafeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function intersectsMapRect(a: MapSafeRect, b: MapSafeRect, gap = 10) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}
/** UI rectangles only. This never changes a geographic anchor. */
export function mapSafeRects(host: HTMLElement): MapSafeRect[] {
  const base = host.getBoundingClientRect();
  return [
    ...document.querySelectorAll<HTMLElement>('[data-map-obstacle="true"]'),
  ]
    .filter(
      (e) =>
        !e.closest('[hidden], [inert]') &&
        getComputedStyle(e).visibility !== 'hidden' &&
        getComputedStyle(e).display !== 'none',
    )
    .map((e) => {
      const r = e.getBoundingClientRect();
      return {
        x: r.x - base.x,
        y: r.y - base.y,
        width: r.width,
        height: r.height,
      };
    })
    .filter(
      (r) =>
        r.width > 0 &&
        r.height > 0 &&
        r.y < base.height &&
        r.x < base.width &&
        r.x + r.width > 0 &&
        r.y + r.height > 0,
    );
}
export function observeMapSafeAreas(
  host: HTMLElement,
  update: (rects: MapSafeRect[]) => void,
) {
  let frame = 0;
  const refresh = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => update(mapSafeRects(host)));
  };
  const resize = new ResizeObserver(refresh);
  resize.observe(host);
  const mutation = new MutationObserver((records) => {
    if (
      records.some(
        (r) =>
          r.type === 'attributes' ||
          [...r.addedNodes, ...r.removedNodes].some(
            (n) => n instanceof HTMLElement,
          ),
      )
    )
      refresh();
  });
  mutation.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open', 'hidden', 'data-map-obstacle'],
  });
  document.addEventListener('toggle', refresh, true);
  window.addEventListener('resize', refresh);
  refresh();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    mutation.disconnect();
    document.removeEventListener('toggle', refresh, true);
    window.removeEventListener('resize', refresh);
  };
}
