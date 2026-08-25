/**
 * 블리치 사신 서바이벌 - 참백도 시해(始解) 각성 파이프라인 매니저
 */

import { ShikaiPipeline, ShikaiArchetype, ShikaiBlock1, ShikaiBlock2 } from '../types/game';

export const SHIKAI_ARCHETYPES: Record<ShikaiArchetype, { name: string; desc: string; color: string }> = {
  A1_Basic: {
    name: '[상시 해방 - 평타 강화]',
    desc: '스킬은 기본, 평타 사거리/공속/타수 몰빵 강화',
    color: 'text-red-400 border-red-500/50 bg-red-950/30'
  },
  A2_Burst: {
    name: '[상시 해방 - 액티브 일격]',
    desc: '평타는 기본, 단발 사출 조각 깡데미지 계수 폭증 (신살창 빌드)',
    color: 'text-amber-400 border-amber-500/50 bg-amber-950/30'
  },
  B1_Area: {
    name: '[형태 변화 - 광역 결계]',
    desc: '투사체 수량/원형 결계 반경 전장 장악 (천본앵 만발 빌드)',
    color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30'
  },
  B2_Compact: {
    name: '[형태 변화 - 고화력 압축]',
    desc: '투사체 1~2개/본체 좁은 장판, 틱당 대미지 초고배율 압축',
    color: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/30'
  }
};

const BLOCK1_NORMS: ShikaiBlock1[] = [
  {
    shape: 'Rhombus',
    shapeName: '마름모 조각',
    count: 5,
    spawnOrigin: 'Caster_To_Enemy',
    text: '자신으로부터 / 마름모 조각 / 5개를 / 가장 가까운 적을 향해 / 발사하고 소멸한다.',
    isMacro: false
  },
  {
    shape: 'Crescent',
    shapeName: '반달 검파',
    count: 2,
    spawnOrigin: 'Caster_To_Random',
    text: '자신 중심으로 / 반달 검파 / 2개를 / 360도 전방위로 / 나선 사출한다.',
    isMacro: false
  },
  {
    shape: 'Circle',
    shapeName: '원형 결계',
    count: 1,
    spawnOrigin: 'Caster_Adjacent_Random',
    text: '자신 발밑에 / 원형 결계 / 1개를 / 제자리에 / 4초간 펼친다.',
    isMacro: false
  }
];

const BLOCK1_RARES: ShikaiBlock1[] = [
  {
    shape: 'Rhombus',
    shapeName: '칠흑 빙룡',
    count: 1,
    spawnOrigin: 'Caster_To_Enemy',
    text: '✨ [전설 매크로] 자신 위치에서 / 칠흑 빙룡 / 1마리를 / 유영시키며 관통한다.',
    isMacro: true,
    macroType: 'Dragon'
  },
  {
    shape: 'Crescent',
    shapeName: '참격 회오리',
    count: 4,
    spawnOrigin: 'Caster_To_Random',
    text: '✨ [전설 매크로] 자신 주변으로 / 참격 회오리 / 4개를 / 넓혀가며 공전시킨다.',
    isMacro: true,
    macroType: 'Spiral'
  },
  {
    shape: 'Circle',
    shapeName: '영력 포식 영역',
    count: 1,
    spawnOrigin: 'Caster_Adjacent_Random',
    text: '✨ [전설 매크로] 전장 전체에 / 영력 포식 영역 / 1개를 / 무한히 팽창시킨다.',
    isMacro: true,
    macroType: 'Domain'
  }
];

