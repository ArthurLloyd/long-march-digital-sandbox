import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ImmersiveExperienceProps,
  ExperienceSegment,
} from '../../shared/contracts';
import { createBridgeStudy } from './prototype/bridge-renderer';
import { createAmbience } from './prototype/ambience';
import './integration/integrated-scene.css';

const SUPPORTED = 'exp-feiduo-ludingqiao';
/** C owns the run, completion and interactions. This module reports only rendered/user-observed work. */
export function ImmersiveExperienceRenderer(props: ImmersiveExperienceProps) {
  return (
    <ImmersiveRun
      key={`${props.manifest.experienceId}:${props.manifest.scriptVersion}:${props.command.runId}`}
      {...props}
    />
  );
}
function ImmersiveRun(props: ImmersiveExperienceProps) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<ReturnType<typeof createBridgeStudy> | null>(null),
    latest = useRef(props);
  const loaded = useRef(false),
    lastReached = useRef(''),
    pending = useRef<ExperienceSegment | null>(null),
    cue = useRef<string | null>(null),
    terminal = useRef(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false),
    [cued, setCued] = useState<Set<string>>(new Set());
  const audio = useRef<ReturnType<typeof createAmbience> | null>(null),
    audible = useRef(false);
  const initial = useRef(props.command.segmentId);
  const report = () => ({
    experienceId: latest.current.manifest.experienceId,
    scriptVersion: latest.current.manifest.scriptVersion,
    runId: latest.current.command.runId,
  });
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    let disposed = false;
    if (props.manifest.experienceId !== SUPPORTED) {
      queueMicrotask(() => {
        if (!disposed)
          latest.current.onError({
            ...report(),
            error: {
              code: 'media_unavailable',
              message: '此专题的三维场景尚未接入，请使用现有图文内容。',
              retryable: false,
            },
          });
      });
      return () => {
        disposed = true;
      };
    }
    try {
      const scene = createBridgeStudy(host.current!, {
        reduced: props.command.reducedMotion,
        showCompany: false,
        onFrame: () => {},
        onMetrics: () => {},
        onReady: () => {
          if (disposed) return;
          loaded.current = true;
          setReady(true);
          latest.current.onReady(report());
        },
        onRendered: () => {
          if (
            disposed ||
            !loaded.current ||
            latest.current.command.playback !== 'playing'
          )
            return;
          const p = latest.current;
          const segment =
            pending.current ??
            p.segments.find(
              (s) =>
                s.segmentId === p.command.segmentId &&
                s.experienceId === p.manifest.experienceId,
            );
          if (!segment || !p.manifest.segmentIds.includes(segment.segmentId))
            return;
          const base = { ...report(), segmentId: segment.segmentId };
          setBusy(false);
          if (lastReached.current !== segment.segmentId) {
            lastReached.current = segment.segmentId;
            p.onSegmentReached(base);
            pending.current = null;
          }
          if (cue.current) {
            const id = segment.interactionIds.find((id) => id === cue.current);
            cue.current = null;
            if (id) p.onInteractionCue({ ...base, interactionId: id });
          }
          if (terminal.current) {
            terminal.current = false;
            if (segment.segmentId === p.manifest.terminalSegmentId)
              p.onTerminalReached(base);
          }
        },
        onError: (message) => {
          if (!disposed)
            latest.current.onError({
              ...report(),
              error: { code: 'render_failed', message, retryable: true },
            });
        },
      });
      api.current = scene;
      scene.setPaused(true);
      scene.pose(0);
      scene.quality(props.command.quality === 'low');
      const bookmark = props.cameraBookmark;
      if (bookmark?.sceneId === 'luding-art-space' && bookmark.phaseId === null)
        scene.restore(bookmark);
      audio.current = createAmbience();
    } catch {
      queueMicrotask(() => {
        if (!disposed)
          latest.current.onError({
            ...report(),
            error: {
              code: 'webgl_unavailable',
              message: '当前设备无法加载三维桥谷，可返回后重试或选择图文体验。',
              retryable: true,
            },
          });
      });
    }
    return () => {
      disposed = true;
      loaded.current = false;
      api.current?.dispose();
      api.current = null;
      audio.current?.dispose();
      audio.current = null;
    };
    // A new run remounts this component; subsequent commands never recreate its WebGL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    api.current?.setPaused(
      props.command.playback !== 'playing' || props.command.reducedMotion,
    );
  }, [props.command.playback, props.command.reducedMotion]);
  useEffect(() => {
    api.current?.quality(props.command.quality === 'low');
  }, [props.command.quality]);
  useEffect(() => {
    if (props.command.segmentId === initial.current) return;
    initial.current = props.command.segmentId;
    const index = props.manifest.segmentIds.indexOf(props.command.segmentId);
    if (index < 0) return;
    if (lastReached.current !== props.command.segmentId) {
      api.current?.pose(Math.min(index, 3));
      pending.current =
        props.segments.find((s) => s.segmentId === props.command.segmentId) ??
        null;
    }
  }, [props.command.segmentId, props.manifest.segmentIds, props.segments]);
  useEffect(() => {
    const shouldPlay =
      !props.command.muted && props.command.playback === 'playing';
    if (shouldPlay !== audible.current && audio.current) {
      audible.current = shouldPlay;
      void audio.current.toggle().catch(() => {
        audible.current = false;
      });
    }
  }, [props.command.muted, props.command.playback]);
  const segment = props.segments.find(
    (s) => s.segmentId === props.command.segmentId,
  );
  const index = props.manifest.segmentIds.indexOf(props.command.segmentId);
  const active = ready && !busy && props.command.playback === 'playing';
  const current = props.segments.find(
    (s) => s.segmentId === props.command.segmentId,
  );
  const missingCue = current?.interactionIds.find((id) => !cued.has(id));
  const remember = () => {
    const pose = api.current?.bookmark();
    if (pose)
      props.onCameraBookmark({
        ...report(),
        bookmark: {
          ...pose,
          sceneId: 'luding-art-space',
          coordinateSystem: 'scene-local',
          phaseId: null,
        },
      });
  };
  const advance = () => {
    if (!active || !current) return;
    remember();
    setBusy(true);
    if (missingCue) {
      api.current?.focusSpot(missingCue === 'ld-01' ? 'bridge' : 'banks');
      cue.current = missingCue;
      setCued((value) => new Set([...value, missingCue]));
      return;
    }
    if (current.segmentId === props.manifest.terminalSegmentId) {
      terminal.current = true;
      return;
    }
    const next = props.segments.find(
      (s) => s.segmentId === props.manifest.segmentIds[index + 1],
    );
    if (next) {
      pending.current = next;
      api.current?.pose(Math.min(index + 1, 3));
    }
  };
  return (
    <section
      className="integrated-immersive"
      aria-label="泸定桥三维空间观察"
      data-run-id={props.command.runId}
    >
      <div ref={host} className="integrated-immersive-canvas" />
      <div className="integrated-immersive-caption">
        <small>空间观察 · 艺术表达</small>
        <h3>{segment?.title ?? '大渡河谷'}</h3>
      </div>
      <div className="integrated-immersive-actions">
        <small>拖动环顾 · 桥体与环境为艺术空间，史料见下方正文</small>
        <button disabled={!active} onClick={advance}>
          {missingCue
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
