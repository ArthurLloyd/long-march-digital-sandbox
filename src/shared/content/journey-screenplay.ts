/** Exhibition editing cues. Fractions are playback positions, not historical times.
 * Chishui and Jinsha follow the supplied visual reference. No geographic vertices. */
export type Shot = 'wide' | 'advance' | 'detail' | 'resolve';
export type Cue = readonly [
  start: number,
  shot: Shot,
  heading: string,
  caption: string,
  date?: string,
  correction?: string,
  placement?: 'annotation',
];
const tongziLines = [
  '川军转向东追，黔军和中央军赶来增援。',
  '红军向娄山关、遵义方向推进。',
] as const;
export const tongziHandoff =
  narrationSeconds(tongziLines[0]) /
  (narrationSeconds(tongziLines[0]) + narrationSeconds(tongziLines[1]));
const tongziCaption = tongziLines.join('');
const scenes: Record<string, readonly Cue[]> = {
  'event-sd': [
    [
      0,
      'wide',
      '川黔边 · 合围',
      '中央红军身处群山之间。川军、滇军、黔军和中央军从不同方向形成压力。',
    ],
    [
      0.22,
      'detail',
      '赤水河',
      '先看这条河。接下来的四次渡河，都发生在这片山地之间。',
    ],
    [
      0.44,
      'advance',
      '北渡长江',
      '从遵义出发，红军最初的打算是向北寻找渡江机会。',
    ],
    [
      0.7,
      'wide',
      '四次渡河',
      '随着追堵部署改变，红军在同一条河的两岸反复转向。',
    ],
  ],
  'event-sd-1': [
    [
      0,
      'advance',
      '进抵土城',
      '红军向北进至土城，在赤水河边与尾追的川军接触。',
      '1月下旬',
    ],
    [
      0.1,
      'detail',
      '尾追川军 · 初判四个团',
      '红军准备在青杠坡地区迎击尾追的川军。',
      '1月28日',
    ],
    [
      0.16,
      'detail',
      '川军增援 · 战斗陷入僵持',
      '川军后续部队不断增援，战斗比预想的更难速决。',
      '1月28日',
      '先前判断：四个团',
    ],
    [
      0.24,
      'detail',
      '撤出战斗',
      '继续僵持会增加被围的危险，红军决定向西渡河。',
      '1月28日夜',
    ],
    [
      0.32,
      'advance',
      '一渡赤水',
      '主力从土城、元厚一带分路西渡，进入川南。',
      '1月29日',
    ],
    [
      0.6,
      'wide',
      '长江沿岸布防',
      '北渡长江的方向受到阻挡，追兵也在调整部署。',
      '2月上旬',
    ],
    [0.79, 'resolve', '向扎西集中', '红军转向川滇黔交界，在扎西一带集结整编。'],
  ],
  'event-zy-resolution': [
    [
      0,
      'wide',
      '扎西集结',
      '川军和滇军向川滇边逼近，红军需要选择新的行动方向。',
    ],
    [
      0.32,
      'detail',
      '决议与整编',
      '扎西期间，中央连续开会，讨论战略方向，调整部队编制。',
    ],
    [
      0.68,
      'resolve',
      '回师黔北',
      '追堵力量集中到西面。红军准备东返，再渡赤水。',
    ],
  ],
  'event-sd-2': [
    [
      0,
      'wide',
      '追兵西移',
      '敌军向川南和川滇边集中，黔北出现空隙。',
      '2月中旬',
    ],
    [
      0.19,
      'advance',
      '掉头向东',
      '主力从扎西方向折返，抢在追兵重新部署之前接近赤水。',
    ],
    [
      0.42,
      'detail',
      '二渡赤水',
      '红军从太平渡、二郎滩等处向东渡过赤水河。',
      '2月18日起',
    ],
    [0.6, 'advance', '桐梓 · 娄山关', tongziCaption, '2月下旬'],
    [
      0.84,
      'resolve',
      '重占遵义',
      '桐梓、娄山关、遵义接连取得胜利，红军士气回升。',
    ],
  ],
  'event-sd-3': [
    [
      0,
      'wide',
      '围堵遵义',
      '敌军调整部署，沿遵义、鸭溪一带压迫红军。',
      '3月上中旬',
    ],
    [
      0.25,
      'detail',
      '鲁班场',
      '鲁班场攻坚未克，红军撤出战斗，转向赤水河边的茅台。',
      '3月15日',
    ],
    [
      0.43,
      'advance',
      '三渡赤水',
      '主力从茅台一带向西渡河，第三次穿过赤水，转入川南。',
      '3月16日起',
    ],
    [0.69, 'wide', '古蔺方向', '红军派出一部，向古蔺方向佯动，吸引追兵。'],
    [
      0.83,
      'resolve',
      '追兵压向河西',
      '川军一部从茅台向西追。叙永、古蔺一带的兵力也在防堵。',
    ],
  ],
  'event-sd-4': [
    [0, 'wide', '河西追堵', '追兵的注意力仍在河西，古蔺方向的佯动还在继续。'],
    [
      0.22,
      'advance',
      '佯动与折返',
      '佯动部队继续向西，主力却掉头向东，折回赤水河边。',
    ],
    [
      0.53,
      'detail',
      '四渡赤水',
      '主力分路从二郎滩、太平渡等处向东过河，第四次渡过赤水。',
      '3月21—22日',
    ],
    [
      0.78,
      'resolve',
      '挥师南下',
      '追兵仍在河西，红军主力已从东岸挥师南下，转向乌江。',
    ],
  ],
  'event-js': [
    [
      0,
      'wide',
      '乌江以南',
      '四渡赤水后，主力南下渡过乌江，逼近贵阳。',
      '3月下旬',
    ],
    [
      0.16,
      'advance',
      '贵阳方向',
      '红军逼近贵阳，孙渡纵队被调去增援。',
      '4月上旬',
    ],
    [
      0.35,
      'advance',
      '转向云南',
      '主力向西进入云南，经过曲靖一带。',
      '4月下旬',
    ],
    [
      0.52,
      'wide',
      '调动滇军',
      '红军向昆明方向机动，滇军回援，主力寻找向北渡江的机会。',
    ],
    [
      0.72,
      'advance',
      '抢占渡口',
      '红军先遣部队控制皎平渡，组织船只和船工接渡。',
      '5月上旬',
    ],
    [0.87, 'detail', '皎平渡', '部队分批登船，先后渡过金沙江。', '5月3—9日'],
    [
      0.96,
      'resolve',
      '渡过金沙江',
      '金沙江横在红军与追兵之间。主力渡江后，追堵的局面随之改变。',
      '5月9日',
    ],
  ],
};

