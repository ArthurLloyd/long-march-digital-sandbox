import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HistoricalNavigation } from '../components/overlay/HistoricalNavigation';
import { RelatedHistoryLinks } from '../components/experience/RelatedHistoryLinks';
import { getPublishedDatasetV2 } from '../shared/utils/validate-dataset';
import { simulatePublishedC2 } from './fixtures/c2-sample';
import { emptyV2 } from './fixtures/v2-dataset';

function setup(input = simulatePublishedC2()) {
  const props = {
    dataset: getPublishedDatasetV2(input),
    topicId: 'fixture-topic',
    phaseId: 'c2-a2',
    onTopic: vi.fn(),
    onPhase: vi.fn(),
    onObjectSelect: vi.fn(),
    onEventAtPhase: vi.fn(),
  };
  render(<HistoricalNavigation {...props} />);
  return props;
}
describe('C2 公开专题与资料导航', () => {
  it('专题/阶段选择只通知时钟，主动事件带明确阶段交给统一入口', async () => {
    const user = userEvent.setup(),
      p = setup();
    await user.click(
      screen.getByRole('button', { name: '进入专题：工程专题甲（非史实）' }),
    );
    expect(p.onTopic).toHaveBeenCalledWith('fixture-topic');
    expect(p.onObjectSelect).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: /查看阶段：工程甲·重点入口/ }),
    );
    expect(p.onPhase).toHaveBeenCalledWith('c2-a2');
    await user.click(
      screen.getByRole('button', { name: /测试事件（非史实）/ }),
    );
    expect(p.onEventAtPhase).toHaveBeenCalledWith(
      'fixture-event',
      'fixture-topic',
      'c2-a2',
    );
  });
  it('人物和无坐标地点独立访问，保留位置未知说明', async () => {
    const user = userEvent.setup(),
      p = setup();
    await user.click(
      screen.getByRole('button', { name: '虚构测试条目（非历史人物）' }),
    );
    expect(p.onObjectSelect).toHaveBeenCalledWith({
      kind: 'person',
      id: 'fixture-person',
    });
    await user.click(
      screen.getByRole('button', { name: /测试占位（非历史地点）/ }),
    );
    expect(p.onObjectSelect).toHaveBeenCalledWith({
      kind: 'place',
      id: 'fixture-place',
    });
    expect(screen.getByText('位置未知 · 可阅读资料')).toBeInTheDocument();
  });
  it('未发布及撤回关联人物不因当前专题而出现', () => {
    const input = simulatePublishedC2();
    input.people[0]!.releaseStatus = 'unpublished';
    setup(input);
    expect(
      screen.queryByRole('button', { name: '虚构测试条目（非历史人物）' }),
    ).toBeNull();
  });
  it('撤回专题不进入目录，独立无坐标地点仍保留在全部目录', () => {
    const input = simulatePublishedC2();
    input.topics[0]!.releaseStatus = 'unpublished';
    setup(input);
    expect(screen.queryByText('工程专题甲（非史实）')).toBeNull();
    expect(screen.getByText('全部人物与地点资料')).toBeInTheDocument();
  });
  it('空目录明示核验，不以六个常量填充开放章节', () => {
    setup(emptyV2());
    expect(
      screen.getByText('历史专题正在核验，正式内容暂未开放。'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /进入专题/ })).toBeNull();
  });
  it('正文关联仅以已发布 ID 导航，地点说明区分现代对照与历史位置', async () => {
    const user = userEvent.setup(),
      data = getPublishedDatasetV2(simulatePublishedC2()),
      onNavigate = vi.fn();
    render(
      <RelatedHistoryLinks
        dataset={data}
        detail={{ kind: 'place', record: data.places[0]! }}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByText(/地点类型：现代对照地点/)).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('region', { name: '关联历史资料' })).getByRole(
        'button',
        { name: '测试事件（非史实）' },
      ),
    );
    expect(onNavigate).toHaveBeenCalledWith({
      type: 'open_object',
      selection: { kind: 'event', id: 'fixture-event' },
    });
  });
});
