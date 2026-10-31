import type { CSSProperties, ReactNode } from 'react';

// 背景緩慢飄動的光暈、小光點，和四處亂飄的羽球 / 音符 / 咖啡杯（純 CSS 動畫，樣式在 styles.css 的 .bg-decor）

// 固定種子的亂數，每次載入位置都一樣，不會 render 一次跳一次
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(7122);
const between = (min: number, max: number) => min + rand() * (max - min);

const motes = Array.from({ length: 8 }, (_, i) => ({
  left: 6 + i * 12 + between(-3, 3),
  size: Math.round(between(5, 10)),
  duration: between(26, 40),
  delay: between(0, 26),
  drift: between(-35, 35),
}));

const ICONS: Record<'shuttle' | 'note' | 'coffee', ReactNode> = {
  shuttle: (
    <>
      <path d="M9 15 6 3M15 15l3-12M12 15V3M6.6 7.5h10.8" />
      <path d="M6 3h12" />
      <path d="M9 15h6v1.5a3 3 0 0 1-6 0Z" />
    </>
  ),
  note: (
    <>
      <path d="M9 18V5.5l10-2.5v12.5" />
      <path d="M9 9l10-2.5" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 3.5c-1 1 1 2 0 3M12 3.5c-1 1 1 2 0 3" />
    </>
  ),
};

const kinds = ['shuttle', 'note', 'coffee'] as const;
// 畫面切成 3×3 格，每格放一個，分布比較平均
const floaters = Array.from({ length: 9 }, (_, i) => ({
  kind: kinds[i % 3],
  left: (i % 3) * 33 + between(4, 26),
  top: Math.floor(i / 3) * 33 + between(4, 24),
  size: Math.round(between(26, 44)),
  duration: between(38, 60),
  delay: between(0, 40),
  vars: {
    '--x1': `${between(-9, 9)}vw`,
    '--y1': `${between(-8, 8)}vh`,
    '--x2': `${between(-9, 9)}vw`,
    '--y2': `${between(-8, 8)}vh`,
    '--x3': `${between(-9, 9)}vw`,
    '--y3': `${between(-8, 8)}vh`,
    '--r0': `${between(-30, 30)}deg`,
    '--r1': `${between(-50, 50)}deg`,
  },
  // 手機上只留一半，避免太擠
  hideSmall: i % 2 === 1,
}));

export function BackgroundDecor() {
  return (
    <div className="bg-decor" aria-hidden>
      <span className="bg-glow bg-glow-1" />
      <span className="bg-glow bg-glow-2" />
      <span className="bg-glow bg-glow-3" />
      {motes.map((m, i) => (
        <span
          key={i}
          className="bg-mote"
          style={
            {
              left: `${m.left}%`,
              width: m.size,
              height: m.size,
              animationDuration: `${m.duration}s`,
              animationDelay: `-${m.delay}s`,
              '--drift': `${m.drift}px`,
            } as CSSProperties
          }
        />
      ))}
      {floaters.map((f, i) => (
        <svg
          key={`f${i}`}
          className={`bg-floater ${f.hideSmall ? 'hide-small' : ''}`}
          viewBox="0 0 24 24"
          width={f.size}
          height={f.size}
          style={
            {
              left: `${f.left}%`,
              top: `${f.top}%`,
              animationDuration: `${f.duration}s`,
              animationDelay: `-${f.delay}s`,
              ...f.vars,
            } as CSSProperties
          }
        >
          {ICONS[f.kind]}
        </svg>
      ))}
    </div>
  );
}
