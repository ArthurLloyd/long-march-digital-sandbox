import type {
  HistoricalPerson,
  AssetReference,
  HistoryEvent,
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
    .replace(/（src-[^）]*）|\(src-[^)]*\)/g, '')
    .split(/(?<=[。！？])/u)
    .filter((sentence) => {
      if (
        /本章|本页|本项目|本条|卡片|此处|程序|工程|页面|界面|字段|素材|坐标|所配.*照片|使用条件|Commons|官方叙述.*表述|按.*时段说明|用于.*识别/.test(
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
    .replace(/〔[^〕]+〕|\[src-[^\]]+\]/g, '')
    .trim();
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
