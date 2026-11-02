import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ImmersiveExperienceProps,
  ExperienceId,
  ExperienceSegment,
} from '../../../shared/contracts';
import { requiredInteractionsFor } from '../../../shared/contracts';
import type { RegionId } from '../atlas/regions';
import { RegionalImmersiveRun } from './RegionalImmersiveRun';

const harness = vi.hoisted(() => ({
  runs: [] as {
    onReady?: () => void;
    onRendered?: () => void;
    onError?: (error: Error) => void;
  }[],
  create: vi.fn(),
  dispose: vi.fn(),
  paused: vi.fn(),
  reduced: vi.fn(),
  view: vi.fn(),
  quality: vi.fn(),
  restore: vi.fn(),
}));
vi.mock('./regional-world', () => ({
  createRegionalWorld: (
    _host: HTMLElement,
    regionId: string,
    options: {
      onReady?: () => void;
      onRendered?: () => void;
      onError?: (error: Error) => void;
    },
  ) => {
    harness.create(regionId);
    harness.runs.push(options);
    return {
      setView: harness.view,
      setPaused: harness.paused,
      setReducedMotion: harness.reduced,
      quality: harness.quality,
      restore: harness.restore,
      dispose: harness.dispose,
      bookmark: () => ({ position: [1, 2, 3], target: [0, 0, 0], zoom: 1 }),
    };
  },
}));
function input(
  experienceId: ExperienceId = 'exp-zunyi-conference',
): ImmersiveExperienceProps {
  const audit = {
    reviewStatus: 'draft' as const,
    releaseStatus: 'unpublished' as const,
    reviewedBy: [],
    reviewedAt: null,
    reviews: [],
    sourceIds: [],
  };
  const requiredInteractionIds = [...requiredInteractionsFor(experienceId)];
  const kinds = [
    'context',
    'observation',
    'process',
    'interaction',
    'conclusion',
  ] as const;
  const segments: ExperienceSegment[] = kinds.map((kind, index) => ({
    segmentId: `fixture-s${index + 1}`,
    experienceId,
    kind,
    title: `工程测试段落${index + 1}`,
    text: '仅用于接口测试，不是历史资料。',
    contentType: 'teaching_simulation',
    presentation: '3d',
    durationSeconds: null,
    interactionIds:
      index === 1
        ? [requiredInteractionIds[0]!]
        : index === 3
          ? [requiredInteractionIds[1]!]
          : [],
    assetIds: [],
    ...audit,
  }));
  return {
    manifest: {
      experienceId,
      topicId: 'test-topic',
      linkedEventIds: [],
      scriptVersion: 'test-v1',
      completionPolicyVersion: 1,
      segmentIds: segments.map((segment) => segment.segmentId),
      requiredInteractionIds,
      terminalSegmentId: 'fixture-s5',
      fallbackContentId: 'test-fallback',
      assetIds: [],
      ...audit,
    },
    segments,
    assets: [],
    cameraBookmark: null,
    command: {
      runId: 'regional-run-1',
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

describe('regional formal C1 adapter', () => {
  it('reports only rendered playing observations and explicit interaction or terminal requests', () => {
    const p = input();
    const view = render(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    const renderer = harness.runs[0]!;
    act(() => renderer.onRendered?.());
    expect(p.onReady).not.toHaveBeenCalled();
    expect(p.onSegmentReached).not.toHaveBeenCalled();
    act(() => renderer.onReady?.());
    act(() => renderer.onRendered?.());
    expect(p.onSegmentReached).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: '继续观察下一段' }),
    ).toBeDisabled();
    p.command = { ...p.command, playback: 'playing' };
    view.rerender(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    act(() => renderer.onRendered?.());
    expect(p.onSegmentReached).toHaveBeenLastCalledWith(
      expect.objectContaining({
        segmentId: 'fixture-s1',
        runId: 'regional-run-1',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '继续观察下一段' }));
    expect(p.onSegmentReached).toHaveBeenCalledTimes(1);
    act(() => renderer.onRendered?.());
    expect(p.onSegmentReached).toHaveBeenLastCalledWith(
      expect.objectContaining({ segmentId: 'fixture-s2' }),
    );
    act(() => renderer.onRendered?.());
    expect(p.onSegmentReached).toHaveBeenCalledTimes(2);
    p.command = { ...p.command, segmentId: 'fixture-s2' };
    view.rerender(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    fireEvent.click(screen.getByRole('button', { name: '观察并打开互动材料' }));
    p.command = { ...p.command, playback: 'paused' };
    view.rerender(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    act(() => renderer.onRendered?.());
    expect(p.onInteractionCue).not.toHaveBeenCalled();
    p.command = { ...p.command, playback: 'playing' };
    view.rerender(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    act(() => renderer.onRendered?.());
    expect(p.onInteractionCue).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentId: 'fixture-s2',
        interactionId: 'zy-01',
      }),
    );
    p.command = { ...p.command, segmentId: 'fixture-s5' };
    view.rerender(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    act(() => renderer.onRendered?.());
    expect(p.onTerminalReached).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '结束空间观察' }));
    expect(p.onTerminalReached).not.toHaveBeenCalled();
    act(() => renderer.onRendered?.());
    act(() => renderer.onRendered?.());
    expect(p.onTerminalReached).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: '空间观察已结束' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '返回地图' }));
    expect(p.onExitRequested).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'regional-run-1' }),
    );
    expect(p.onCameraBookmark).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bookmark: expect.objectContaining({
          sceneId: 'regional-art-space-zunyi',
          phaseId: null,
        }),
      }),
    );
  });

  it('disposes old runs and refuses their late readiness, frame, and failure callbacks', () => {
    const p = input();
    const view = render(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    const old = harness.runs[0]!;
    view.rerender(
      <RegionalImmersiveRun
        {...p}
        regionId="zunyi"
        command={{ ...p.command, runId: 'regional-run-2' }}
      />,
    );
    expect(harness.dispose).toHaveBeenCalledOnce();
    act(() => {
      old.onReady?.();
      old.onRendered?.();
      old.onError?.(new Error('old'));
    });
    expect(p.onReady).not.toHaveBeenCalled();
    expect(p.onError).not.toHaveBeenCalled();
    act(() => harness.runs[1]!.onReady?.());
    expect(p.onReady).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'regional-run-2' }),
    );
    view.unmount();
    expect(harness.dispose).toHaveBeenCalledTimes(2);
  });

  it('rejects missing or foreign segments before constructing a renderer', async () => {
    const p = input();
    p.segments = input('exp-feiduo-ludingqiao').segments;
    render(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    await act(async () => {});
    expect(harness.create).not.toHaveBeenCalled();
    expect(p.onReady).not.toHaveBeenCalled();
    expect(p.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'media_unavailable',
          retryable: false,
        }),
      }),
    );
  });

  it('restores only matching local bookmarks and updates quality without replacing the context', () => {
    const p = input();
    p.cameraBookmark = {
      sceneId: 'regional-art-space-zunyi',
      coordinateSystem: 'scene-local',
      phaseId: null,
      position: [3, 4, 5],
      target: [0, 0, 0],
      zoom: 1.1,
    };
    const view = render(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    expect(harness.restore).toHaveBeenCalledWith(p.cameraBookmark);
    view.rerender(
      <RegionalImmersiveRun
        {...p}
        regionId="zunyi"
        command={{ ...p.command, quality: 'low' }}
      />,
    );
    expect(harness.quality).toHaveBeenLastCalledWith(true);
    expect(harness.create).toHaveBeenCalledOnce();
    harness.restore.mockClear();
    view.rerender(
      <RegionalImmersiveRun
        {...p}
        regionId="zunyi"
        command={{ ...p.command, runId: 'regional-run-2' }}
        cameraBookmark={{
          ...p.cameraBookmark,
          sceneId: 'regional-art-space-snow',
        }}
      />,
    );
    expect(harness.restore).not.toHaveBeenCalled();
  });

  it.each(['manifest', 'segment'] as const)(
    'rejects an interaction ID from another experience in the %s',
    async (location) => {
      const p = input();
      if (location === 'manifest')
        p.manifest = {
          ...p.manifest,
          requiredInteractionIds: ['ld-01', 'zy-02'],
        };
      else
        p.segments = p.segments.map((segment) =>
          segment.segmentId === 'fixture-s2'
            ? { ...segment, interactionIds: ['ld-01'] }
            : segment,
        );
      render(<RegionalImmersiveRun {...p} regionId="zunyi" />);
      await act(async () => {});
      expect(harness.create).not.toHaveBeenCalled();
      expect(p.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'media_unavailable' }),
        }),
      );
      expect(p.onInteractionCue).not.toHaveBeenCalled();
    },
  );

  it('cancels a pending cue when C changes the commanded segment', () => {
    const p = input();
    p.command = { ...p.command, segmentId: 'fixture-s2', playback: 'playing' };
    const view = render(<RegionalImmersiveRun {...p} regionId="zunyi" />);
    const renderer = harness.runs[0]!;
    act(() => {
      renderer.onReady?.();
      renderer.onRendered?.();
    });
    fireEvent.click(screen.getByRole('button', { name: '观察并打开互动材料' }));
    view.rerender(
      <RegionalImmersiveRun
        {...p}
        regionId="zunyi"
        command={{ ...p.command, segmentId: 'fixture-s3' }}
      />,
    );
    act(() => renderer.onRendered?.());
    expect(p.onInteractionCue).not.toHaveBeenCalled();
    expect(p.onSegmentReached).toHaveBeenLastCalledWith(
      expect.objectContaining({ segmentId: 'fixture-s3' }),
    );
  });

  it.each<[ExperienceId, RegionId]>([
    ['exp-zunyi-conference', 'zunyi'],
    ['exp-sidu-chishui', 'chishui'],
    ['exp-qiaodu-jinshajiang', 'jinsha'],
    ['exp-crossing-snow-mountains', 'snow'],
    ['exp-crossing-grasslands', 'grass'],
  ])('accepts complete supplied segments for %s', (experienceId, regionId) => {
    const p = input(experienceId);
    render(<RegionalImmersiveRun {...p} regionId={regionId} />);
    expect(harness.create).toHaveBeenCalledWith(regionId);
    act(() => harness.runs[0]!.onReady?.());
    expect(p.onReady).toHaveBeenCalledWith(
      expect.objectContaining({ experienceId }),
    );
    expect(p.onInteractionCue).not.toHaveBeenCalled();
    expect(p.onTerminalReached).not.toHaveBeenCalled();
  });
});