// Editor time from the provided 345.4 s film (cut boundaries rounded to seconds).
// The map, title card and text all use the same cut, including during scrubbing.
const referenceCuts: Record<string, readonly number[]> = {
  'event-sd': [0, 21, 59, 65, 69],
  'event-sd-1': [69, 78, 89, 97, 104, 111, 114, 117],
  'event-zy-resolution': [117, 119, 121, 123],
  'event-sd-2': [123, 128, 136, 141, 147, 165],
  'event-sd-3': [165, 175, 180, 185, 191, 198],
  'event-sd-4': [198, 202, 210, 214, 216],
  'event-js': [216, 221, 239, 248, 251, 255, 263, 270],
};
for (const [id, cuts] of Object.entries(referenceCuts)) {
  const duration = cuts.at(-1)! - cuts[0]!;
  scenes[id] = scenes[id]!.map(([, ...fields], i): Cue => [
    (cuts[i]! - cuts[0]!) / duration,
    ...fields,
  ]);
}
/** Display-time budget at 1×, with pauses for Mandarin punctuation. */
export function narrationSeconds(text: string) {
  const letters = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  const pauses = text.match(/[，、：；,]/gu)?.length ?? 0;
  const stops = text.match(/[。！？!?]/gu)?.length ?? 0;
  return Math.max(2, letters / 4 + pauses * 0.22 + stops * 0.4);
}

/** Split a long utterance at its nearest natural pause without creating new shots. */
export function subtitleAt(text: string, progress: number) {
  if (text === tongziCaption)
    return tongziLines[progress < tongziHandoff ? 0 : 1];
  if (text.length <= 32) return text;
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 32) {
    const window = rest.slice(0, 31);
    const cuts = [...window.matchAll(/[。！？；，、]/gu)];
    const cut = cuts.filter((m) => m.index >= 10).at(-1)?.index;
    const n = cut === undefined ? 28 : cut + 1;
    chunks.push(rest.slice(0, n));
    rest = rest.slice(n);
  }
  chunks.push(rest);
  const lengths = chunks.map(narrationSeconds);
  let elapsed = Math.max(0, progress) * lengths.reduce((a, b) => a + b, 0);
  for (const [i, duration] of lengths.entries()) {
    if (elapsed < duration) return chunks[i]!;
    elapsed -= duration;
  }
  return chunks.at(-1)!;
}

// The point index selects an existing named waypoint on the project track.
export const crossingSeals = [
  {
    track: 'march-sd1',
    point: 0,
    at: scenes['event-sd-1']![4]![0],
    label: '一渡',
    place: '土城',
  },
  {
    track: 'march-sd2',
    point: 1,
    at: scenes['event-sd-2']![2]![0],
    label: '二渡',
    place: '太平渡',
  },
  {
    track: 'march-sd3',
    point: 2,
    at: scenes['event-sd-3']![2]![0],
    label: '三渡',
    place: '茅台',
  },
  {
    track: 'march-sd4',
    point: 1,
    at: scenes['event-sd-4']![2]![0],
    label: '四渡',
    place: '二郎滩',
  },
  {
    track: 'march-jinsha',
    point: 4,
    at: scenes['event-js']![5]![0],
    label: '渡金沙',
    place: '皎平渡',
  },
] as const;
export function referenceCues(chapterId: string) {
  return scenes[chapterId.replace(/^chapter-/, '')];
}

export function cueIndex(cues: readonly Cue[], progress: number) {
  let i = 0;
  while (i + 1 < cues.length && progress + 1e-8 >= cues[i + 1]![0]) i++;
  return i;
}
