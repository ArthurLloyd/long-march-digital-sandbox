import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Compass, Focus, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import type { LongMarchSceneProps } from '../../shared/contracts';
import { createSceneRenderer } from './scene-renderer';
import type { CameraAction, SceneRenderer } from './scene-renderer';
import { visibleEvents, visibleRoutes } from './scene-data';
import styles from './LongMarchScene.module.css';

export function LongMarchScene(props: LongMarchSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<SceneRenderer | null>(null);
  const callbacks = useRef(props);
  const [lowQuality, setLowQuality] = useState(false);
  const helpId = useId();
  const events = useMemo(() => visibleEvents(props.events), [props.events]);
  const routes = useMemo(() => visibleRoutes(props.routes), [props.routes]);
  const hasGeometry = events.length > 0 || routes.length > 0;
  const hasSchematic = routes.some((route) => route.displayMode === 'dashed');

  useEffect(() => {
    callbacks.current = props;
  }, [props]);
  useEffect(() => {
    if (!host.current) return;
    let active = true;
    try {
      renderer.current = createSceneRenderer(host.current, {
        ready: () => {
          if (active) callbacks.current.onSceneReady();
        },
        error: (error) => {
          if (active) callbacks.current.onSceneError(error);
        },
        select: (id) => callbacks.current.onEventSelect(id),
        quality: (low) => {
          if (active) setLowQuality(low);
        },
      });
      renderer.current?.update(callbacks.current);
    } catch {
      callbacks.current.onSceneError({
        code: 'render_failed',
        message: '三维展陈初始化失败，请重试。文字资料仍可阅读。',
      });
    }
    return () => {
      active = false;
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    renderer.current?.update({
      events: props.events,
      routes: props.routes,
      activeEventId: props.activeEventId,
      playbackProgress: props.playbackProgress,
    });
  }, [props.events, props.routes, props.activeEventId, props.playbackProgress]);

  const camera = (action: CameraAction) => renderer.current?.camera(action);
  return (
    <div
      className={styles.scene}
      data-content={hasGeometry ? 'geography' : 'art'}
    >
      <div
        ref={host}
        className={styles.canvasHost}
        data-view={hasGeometry ? 'data' : 'art'}
      />
      {!hasGeometry && (
        <div className={styles.artLabel} aria-hidden="true">
          <span>THE UNDYING EMBER</span>
          <strong>不 灭 · 火 种</strong>
          <i />
        </div>
      )}
      <div
        className={styles.controls}
        role="group"
        aria-label="三维相机与画质"
        aria-describedby={helpId}
      >
        <button
          type="button"
          onClick={() => camera('overview')}
          title="复位总览"
          aria-label="复位总览"
        >
          <RotateCcw size={17} />
        </button>
        <button
          type="button"
          onClick={() => camera('top')}
          title="俯瞰视角"
          aria-label="俯瞰视角"
        >
          <Focus size={17} />
        </button>
        <span className={styles.divider} />
        <button
          type="button"
          onClick={() => camera('zoom-in')}
          title="放大"
          aria-label="放大三维场景"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={() => camera('zoom-out')}
          title="缩小"
          aria-label="缩小三维场景"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={() => renderer.current?.quality(!lowQuality)}
          aria-pressed={lowQuality}
          title={lowQuality ? '当前为轻量画质，切换精细画质' : '切换轻量画质'}
          className={styles.quality}
        >
          <Sparkles size={15} />
          <span>{lowQuality ? '轻量' : '精细'}</span>
        </button>
      </div>
      <div className={styles.caption}>
        <p>
          <span className={styles.emberDot} />
          {hasGeometry
            ? '已发布坐标展示 · 平面投影，无地形高程'
            : '艺术化表现 / 非史实地图'}
        </p>
        {hasSchematic && (
          <p className={styles.schematic}>宏观示意，非真实行军路线</p>
        )}
        <p id={helpId} className={styles.help}>
          <Compass size={12} />
          拖动环顾 · 右键/双指平移 · 滚轮缩放
        </p>
      </div>
      {events.length > 0 && (
        <details className={styles.eventList}>
          <summary>
            已核验节点 <span>{events.length}</span>
          </summary>
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => props.onEventSelect(event.id)}
                  aria-pressed={props.activeEventId === event.id}
                >
                  <span>{event.title}</span>
                  <small>
                    {event.dateText} ·{' '}
                    {event.coordinatePrecision === 'exact'
                      ? '精确位置'
                      : event.coordinatePrecision === 'approximate'
                        ? '近似位置'
                        : '示意位置'}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
