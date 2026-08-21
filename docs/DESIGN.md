# DESIGN.md

디자인 철학·토큰·컴포넌트 스타일 규칙을 작성한다.

---

## 디자인 철학·톤

- **Keywords**: Bleach, Reiatsu (영압), Dark Fantasy, Ink Slash, Anime Action, High Contrast
- **Target vibe**: 짙은 먹빛 배경에 강렬한 검기 및 붉은/푸른 오라 파티클이 교차하는 애니메이션 액션 톤.
- **What we avoid**: 조잡한 원색 UI, 가시성이 떨어지는 복잡한 마이크로텍스트, 렌더링 프레임을 저하시키는 중량 이미지 자산.

---

## Color Palette

- **Brand / Primary**:
  - Reiatsu Black: `#0F0F12` (메인 배경)
  - Getsuga Red: `#FF1E42` (월아천충 / 만해 오라)
  - Spirit Blue: `#00E5FF` (영압 구체 / 귀도 스킬)
- **Neutral**:
  - Dark Surface: `#1A1A24`
  - Border Gold: `#E6B800`
  - Text White: `#F3F4F6`
  - Text Muted: `#9CA3AF`
- **Semantic**:
  - HP Red: `#EF4444`
  - EXP Cyan: `#06B6D4`
  - Warning Gold: `#F59E0B`

---

## Typography

- **Font families**: 'Cinzel', 'Noto Sans KR', sans-serif
- **Base size**: `16px` (1rem)

---

## Component Styling Rules

### HUD Overlay
- 화면 상단: HP 바, EXP 라인, 타이머, 킬 카운터 (반투명 오버레이)
- 화면 하단: 모바일 터치 전용 조이스틱 센서 영역

### Level Up Card Modal
- 네온 골드 굵은 테두리와 짙은 다크 글래스모피즘 (`backdrop-filter: blur(12px)`)
- 3개 카드 배치 (스킬 아이콘, 스킬명, 설명, 등급 색상)