const BLOCK2_REGISTRY: ShikaiBlock2[] = [
  {
    opKey: 1,
    opName: '빙륜환 동결',
    text: '피격당한 적은 / 1.5초간 / 50% 얼어붙어 속박된다.',
    operator: 'Zero',
    targetDomain: 'Move_Speed'
  },
  {
    opKey: 2,
    opName: '타임 스톱',
    text: '피격당한 적은 / 2.0초간 / 시공간이 완전 정지한다.',
    operator: 'Zero',
    targetDomain: 'Local_Time_Scale'
  },
  {
    opKey: 3,
    opName: '강철 경갑',
    text: '피격당한 적은 / 2.0초간 / 몸통 접촉 피해량이 0이 된다.',
    operator: 'Zero',
    targetDomain: 'Collision_Damage'
  },
  {
    opKey: 4,
    opName: '역무 환술',
    text: '피격당한 적은 / 2.0초간 / 이동 방향이 반대로 뒤집혀 도망친다.',
    operator: 'Invert',
    targetDomain: 'Move_Direction'
  },
  {
    opKey: 5,
    opName: '혼란 결계',
    text: '피격당한 적은 / 1.5초간 / 아군이 되어 서로 싸운다.',
    operator: 'Invert',
    targetDomain: 'Faction_Team_ID'
  },
  {
    opKey: 6,
    opName: '바라간 체인전이',
    text: '피격당한 몹의 대미지는 / 주변 20마리 적에게 / 그대로 연쇄 전이된다.',
    operator: 'Link',
    targetDomain: 'Current_HP'
  },
  {
    opKey: 7,
    opName: '빙설 연쇄 속박',
    text: '피격당한 적의 속박은 / 주변 몬스터 무리에 / 동시 연쇄 전이된다.',
    operator: 'Link',
    targetDomain: 'Move_Speed'
  },
  {
    opKey: 8,
    opName: '흡혈 검강',
    text: '입힌 피해량의 100%는 / 플레이어 체력으로 / 즉시 치환 흡수된다.',
    operator: 'Substitute',
    targetDomain: 'Current_HP'
  },
  {
    opKey: 9,
    opName: '피해 반사',
    text: '플레이어가 받은 피해의 50%는 / 적 체력으로 / 되돌려준다.',
    operator: 'Substitute',
    targetDomain: 'Collision_Damage'
  },
  {
    opKey: 10,
    opName: '차조 중량 폭증',
    text: '피격당할 때마다 적의 무게는 / 2배씩 폭증하여 / 짓눌린다.',
    operator: 'Amplify',
    targetDomain: 'Collision_Damage'
  },
  {
    opKey: 11,
    opName: '천본앵 팽창',
    text: '적중할 때마다 소환체 크기가 / 2배씩 거대하게 / 팽창한다.',
    operator: 'Amplify',
    targetDomain: 'Scale'
  },
  {
    opKey: 12,
    opName: '월아천충 깡뎀',
    text: '기본 참격에 추가로 / 1.5배 강력한 / 월아천충 깡뎀이 사출된다.',
    operator: 'Add_Subtract',
    targetDomain: 'Current_HP'
  },
  {
    opKey: 13,
    opName: '방어 쇄약',
    text: '피격당한 적의 방어력은 / 0으로 영구 파괴되어 / 쇄약해진다.',
    operator: 'Add_Subtract',
    targetDomain: 'Armor_Defense'
  }
];

const ZANPAKUTO_NAMES = [
  '빙륜환 (氷輪丸)',
  '류진쟈카 (流刃若火)',
  '참월 (斬月)',
  '천본앵 (千本櫻)',
  '신살창 (神殺槍)',
  '차조 (侘助)',
  '뇌신 (雷神)'
];

const ARCHETYPE_KEYS: ShikaiArchetype[] = ['A1_Basic', 'A2_Burst', 'B1_Area', 'B2_Compact'];

export function generateShikaiPipeline(): ShikaiPipeline {
  const archetypeKey = ARCHETYPE_KEYS[Math.floor(Math.random() * ARCHETYPE_KEYS.length)];
  const archDef = SHIKAI_ARCHETYPES[archetypeKey];

  // 10% 대박 확률 레어 매크로 롤링!
  const isRareRoll = Math.random() < 0.10;
  const b1Pool = isRareRoll ? BLOCK1_RARES : BLOCK1_NORMS;
  const block1 = b1Pool[Math.floor(Math.random() * b1Pool.length)];

  // 13대 인과율 레지스트리 중 1개 롤링!
  const block2 = BLOCK2_REGISTRY[Math.floor(Math.random() * BLOCK2_REGISTRY.length)];

  const zanName = ZANPAKUTO_NAMES[Math.floor(Math.random() * ZANPAKUTO_NAMES.length)];

  return {
    id: `shikai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: zanName,
    releaseCommand: zanName,
    archetype: archetypeKey,
    archetypeName: archDef.name,
    block1,
    block2,
    color: isRareRoll ? '#f59e0b' : '#00e5ff',
    icon: isRareRoll ? '✨' : '⚔️'
  };
}
