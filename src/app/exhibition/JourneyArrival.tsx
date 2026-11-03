import { useEffect } from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';
/** Reading delay only: macro time is already paused at the exact event cue. */
export function JourneyArrival({
  eventId,
  title,
  onOpen,
  autoOpen = true,
}: {
  eventId: string;
  title: string;
  onOpen: (id: string) => void;
  autoOpen?: boolean;
}) {
  useEffect(() => {
    if (!autoOpen) return;
    const timer = setTimeout(() => onOpen(eventId), 3000);
    return () => clearTimeout(timer);
  }, [eventId, onOpen, autoOpen]);
  return (
    <button
      className="journey-arrival"
      data-map-obstacle="true"
      onClick={() => onOpen(eventId)}
      aria-label={`已到达${title}，点击阅读`}
    >
      <MapPin size={23} />
      <span>
        <strong>{title}</strong>
        <small>
          {autoOpen
            ? '已到达 · 点击阅读，三秒后自动展开'
            : '已到达 · 点击阅读全文，或继续观察战况'}
        </small>
      </span>
      <ArrowUpRight size={20} />
    </button>
  );
}
