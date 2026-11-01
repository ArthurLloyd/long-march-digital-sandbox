import type { HistoryDatasetV2 } from '../contracts/dataset';
import { sameIds } from '../contracts/primitives';

export function validateV2Relations(data: HistoryDatasetV2, errors: string[]) {
  const topics = new Map(data.topics.map((r) => [r.topicId, r]));
  const phases = new Map(data.phases.map((r) => [r.phaseId, r]));
  const assets = new Map(data.assets.map((r) => [r.assetId, r]));
  const tracks = new Map(data.forceTracks.map((r) => [r.trackId, r]));
  const snapshots = new Map(data.forceSnapshots.map((r) => [r.snapshotId, r]));
  const experiences = new Map(data.experiences.map((r) => [r.experienceId, r]));
  const segments = new Map(data.segments.map((r) => [r.segmentId, r]));
  const interactions = new Map(
    data.interactions.map((r) => [r.interactionId, r]),
  );
  const fallbacks = new Map(
    data.fallbackContents.map((r) => [r.fallbackContentId, r]),
  );
  const fail = (id: string, message: string) =>
    errors.push(`${id}: ${message}`);
  for (const topic of data.topics) {
    const ordered = topic.phaseIds
      .map((id) => phases.get(id))
      .filter((r) => r !== undefined);
    if (
      new Set(ordered.map((r) => r.sequence)).size !== ordered.length ||
      ordered.some(
        (r, i) =>
          r.topicId !== topic.topicId ||
          (i > 0 && r.sequence <= ordered[i - 1]!.sequence),
      )
    )
      fail(topic.topicId, '阶段归属或 sequence 顺序非法');
  }
  for (const phase of data.phases) {
    const topic = topics.get(phase.topicId);
    if (
      topic &&
      (!topic.phaseIds.includes(phase.phaseId) ||
        phase.eventIds.some((id) => !topic.eventIds.includes(id)))
    )
      fail(phase.phaseId, '阶段必须被所属专题包含，且事件属于同一专题');
  }
  for (const person of data.people) {
    const linked = person.assetIds
      .map((id) => assets.get(id))
      .filter((r) => r !== undefined);
    if (
      linked.some((asset) => !asset.relatedPersonIds.includes(person.personId))
    )
      fail(person.personId, '人物素材关联不一致，不能绑定另一人的照片');
    if (
      linked.some((asset) =>
        ['artistic_recreation', 'ai_recreation'].includes(asset.representation),
      ) &&
      !linked.some(
        (asset) =>
          asset.assetType === 'historical_photo' &&
          asset.relatedPersonIds.includes(person.personId),
      )
    )
      fail(
        person.personId,
        '艺术人物形象必须配对同一人物的真实历史照片；缺图先保留文字',
      );
  }
  for (const place of data.places) {
    if (
      place.assetIds.some((id) => {
        const asset = assets.get(id);
        return asset && !asset.relatedPlaceIds.includes(place.placeId);
      })
    )
      fail(place.placeId, '地点素材关联不一致');
  }
  const trackPhases = new Set<string>();
  for (const track of data.forceTracks) {
    if (
      track.snapshotIds.some((id) => {
        const snapshot = snapshots.get(id);
        return snapshot && snapshot.trackId !== track.trackId;
      })
    )
      fail(track.trackId, '部队快照必须属于同一 track');
  }
  for (const snapshot of data.forceSnapshots) {
    const track = tracks.get(snapshot.trackId);
    if (track && !track.snapshotIds.includes(snapshot.snapshotId))
      fail(snapshot.snapshotId, '部队快照未被 track 包含');
    const key = JSON.stringify([snapshot.trackId, snapshot.phaseId]);
    if (trackPhases.has(key))
      fail(snapshot.snapshotId, '同一部队和阶段不能有重复态势');
    trackPhases.add(key);
  }
  const eventOwners = new Map<string, string>();
  for (const manifest of data.experiences) {
    const topic = topics.get(manifest.topicId);
    for (const eventId of manifest.linkedEventIds) {
      if (topic && !topic.eventIds.includes(eventId))
        fail(manifest.experienceId, '体验事件必须属于对应专题');
      if (eventOwners.has(eventId)) fail(eventId, '一个事件最多映射一个主体验');
      eventOwners.set(eventId, manifest.experienceId);
    }
    const linkedSegments = manifest.segmentIds
      .map((id) => segments.get(id))
      .filter((r) => r !== undefined);
    const kinds = new Set(linkedSegments.map((r) => r.kind));
    if (
      ['context', 'observation', 'process', 'interaction', 'conclusion'].some(
        (kind) => !kinds.has(kind as (typeof linkedSegments)[number]['kind']),
      )
    )
      fail(manifest.experienceId, '体验必须覆盖五类剧情段落');
    if (
      linkedSegments.some((r) => r.experienceId !== manifest.experienceId) ||
      segments.get(manifest.terminalSegmentId)?.kind !== 'conclusion'
    )
      fail(manifest.experienceId, '段落归属或终点类型错误');
    for (const id of manifest.requiredInteractionIds) {
      const interaction = interactions.get(id);
      if (
        interaction &&
        (interaction.experienceId !== manifest.experienceId ||
          !manifest.segmentIds.includes(interaction.segmentId))
      )
        fail(id, '必要互动不属于本体验段落');
    }
    const fallback = fallbacks.get(manifest.fallbackContentId);
    if (
      fallback &&
      (fallback.experienceId !== manifest.experienceId ||
        JSON.stringify(fallback.steps.map((s) => s.segmentId)) !==
          JSON.stringify(manifest.segmentIds))
    )
      fail(manifest.experienceId, '等价体验必须按相同顺序完整覆盖主线');
  }
  for (const segment of data.segments) {
    const manifest = experiences.get(segment.experienceId);
    if (manifest && !manifest.segmentIds.includes(segment.segmentId))
      fail(segment.segmentId, '段落未被对应体验包含');
    for (const id of segment.interactionIds) {
      const interaction = interactions.get(id);
      if (
        interaction &&
        (interaction.segmentId !== segment.segmentId ||
          interaction.experienceId !== segment.experienceId)
      )
        fail(segment.segmentId, '段落互动归属不一致');
    }
  }
  for (const interaction of data.interactions) {
    const segment = segments.get(interaction.segmentId);
    const manifest = experiences.get(interaction.experienceId);
    if (
      (segment &&
        (!segment.interactionIds.includes(interaction.interactionId) ||
          segment.experienceId !== interaction.experienceId)) ||
      (manifest &&
        !manifest.requiredInteractionIds.includes(interaction.interactionId))
    )
      fail(interaction.interactionId, '互动未被对应段落和体验声明');
    if (
      interaction.releaseStatus === 'published' &&
      'materials' in interaction &&
      interaction.materials.some((material) => material.sourceIds.length === 0)
    )
      fail(interaction.interactionId, '正式互动材料缺失来源');
  }
  for (const content of data.fallbackContents) {
    const manifest = experiences.get(content.experienceId);
    if (manifest && manifest.fallbackContentId !== content.fallbackContentId)
      fail(content.fallbackContentId, '等价内容未被对应体验声明');
    for (const step of content.steps) {
      const segment = segments.get(step.segmentId);
      if (
        segment &&
        (segment.experienceId !== content.experienceId ||
          !sameIds(step.interactionIds, segment.interactionIds))
      )
        fail(step.stepId, '等价步骤必须保留同一段落的全部互动');
    }
  }
}
