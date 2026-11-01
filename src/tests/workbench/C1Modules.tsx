import { useEffect } from 'react';
import type {
  EquivalentExperienceProps,
  HistoricalDetailProps,
  ImmersiveExperienceProps,
  TeachingInteractionProps,
  LongMarchSceneV2Props,
} from '../../shared/contracts';
import { responseFor } from '../fixtures/c1-driver';

export function EngineeringRenderer(props: ImmersiveExperienceProps) {
  const run = {
    experienceId: props.manifest.experienceId,
    scriptVersion: props.manifest.scriptVersion,
    runId: props.command.runId,
  };
  const index = props.manifest.segmentIds.indexOf(props.command.segmentId);
  return (
    <section aria-label="合成渲染器探针">
      <p>
        工程模拟，没有三维历史场景。当前命令：
        <output aria-label="渲染播放命令">{props.command.playback}</output>
      </p>
      <button className="outlined-button" onClick={() => props.onReady(run)}>
        工程：报告准备完成
      </button>
      <button
        className="outlined-button"
        onClick={() =>
          props.onSegmentReached({ ...run, segmentId: props.command.segmentId })
        }
      >
        工程：报告当前段落
      </button>
      <button
        className="outlined-button"
        disabled={index === props.segments.length - 1}
        onClick={() =>
          props.onSegmentReached({
            ...run,
            segmentId: props.manifest.segmentIds[index + 1]!,
          })
        }
      >
        工程：前进一段
      </button>
      {props.segments[index]?.interactionIds.map((interactionId) => (
        <button
          className="outlined-button"
          key={interactionId}
          onClick={() =>
            props.onInteractionCue({
              ...run,
              segmentId: props.command.segmentId,
              interactionId,
            })
          }
        >
          工程：触发 {interactionId}
        </button>
      ))}
      <button
        className="outlined-button"
        onClick={() =>
          props.onTerminalReached({
            ...run,
            segmentId: props.manifest.terminalSegmentId,
          })
        }
      >
        工程：报告终点
      </button>
      <button
        className="outlined-button"
        onClick={() =>
          props.onError({
            ...run,
            error: {
              code: 'webgl_unavailable',
              message: '工程模拟 WebGL 不可用',
              retryable: true,
            },
          })
        }
      >
        工程：模拟 WebGL 故障
      </button>
    </section>
  );
}
export function EngineeringTeaching(props: TeachingInteractionProps) {
  return (
    <section aria-label="合成教学探针">
      <p>{props.interaction.prompt}</p>
      <p>此按钮仅模拟 B 的完整响应，不代表真实教学内容或历史操作。</p>
      <button
        className="outlined-button"
        onClick={() =>
          props.onResponse(
            props.interaction.interactionId,
            responseFor(props.interaction),
          )
        }
      >
        工程：提交完整互动响应
      </button>
      <button
        className="text-button"
        onClick={() =>
          props.onExplanationAcknowledged(props.interaction.interactionId)
        }
      >
        工程：报告解释确认
      </button>
    </section>
  );
}
export function EngineeringEquivalent(props: EquivalentExperienceProps) {
  const step = props.content.steps.find((r) => r.stepId === props.activeStepId);
  return (
    <section aria-label="合成等价内容">
      <p>{step?.text}</p>
    </section>
  );
}
export function EngineeringDetails(props: HistoricalDetailProps) {
  return (
    <article>
      <h3>工程正文（非史实）</h3>
      <p>
        {'detail' in props.detail.record
          ? props.detail.record.detail
          : props.detail.record.summary}
      </p>
      <button className="text-button" onClick={props.onClose}>
        关闭工程正文
      </button>
    </article>
  );
}
export function EngineeringMap(props: LongMarchSceneV2Props) {
  const { onSceneReady } = props;
  useEffect(() => onSceneReady(), [onSceneReady]);
  return (
    <section aria-label="工程地图探针">
      <p>工程控件，不代表真实地形或历史位置。</p>
      <button
        className="outlined-button"
        onClick={() => {
          const id = props.events[0]?.id;
          if (id) props.onObjectSelect({ kind: 'event', id });
        }}
      >
        工程：打开地图事件
      </button>
      <button
        className="outlined-button"
        onClick={() =>
          props.onCameraBookmark({
            sceneId: 'engineering-map',
            coordinateSystem: 'scene-local',
            position: [1, 2, 3],
            target: [0, 0, 0],
            zoom: 1,
            phaseId: props.phaseId,
          })
        }
      >
        工程：报告地图书签
      </button>
      <output aria-label="工程地图书签">
        {props.cameraBookmark?.sceneId ?? 'none'}
      </output>
    </section>
  );
}
