import type { HistoricalPerson, AssetReference } from '../../shared/contracts';

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
export function readingCopy(text: string) {
  return text
    .split(/(?<=[。！？])/u)
    .filter((sentence) => {
      if (
        /本章|本页|本项目|本条|卡片|此处|程序|工程|页面|界面|字段|素材|坐标|所配.*照片|使用条件|Commons|不同官方叙述|按.*时段说明|用于.*识别/.test(
          sentence,
        )
      )
        return false;
      if (
        /不能|不得|须|不应|不等于|不据此|不扩展/.test(sentence) &&
        /虚构|推断|推算|写成|压成|拼成|说明|证明|冒充|回填|时刻|同一|全部|对话|对白|证据|理解/.test(
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
