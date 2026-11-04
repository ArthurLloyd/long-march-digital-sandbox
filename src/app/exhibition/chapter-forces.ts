import type {
  JourneyPlan,
  JourneyFormation,
} from '../../features/timeline/journey';
import { YUDU_FORMATIONS, type CampaignResearch } from './campaign-situations';

const stableUnitId = (name: string) => {
  for (const [prefix, id] of [
    ['红一方面军', 'red-first-front'],
    ['红二方面军', 'red-second-front'],
    ['红四方面军', 'red-fourth-front'],
    ['红十五军团', 'red-fifteenth-corps'],
    ['红二十五军', 'red-twenty-fifth'],
    ['陕北红军', 'shaanxi-red'],
  ] as const)
    if (name.startsWith(prefix)) return id;
  return name.split('·')[0]!;
};

/** Attach the sourced battle relationship to the main map. A formation layout
 * is a display diagram at an event, with no inferred geographic path. */
export function chapterFormations(
  plan: JourneyPlan,
  entries: readonly {
    eventId: string;
    anchorCoordinates: readonly [number, number];
  }[],
  research: CampaignResearch,
) {
  const result: JourneyFormation[] = [];
  for (const c of plan.chapters) {
    const stage = research.stages.find((s) => s.chapterIds.includes(c.id))!;
    const tracks = plan.tracks.filter(
      (t) => t.chapterId === c.id || t.holdChapterIds?.includes(c.id),
    );
    const entry = entries.find((e) => c.eventIds.includes(e.eventId));
    const anchor =
      entry?.anchorCoordinates ??
      tracks.find((t) => t.camp === 'red_army')?.points.at(-1);
    if (!anchor) continue;
    const sources = stage.sourceIds.map((id) => research.sources[id]!.url);
    const add = (
      names: readonly string[],
      action: JourneyFormation['action'],
      departChapterId?: string,
      sequenceId?: string,
    ) =>
      names.forEach((name, i) =>
        result.push({
          id: `formation:${c.id}:red_army:${i}`,
          chapterId: c.id,
          sequenceId,
          unitId: stableUnitId(name),
          unitName: name,
          camp: 'red_army',
          action,
          anchor: [anchor[0], anchor[1]],
          lane: i,
          lanes: names.length,
          sourceUrls: sources,
          replacesPrimary: action === 'assembly',
          departChapterId,
        }),
      );
    if (c.id === 'chapter-ex-event-yudu-assembly')
      add(YUDU_FORMATIONS, 'assembly', 'chapter-ex-event-yudu-crossing');
    else if (
      c.id === 'chapter-ex-event-dawei' ||
      c.id === 'chapter-ex-event-maogong'
    )
      add(['红四方面军·接应会师'], 'hold');
    else if (c.id === 'chapter-event-gr')
      add(['右路军·红四方面军部队'], 'hold');
    else if (c.id === 'chapter-ex-event-ganquan')
      add(['红十五军团·甘泉会师'], 'hold', undefined, 'central');
    else if (c.id === 'chapter-ex-event-huining')
      add(['红一方面军·会宁接应'], 'hold');
    else if (c.id === 'chapter-ex-event-jiangtai') {
      add(['红一方面军·将台堡接应'], 'hold');
      const huining = entries.find((e) => e.eventId === 'ex-event-huining');
      if (huining)
        result.push({
          id: 'formation:red-fourth-after-huining',
          chapterId: c.id,
          unitId: 'red-fourth-front',
          unitName: '红四方面军·会宁会师后',
          camp: 'red_army',
          action: 'hold',
          anchor: [...huining.anchorCoordinates],
          lane: 0,
          lanes: 1,
          sourceUrls: sources,
        });
    } else if (c.id === 'chapter-ex-event-yongping')
      add(['陕北红军·接应会师'], 'hold');
    else if (c.id === 'chapter-ex-event-ganzi')
      add(['红二、六军团·甘孜会师', '红四方面军·甘孜会师'], 'hold');
    else if (c.id === 'chapter-ex-event-red2-formed')
      add(['红二方面军·组成后北上', '红四方面军·北上策应'], 'hold');
    // The map already renders located enemy deployments and movements from
    // plan.tracks. Other campaign actions belong to the narrative: the event
    // anchor gives no position or direction for an opposing force.
  }
  return result;
}
