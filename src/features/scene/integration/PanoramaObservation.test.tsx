import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PanoramaObservation } from './PanoramaObservation';
const mock = vi.hoisted(() => ({
  load: vi.fn(),
  zoom: vi.fn(),
  home: vi.fn(),
  focus: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('./panorama', () => ({ createPanorama: () => mock }));
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn();
});
afterEach(cleanup);
describe('integrated environment painting', () => {
  it('waits for image readiness and exposes view controls without historical completion', async () => {
    mock.load.mockResolvedValue(true);
    const close = vi.fn();
    const view = render(<PanoramaObservation kind="snow" onClose={close} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '拉近细看' })).toBeEnabled(),
    );
    expect(mock.load).toHaveBeenCalledWith(
      '/assets/textures/immersive-landscapes/snow-pass.webp',
    );
    fireEvent.click(screen.getByRole('button', { name: '拉近细看' }));
    expect(mock.zoom).toHaveBeenCalledWith(-8);
    fireEvent.click(screen.getByRole('button', { name: '← 返回地图' }));
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(mock.dispose).toHaveBeenCalledOnce();
  });
  it('offers an exit when the texture fails', async () => {
    mock.load.mockRejectedValue(new Error('network'));
    render(<PanoramaObservation kind="grass" onClose={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '画卷暂未加载成功',
    );
    expect(screen.getByRole('button', { name: '拉近细看' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '← 返回地图' })).toBeEnabled();
  });
  it('disposes immediately when leaving during an unresolved load', () => {
    mock.load.mockReturnValue(new Promise(() => {}));
    const view = render(
      <PanoramaObservation kind="grass" onClose={() => {}} />,
    );
    view.unmount();
    expect(mock.dispose).toHaveBeenCalledOnce();
  });
});
