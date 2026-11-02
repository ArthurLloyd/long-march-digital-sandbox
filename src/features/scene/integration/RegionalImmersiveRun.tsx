import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ExperienceSegment,
  ImmersiveExperienceProps,
  InteractionId,
} from '../../../shared/contracts';
import { requiredInteractionsFor } from '../../../shared/contracts';
import type { RegionId } from '../atlas/regions';
import { createRegionalWorld, type RegionalView } from './regional-world';
import './integrated-scene.css';
import './regional-observation.css';

const REGIONAL_EXPERIENCES = {
  'exp-zunyi-conference': 'zunyi',
  'exp-sidu-chishui': 'chishui',
  'exp-qiaodu-jinshajiang': 'jinsha',
  'exp-crossing-snow-mountains': 'snow',
  'exp-crossing-grasslands': 'grass',
} as const;
type Props = ImmersiveExperienceProps & { regionId: RegionId };
type PendingAction = {
  segmentId: string;
  interactionId?: InteractionId;
  terminal?: boolean;
};

function suppliedSegment(props: Props, segmentId: string) {
  if (!props.manifest.segmentIds.includes(segmentId)) return undefined;
  return props.segments.find(
    (segment) =>
      segment.segmentId === segmentId &&
      segment.experienceId === props.manifest.experienceId,
  );
}
function validInput(props: Props) {
  const expected =
    REGIONAL_EXPERIENCES[
      props.manifest.experienceId as keyof typeof REGIONAL_EXPERIENCES
    ];
  if (expected !== props.regionId) return false;
  const permittedInteractions = requiredInteractionsFor(
    props.manifest.experienceId,
  );
  const suppliedSegments = props.manifest.segmentIds.map((id) =>
    suppliedSegment(props, id),
  );
  return (
    props.manifest.segmentIds.length > 0 &&
    new Set(props.manifest.segmentIds).size ===
      props.manifest.segmentIds.length &&
    props.manifest.requiredInteractionIds.length ===
      permittedInteractions.length &&
    new Set(props.manifest.requiredInteractionIds).size ===
      permittedInteractions.length &&
    props.manifest.requiredInteractionIds.every((id) =>
      permittedInteractions.includes(id),
    ) &&
    suppliedSegments.every(
      (segment) =>
        segment &&
        segment.interactionIds.every((id) =>
          permittedInteractions.includes(id),
        ),
    ) &&
    permittedInteractions.every((id) =>
      suppliedSegments.some((segment) => segment?.interactionIds.includes(id)),
    ) &&
    suppliedSegment(props, props.command.segmentId) !== undefined &&
    props.manifest.segmentIds.at(-1) === props.manifest.terminalSegmentId &&
    suppliedSegment(props, props.manifest.terminalSegmentId)?.kind ===
      'conclusion'
  );
}
function segmentView(segment: ExperienceSegment): RegionalView {
  switch (segment.kind) {
    case 'process':
      return 'company';
    case 'observation':
    case 'conclusion':
      return 'landscape';
    case 'interaction':
      return 'detail';
    default:
      return 'arrival';
  }
}

/** Formal C1 adapter. C owns progress, questions, responses and completion. */
export function RegionalImmersiveRun(props: Props) {
  return (
    <RegionalRun
      key={`${props.regionId}:${props.manifest.experienceId}:${props.manifest.scriptVersion}:${props.command.runId}`}
      {...props}
    />
  );
}

