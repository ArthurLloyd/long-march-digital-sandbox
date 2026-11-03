/** Editorial narration shared by the macro exhibition and the local artistic board.
 * Not a history schema, coordinate dataset, or human review record. */
export const CAMPAIGN_SOURCES = {
  strategy: {
    id: 'ex-src-sd-strategy',
    title: '四渡赤水出奇兵',
    publisher: '中央网信办转载人民网',
    url: 'https://www.cac.gov.cn/2016-08/22/c_1119430867.htm',
  },
  first: {
    id: 'ex-src-sd-first-deployment',
    title: '第八章 四渡赤水（上）',
    publisher: '人民网党史频道',
    url: 'https://dangshi.people.com.cn/n1/2016/0814/c406330-28634764.html',
  },
  zhaxi: {
    id: 'ex-src-zhaxi-meetings',
    title: '长征中的会议：扎西会议',
    publisher: '共产党员网转载新华网',
    url: 'https://fuwu.12371.cn/2012/06/11/ARTI1339400564382590_5.shtml',
  },
  second: {
    id: 'ex-src-sd-second-museum',
    title: '二渡赤水巧用兵',
    publisher: '四渡赤水纪念馆',
    url: 'https://www.sdcs1935.com/html/yanjiu/sdcs/202007/e3dd4b9a835af3c7.shtml',
  },
  campaign: {
    id: 'ex-src-sd-campaign-museum',
    title: '四渡赤水：中央红军战略转移的决定性胜利',
    publisher: '四渡赤水纪念馆',
    url: 'https://www.sdcs1935.com/html/yanjiu/sdcs/202104/fd2e1eb33ba35bb1.shtml',
  },
  north: {
    id: 'ex-src-sd-north-xinhua',
    title: '1935年红军四渡赤水转战川南 曾佯攻古蔺',
    publisher: '新华网',
    url: 'https://www.xinhuanet.com/politics/2015-02/12/c_127489364.htm',
  },
  west: {
    id: 'ex-src-sd-west-deployment',
    title: '第九章 四渡赤水（下）',
    publisher: '人民网党史频道',
    url: 'https://dangshi.people.com.cn/n1/2016/0814/c406330-28634785.html',
  },
} as const;
export interface CampaignBeat {
  title: string;
  date: string;
  threat: string;
  response: string;
  significance: string;
  sourceKeys: (keyof typeof CAMPAIGN_SOURCES)[];
}
export interface CampaignChapter {
  title: string;
  beats: readonly [CampaignBeat, CampaignBeat, CampaignBeat];
}
export const CHISHUI_CAMPAIGN: Record<string, CampaignChapter> = {
  'chapter-event-sd': {
    title: '四渡赤水 · 为什么反复转向？',
    beats: [
      {
        title: '北上面临围堵',
        date: '1935年1月下旬',
        threat: '国民党军从多个方向逼近黔北，企图阻止中央红军北渡长江。',
        response: '遵义会议后，红军向土城方向前进，寻找北渡长江的机会。',
        significance:
          '最初的北上计划很快遇到敌情变化，随后四次渡河是在不断调整中争取主动。',
        sourceKeys: ['strategy', 'campaign'],
      },
      {
        title: '不是沿一条路一直走',
        date: '1935年1—3月',
        threat: '追兵随红军转移重新部署，河流与山地又限制了行动空间。',
        response: '红军反复改变行进方向，在川滇黔边地区调动敌军、寻找空隙。',
        significance:
          '请同时看红色行动和蓝色追堵；往返渡河背后，是敌我部署的相互变化。',
        sourceKeys: ['strategy', 'campaign'],
      },
      {
        title: '把四次渡河连成因果',
        date: '战役概览',
        threat: '西进、东返并不是没有目标的往返。',
        response: '依次观察土城脱离接触、扎西转兵、回师黔北和折返东渡。',
        significance:
          '每一幕都回答：敌军怎样压迫，红军为什么转向，这次转向争取到了什么。',
        sourceKeys: ['strategy'],
      },
    ],
  },
  'chapter-event-sd-1': {
    title: '一渡赤水 · 从土城危局中转出',
    beats: [
      {
        title: '土城：增援使战斗难以速决',
        date: '1935年1月28日',
        threat:
          '土城、青杠坡战斗中，川军后续部队增援；继续僵持会使红军面临更大围堵压力。',
        response: '红军决定主动撤出战斗，准备从土城南北和猿猴场等处渡河。',
        significance:
          '西渡首先是为脱离不利接触、保存力量，不是已经实现了北渡长江。',
        sourceKeys: ['campaign', 'strategy', 'first'],
      },
      {
        title: '西渡：离开不利交战地域',
        date: '1935年1月29日',
        threat: '土城方向有追兵，川南又有敌军防堵；渡河需要掩护与分路行动。',
        response: '中央红军从不同渡口西渡赤水，向古蔺、叙永相关地区转移。',
        significance:
          '同一画面里的土城、猿猴场是同一次渡河的不同地点，不是发生了两次“一渡”。',
        sourceKeys: ['strategy', 'north'],
      },
      {
        title: '北渡受阻，转向扎西',
        date: '1935年2月上旬',
        threat:
          '叙永一带进攻与转移受阻，长江沿岸防御加强，原定北渡长江的条件恶化。',
        response: '红军暂缓北渡计划，摆脱追截，向川滇黔交界的扎西地区集中。',
        significance:
          '从硬闯堵口转向机动作战，为扎西会议、部队整编和回师黔北创造条件。',
        sourceKeys: ['second', 'strategy', 'north'],
      },
    ],
  },
  'chapter-event-zy-resolution': {
    title: '扎西会议 · 为什么决定回师黔北？',
    beats: [
      {
        title: '扎西不是安全的终点',
        date: '1935年2月上旬',
        threat: '川军从北面、滇军从南面逼近扎西，中央军也向川滇边追击。',
        response: '中央领导在集结和行军过程中继续分析敌情，讨论新的行动方向。',
        significance:
          '敌情变化把战略讨论变成紧迫任务，下一步去向关系到能否继续保持机动。',
        sourceKeys: ['strategy', 'second'],
      },
      {
        title: '会议、决议与整编相互配合',
        date: '1935年2月5—9日；决议于8日通过',
        threat:
          '既要回应现实敌情，也要完成遵义会议尚待落实的工作，增强部队机动与战斗能力。',
        response:
          '扎西期间连续开会，讨论战略方向和部队缩编；2月8日通过遵义会议决议。',
        significance:
          '会议延续并落实遵义会议的转变。这里通过的是决议，不是在扎西重新召开一次遵义会议。',
        sourceKeys: ['zhaxi'],
      },
      {
        title: '敌军西移，黔北出现战机',
        date: '1935年2月10—11日前后',
        threat: '敌军主力向川滇边集中，继续留在扎西会承受夹击。',
        response:
          '红军决定突然回师东进，准备再渡赤水，攻向兵力相对薄弱的黔北。',
        significance:
          '不是简单返回原路，而是利用敌军调动后的部署空隙重新选择战场。',
        sourceKeys: ['second', 'north'],
      },
    ],
  },
  'chapter-event-sd-2': {
    title: '二渡赤水 · 脱离夹击，回师黔北',
    beats: [
      {
        title: '把追兵留在错误的方向',
        date: '1935年2月中旬',
        threat: '川、滇两军逼近扎西，敌军企图在川滇黔交界地区合围红军。',
        response:
          '红军突然东进，在追兵重新调整前抢先接近太平渡、二郎滩等渡口。',
        significance:
          '抓住敌军主力西移、黔北相对空虚的时机，摆脱被动挨堵的局面。',
        sourceKeys: ['second', 'north'],
      },
      {
        title: '东渡之后，敌军急忙追援',
        date: '1935年2月18—21日及其后',
        threat:
          '川军转向东追；黔军从遵义向桐梓、娄山关增援，吴奇伟部也向遵义推进。',
        response:
          '红军从太平渡、二郎滩等处东渡赤水，向桐梓、娄山关方向迅速前进。',
        significance:
          '追击与增援使时间成为关键：必须在对手形成合力前打开前进空间。',
        sourceKeys: ['strategy', 'second'],
      },
      {
        title: '娄山关与遵义：把机动变成战果',
        date: '1935年2月下旬',
        threat:
          '黔军阻拦南进，中央军增援遵义；若敌军合拢，新的行动空间仍可能被封住。',
        response: '红军连续作战，攻取桐梓、娄山关，再占遵义，打击来援之敌。',
        significance:
          '回师后的作战胜利鼓舞士气、补充物资，说明转移方向是为了创造有利战机。',
        sourceKeys: ['second', 'campaign'],
      },
    ],
  },
  'chapter-event-sd-3': {
    title: '三渡赤水 · 避开重兵，再次调敌',
    beats: [
      {
        title: '遵义、鲁班场附近重兵聚集',
        date: '1935年3月上中旬',
        threat:
          '敌军从南北方向压迫遵义、鸭溪地区，周浑元部在鲁班场据守，援敌继续逼近。',
        response:
          '红军寻机作战，鲁班场进攻未能奏效后，主动脱离，向茅台地区机动。',
        significance:
          '避开敌军优势集结，保存主力并寻找新战机，是这次西渡的直接背景。',
        sourceKeys: ['campaign', 'strategy'],
      },
      {
        title: '茅台西渡，重入川南',
        date: '1935年3月16—17日',
        threat: '继续停留在敌军正在集中的地域，会失去机动空间。',
        response: '中央红军从茅台及附近地区西渡赤水，向古蔺、叙永方向活动。',
        significance:
          '再入川南迫使敌军重新判断红军去向，为下一次折返争取条件。',
        sourceKeys: ['north', 'campaign'],
      },
      {
        title: '追兵向河西集中',
        date: '1935年3月中下旬',
        threat:
          '敌军判断红军可能再寻北渡长江机会，向赤水河西岸集中，并加强川南防堵。',
        response: '红军以机动和佯动继续牵动对手，同时准备再次改变方向。',
        significance:
          '三渡与四渡是连在一起的调敌、摆脱过程，不能只看成又过了一次河。',
        sourceKeys: ['campaign', 'west'],
      },
    ],
  },
  'chapter-event-sd-4': {
    title: '四渡赤水 · 诱敌向西，主力折返',
    beats: [
      {
        title: '河西追堵正在合拢',
        date: '1935年3月18—20日前后',
        threat:
          '川军在叙永、古蔺一线防堵，并有部队从茅台西渡追击；敌军企图把红军困在河西。',
        response: '红军没有继续向敌军重兵聚集处硬闯，而是寻找折返东岸的空隙。',
        significance:
          '利用敌人西移后露出的空隙，重新掌握转移方向，是折返东渡的关键。',
        sourceKeys: ['west', 'campaign'],
      },
      {
        title: '以一部佯动，掩护主力东渡',
        date: '1935年3月20—22日',
        threat: '追军正向川南集中，主力转移既要迅速，也要隐蔽。',
        response:
          '红军以一部向古蔺方向佯动，主力突然折向东，从二郎滩、太平渡等处四渡赤水。',
        significance:
          '佯动与主力转移配合，使追兵的集中方向与红军的实际去向出现错位。',
        sourceKeys: ['strategy', 'north'],
      },
      {
        title: '东渡不是终点，继续南下',
        date: '1935年3月下旬及以后',
        threat:
          '渡河后敌军仍可能重新追堵，不能把过河瞬间当成全部突围已经完成。',
        response:
          '主力继续向南疾进，随后南渡乌江，向贵阳方向机动，再向云南转移。',
        significance:
          '四渡打开了继续机动的局面；后续南渡乌江、转向云南和渡金沙江各有自己的过程。',
        sourceKeys: ['strategy', 'campaign'],
      },
    ],
  },
};
export function campaignBeat(
  chapterId: string | null | undefined,
  progress: number,
) {
  const chapter = chapterId ? CHISHUI_CAMPAIGN[chapterId] : undefined;
  if (!chapter) return null;
  const index = progress + 1e-6 < 0.28 ? 0 : progress + 1e-6 < 0.6 ? 1 : 2;
  return {
    chapter,
    index,
    beat: chapter.beats[index]!,
    start: [0, 0.28, 0.6][index]!,
  };
}
export function campaignSourceList(
  keys: readonly (keyof typeof CAMPAIGN_SOURCES)[],
) {
  return [...new Set(keys)].map((key) => CAMPAIGN_SOURCES[key]);
}
