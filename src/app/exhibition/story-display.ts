import type {
  HistoricalPerson,
  AssetReference,
  HistoryEvent,
  HistoryDatasetV2,
} from '../../shared/contracts';

// Reading copy only. The original records, review fields and editorial notes remain intact.
const biographies: Record<string, string> = {
  'person-mao':
    '遵义会议上被增选为中央政治局常委，参与长征期间的重要军事决策。',
  'person-zhou': '遵义会议的参加者之一，参与中央红军的军事指挥工作。',
  'person-zhu': '红军主要领导人之一，参加遵义会议，参与长征中的军事指挥。',
  'person-liu': '率先遣部队参与控制皎平渡，为中央红军渡过金沙江创造条件。',
  'person-yang': '红四团政治委员，参与飞夺泸定桥。',
  'person-huang': '红四团团长，与政治委员杨成武共同率领部队参加飞夺泸定桥。',
};
// C's reading presentation of B's existing facts. Original text and source notes
// remain available in Sources; no review or release field is changed.
const narratives: Record<string, string[]> = {
  'ex-event-yudu-assembly': [
    '战略转移前，红一、红三、红五、红八、红九军团与军委、中央两支机关纵队，陆续移交防务，向于都河以北地区集结。',
    '各部承担接防、掩护、休整与物资补充等任务。红五军团担任后卫，其他部队与机关纵队相互策应，为大部队转移争取时间。',
    '10月中旬，各路红军先后完成集结，随即组织分批渡河。地方群众支援架桥、筹粮和运输，与红军共同保障远征出发。',
  ],
  'ex-event-yudu-crossing': [
    '于都集结后，中央机关与红军主力分批渡过于都河，人员、装备和物资运输同接防与掩护相衔接。',
    '1934年10月17日起，各部利用浮桥等条件组织夜渡。当地群众支援架桥、筹粮和运输，帮助红军渡河出发。',
    '渡河之后，红军继续向西转移，接连突破敌军封锁，远征由此展开。',
  ],
  'ex-event-blockades': [
    '离开于都后，国民党军在赣南、粤北和湘南设置封锁。中央红军结合迂回、交涉与作战，寻求西进通道。',
    '1934年10月下旬至11月中旬，红军连续通过前三道封锁线，随后向湘江一线推进。',
    '部队在前进中承担开路、掩护和后卫任务，机关与主力穿过封锁地带，迎来更加艰巨的湘江战役。',
  ],
  'ex-event-liping': [
    '湘江战役后，红军在严密的追堵中重新选择前进方向。通道的紧急讨论推动部队转兵贵州。',
    '1934年12月18日，中央政治局在黎平召开会议，接受继续向贵州西北进军的主张，通过关于战略方针的决定。',
    '红军由此向黔北转进，为随后召开遵义会议、总结军事指挥经验创造了条件。',
  ],
  'ex-event-dawei': [
    '中央红军渡过大渡河、翻越夹金山后，继续同红四方面军取得联系。红四方面军派出部队迎接。',
    '1935年6月12日，两军先头部队在达维以南、夹金山北麓地区会合。',
    '先头部队的相逢打开了进一步集结的条件，随后中央机关与主力陆续向懋功地区集中。',
  ],
  'ex-event-maogong': [
    '达维附近会合后，两军各部继续向懋功地区集中。',
    '1935年6月18日，中共中央、中革军委与中央红军主力到达懋功地区。红一、红四方面军的会合增强了红军力量。',
    '会合后，红军继续研究建立根据地和北上的行动方向，长征进入新的阶段。',
  ],
  'ex-event-lazikou': [
    '走出草地后，北上的红一、红三军和军委纵队继续向甘肃前进。腊子口险隘成为北上通道的重要关口。',
    '1935年9月中旬，红军攻克腊子口，打开北上通路。经过艰难战斗，部队进入甘南，向哈达铺一带前进。',
    '胜利为后续休整、补给与选择落脚点创造了条件。',
  ],
  'ex-event-hadapu': [
    '长期行军与连续战斗之后，红军在哈达铺得到休整和补给。',
    '领导人从报纸中了解到陕北红军和根据地的消息。毛泽东等结合形势判断北上方向，部队在这一阶段整编为陕甘支队，彭德怀任司令员，毛泽东任政治委员。',
    '1935年9月中下旬，各部完成休整和整编，继续向陕甘根据地前进。',
  ],
  'ex-event-wuqi': [
    '明确北上方向后，陕甘支队继续突破阻截，向已有红军和根据地基础的陕甘地区前进。',
    '1935年10月19日，中共中央与陕甘支队到达吴起镇，中央红军主力的长征胜利结束。',
    '随后，中央红军继续同当地红军相互策应，向新的会合与共同作战迈进。',
  ],
  'ex-event-red25-start': [
    '红二十五军由鄂豫皖地区出发，开启一条独立的长征行动线。',
    '1934年11月，部队离开原根据地，转战陕南，投入创建鄂豫陕苏区的斗争。1935年7月继续向西北转移。',
    '此后，红二十五军向陕北前进，同当地红军会合。',
  ],
  'ex-event-yongping': [
    '转战陕南等地后，红二十五军继续向陕甘根据地前进。',
    '1935年9月中旬，红二十五军与红二十六、红二十七军在永坪地区会合，随后合编为红十五军团。徐海东任军团长，程子华任政治委员，刘志丹任副军团长兼参谋长。',
    '会合与整编增强了陕北红军力量，为共同保卫根据地创造了条件。',
  ],
  'ex-event-ganzi': [
    '红二、红六军团长途转战，在1936年6月底至7月初抵达甘孜地区，同红四方面军会合。',
    '会合后，各部相互策应，继续准备北上。',
    '甘孜会师为红二方面军的组成和后续北上行动创造了条件。',
  ],
  'ex-event-red2-formed': [
    '1936年7月，红二、红六军团与红三十二军合编为红二方面军，贺龙任总指挥，任弼时任政治委员。',
    '新的组织关系加强了协同。红二方面军与红四方面军相互策应，继续北上，向大会师前进。',
  ],
  'ex-event-huining': [
    '各路红军经过不同地区的长期转战，逐渐向陕甘地区汇聚。',
    '1936年10月9日，红一方面军与红四方面军在甘肃会宁会师。此时红二方面军继续北上。',
    '随后，红二方面军在将台堡同红一方面军会师，共同构成长征大会师的胜利进程。',
  ],
  'ex-event-jiangtai': [
    '会宁会师后，红二方面军继续沿北上方向前进，红一方面军积极接应。',
    '1936年10月22日，红二方面军在贺龙、任弼时等率领下到达将台堡，同红一方面军胜利会师。',
    '红军各路主力长期转战、相互策应，最终实现大会师。长征的胜利保存和锻炼了革命力量，开启了新的征程。',
  ],
  'event-zy': [
    '第五次反“围剿”失败及长征初期的损失，促使党内重新检视军事指挥。此前的相关会议为进一步讨论创造了条件。',
    '1935年1月15日至17日，中央政治局在贵州遵义召开扩大会议，讨论军事领导的经验教训并调整领导机构。毛泽东被增选为中央政治局常委。',
    '张闻天受委托起草相关决议，决议于2月8日经中央政治局会议通过。遵义会议成为党在危急处境中独立探索革命道路的重要转折。',
  ],
  'event-sd': [
    '遵义会议后，中央红军在川黔滇边境的敌军压力下调整行动方向。四次渡河与部队的转向、机动相互联系。',
    '1月29日的一渡行动涉及土城、猿猴场等地区；2月18日至21日，红军由太平渡、二郎滩等地二渡赤水，回到黔北。',
    '3月16日至17日，红军经茅台及附近地区三渡赤水；3月21日至22日，再由太平渡、二郎滩等地四渡赤水。',
  ],
  'event-sd-1': [],
  'event-sd-2': [],
  'event-sd-3': [],
  'event-sd-4': [],
  'event-js': [
    '进入云南后，中央红军通过机动和佯动争取北渡金沙江的条件，提前准备渡江入川。',
    '刘伯承率领的先遣部队参与抢占皎平渡，随后组织渡江。控制两岸、组织船只和船工，为主力通行创造了条件。',
    '1935年5月3日至9日，中央红军主力陆续渡过金沙江，继续向川西方向行动。',
  ],
  'event-ld': [
    '安顺场渡河打开突破口后，有限的摆渡条件仍难以迅速保障大部队通行。中央红军分路向泸定方向行动。',
    '担任夺桥任务的红一军团第二师第四团，在团长黄开湘、政治委员杨成武率领下，沿大渡河西岸赶赴泸定，于1935年5月29日抵达西桥头。',
    '红四团在准备后发起夺桥行动，突击与后续铺板等行动相互配合，最终控制桥梁。',
    '夺桥胜利后，中央红军主力陆续通过大渡河，继续北上。',
  ],
  'event-sn': [
    '中央红军通过大渡河后，向夹金山方向前进。1935年6月，先头部队与中央机关分批翻越雪山。',
    '高山环境给行进和保障带来困难。御寒、寻找掉队人员、组织医疗保障，成为行军中的重要任务。',
    '翻越夹金山之后，中央红军与红四方面军在川西北会合，长征进入新的阶段。',
  ],
  'event-gr': [
    '红一、红四方面军会合后，部队混编为左右两路军。右路军包括两方面军的部分部队。',
    '1935年8月，右路军自毛儿盖方向进入草地，随后抵达班佑、巴西等地区，继续北上。',
    '湿地通行、宿营和食物保障相互牵连。将士们在粮食不足等困难中坚持行进。',
  ],
  'event-anshunchang': [
    '红一军团第一师第一团于1935年5月24日到达安顺场，次日清晨组织突击渡河。',
    '水急、船少，限制了大部队过河的速度。渡河成功之后，红军继续向泸定桥方向行动。',
  ],
  'event-zy-resolution': [
    '遵义会议于1935年1月15日至17日召开。会后，张闻天受委托起草相关决议。',
    '1935年2月8日，中央政治局会议通过相关决议，会议讨论与后续组织调整逐步展开。',
  ],
};
export function eventNarrative(event: HistoryEvent) {
  return (
    narratives[event.id] ??
    event.detail
      .split(/\n\s*\n/)
      .map(readingCopy)
      .filter(
        (p) =>
          p &&
          !/^(材料边界|资料边界|使用条件|素材条件|工程说明|程序说明|图像配对|照片出处|编辑性摘要|限制|局限|使用说明)/.test(
            p,
          ),
      )
  );
}
export function readingCopy(text: string) {
  return text
    .replace(/(?:^|\n)(?:依据|出处)[:：]\s*src-[^\n]*/g, '')
    .replace(/（src-[^）]*）|\(src-[^)]*\)/g, '')
    .split(/(?<=[。！？])/u)
    .filter((sentence) => {
      if (
        /本章|本页|本项目|本条|本体验|本专题|卡片|此处|程序|工程|页面|界面|字段|素材|坐标|所配.*照片|使用条件|Commons|官方叙述.*表述|按.*时段说明|用于.*识别|编辑概述|逐字记录|通关|明确完成按钮|请打开|请依次|请完成|接下来完成|选项用于|提交不会/.test(
          sentence,
        )
      )
        return false;
      if (
        /不能.{0,12}(?:画|写|替代|移作|推导|换算|说明)|不应.{0,8}(?:缩|写|混)|不把.{0,18}(?:并入|混同|套用)|观看时应|观察重点|应该.*理解|须区分/.test(
          sentence,
        )
      )
        return false;
      if (
        /不能|不得|须|不应|不等于|不据此|不扩展/.test(sentence) &&
        /虚构|推断|推算|写成|压成|拼成|缩成|现代纪念地|说明|证明|冒充|回填|时刻|同一|全部|对话|对白|证据|理解/.test(
          sentence,
        )
      )
        return false;
      return true;
    })
    .join('')
    .replace(
      /^(?:背景|经过|影响|联系|结果与联系|范围|环境与生活|环境|到达|行动|通行|一、二渡|三、四渡)[｜：]\s*/,
      '',
    )
    .replace(/〔[^〕]+〕|\[src-[^\]]+\]/g, '')
    .trim();
}
/** Move the substantive teaching knowledge into ordinary reading; no tasks,
 * progress gates or synthetic completion records are created. */
