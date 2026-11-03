import { CAMPAIGN_SOURCES } from '../../../../shared/content/chishui-campaign';
/** Original editorial layout in local diagram units; never geographic coordinates.
 * The lines communicate direction, not reconstructed marching routes. */
export type DiagramPoint = readonly [number, number];
export const CHISHUI_SOURCES = Object.values(CAMPAIGN_SOURCES);
export const CHISHUI_CHAPTERS = [
  {
    id: 'first',
    name: '一渡赤水',
    date: '1935年1月29日',
    keyword: '避实就虚',
    caption: '土城、猿猴场等渡口 · 西渡',
    text: '土城战斗后，中央红军改变行动部署，从土城南北及猿猴场等渡口西渡赤水，进入川南，随后向扎西地区集中。',
    insight: '北渡长江的计划受到阻碍，转移方向成为保存主动的关键。',
    narration:
      '一渡赤水。土城战斗后，中央红军主动转移，西渡赤水，进入川南。随后向扎西集中，重新寻找战机。',
    label: '主力西渡 · 向川南转移',
    path: [
      [22, -27],
      [13, -29],
      [4, -27],
      [-9, -28],
      [-25, -23],
      [-37, -8],
      [-40, 14],
    ] as readonly DiagramPoint[],
    crossing: [1, -28] as DiagramPoint,
    target: [-16, -15] as DiagramPoint,
  },
  {
    id: 'second',
    name: '二渡赤水',
    date: '1935年2月18—21日',
    keyword: '回师黔北',
    caption: '太平渡、二郎滩等渡口 · 东渡',
    text: '中央红军从扎西地区折返东进，经太平渡、二郎滩等处东渡赤水。随后攻占桐梓、娄山关，再取遵义，打开战局。',
    insight: '利用敌军调动形成的空隙，迅速回师，争取局部作战的主动。',
    narration:
      '二渡赤水。红军从扎西折返东进，从太平渡、二郎滩等处东渡赤水，回师黔北。随后攻占娄山关，再取遵义。',
    label: '回师东进 · 再取遵义',
    path: [
      [-40, 14],
      [-32, 3],
      [-18, -6],
      [-7, -8],
      [6, -8],
      [20, -3],
      [29, 12],
      [34, 26],
    ] as readonly DiagramPoint[],
    crossing: [-1, -8] as DiagramPoint,
    target: [12, 2] as DiagramPoint,
  },
  {
    id: 'third',
    name: '三渡赤水',
    date: '1935年3月16—17日',
    keyword: '转兵西进',
    caption: '茅台及附近渡口 · 西渡',
    text: '鲁班场战斗后，中央红军向茅台地区机动，再次西渡赤水，重入川南，向古蔺、叙永方向活动，调动追堵部队。',
    insight: '不在敌军重兵聚集处久留，通过机动重新创造有利条件。',
    narration:
      '三渡赤水。鲁班场战斗后，红军转向茅台，再次西渡赤水，重入川南，调动敌军。',
    label: '茅台西渡 · 再入川南',
    path: [
      [34, 26],
      [21, 24],
      [9, 24],
      [-2, 24],
      [-16, 18],
      [-26, 6],
      [-29, -10],
    ] as readonly DiagramPoint[],
    crossing: [0, 24] as DiagramPoint,
    target: [-12, 10] as DiagramPoint,
  },
  {
    id: 'fourth',
    name: '四渡赤水',
    date: '1935年3月21—22日',
    keyword: '出敌不意',
    caption: '二郎滩、太平渡等渡口 · 东渡',
    text: '红军以一部向古蔺方向佯动，主力突然折返，从二郎滩、太平渡等处东渡赤水，随后向南疾进，继续寻机摆脱围堵。',
    insight:
      '佯动与主力转移相配合。四渡之后继续南渡乌江，不把一次渡河等同于整个突围过程。',
    narration:
      '四渡赤水。一部兵力向古蔺方向佯动，主力突然折返东进，再渡赤水，随后向南疾进，继续摆脱围堵。',
    label: '折返东渡 · 乘隙南下',
    path: [
      [-29, -10],
      [-19, -16],
      [-9, -10],
      [4, -8],
      [17, 2],
      [21, 18],
      [25, 35],
    ] as readonly DiagramPoint[],
    crossing: [-1, -8] as DiagramPoint,
    target: [10, 13] as DiagramPoint,
  },
] as const;
export const CHAPTER_SECONDS = 22;
export const TOTAL_SECONDS = CHAPTER_SECONDS * CHISHUI_CHAPTERS.length;
export function sampleChishui(time: number) {
  const safe = Math.min(
    TOTAL_SECONDS,
    Math.max(0, Number.isFinite(time) ? time : 0),
  );
  const chapter = Math.min(3, Math.floor(safe / CHAPTER_SECONDS));
  return {
    time: safe,
    chapter,
    progress: Math.min(1, (safe - chapter * CHAPTER_SECONDS) / CHAPTER_SECONDS),
  };
}
// Author-drawn river axis; not a survey or a historic river reconstruction.
export function riverX(z: number) {
  return Math.sin(z * 0.075) * 4 + Math.sin(z * 0.19) * 1.8;
}
export const DIAGRAM_PLACES = [
  { name: '土城 · 猿猴场', x: 12, z: -31 },
  { name: '太平渡 · 二郎滩', x: 12, z: -10 },
  { name: '茅台', x: 11, z: 25 },
  { name: '扎西方向', x: -40, z: 20 },
  { name: '遵义方向', x: 35, z: 30 },
  { name: '川南方向', x: -30, z: -29 },
] as const;
