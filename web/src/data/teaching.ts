export type Pillar = 'space' | 'drive' | 'control';

export interface TeachingNote {
  title: string;
  what: string;
  why: string;
  hint: string;
  pillar: Pillar;
}

export const PILLAR_META = {
  space: { label: '空间', color: '#5B6B7A' },
  drive: { label: '传动', color: '#C2652A' },
  control: { label: '控制', color: '#1F6B3A' },
} as const;

export const TEACHING: Record<string, TeachingNote> = {
  body: {
    title: '散热壳体',
    what: '把电机、减速器和轴承包成一个整体，并带走热量。',
    why: '外壳同时是定子座、刚轮座和轴承座，少一层套壳就少一段长度。',
    hint: '表面的环槽不是为了好看，是增加散热面积。',
    pillar: 'space',
  },
  stator: {
    title: '无框定子',
    what: '没有外壳的电机定子，直接压进关节壳体。',
    why: '省掉电机自己的机壳和端盖，径向尺寸全部让给扭矩。',
    hint: '它自己不转，转的是里面那圈磁钢。',
    pillar: 'drive',
  },
  windings: {
    title: '铜绕组',
    what: '24 个集中绕组，通电后推动转子旋转。',
    why: '集中绕组端部短、铜耗低，适合关节这种需要连续出力的场合。',
    hint: '铜线不是越粗越好，槽满率和散热先到极限。',
    pillar: 'drive',
  },
  rotor: {
    title: '空心转子轴',
    what: '把电机转子和波发生器连在同一根空心轴上。',
    why: '一根轴同时做转子支撑和动力输入，中间还留出 Ø20 走线孔。',
    hint: '转子转得比输出快 50 倍，惯量必须做得小。',
    pillar: 'drive',
  },
  magnets: {
    title: '转子磁钢',
    what: '20 极表贴 NdFeB 磁钢，提供电机磁场。',
    why: '表贴磁钢转子惯量小，配合无框定子能把扭矩密度做高。',
    hint: '磁钢外面还要套一层碳纤维，不然高速时会被甩开。',
    pillar: 'drive',
  },
  sleeve: {
    title: '碳纤维护套',
    what: '一圈薄薄的 CFRP，把磁钢牢牢压在转子上。',
    why: '碳纤维不导磁、强度高，比金属护套的涡流损耗小。',
    hint: '它只承受 hoop 方向的力，所以可以做得比纸还薄。',
    pillar: 'drive',
  },
  rear_end_bell: {
    title: '后端盖',
    what: '承载后轴承和输入端编码器的尾端结构。',
    why: '把后轴承和编码器独立成一件，装配和维修都不用拆主体。',
    hint: '它和主体分开，是为了让定子能从后面装进去。',
    pillar: 'space',
  },
  rear_cover: {
    title: '后盖',
    what: '输入端编码器的检修盖，也是走线孔的外端。',
    why: '拆下四颗 M3 就能看到编码器板，不用打开整个关节。',
    hint: '它不承力，只负责防尘和定位。',
    pillar: 'space',
  },
  rear_bearing: {
    title: '后轴承 6806',
    what: '支撑输入轴后端的深沟球轴承。',
    why: '前后两只 6806 把输入轴夹住，跨距 41 mm，刚性足够。',
    hint: '后轴承外圈是浮动的，留了热膨胀的余地。',
    pillar: 'control',
  },
  front_bearing: {
    title: '前轴承 6806',
    what: '支撑输入轴前端、靠近波发生器的深沟球轴承。',
    why: '前轴承做轴向定位，后轴承浮动，避免两端过约束。',
    hint: '它离波发生器很近，但不算波发生器的支撑。',
    pillar: 'control',
  },
  input_encoder_ring: {
    title: '输入端磁环',
    what: '装在转子后端的 14 位磁环，随转子一起转。',
    why: '电机换相需要知道转子的绝对角度，磁环直接给出这个信号。',
    hint: '它读的是电机端，不是关节输出端。',
    pillar: 'control',
  },
  input_encoder_pcb: {
    title: '输入端编码器板',
    what: '侧置读头板，隔着 1.2 mm 气隙读磁环。',
    why: '板子藏在后端盖里，拆后盖就能维护，不占轴向长度。',
    hint: '读头和磁环之间不能有金属屑，装配时要防污染。',
    pillar: 'control',
  },
  cs: {
    title: '刚轮',
    what: '102 齿的刚性内齿轮，固定在壳体上。',
    why: '它比柔轮多 2 齿，齿差 2 就是 50:1 的来源。',
    hint: '刚轮不转，反力却全部由它传给壳体。',
    pillar: 'drive',
  },
  fs: {
    title: '柔轮',
    what: '100 齿的薄壁杯，被波发生器撑成椭圆。',
    why: '薄壁让它能弹性变形，长轴处啮合、短轴处脱开，形成减速。',
    hint: '柔轮不是越厚越强，太厚就撑不动、太薄会疲劳。',
    pillar: 'drive',
  },
  wg_cam: {
    title: '波发生器凸轮',
    what: '椭圆凸轮，把柔轮撑成椭圆并随输入轴旋转。',
    why: '凸轮转一圈，柔轮相对刚轮只前进 2 齿，得到 50:1。',
    hint: '它的长轴不是固定方向，而是一直在转。',
    pillar: 'drive',
  },
  wg_balls: {
    title: '波发生器钢球',
    what: '18 颗钢球，把凸轮的椭圆运动传给柔轮内壁。',
    why: '钢球把滑动摩擦变成滚动摩擦，效率高、发热小。',
    hint: '钢球尺寸很小，但决定了柔轮的变形形状。',
    pillar: 'drive',
  },
  wg_race: {
    title: '柔性外圈',
    what: '波发生器的椭圆薄壁外圈，直接接触柔轮内壁。',
    why: '它把载荷分散到柔轮内壁，避免局部压痕。',
    hint: '外圈本身也会轻微变形，不是完全刚性的。',
    pillar: 'drive',
  },
  crb_outer: {
    title: '交叉滚子外圈',
    what: '固定在主体上的轴承外圈，承受输出端的倾覆力矩。',
    why: '交叉滚子轴承能同时承受径向、轴向和力矩，输出刚性高。',
    hint: '它不参与减速，只负责把负载接住。',
    pillar: 'control',
  },
  crb_inner: {
    title: '交叉滚子内圈',
    what: '压在输出法兰上的内圈，随输出一起转。',
    why: '内圈和输出法兰一体，负载路径短，形变小。',
    hint: '内圈由旋转肩台和轴环锁住，不靠过盈硬撑。',
    pillar: 'control',
  },
  crb_cage: {
    title: '交叉滚子',
    what: '36 个交替 ±45° 的圆柱滚子，组成交叉滚子轴承。',
    why: '交替 45° 让一套轴承同时承担两个方向的力矩。',
    hint: '滚子不是垂直排列，而是斜着交叉。',
    pillar: 'control',
  },
  output_flange: {
    title: '输出法兰',
    what: '客户的负载接口，Ø82 法兰面、8×M5、Ø42 止口。',
    why: '它同时是 CRB 内圈座和柔轮膜片的安装面，零件数少、刚性好。',
    hint: '输出法兰不是被动盖板，它本身就是轴承内圈的一部分。',
    pillar: 'space',
  },
  output_encoder_ring: {
    title: '输出端磁环',
    what: '装在输出法兰外缘的 19 位磁环，随输出转动。',
    why: '直接读关节输出角度，上电就知道负载位置，不用回零。',
    hint: '它和输入端磁环不是重复，一个管换相、一个管关节。',
    pillar: 'control',
  },
  output_encoder_pcb: {
    title: '输出端编码器板',
    what: '从壳体侧面插入的读头板，径向读磁环。',
    why: '侧向安装不占轴向长度，维护时抽出来即可。',
    hint: '读头与磁环只有 1 mm 气隙，装配精度要求高。',
    pillar: 'control',
  },
  output_cap: {
    title: '输出盖 / 安装法兰',
    what: 'Ø118 安装法兰，8×M4 客户孔，压住 CRB 外圈。',
    why: '把安装接口和轴承压盖合成一件，负载直接传到壳体。',
    hint: '它和输出法兰只差 2 mm 间隙，装配时要对中。',
    pillar: 'space',
  },
};
