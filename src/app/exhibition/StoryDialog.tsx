import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { BookOpen, Pin, PinOff, X } from 'lucide-react';
import type {
  HistoricalPerson,
  HistoryEvent,
  HistoryDatasetV2,
} from '../../shared/contracts';
import {
  readingCopy,
  personBiography,
  portraitCaption,
  eventNarrative,
  teachingKnowledge,
} from './story-display';
import { ExhibitionDrawer } from '../../components/overlay/ExhibitionDrawer';

export function StoryDialog({
  event,
  dataset,
  onClose,
  onContinue,
  onSources,
  returnFocusRef,
  extension,
  onRelated,
}: {
  extension?: { paragraphs: string[]; sourceIds: string[] };
  onRelated: (id: string) => void;
  event: HistoryEvent;
  dataset: HistoryDatasetV2;
  onClose: () => void;
  onContinue?: () => void;
  onSources: (ids: string[]) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [person, setPerson] = useState<HistoricalPerson | null>(null);
  const [pinned, setPinned] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    maxHeight: 560,
    width: 440,
  });
  const opener = useRef<HTMLButtonElement | null>(null);
  const hover = useRef<ReturnType<typeof setTimeout> | null>(null);
  const section = useRef<HTMLDivElement>(null);
  const restoringFocus = useRef(false);
  const cancelHover = () => {
    if (hover.current) clearTimeout(hover.current);
    hover.current = null;
  };
  useEffect(
    () => () => {
      if (hover.current) clearTimeout(hover.current);
    },
    [],
  );
  const showPerson = (
    record: HistoricalPerson,
    element: HTMLButtonElement,
    pin = false,
  ) => {
    cancelHover();
    const r = element.getBoundingClientRect();
    const dialog = section.current
      ?.closest('[role="dialog"]')
      ?.getBoundingClientRect();
    const leftBound = Math.max(24, (dialog?.left ?? 0) + 16),
      rightBound = Math.min(
        innerWidth - 24,
        (dialog?.right ?? innerWidth) - 16,
      );
    const rightSpace = rightBound - r.right - 14,
      leftSpace = r.left - 14 - leftBound;
    const side = rightSpace >= leftSpace ? 'right' : 'left';
    const width = Math.min(
      440,
      Math.max(300, Math.max(rightSpace, leftSpace)),
      rightBound - leftBound,
    );
    const left =
      side === 'right'
        ? Math.min(rightBound - width, r.right + 14)
        : Math.max(leftBound, r.left - 14 - width);
    const topBound = (dialog?.top ?? 0) + 90,
      bottomBound = Math.min(
        innerHeight - 24,
        (dialog?.bottom ?? innerHeight) - 16,
      );
    const maxHeight = Math.max(160, Math.min(560, bottomBound - topBound));
    setPosition({
      left: left - (dialog?.left ?? 0),
      top:
        Math.max(topBound, Math.min(bottomBound - maxHeight, r.top - 40)) -
        (dialog?.top ?? 0),
      maxHeight,
      width,
    });
    opener.current = element;
    setPerson(record);
    setPinned(pin);
  };
  const closePerson = () => {
    cancelHover();
    setPerson(null);
    setPinned(false);
    restoringFocus.current = true;
    opener.current?.focus({ preventScroll: true });
    queueMicrotask(() => {
      restoringFocus.current = false;
    });
  };
  useEffect(() => {
    if (!person) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (hover.current) clearTimeout(hover.current);
      setPerson(null);
      setPinned(false);
      restoringFocus.current = true;
      opener.current?.focus({ preventScroll: true });
      queueMicrotask(() => {
        restoringFocus.current = false;
      });
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, [person]);
  const names = dataset.people
    .filter((p) => p.reviewStatus !== 'rejected')
    .sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(
    `(${names.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g',
  );
  const renderPeople = (text: string): ReactNode =>
    text.split(pattern).map((part, index) => {
      const record = names.find((p) => p.name === part);
      if (!record) return part;
      return (
        <button
          key={index}
          className="story-person-name"
          aria-haspopup="dialog"
          aria-expanded={person?.personId === record.personId}
          onMouseEnter={(e) => {
            if (pinned) return;
            const target = e.currentTarget;
            cancelHover();
            hover.current = setTimeout(() => showPerson(record, target), 180);
          }}
          onMouseLeave={() => {
            if (!pinned) {
              cancelHover();
              hover.current = setTimeout(() => setPerson(null), 180);
            }
          }}
          onFocus={(e) => {
            if (!pinned && !restoringFocus.current)
              showPerson(record, e.currentTarget);
          }}
          onClick={(e) => showPerson(record, e.currentTarget, true)}
        >
          {part}
        </button>
      );
    });
  const baseParagraphs = [
    ...eventNarrative(event),
    ...(extension?.paragraphs.map(readingCopy).filter(Boolean) ?? []),
  ];
  const knowledge = teachingKnowledge(event, dataset, baseParagraphs);
  const paragraphs = [...baseParagraphs, ...knowledge.paragraphs];
  const photo =
    person &&
    dataset.assets.find(
      (a) =>
        a.assetId !== failedPhoto &&
        a.assetType === 'historical_photo' &&
        a.rightsStatus === 'cleared' &&
        a.reviewStatus !== 'rejected' &&
        a.relatedPersonIds.includes(person.personId) &&
        person.assetIds.includes(a.assetId) &&
        /^\/assets\/archive\/[\w./-]+$/.test(a.filePath) &&
        !a.filePath.includes('..'),
    );
  return (
    <ExhibitionDrawer
      title={event.title}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      className="journey-story-dialog"
    >
      <div
        ref={section}
        className="story-reading"
        onKeyDownCapture={(e) => {
          if (e.key === 'Escape' && person) {
            e.preventDefault();
            e.stopPropagation();
            closePerson();
          }
        }}
      >
        <div className="story-context">
          <time>{event.dateText}</time>
          <span>{event.locationName}</span>
        </div>
        <div className="story-body">
          <p className="story-lead">
            {renderPeople(readingCopy(event.summary))}
          </p>
          {paragraphs.map((p, i) => (
            <p key={i}>{renderPeople(p)}</p>
          ))}
        </div>
        <footer className="story-actions">
          <button
            onClick={() =>
              onSources([
                ...new Set([
                  ...event.sourceIds,
                  ...(extension?.sourceIds ?? []),
                  ...knowledge.sourceIds,
                ]),
              ])
            }
          >
            <BookOpen size={16} />
            资料来源
          </button>
          <button onClick={onContinue ?? onClose}>返回地图，继续行军</button>
        </footer>
        {person && (
          <aside
            className="story-person-card"
            role="dialog"
            aria-label={`人物：${person.name}`}
            style={position}
            onMouseEnter={cancelHover}
            onMouseLeave={() => {
              if (!pinned) {
                cancelHover();
                hover.current = setTimeout(() => setPerson(null), 180);
              }
            }}
          >
            <header>
              <h3>{person.name}</h3>
              <button aria-label="关闭人物卡" onClick={closePerson}>
                <X size={17} />
              </button>
            </header>
            {photo ? (
              <figure>
                <img
                  src={photo.filePath}
                  alt={`${person.name}真实肖像`}
                  onError={() => {
                    setFailedPhoto(photo.assetId);
                  }}
                />
                <figcaption>{portraitCaption(photo)}</figcaption>
              </figure>
            ) : (
              <div
                className="person-text-portrait"
                aria-label="暂无可用的已明确授权照片"
              >
                {person.name}
              </div>
            )}
            <p className="person-current-role">
              {paragraphs
                .flatMap((p) => p.split('。'))
                .find((p) => p.includes(person.name)) ??
                readingCopy(person.summary)}
            </p>
            <p>{personBiography(person)}</p>
            <details>
              <summary>相关历史故事</summary>
              {dataset.events
                .filter(
                  (e) =>
                    person.relatedEventIds.includes(e.id) && e.id !== event.id,
                )
                .map((e) => (
                  <button key={e.id} onClick={() => onRelated(e.id)}>
                    {e.title}
                  </button>
                ))}
            </details>
            <div className="person-card-actions">
              <button onClick={() => setPinned(!pinned)}>
                {pinned ? <PinOff size={15} /> : <Pin size={15} />}{' '}
                {pinned ? '取消固定' : '固定人物卡'}
              </button>
              <button
                onClick={() =>
                  onSources([
                    ...new Set([
                      ...person.sourceIds,
                      ...(photo?.sourceIds ?? []),
                    ]),
                  ])
                }
              >
                人物出处
              </button>
            </div>
          </aside>
        )}
      </div>
    </ExhibitionDrawer>
  );
}
