/** Original geometric exhibition trim; never a historical insignia. */
export function MapControlFrame() {
  return (
    <span className="map-control-frame" aria-hidden="true">
      {['tl', 'tr', 'bl', 'br'].map((corner) => (
        <svg
          key={corner}
          className={`map-corner map-corner-${corner}`}
          viewBox="0 0 30 30"
          fill="none"
        >
          <path d="M2 27V9l7-7h18" />
          <path d="M7 20V11l4-4h9" />
        </svg>
      ))}
    </span>
  );
}
