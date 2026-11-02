import type { RegionId } from '../atlas/regions';

export type RegionHotspotId = 'terrain' | 'people' | 'detail';

export interface RegionStory {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  cover: string;
  hotspots: readonly {
    id: RegionHotspotId;
    title: string;
    kicker: string;
    text: string;
  }[];
  question: {
    prompt: string;
    choices: readonly [string, string];
    answer: 0 | 1;
    explanation: string;
  };
}

export const REGIONAL_ART_DISCLOSURE = '艺术场景 · 红军人物为代表性塑造';

const covers = {
  river: '/assets/textures/immersive-landscapes/river-valley-cover.webp',
  snow: '/assets/textures/immersive-landscapes/snow-pass-cover.webp',
  grass: '/assets/textures/immersive-landscapes/grassland-cover.webp',
} as const;

/** Observation writing for artistic spaces, separate from reviewed historical scripts. */
export const REGION_STORIES: Record<RegionId, RegionStory> = {
  ruijin: {
    eyebrow: '第一卷 · 瑞金周边',
    title: '青山行囊',
    subtitle: '从一段山路，走近远行的人。',
    description:
      '村舍、山径与林木构成眼前的出发意象。沿着视线走近队伍，看看背上的行囊，再回望身后的屋舍：辽阔山河之中，每一步都由具体的人走过。',
    cover: covers.river,
    hotspots: [
      {
        id: 'terrain',
        title: '山径与村舍',
        kicker: '先看环境',
        text: '从近处的路面望向山坡，观察道路、房屋与林地怎样连接。转动视角，比只看俯视图更容易体会坡地的高低。',
      },
      {
        id: 'people',
        title: '肩上的行囊',
        kicker: '走近队伍',
        text: '留意人物肩背和行装的轮廓，再把视线移到脚边的路。山河不再只有远景，也有行囊的重量和一步步前行的尺度。',
      },
      {
        id: 'detail',
        title: '路旁的物件',
        kicker: '靠近生活细节',
        text: '看一看路旁的木箱与小车，辨认车轮、把手和箱体的结构。离开辽阔远景之后，一件件物品把目光带回行路的日常。',
      },
    ],
    question: {
      prompt: '山路漫长，怎样安排随身行装，才能让队伍走得更远？',
      choices: [
        '按需要整理、分担物资，让负重适合各自体力',
        '把物资集中给少数人，让其余人尽量轻装',
      ],
      answer: 0,
      explanation:
        '行囊背得起，还要背得远。过重的负担会让人更快疲惫；合理整理和分担，照顾同伴的体力，才能让整支队伍保持持续前行的节奏。',
    },
  },
  zunyi: {
    eyebrow: '第二卷 · 遵义周边',
    title: '城巷灯影',
    subtitle: '走过街巷，停在历史的门前。',
    description:
      '山城的建筑与街巷，把视线从广阔地形收拢到人的尺度。走近门窗、屋檐和街边的队伍，感受空间的安静；关于会议的内容与人物，则需要回到史料中阅读。',
    cover: covers.river,
    hotspots: [
      {
        id: 'terrain',
        title: '山城街巷',
        kicker: '观察空间',
        text: '看看建筑沿道路的排列，以及街道怎样被屋檐和墙面围合。沿街望去，近处的墙面遮住远方，转过视角，空间又逐渐展开。',
      },
      {
        id: 'people',
        title: '街边的身影',
        kicker: '人物与尺度',
        text: '以人物为参照，观察门窗、墙面和街道的大小。站在队伍身旁看一眼，再退到街巷远端，感受同一座建筑的远近变化。',
      },
      {
        id: 'detail',
        title: '桌边片刻',
        kicker: '靠近细节',
        text: '走近屋前的桌子，看看桌面铺开的浅色织物与杯盏，再回望后方的门窗。场景把视线从街巷收拢到一个可以停留的角落。',
      },
    ],
    question: {
      prompt: '队伍从开阔山路走入街巷，怎样避免在转角处分散？',
      choices: [
        '只看前方领队，尽快穿过每一个路口',
        '辨认岔路和转角，保持间距与前后联系',
      ],
      answer: 1,
      explanation:
        '街巷里的墙面和转角会遮挡视线。看清去向、照应身后的同伴，比一味加快脚步更重要；队伍的联系，也要随着空间的变化而调整。',
    },
  },
  chishui: {
    eyebrow: '第三卷 · 赤水流域',
    title: '赤水回环',
    subtitle: '沿水望山，在转折中读懂空间。',
    description:
      '山坡逼近河岸，林木与水面形成深浅相间的层次。走近岸边的队伍，再把视线交给远处的河谷：一片水面之外，还有需要反复辨认的山势与通行空间。',
    cover: covers.river,
    hotspots: [
      {
        id: 'terrain',
        title: '山水相接',
        kicker: '远望地形',
        text: '顺着水面看向远处，观察两岸的山坡与林木。把镜头从高处放低，比较俯瞰河谷和临江而望时不同的空间层次。',
      },
      {
        id: 'people',
        title: '岸边行列',
        kicker: '走近人物',
        text: '从人物高度看河面，再从高处回看队伍。同一处环境会显出不同的宽窄和远近，也更容易感受到岸边空间的局促。',
      },
      {
        id: 'detail',
        title: '水岸之间',
        kicker: '寻找连接',
        text: '留意岸坡、落脚处与水面的高低关系。思考队伍接近河岸时，需要先了解哪些地形与通行条件。',
      },
    ],
    question: {
      prompt: '隔着河谷看去，对岸似乎很近。行进前还要看清什么？',
      choices: [
        '坡地起伏、河岸的通行条件，以及两岸如何连接',
        '两地的直线距离，距离短就能走得快',
      ],
      answer: 0,
      explanation:
        '看得近，不一定走得近。山坡、水面与岸边的落脚条件都会影响通行；把眼前的河谷看完整，才能理解一段路为何需要更多时间与体力。',
    },
  },
  jinsha: {
    eyebrow: '第四卷 · 金沙江谷地',
    title: '江岸待渡',
    subtitle: '一岸望向另一岸，距离有了重量。',
    description:
      '从岸边望出去，江面把两岸分开。船、岸坡和人物构成渡河情境的观察线索。走近看一看，再退远一些，体会通行工具与广阔河谷之间的尺度差异。',
    cover: covers.river,
    hotspots: [
      {
        id: 'terrain',
        title: '两岸相望',
        kicker: '先辨河岸',
        text: '比较近岸与远岸的坡势，看看哪里是水面、哪里是落脚的地面。把目光从脚下移向对岸，感受水面如何将两边的空间分开。',
      },
      {
        id: 'people',
        title: '临江的队伍',
        kicker: '贴近人的视线',
        text: '把镜头放低，让视线接近队伍。宽阔江面与人的对照，让渡河不再只是地图上的一个点，而成为可以观察的空间问题。',
      },
      {
        id: 'detail',
        title: '舟与岸',
        kicker: '观察通行',
        text: '观察舟体和岸边的连接方式，再想想登岸、装载与通行各需要什么条件。将视线放低，舟舷、水面与岸坡的关系会更清楚。',
      },
    ],
    question: {
      prompt: '让队伍有序渡河，除了有船，还需要一起考虑什么？',
      choices: [
        '只要船能离岸，就让更多人同时上船',
        '船只承载、水势、上下船地点与人员次序',
      ],
      answer: 1,
      explanation:
        '渡河连接着两岸，也连接着许多人的配合。船的承载、靠岸条件和人员次序需要相互协调；岸上的等待与接应，同样是通行的一部分。',
    },
  },
  luding: {
    eyebrow: '第五卷 · 泸定河谷',
    title: '峡谷与桥',
    subtitle: '桥索横江，人的脚步与山河相遇。',
    description:
      '先看两岸石壁与江面，再沿桥索走近队伍。远处是一座横跨河谷的桥，近处是桥板、绳索与人的步伐。切换视角，感受整体结构和脚下细节之间的变化。',
    cover: covers.river,
    hotspots: [
      {
        id: 'terrain',
        title: '两岸石壁',
        kicker: '远望峡谷',
        text: '观察桥面与两岸石壁的高度关系。水面、山壁和桥共同围出一个狭长空间，先看整体，再走近桥体。',
      },
      {
        id: 'people',
        title: '桥上的队伍',
        kicker: '近看人物',
        text: '从桥边观看人物的行装与步伐，再把目光投向桥下。脚步、狭长桥面与开阔江水出现在同一个视野里，人的尺度由此更加鲜明。',
      },
      {
        id: 'detail',
        title: '桥索与桥板',
        kicker: '观察结构',
        text: '沿着桥索辨认桥面的支撑关系，再低头看看桥板。试着追踪一根桥索，从眼前的细节一直望到远端的岸壁。',
      },
    ],
    question: {
      prompt: '队伍经过狭长桥面，怎样让前后的脚步相互配合？',
      choices: [
        '留意脚下，保持合理间距，并与前后同伴呼应',
        '各自按最快速度前进，到了桥头再集合',
      ],
      answer: 0,
      explanation:
        '桥面把通行空间收窄，前面的停顿也会影响后面的人。留意脚下、保持间距并相互照应，让每个人的动作接得上，队伍才能有序通过。',
    },
  },
  snow: {
    eyebrow: '第六卷 · 川西雪山',
    title: '雪岭同行',
    subtitle: '天地辽阔，身边的同行者更加清晰。',
    description:
      '雪色把远山与近路连在一起。让镜头停在队伍身旁，观察坡地、脚下与行囊；再抬头看向山脊，体会人在高山环境中的渺小与彼此陪伴的分量。',
    cover: covers.snow,
    hotspots: [
      {
        id: 'terrain',
        title: '雪脊与坡面',
        kicker: '远望山势',
        text: '寻找近处坡面与远处山脊的分界。明暗、雾层和遮挡帮助辨认远近；低处的岩石与高处的雪脊，共同勾出山势。',
      },
      {
        id: 'people',
        title: '与队伍同行',
        kicker: '走近身影',
        text: '从侧面观察人物与坡地的关系，留意肩背和脚步。当镜头靠近同行者，原本辽阔的远景也有了可以对照的尺度。',
      },
      {
        id: 'detail',
        title: '岩石旁的停驻',
        kicker: '改变观看尺度',
        text: '走近岩石旁的帐篷，留意支撑和拉绳，再看看一旁的箱子。小小的停驻空间与远处雪岭形成对照，把目光带回人的生活。',
      },
    ],
    question: {
      prompt: '面对寒冷与上坡的消耗，怎样安排持续行进更合理？',
      choices: [
        '始终加快脚步，尽量不调整衣物和节奏',
        '兼顾御寒、体力与步速，及时照应疲惫的同伴',
      ],
      answer: 1,
      explanation:
        '寒冷与坡度让行路更耗体力。御寒和稳定节奏要一起考虑，也要留意同行者的状态；走向远处的山脊，需要持续的体力和彼此的照应。',
    },
  },
  grass: {
    eyebrow: '第七卷 · 川西北草地',
    title: '旷野相伴',
    subtitle: '在开阔天地中，看见人和生活。',
    description:
      '远方铺开，近处却有草丛、水面与不平的地面。走到队伍身边，再看看停驻的空间与随身物件。环境的辽阔和人的日常，在这里进入同一个画面。',
    cover: covers.grass,
    hotspots: [
      {
        id: 'terrain',
        title: '草地与水面',
        kicker: '辨认地表',
        text: '观察草丛、低洼水面和地面的区别。远看连成一片的草地，靠近之后才显出不同的落脚条件。',
      },
      {
        id: 'people',
        title: '旷野中的身影',
        kicker: '走近队伍',
        text: '用人物高度比较周围草地和远方地平线。远看时，队伍是旷野中的一小片轮廓；靠近之后，行装与地面的细节逐渐清晰。',
      },
      {
        id: 'detail',
        title: '停驻的片刻',
        kicker: '留意生活',
        text: '看看停驻处与行装，把注意力从大地形转向生活。留意人与物件如何围出一小片空间，再回望四周延伸的草地。',
      },
    ],
    question: {
      prompt: '草地远看平整开阔，落脚之前最需要留意什么？',
      choices: [
        '辨认积水和地面变化，谨慎确认落脚处的承托',
        '只看远处方向，沿颜色相近的草地加快行进',
      ],
      answer: 0,
      explanation:
        '远处连成一片的草色，近看可能藏着积水与湿洼。不能只凭颜色判断地面是否稳固；留心脚下、相互提醒，才能理解开阔草地里的行路难处。',
    },
  },
  reunion: {
    eyebrow: '第八卷 · 陕甘地区',
    title: '山河相望',
    subtitle: '走近黄土层峦，也回望来时的山河。',
    description:
      '黄土色的山坡与层层起伏，把视野带到另一片天地。看看队伍、地面与远山的关系，再回望此前见过的河谷、雪岭和草地：不同环境，留下不同的观看记忆。',
    cover: covers.grass,
    hotspots: [
      {
        id: 'terrain',
        title: '黄土层峦',
        kicker: '辨认地貌',
        text: '从近处坡面观察远处层峦，留意沟谷与山脊的明暗变化。暖色的地面逐渐退入远方，层层山势让视线有了停留之处。',
      },
      {
        id: 'people',
        title: '山前的队伍',
        kicker: '看见同行者',
        text: '人物与山坡构成大小鲜明的对照。先看身边的队伍，再把视线放远；在人的脚步之外，山河仍向四周展开。',
      },
      {
        id: 'detail',
        title: '停驻与回望',
        kicker: '走近生活',
        text: '走近石块围成的火塘，看看木柴与身边的停驻空间，再回望黄土色的山坡。从生活细节到远山，让视线慢慢展开。',
      },
    ],
    question: {
      prompt: '山坡接连起伏，怎样让队伍保持长久的行进节奏？',
      choices: [
        '上坡尽量冲快，下坡各自走，落后的人再追赶',
        '随坡势调整步速，留意脚下，并照顾整队的体力',
      ],
      answer: 1,
      explanation:
        '一处坡顶之外，往往还有下一道起伏。上坡保存体力，下坡留意落脚，并让前后保持联系；走得持久，需要把个人脚步放进整队的节奏。',
    },
  },
};
