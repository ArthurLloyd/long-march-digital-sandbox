import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CinematicIntro } from './CinematicIntro';
import type { SceneCinematic } from './cinematic-config';

const cinematic: SceneCinematic = {
  enabled: true,
  src: '/assets/textures/scene-cinematics/snow-intro.mp4',
  poster: '/assets/textures/scene-covers/snow.jpg',
  label: '雪岭同行',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cinematic scene introduction', () => {
  it('does not start in a hidden tab or resume a user-paused film on tab return', async () => {
    let hidden = true;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    render(
      <CinematicIntro
        cinematic={cinematic}
        onComplete={() => {}}
        onExit={() => {}}
      />,
    );
    await act(async () => {});
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    hidden = false;
    await act(async () => fireEvent(document, new Event('visibilitychange')));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '暂停片段' }));
    hidden = true;
    fireEvent(document, new Event('visibilitychange'));
    hidden = false;
    await act(async () => fireEvent(document, new Event('visibilitychange')));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: '继续播放片段' }),
    ).toBeInTheDocument();
  });

  it('attempts audible playback and enters the scene once only after the film ends and fades', async () => {
    const done = vi.fn();
    const { container } = render(
      <CinematicIntro
        cinematic={cinematic}
        onComplete={done}
        onExit={() => {}}
      />,
    );
    const video = container.querySelector('video')!;
    await act(async () => {});
    expect(video.play).toHaveBeenCalledOnce();
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(0.9);
    expect(video.loop).toBe(false);
    expect(done).not.toHaveBeenCalled();
    fireEvent.ended(video);
    fireEvent.ended(video);
    act(() => vi.advanceTimersByTime(479));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledOnce();
  });

  it('offers a real play gesture when audible autoplay is blocked', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException('blocked', 'NotAllowedError'),
    );
    const done = vi.fn();
    render(
      <CinematicIntro
        cinematic={cinematic}
        onComplete={done}
        onExit={() => {}}
      />,
    );
    await act(async () => {});
    const play = screen.getByRole('button', { name: '播放片段' });
    expect(play).toHaveFocus();
    expect(done).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(play));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('button', { name: '暂停片段' }),
    ).toBeInTheDocument();
  });

  it('keeps exit and exploration available when a local film is missing', async () => {
    const done = vi.fn();
    const exit = vi.fn();
    const { container } = render(
      <CinematicIntro cinematic={cinematic} onComplete={done} onExit={exit} />,
    );
    await act(async () => {});
    fireEvent.error(container.querySelector('video')!);
    expect(screen.getByRole('alert')).toHaveTextContent('片段暂未能播放');
    expect(screen.getByRole('button', { name: '继续探索' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '继续探索' }));
    act(() => vi.advanceTimersByTime(480));
    expect(done).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '返回总地图' }));
    expect(exit).toHaveBeenCalledOnce();
  });

  it('honors reduced motion and lets the user enter without playing', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const done = vi.fn();
    render(
      <CinematicIntro
        cinematic={cinematic}
        onComplete={done}
        onExit={() => {}}
      />,
    );
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '直接进入场景' }));
    act(() => vi.advanceTimersByTime(0));
    expect(done).toHaveBeenCalledOnce();
  });

  it('releases media, timers, and stale callbacks when leaving during playback', async () => {
    const done = vi.fn();
    const { container, unmount } = render(
      <CinematicIntro
        cinematic={cinematic}
        onComplete={done}
        onExit={() => {}}
      />,
    );
    const video = container.querySelector('video')!;
    await act(async () => {});
    fireEvent.ended(video);
    unmount();
    act(() => vi.runAllTimers());
    expect(done).not.toHaveBeenCalled();
    expect(video).not.toHaveAttribute('src');
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
  });

  it('offers recovery when loading never resolves', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(
      new Promise(() => {}),
    );
    const done = vi.fn();
    render(
      <CinematicIntro
        cinematic={cinematic}
        onComplete={done}
        onExit={() => {}}
      />,
    );
    await act(async () => vi.advanceTimersByTime(18000));
    expect(
      screen.getByRole('button', { name: '继续探索' }),
    ).toBeInTheDocument();
    expect(done).not.toHaveBeenCalled();
  });

  it('keeps explicit volume and mute choices across scene entries', async () => {
    const first = render(
      <CinematicIntro
        cinematic={cinematic}
        onComplete={() => {}}
        onExit={() => {}}
      />,
    );
    await act(async () => {});
    fireEvent.change(screen.getByRole('slider', { name: '影片音量' }), {
      target: { value: '0.35' },
    });
    fireEvent.click(screen.getByRole('button', { name: '静音影片' }));
    first.unmount();
    const second = render(
      <CinematicIntro
        cinematic={{ ...cinematic, label: '另一处场景' }}
        onComplete={() => {}}
        onExit={() => {}}
      />,
    );
    await act(async () => {});
    const video = second.container.querySelector('video')!;
    expect(video.volume).toBe(0.35);
    expect(video.muted).toBe(true);
    // Restore the session preference through the same user-facing control.
    fireEvent.change(screen.getByRole('slider', { name: '影片音量' }), {
      target: { value: '0.9' },
    });
  });
});
