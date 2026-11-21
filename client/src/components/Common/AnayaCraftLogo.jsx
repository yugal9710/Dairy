import React from 'react';

/**
 * Anaya Craft Official AC Geometric Ribbon Logo Mark SVG
 * Updated vector implementation matching official design specification (240x160 viewBox)
 */
export function AnayaCraftMark({ className = 'w-20 h-auto', idPrefix = 'ac' }) {
  const aLeftGrad = `${idPrefix}_aLeftGrad`;
  const aCrossbarGrad = `${idPrefix}_aCrossbarGrad`;
  const cRibbonGrad = `${idPrefix}_cRibbonGrad`;

  return (
    <svg
      className={`${className} select-none block`}
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Anaya Craft AC Geometric Ribbon Mark"
    >
      <defs>
        <linearGradient id={aLeftGrad} x1="40" y1="22" x2="115" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22b8f0" />
          <stop offset="55%" stopColor="#1d74d6" />
          <stop offset="100%" stopColor="#163b7a" />
        </linearGradient>
        <linearGradient id={aCrossbarGrad} x1="82" y1="88" x2="145" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1c8ce6" />
          <stop offset="100%" stopColor="#123978" />
        </linearGradient>
        <linearGradient id={cRibbonGrad} x1="110" y1="20" x2="195" y2="136" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1b4d8c" />
          <stop offset="45%" stopColor="#091d38" />
          <stop offset="100%" stopColor="#135aa6" />
        </linearGradient>
      </defs>

      {/* Left leg & apex of 'A' */}
      <path
        d="M42 126L96 22C99 17 106 17 109 22L134 72L116 80L102 48L72 108C68 116 61 126 49 126H42Z"
        fill={`url(#${aLeftGrad})`}
      />

      {/* Crossbar of 'A' */}
      <path
        d="M84 86H136L142 100H78L84 86Z"
        fill={`url(#${aCrossbarGrad})`}
      />

      {/* Interlocking 'C' ribbon */}
      <path
        d="M188 46H142L126 20H184C191 20 196 26 196 33C196 40 192 46 188 46Z"
        fill="#194a85"
      />
      <path
        d="M126 20C108 20 98 35 105 53L136 128C140 137 150 140 159 136L198 112L187 95L156 114C152 116 148 115 146 111L122 52C119 44 123 36 131 36H142L126 20Z"
        fill={`url(#${cRibbonGrad})`}
      />
    </svg>
  );
}

// Backward compatibility alias
export const AnayaCraftMonogram = AnayaCraftMark;

/**
 * Anaya Craft Complete Brand Lockup
 * - Typography: Plus Jakarta Sans
 * - Brand Name: Anaya (linear-gradient(135deg, #0ea5e9, #1d4ed8)) + Craft (#091e3a)
 * - Primary Tagline: ALL KINDS OF IT SOLUTIONS (font-weight: 800, letter-spacing: 0.08em, uppercase)
 * - Secondary Tagline: TECHNOLOGY • BUILT AROUND YOU (font-weight: 600, letter-spacing: 0.14em, uppercase)
 */
export function AnayaCraftBrandLockup({
  size = 'md',
  className = '',
  idPrefix = 'ac_brand'
}) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const markSize = isSm ? 'w-12 sm:w-14' : isLg ? 'w-32 sm:w-40' : 'w-20 sm:w-24';
  const nameSize = isSm ? 'text-lg sm:text-xl mb-1' : isLg ? 'text-4xl sm:text-5xl mb-3' : 'text-2xl sm:text-3xl mb-1.5';
  const tagPrimarySize = isSm ? 'text-[9.5px] sm:text-[10px] mb-1' : isLg ? 'text-base sm:text-lg mb-2' : 'text-[11px] sm:text-[12.5px] mb-1';
  const tagSecondarySize = isSm ? 'text-[7.5px] sm:text-[8.5px]' : isLg ? 'text-xs sm:text-sm' : 'text-[8.5px] sm:text-[10px]';
  const dotSize = isSm ? 'w-1 h-1' : isLg ? 'w-2 h-2' : 'w-1.5 h-1.5';

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}
      className={`inline-flex flex-col items-center justify-center text-center select-none py-1 ${className}`}
      role="img"
      aria-label="Anaya Craft — All Kinds of IT Solutions — Technology Built Around You"
    >
      {/* AC Geometric Ribbon SVG */}
      <div className="mb-2 flex items-center justify-center">
        <AnayaCraftMark className={markSize} idPrefix={idPrefix} />
      </div>

      {/* Brand Name */}
      <div
        className={`font-extrabold tracking-[-0.025em] leading-[1.08] flex items-center justify-center gap-1.5 ${nameSize}`}
      >
        <span
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          Anaya
        </span>
        <span className="text-[#091e3a] dark:text-slate-100">
          Craft
        </span>
      </div>

      {/* Primary Tagline */}
      <div
        className={`font-extrabold uppercase text-[#091e3a] dark:text-slate-200 tracking-[0.08em] leading-[1.3] ${tagPrimarySize}`}
      >
        ALL KINDS OF IT SOLUTIONS
      </div>

      {/* Secondary Tagline */}
      <div
        className={`font-semibold uppercase text-[#0b223f] dark:text-slate-400 tracking-[0.14em] leading-[1.4] flex items-center justify-center gap-2 ${tagSecondarySize}`}
      >
        <span>TECHNOLOGY</span>
        <span className={`rounded-full bg-[#0b223f] dark:bg-slate-300 inline-block shrink-0 ${dotSize}`} aria-hidden="true" />
        <span>BUILT AROUND YOU</span>
      </div>
    </div>
  );
}

/**
 * Main AnayaCraftLogo default export
 */
export default function AnayaCraftLogo({
  variant = 'brand-card',
  size = 'md',
  theme = 'light',
  className = ''
}) {
  if (variant === 'emblem') {
    return (
      <AnayaCraftMark
        className={size === 'sm' ? 'w-10 h-auto' : size === 'lg' ? 'w-24 h-auto' : 'w-16 h-auto'}
      />
    );
  }

  return <AnayaCraftBrandLockup size={size} className={className} />;
}
