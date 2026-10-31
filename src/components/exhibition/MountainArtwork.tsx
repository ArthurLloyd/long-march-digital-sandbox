import mountainArt from '../../assets/exhibition/mountains-dawn.webp';

/** Theme artwork only. Provenance lives in docs/design/hero-art-provenance.md. */
export function MountainArtwork({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`mountain-artwork ${compact ? 'mountain-artwork-compact' : ''}`}
      aria-hidden="true"
    >
      <img
        src={mountainArt}
        alt=""
        width="1672"
        height="941"
        fetchPriority={compact ? 'auto' : 'high'}
        decoding="async"
      />
      <div className="artwork-haze" />
    </div>
  );
}
