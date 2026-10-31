/** Original exhibition ornament geometry, not a historical emblem or route. */
export function OrnamentFrame() {
  return (
    <span className="ornament-frame" aria-hidden="true">
      {['tl', 'tr', 'bl', 'br'].map((corner) => (
        <svg
          className={`frame-corner frame-corner-${corner}`}
          key={corner}
          viewBox="0 0 48 48"
          fill="none"
        >
          <path className="corner-rim" d="M2 48V16L16 2h32" />
          <path d="M8 43V19L19 8h24M13 37V22l9-9h15" />
          <path d="M18 30V19h13v8h-7v9h-8" />
          <path className="corner-jewel" d="m9 9 4-4 4 4-4 4Z" />
          <path d="M28 3h8m-9 5h7M3 28v8m5-9v7" />
        </svg>
      ))}
      <span className="frame-crown" />
    </span>
  );
}

export function ToolEmblem({ kind }: { kind: 'chapters' | 'history' }) {
  return (
    <svg
      className="tool-emblem"
      viewBox="0 0 56 64"
      fill="none"
      aria-hidden="true"
    >
      <path className="emblem-ground" d="m28 2 23 12v32L28 61 5 46V14Z" />
      <path d="m28 7 18 10v26L28 55 10 43V17Z" />
      <path d="M28 1v6m0 48v8M1 31h8m38 0h8" />
      {kind === 'chapters' ? (
        <>
          <path
            className="emblem-symbol"
            d="m15 37 9-16 6 10 5-7 8 13M16 42h25M21 47h14"
          />
          <path d="m24 21 2 9-4 3m8-2 3 6" />
          <path className="emblem-spark" d="m36 16 2-3 2 3-2 3Z" />
        </>
      ) : (
        <>
          <path
            className="emblem-symbol"
            d="M18 20h21v25H18c-4 0-4-6 0-6h21M18 20c-4 0-4 6 0 6h3v13"
          />
          <path d="M25 26h9m-9 5h9m-9 5h6M18 42h18" />
          <path d="M39 20c4 0 4 6 0 6m0 13c4 0 4 6 0 6" />
        </>
      )}
    </svg>
  );
}

export function ForwardOrnament() {
  return (
    <svg
      className="tool-forward"
      viewBox="0 0 32 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M2 12h23M18 4l9 8-9 8M14 8l4 4-4 4" />
      <path d="m5 8 4 4-4 4" />
    </svg>
  );
}

export function EmberCrest({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`ember-crest ${className}`}
      viewBox="0 0 120 44"
      fill="none"
      aria-hidden="true"
    >
      <path d="M1 22h30l12-9m-42 4h24m94 5H89l-12-9m42 4H95M35 26l10 7h30l10-7" />
      <path d="m42 22 18-19 18 19-18 19Z" />
      <path d="m48 22 12-13 12 13-12 13Z" />
      <path
        className="crest-flame"
        d="M59 14c3 5-1 6 2 9 2-1 3-3 2-5 7 5 4 12-3 13-8-1-11-8-4-13 0 3 0 4 1 5 3-2 1-5 2-9Z"
      />
    </svg>
  );
}

export function PlaybackDial() {
  return (
    <svg
      className="playback-dial"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="34" />
      <circle cx="40" cy="40" r="29" />
      <path d="M40 0v9m0 62v9M0 40h9m62 0h9M12 12l7 7m42 42 7 7M12 68l7-7m42-42 7-7" />
      <path
        className="dial-jewel"
        d="m40 2 4 4-4 4-4-4Zm34 34 4 4-4 4-4-4ZM40 70l4 4-4 4-4-4ZM6 36l4 4-4 4-4-4Z"
      />
    </svg>
  );
}
