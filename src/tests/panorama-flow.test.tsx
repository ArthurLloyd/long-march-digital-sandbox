import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import original from '../data/verified/dataset.json';
import { normalizeDataset } from '../shared/contracts';
import { validateDataset } from '../shared/utils/validate-dataset';
import { PanoramaApp } from '../app/panorama/PanoramaApp';

const camera = vi.hoisted(() => ({
  focus: vi.fn(),
  overview: vi.fn(),
  zoom: vi.fn(),
  bookmark: vi.fn(() => ({
    sceneId: 'long-march-modern-panorama',
    position: [1, 2, 3],
    target: [0, 0, 0],
  })),
  restore: vi.fn(),
  setRoutes: vi.fn(),
  setRivers: vi.fn(),
  setVerticalExaggeration: vi.fn(),
  suspend: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('../app/panorama/MapCanvas', async () => {
  const React = await import('react');
  return {
    MapCanvas: ({ onAdapter }: { onAdapter: (api: typeof camera) => void }) => {
      React.useEffect(() => onAdapter(camera), [onAdapter]);
      return <div>地图边界测试替身（不声称 WebGL 验收）</div>;
    },
  };
});
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
const candidate = () => normalizeDataset(validateDataset(original));
describe('全景原型真实导航与沉浸插槽', () => {
  it('瑞金开始、四渡切换和镜头取景共用阶段，双阵营独立显隐', async () => {
    const user = userEvent.setup();
    render(<PanoramaApp candidate={candidate()} />);
    const nav = within(screen.getByRole('navigation', { name: '重要事件' }));
    await user.click(screen.getByText('地图图层'));
    await user.selectOptions(
      screen.getByRole('combobox', { name: '地势表现强度' }),
      '24',
    );
    expect(camera.setVerticalExaggeration).toHaveBeenLastCalledWith(24);
    await user.selectOptions(
      screen.getByRole('combobox', { name: '地势表现强度' }),
      '1',
    );
    expect(camera.setVerticalExaggeration).toHaveBeenLastCalledWith(1);
    expect(nav.getByRole('button', { name: /瑞金出发/ })).toHaveAttribute(
      'aria-current',
      'location',
    );
    await user.click(nav.getByRole('button', { name: /四渡赤水/ }));
    expect(
      screen.queryByRole('button', { name: /4.*四渡.*渡口待核/ }),
    ).toBeNull();
    await user.click(
      screen.getByRole('button', { name: '收起一渡赤水电影题字' }),
    );
    expect(
      screen.getByRole('heading', { name: '一渡赤水' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /一渡双阵营/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /4.*四渡.*渡口待核/ }));
    await user.click(
      screen.getByRole('button', { name: '收起四渡赤水电影题字' }),
    );
    expect(
      screen.getByRole('heading', { name: '四渡赤水' }),
    ).toBeInTheDocument();
    expect(camera.focus).toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: /国军围堵态势/ }));
    expect(camera.setRoutes).toHaveBeenLastCalledWith([], ['red_army']);
    await user.click(screen.getByRole('button', { name: '全景' }));
    expect(camera.overview).toHaveBeenCalled();
  });
  it('三个沉浸插槽均能进入并返回，恢复镜头、阶段和暂停，不写完成记录', async () => {
    const user = userEvent.setup();
    render(<PanoramaApp candidate={candidate()} />);
    const before = JSON.stringify(localStorage);
    for (const title of ['遵义会议', '飞夺泸定桥', '翻越雪山']) {
      await user.click(
        within(screen.getByRole('navigation', { name: '重要事件' })).getByRole(
          'button',
          {
            name: new RegExp(title),
          },
        ),
      );
      await user.click(
        screen.getByRole('button', { name: `收起${title}电影题字` }),
      );
      await user.click(
        screen.getByRole('button', { name: '查看沉浸入口占位' }),
      );
      expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
      expect(screen.getByText(/不产生完成记录/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '返回区域地图' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(camera.restore).toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: '播放全景浏览' }),
      ).toBeInTheDocument();
    }
    await act(async () => {});
    expect(JSON.stringify(localStorage)).toBe(before);
  });
  it('事件与资料标题可切换艺术题字，题字期间收起资料，再次点击恢复原阶段', async () => {
    const user = userEvent.setup();
    render(<PanoramaApp candidate={candidate()} />);
    const nav = within(screen.getByRole('navigation', { name: '重要事件' }));
    await user.click(nav.getByRole('button', { name: /飞夺泸定桥/ }));
    expect(
      screen.getByRole('button', { name: '收起飞夺泸定桥电影题字' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: '当前阶段资料' }),
    ).toBeNull();
    await user.click(
      screen.getByRole('button', { name: '收起飞夺泸定桥电影题字' }),
    );
    const detail = within(
      screen.getByRole('complementary', { name: '当前阶段资料' }),
    );
    expect(
      detail.getByRole('heading', { name: '飞夺泸定桥' }),
    ).toBeInTheDocument();
    await user.click(detail.getByRole('button', { name: '飞夺泸定桥' }));
    expect(
      screen.getByRole('button', { name: '收起飞夺泸定桥电影题字' }),
    ).toBeInTheDocument();
    await user.click(nav.getByRole('button', { name: /飞夺泸定桥/ }));
    expect(
      screen.queryByRole('button', { name: '收起飞夺泸定桥电影题字' }),
    ).toBeNull();
    expect(
      screen.getByRole('heading', { name: '飞夺泸定桥' }),
    ).toBeInTheDocument();
  });
});