function RegionalRun(props: Props) {
  const hasAiBackdrop = ['snow', 'grass', 'chishui', 'jinsha'].includes(
    props.regionId,
  );
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<ReturnType<typeof createRegionalWorld> | null>(null);
  const latest = useRef(props);
  const loaded = useRef(false);
  const failed = useRef(false);
  const lastReached = useRef<string | null>(null);
  const awaitingCommand = useRef<string | null>(null);
  const pending = useRef<PendingAction | null>(null);
  const initialCommand = useRef(props.command.segmentId);
  const terminalReported = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [observedSegment, setObservedSegment] = useState<string | null>(null);
  const [cued, setCued] = useState<Set<InteractionId>>(new Set());
  const [finished, setFinished] = useState(false);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const report = () => ({
    experienceId: latest.current.manifest.experienceId,
    scriptVersion: latest.current.manifest.scriptVersion,
    runId: latest.current.command.runId,
  });

  useEffect(() => {
    let disposed = false;
    const fail = (
      code: 'media_unavailable' | 'webgl_unavailable' | 'render_failed',
      message: string,
      retryable: boolean,
    ) => {
      if (disposed || failed.current) return;
      failed.current = true;
      loaded.current = false;
      setReady(false);
      latest.current.onError({
        ...report(),
        error: { code, message, retryable },
      });
    };
    if (!validInput(props)) {
      queueMicrotask(() =>
        fail(
          'media_unavailable',
          '此场景的段落内容未完整提供，请使用图文体验。',
          false,
        ),
      );
      return () => {
        disposed = true;
      };
    }
    try {
      const scene = createRegionalWorld(host.current!, props.regionId, {
        reducedMotion: props.command.reducedMotion,
        onReady: () => {
          if (disposed || loaded.current || failed.current) return;
          loaded.current = true;
          setReady(true);
          latest.current.onReady(report());
        },
        onRendered: () => {
          const p = latest.current;
          if (
            disposed ||
            !loaded.current ||
            failed.current ||
            document.hidden ||
            p.command.playback !== 'playing' ||
            !validInput(p)
          )
            return;
          if (
            awaitingCommand.current &&
            p.command.segmentId !== awaitingCommand.current
          )
            return;
          const action = pending.current;
          const segment = suppliedSegment(
            p,
            action?.segmentId ?? p.command.segmentId,
          );
          if (!segment) return;
          const base = { ...report(), segmentId: segment.segmentId };
          pending.current = null;
          setBusy(false);
          setObservedSegment(segment.segmentId);
          if (lastReached.current !== segment.segmentId) {
            lastReached.current = segment.segmentId;
            if (p.command.segmentId !== segment.segmentId)
              awaitingCommand.current = segment.segmentId;
            p.onSegmentReached(base);
          }
          if (
            action?.interactionId &&
            segment.interactionIds.includes(action.interactionId) &&
            p.manifest.requiredInteractionIds.includes(action.interactionId)
          ) {
            const interactionId = action.interactionId;
            setCued((value) => new Set([...value, interactionId]));
            p.onInteractionCue({ ...base, interactionId });
          }
          if (
            action?.terminal &&
            !terminalReported.current &&
            segment.segmentId === p.manifest.terminalSegmentId
          ) {
            terminalReported.current = true;
            setFinished(true);
            p.onTerminalReached(base);
          }
        },
        onError: (error) => fail('render_failed', error.message, true),
      });
      api.current = scene;
      scene.setPaused(true);
      scene.quality(props.command.quality === 'low');
      const segment = suppliedSegment(props, props.command.segmentId);
      if (segment) scene.setView(segmentView(segment));
      const bookmark = props.cameraBookmark;
      if (
        bookmark?.sceneId === `regional-art-space-${props.regionId}` &&
        bookmark.phaseId === null
      )
        scene.restore(bookmark);
    } catch {
      queueMicrotask(() =>
        fail(
          'webgl_unavailable',
          '当前设备暂时无法打开三维空间，可重试或选择图文体验。',
          true,
        ),
      );
    }
    return () => {
      disposed = true;
      loaded.current = false;
      pending.current = null;
      api.current?.dispose();
      api.current = null;
    };
    // The keyed wrapper creates one renderer per C run, never per playback command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.setReducedMotion(props.command.reducedMotion);
    api.current?.setPaused(
      props.command.playback !== 'playing' || props.command.reducedMotion,
    );
  }, [props.command.playback, props.command.reducedMotion]);
  useEffect(() => {
    api.current?.quality(props.command.quality === 'low');
  }, [props.command.quality]);
  useEffect(() => {
    if (initialCommand.current === props.command.segmentId) return;
    initialCommand.current = props.command.segmentId;
    pending.current = null;
    awaitingCommand.current = null;
    const segment = suppliedSegment(props, props.command.segmentId);
    if (segment && lastReached.current !== segment.segmentId)
      api.current?.setView(segmentView(segment));
  }, [props]);

  const current = suppliedSegment(props, props.command.segmentId);
  const index = props.manifest.segmentIds.indexOf(props.command.segmentId);
  const missingCue = current?.interactionIds.find(
    (id) => props.manifest.requiredInteractionIds.includes(id) && !cued.has(id),
  );
  const active =
    ready &&
    !busy &&
    !finished &&
    observedSegment === props.command.segmentId &&
    props.command.playback === 'playing' &&
    validInput(props);
  const remember = () => {
    const bookmark = api.current?.bookmark();
    if (bookmark)
      props.onCameraBookmark({
        ...report(),
        bookmark: {
          ...bookmark,
          sceneId: `regional-art-space-${props.regionId}`,
          coordinateSystem: 'scene-local',
          phaseId: null,
        },
      });
  };
  const advance = () => {
    if (!active || !current) return;
    remember();
    if (missingCue) {
      pending.current = {
        segmentId: current.segmentId,
        interactionId: missingCue,
      };
      setBusy(true);
      api.current?.setView('detail');
      return;
    }
    if (current.segmentId === props.manifest.terminalSegmentId) {
      pending.current = { segmentId: current.segmentId, terminal: true };
      setBusy(true);
      return;
    }
    const nextId = props.manifest.segmentIds[index + 1];
    const next = nextId ? suppliedSegment(props, nextId) : undefined;
    if (next) {
      pending.current = { segmentId: next.segmentId };
      setBusy(true);
      api.current?.setView(segmentView(next));
    }
  };
  return (
    <section
      className="integrated-immersive"
      aria-label="历史专题三维空间观察"
      data-run-id={props.command.runId}
      data-region={props.regionId}
    >
      <div ref={host} className="integrated-immersive-canvas" />
      <div className="integrated-immersive-caption">
        <small>
          {hasAiBackdrop
            ? '空间观察 · AI 远景 · 艺术再现'
            : '空间观察 · 艺术再现'}
        </small>
        <h3>{current?.title ?? '空间观察'}</h3>
      </div>
      <div className="integrated-immersive-actions">
        <details className="regional-formal-notice">
          <summary>画面说明</summary>
          <p>
            人物与环境为艺术塑造，不代表历史实测；史料见下方正文。
            {hasAiBackdrop
              ? '远景复用 MiniMax 生成的环境图，非历史照片；全景背面仍可见接缝，尚未通过无缝验收。'
              : ''}
          </p>
        </details>
        <button disabled={!active} onClick={advance}>
          {finished
            ? '空间观察已结束'
            : missingCue
              ? '观察并打开互动材料'
              : current?.segmentId === props.manifest.terminalSegmentId
                ? '结束空间观察'
                : '继续观察下一段'}
        </button>
        <button
          onClick={() => {
            remember();
            props.onExitRequested(report());
          }}
        >
          返回地图
        </button>
      </div>
    </section>
  );
}
