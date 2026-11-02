import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImmersiveExperienceProps } from '../shared/contracts';
import { createDraftV2Dataset } from './fixtures/v2-dataset';
import { ImmersiveExperienceRenderer } from '../features/scene/ImmersiveExperienceRenderer';

const harness = vi.hoisted(() => ({
  runs: [] as { onReady?: () => void; onRendered?: () => void }[],
  dispose: vi.fn(),
  paused: vi.fn(),
  pose: vi.fn(),
  quality: vi.fn(),
}));
vi.mock('../features/scene/prototype/bridge-renderer', () => ({
  createBridgeStudy: (
    _host: HTMLElement,
    options: { onReady?: () => void; onRendered?: () => void },
  ) => {
    harness.runs.push(options);
    return {
      dispose: harness.dispose,
      setPaused: harness.paused,
      pose: harness.pose,
      quality: harness.quality,
      restore: vi.fn(),
      focusSpot: vi.fn(),
      bookmark: () => ({ position: [1, 2, 3], target: [0, 0, 0], zoom: 1 }),
    };
  },
}));
vi.mock('../features/scene/prototype/ambience', () => ({
  createAmbience: () => ({ toggle: vi.fn(async () => true), dispose: vi.fn() }),
}));

function input(): ImmersiveExperienceProps {
  const data = createDraftV2Dataset();
  return {
    manifest: data.experiences[0]!,
    segments: data.segments,
    assets: [],
    cameraBookmark: null,
    command: {
      runId: 'test-run-1',
      segmentId: 'fixture-s1',
      playback: 'paused',
      muted: true,
      quality: 'medium',
      reducedMotion: true,
    },
    onReady: vi.fn(),
    onError: vi.fn(),
    onSegmentReached: vi.fn(),
    onInteractionCue: vi.fn(),
    onTerminalReached: vi.fn(),
    onExitRequested: vi.fn(),
    onCameraBookmark: vi.fn(),
  };
}
beforeEach(() => {
  harness.runs.length = 0;
  vi.clearAllMocks();
});
describe('C1 renderer adapter', () => {
  it('waits for real readiness and a rendered playing frame, then delegates interaction and completion to C', () => {
    const p = input();
    const { rerender } = render(<ImmersiveExperienceRenderer {...p} />);
    expect(p.onReady).not.toHaveBeenCalled();
    act(() => harness.runs[0]!.onRendered?.());
    expect(p.onSegmentReached).not.toHaveBeenCalled();
    act(() => harness.runs[0]!.onReady?.());
    expect(p.onReady).toHaveBeenCalledWith({
      experienceId: p.manifest.experienceId,
      scriptVersion: p.manifest.scriptVersion,
      runId: 'test-run-1',
    });
    act(() => harness.runs[0]!.onRendered?.());
    expect(p.onSegmentReached).not.toHaveBeenCalled();
    p.command = { ...p.command, playback: 'playing' };
    rerender(<ImmersiveExperienceRenderer {...p} />);
    act(() => harness.runs[0]!.onRendered?.());
    expect(p.onSegmentReached).toHaveBeenLastCalledWith(
      expect.objectContaining({ segmentId: 'fixture-s1' }),
    );
    fireEvent.click(screen.getByText('继续观察下一段'));
    expect(p.onSegmentReached).toHaveBeenCalledTimes(1);
    act(() => harness.runs[0]!.onRendered?.());
    expect(p.onSegmentReached).toHaveBeenLastCalledWith(
      expect.objectContaining({ segmentId: 'fixture-s2' }),
    );
    p.command = { ...p.command, segmentId: 'fixture-s2' };
    rerender(<ImmersiveExperienceRenderer {...p} />);
    fireEvent.click(screen.getByText('观察并打开互动材料'));
    expect(p.onInteractionCue).not.toHaveBeenCalled();
    act(() => harness.runs[0]!.onRendered?.());
    expect(p.onInteractionCue).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentId: 'fixture-s2',
        interactionId: 'ld-01',
        runId: 'test-run-1',
      }),
    );
    expect(p.onTerminalReached).not.toHaveBeenCalled();
    p.command = { ...p.command, segmentId: 'fixture-s5', playback: 'paused' };
    rerender(<ImmersiveExperienceRenderer {...p} />);
    expect(screen.getByText('结束空间观察')).toBeDisabled();
    act(() => harness.runs[0]!.onRendered?.());
    expect(p.onTerminalReached).not.toHaveBeenCalled();
    p.command = { ...p.command, playback: 'playing' };
    rerender(<ImmersiveExperienceRenderer {...p} />);
    act(() => harness.runs[0]!.onRendered?.());
    fireEvent.click(screen.getByText('结束空间观察'));
    act(() => harness.runs[0]!.onRendered?.());
    expect(p.onTerminalReached).toHaveBeenCalledWith(
      expect.objectContaining({ segmentId: 'fixture-s5' }),
    );
    fireEvent.click(screen.getByText('返回地图'));
    expect(p.onCameraBookmark).toHaveBeenCalledWith(
      expect.objectContaining({
        bookmark: expect.objectContaining({
          sceneId: 'luding-art-space',
          phaseId: null,
        }),
      }),
    );
    expect(p.onExitRequested).toHaveBeenCalledOnce();
  });
  it('disposes old runs and ignores late callbacks from a replaced renderer', () => {
    const p = input();
    const { rerender, unmount } = render(
      <ImmersiveExperienceRenderer {...p} />,
    );
    const old = harness.runs[0]!;
    rerender(
      <ImmersiveExperienceRenderer
        {...p}
        command={{ ...p.command, runId: 'test-run-2' }}
      />,
    );
    expect(harness.dispose).toHaveBeenCalledOnce();
    act(() => {
      old.onReady?.();
      old.onRendered?.();
    });
    expect(p.onReady).not.toHaveBeenCalled();
    act(() => harness.runs[1]!.onReady?.());
    expect(p.onReady).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'test-run-2' }),
    );
    unmount();
    expect(harness.dispose).toHaveBeenCalledTimes(2);
  });
  it('routes unsupported scenes to C fallback without claiming media readiness', async () => {
    const p = input();
    p.manifest = createDraftV2Dataset('exp-zunyi-conference').experiences[0]!;
    render(<ImmersiveExperienceRenderer {...p} />);
    await act(async () => {});
    expect(p.onReady).not.toHaveBeenCalled();
    expect(p.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'media_unavailable' }),
      }),
    );
    expect(harness.runs).toHaveLength(0);
  });
});
