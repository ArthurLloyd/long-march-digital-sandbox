import type { Cue } from '../../shared/content/journey-screenplay';

/** Shot boundaries match the registered stage anchors in film-movement. */
export const red25Cues: Readonly<Record<string, readonly Cue[]>> = {
  'chapter-ex-event-red25-start': [
    [
      0,
      'advance',
      '罗山出发',
      '红二十五军从罗山县何家冲出发，向豫西挺进。',
      '1934年11月',
    ],
    [
      0.34,
      'advance',
      '独树镇突围',
      '部队在方城独树镇一带突破封锁，继续向西进入陕南。',
      '1934年11月下旬',
    ],
    [
      0.74,
      'resolve',
      '转入陕南',
      '部队到达庾家河一带，开始创建鄂豫陕革命根据地。',
      '1934年12月',
    ],
  ],
  'chapter-ex-event-yongping': [
    [
      0,
      'advance',
      '西征北上',
      '红二十五军离开鄂豫陕根据地，向西转战甘肃。',
      '1935年夏',
    ],
    [
      0.36,
      'advance',
      '从陇东向陕北',
      '经过泾川一带后，部队继续向陕北前进。',
      '1935年8月至9月',
    ],
    [
      0.74,
      'resolve',
      '永坪会师',
      '红二十五军在永坪与红二十六、红二十七军会合，随后合编为红十五军团。',
      '1935年9月中旬',
    ],
  ],
  'chapter-ex-event-ganquan': [
    [
      0,
      'wide',
      '永坪整编',
      '在永坪合编后，红十五军团参加了保卫陕北根据地的战斗。',
      '1935年9月后',
    ],
    [
      0.36,
      'advance',
      '向甘泉会合',
      '中央红军到达陕北，两支部队向甘泉一带会合。',
      '1935年秋',
    ],
    [
      0.86,
      'resolve',
      '甘泉会师',
      '红十五军团在甘泉地区同中央红军会师。',
      '1935年11月上旬',
    ],
  ],
};
