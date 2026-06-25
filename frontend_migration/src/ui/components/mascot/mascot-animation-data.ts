export type MascotFrame = {
  column: number;
  row: number;
};

export type MascotAnimationClip = {
  description: string;
  frameDurationMs: number;
  frames: readonly MascotFrame[];
  label: string;
};

export const MASCOT_SPRITE = {
  columns: 8,
  frameHeight: 208,
  frameWidth: 192,
  rows: 9,
  src: "/animation_related/source_webp/spritesheet.webp",
} as const;

const frame = (column: number, row: number): MascotFrame => ({ column, row });

const mascotAnimationClips = {
  idle: {
    label: "대기",
    description: "기본 상태에서 작게 숨 쉬고 눈을 깜빡이는 상태",
    frameDurationMs: 320,
    frames: [
      frame(0, 0),
      frame(0, 0),
      frame(1, 0),
      frame(0, 0),
      frame(2, 0),
      frame(0, 0),
      frame(0, 0),
      frame(3, 0),
    ],
  },
  greeting: {
    label: "인사",
    description: "상담 시작 전 로디가 손을 들어 반응하는 상태",
    frameDurationMs: 210,
    frames: [
      frame(0, 3),
      frame(1, 3),
      frame(2, 3),
      frame(1, 3),
      frame(0, 3),
      frame(4, 3),
      frame(5, 3),
      frame(4, 3),
    ],
  },
  attentive: {
    label: "입력 감지",
    description: "사용자가 메시지를 작성하고 있어 로디가 집중하는 상태",
    frameDurationMs: 240,
    frames: [
      frame(0, 6),
      frame(1, 6),
      frame(2, 6),
      frame(3, 6),
      frame(4, 6),
      frame(5, 6),
      frame(6, 6),
      frame(7, 6),
    ],
  },
  listening: {
    label: "듣는 중",
    description: "음성 입력을 기다리거나 받아쓰는 상태",
    frameDurationMs: 220,
    frames: [
      frame(0, 7),
      frame(1, 7),
      frame(2, 7),
      frame(3, 7),
      frame(4, 7),
      frame(5, 7),
      frame(6, 7),
      frame(7, 7),
    ],
  },
  thinking: {
    label: "생각 중",
    description: "요청을 보낸 뒤 답변을 기다리는 상태",
    frameDurationMs: 200,
    frames: [
      frame(0, 4),
      frame(1, 4),
      frame(2, 4),
      frame(3, 4),
      frame(4, 4),
      frame(5, 4),
      frame(6, 4),
      frame(7, 4),
    ],
  },
  speaking: {
    label: "답변 중",
    description: "답변 스트리밍이나 TTS 재생 중인 상태",
    frameDurationMs: 220,
    frames: [
      frame(0, 8),
      frame(1, 8),
      frame(2, 8),
      frame(3, 8),
      frame(4, 8),
      frame(5, 8),
      frame(6, 8),
      frame(7, 8),
    ],
  },
  sad: {
    label: "오류",
    description: "요청 실패나 음성 입력 오류가 발생한 상태",
    frameDurationMs: 260,
    frames: [
      frame(0, 5),
      frame(1, 5),
      frame(2, 5),
      frame(3, 5),
      frame(4, 5),
      frame(5, 5),
      frame(6, 5),
      frame(7, 5),
    ],
  },
} as const satisfies Record<string, MascotAnimationClip>;

export const MASCOT_ANIMATION_CLIPS = mascotAnimationClips;

export type MascotAnimationName = keyof typeof mascotAnimationClips;

export const MASCOT_ANIMATION_NAMES = Object.keys(
  mascotAnimationClips
) as MascotAnimationName[];