export function teachingKnowledge(
  event: HistoryEvent,
  dataset: HistoryDatasetV2,
  existing: readonly string[],
) {
  const experience = dataset.experiences.find((e) =>
    e.linkedEventIds.includes(event.id),
  );
  if (!experience) return { paragraphs: [], sourceIds: [] };
  const records = [
    ...dataset.segments.filter(
      (s) =>
        s.experienceId === experience.experienceId &&
        ['context', 'process', 'conclusion'].includes(s.kind),
    ),
    ...dataset.interactions.filter(
      (i) => i.experienceId === experience.experienceId,
    ),
  ];
  const seen = existing.map((p) => p.replace(/[\s\p{P}]/gu, ''));
  const paragraphs: string[] = [];
  // These are the historical knowledge points from the six teaching scripts.
  // Keep their source records, while leaving task instructions, media criticism
  // and completion mechanics in the original auditable records rather than prose.
  const notes: Record<string, string[]> = {
    'event-zy': [],
    'event-sd': [
      '二渡赤水后，中央红军回到黔北，针对王家烈黔军展开行动。四次渡河与转向、机动相互衔接。',
    ],
    'event-js': [
      '抢占渡口、控制两岸，为渡江打开通道；组织船只、船工和部队分批通行，保障主力陆续过江。',
    ],
    'event-ld': ['突击队向前夺桥时，后续部队铺设桥板，协力打通通道。'],
    'event-sn': [
      '1935年6月12日，先头部队在川西北会合；6月14日，中央机关翻越夹金山。部队在不同时间分批通过雪山。',
    ],
    'event-gr': [
      '1935年8月21日，右路军自毛儿盖方向进入草地，随后经过班佑、巴西等地，继续北上。',
    ],
  };
  for (const text of notes[event.id] ?? []) {
    for (const part of text.split(/\n\s*\n/)) {
      const clean = readingCopy(part);
      if (!clean) continue;
      const sentences = clean
        .split(/(?<=[。！？])/u)
        .filter((s) => {
          const key = s.replace(/[\s\p{P}]/gu, '');
          if (!key || seen.some((p) => p.includes(key))) return false;
          seen.push(key);
          return true;
        })
        .join('');
      if (sentences) paragraphs.push(sentences);
    }
  }
  return {
    paragraphs,
    sourceIds: [...new Set(records.flatMap((r) => r.sourceIds))],
  };
}
export function personBiography(person: HistoricalPerson) {
  return biographies[person.personId] ?? readingCopy(person.detail);
}
export function portraitCaption(
  asset: Pick<AssetReference, 'assetId' | 'title'>,
) {
  const dates: Record<string, string> = {
    'asset-mao-photo': '1950年',
    'asset-zhou-photo': '1917年',
    'asset-zhu-photo': '1922年',
    'asset-liu-photo': '20世纪20年代',
    'asset-yang-photo': '1937年11月，合影左起第三人',
  };
  return dates[asset.assetId] ?? asset.title;
}
