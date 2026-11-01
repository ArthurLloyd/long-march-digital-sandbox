import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  EquivalentExperienceProps,
  HistoricalDetailProps,
  ImmersiveExperienceProps,
  LongMarchSceneV2Props,
  TeachingInteractionProps,
} from '../shared/contracts';

// Public-boundary probes only: these do not test A's rendering or B's historical content.
vi.mock('../features/scene', () => ({
  LongMarchScene: () => <p>旧场景探针</p>,
  LongMarchSceneV2: (props: LongMarchSceneV2Props) => (
    <>
      <output aria-label="阶段探针">{props.phaseId ?? 'none'}</output>
      <output aria-label="书签探针">
        {props.cameraBookmark?.sceneId ?? 'none'}
      </output>
      <button
        onClick={() =>
          props.onObjectSelect({ kind: 'place', id: 'fixture-place' })
        }
      >
        报告地点选择
      </button>
      <button
        onClick={() =>
          props.onCameraBookmark({
            sceneId: 'probe-scene',
            coordinateSystem: 'scene-local',
            position: [0, 1, 2],
            target: [0, 0, 0],
            zoom: 1,
            phaseId: props.phaseId,
          })
        }
      >
        报告相机书签
      </button>
    </>
  ),
  ImmersiveExperienceRenderer: (props: ImmersiveExperienceProps) => (
    <button
      onClick={() =>
        props.onTerminalReached({
          experienceId: props.manifest.experienceId,
          scriptVersion: props.manifest.scriptVersion,
          runId: props.command.runId,
          segmentId: props.manifest.terminalSegmentId,
        })
      }
    >
      报告演绎终点
    </button>
  ),
}));
vi.mock('../features/history', () => ({
  HistoryEventPanel: () => <p>旧资料探针</p>,
  HistoricalDetailPanel: (props: HistoricalDetailProps) => (
    <output aria-label="资料探针">{props.detail.kind}</output>
  ),
  TeachingInteraction: (props: TeachingInteractionProps) => (
    <>
      <button
        onClick={() =>
          props.onResponse(props.interaction.interactionId, {
            interactionType: 'observe_hotspots',
            visitedMaterialIds: ['fixture-material-0'],
          })
        }
      >
        报告观察操作
      </button>
      <button
        onClick={() =>
          props.onExplanationAcknowledged(props.interaction.interactionId)
        }
      >
        报告解释确认
      </button>
      <output aria-label="互动状态探针">
        {props.response?.interactionType ?? 'none'} /{' '}
        {String(props.explanationAcknowledged)}
      </output>
    </>
  ),
  EquivalentExperience: (props: EquivalentExperienceProps) => (
    <button onClick={() => props.onStepViewed(props.content.steps[0]!.stepId)}>
      报告等价步骤
    </button>
  ),
}));
import { ContractWorkbench } from './workbench/ContractWorkbench';

describe('工作台对未来 v2 公共组件的接线', () => {
  it('阶段、对象选择和相机输出可再作为输入，且不触及生产 App', () => {
    render(<ContractWorkbench />);
    fireEvent.change(screen.getByLabelText('历史阶段输入'), {
      target: { value: '' },
    });
    expect(screen.getByLabelText('阶段探针')).toHaveTextContent('none');
    fireEvent.click(screen.getByRole('button', { name: '报告地点选择' }));
    expect(screen.getByLabelText('回调日志')).toHaveTextContent(
      'fixture-place',
    );
    fireEvent.click(screen.getByRole('button', { name: '报告相机书签' }));
    fireEvent.click(screen.getByRole('button', { name: '应用最近相机书签' }));
    expect(screen.getByLabelText('书签探针')).toHaveTextContent('probe-scene');
    fireEvent.change(screen.getByLabelText('测试模块'), {
      target: { value: 'renderer' },
    });
    fireEvent.click(screen.getByRole('button', { name: '报告演绎终点' }));
    expect(screen.getByLabelText('回调日志')).toHaveTextContent(
      'terminalReached（不是完成）',
    );
    expect(
      screen.queryByRole('button', { name: '完成体验，阅读资料' }),
    ).toBeNull();
  });
  it('人物/地点详情按类型接线，教学输入由工作台保存并回传', () => {
    render(<ContractWorkbench />);
    fireEvent.change(screen.getByLabelText('测试模块'), {
      target: { value: 'history' },
    });
    for (const kind of ['person', 'place', 'topic']) {
      fireEvent.change(screen.getByLabelText('资料对象'), {
        target: { value: kind },
      });
      expect(screen.getByLabelText('资料探针')).toHaveTextContent(kind);
    }
    fireEvent.change(screen.getByLabelText('测试模块'), {
      target: { value: 'teaching' },
    });
    fireEvent.click(screen.getByRole('button', { name: '报告观察操作' }));
    fireEvent.click(screen.getByRole('button', { name: '报告解释确认' }));
    expect(screen.getByLabelText('互动状态探针')).toHaveTextContent(
      'observe_hotspots / true',
    );
    fireEvent.change(screen.getByLabelText('测试模块'), {
      target: { value: 'equivalent' },
    });
    fireEvent.click(screen.getByRole('button', { name: '报告等价步骤' }));
    expect(screen.getByLabelText('回调日志')).toHaveTextContent(
      'equivalent.stepViewed',
    );
  });
});
