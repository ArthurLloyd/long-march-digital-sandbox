import type { MapEventEntry } from '../history/event-map/event-map-selectors';
const CROSSING_CAPTIONS: Record<string, string> = {
  'pl-sd1-tucheng': '一渡赤水 · 土城',
  'pl-sd1-yuanhou': '猿猴场渡河（同属一渡）',
  'pl-sd-2-taiping': '二渡赤水 · 太平渡',
  'pl-sd-2-erlang': '二郎滩渡河（同属二渡）',
  'pl-sd-4-taiping': '四渡赤水 · 太平渡',
  'pl-sd-4-erlang': '二郎滩渡河（同属四渡）',
};
/** Separate the event from its multiple placename references, keeping all source records. */
export function eventMarkerCaption(entry: MapEventEntry) {
  if (entry.eventId === 'event-zy-resolution') return '扎西会议 · 决议与整编';
  return (
    CROSSING_CAPTIONS[entry.placementId] ??
    entry.displayLabel ??
    entry.event.title
  );
}
