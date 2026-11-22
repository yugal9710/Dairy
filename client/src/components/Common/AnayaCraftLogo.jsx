import React from 'react';

/**
 * Anaya Craft Official Folded Ribbon AC Monogram SVG
 * Pure vector implementation matching user-provided brand design
 */
export function AnayaCraftMonogram({ className = 'w-16 h-auto', idPrefix = 'ac' }) {
  const leftGradId = `${idPrefix}_aLeftGrad`;
  const barGradId = `${idPrefix}_aBarGrad`;
  const topGradId = `${idPrefix}_cTopGrad`;
  const topFoldId = `${idPrefix}_cTopFold`;
  const spineGradId = `${idPrefix}_cSpineGrad`;
  const bottomGradId = `${idPrefix}_cBottomGrad`;

  return (
    <svg
      className={`${className} select-none`}
      viewBox="0 0 260 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(10, 35, 70, 0.12))' }}
      role="img"
      aria-label="Anaya Craft AC Folded Ribbon Monogram"
    >
      <defs>
        {/* Left Leg of A */}
        <linearGradient id={leftGradId} x1="85" y1="12" x2="35" y2="165" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#36c5f5" />
          <stop offset="48%" stopColor="#1967d2" />
          <stop offset="100%" stopColor="#152c87" />
        </linearGradient>

        {/* Crossbar of A */}
        <linearGradient id={barGradId} x1="30" y1="168" x2="132" y2="115" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#162d88" />
          <stop offset="55%" stopColor="#1e75d8" />
          <stop offset="100%" stopColor="#45c8f5" />
        </linearGradient>

        {/* C Top Arm */}
        <linearGradient id={topGradId} x1="122" y1="12" x2="215" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#09172c" />
          <stop offset="45%" stopColor="#0f3c6e" />
          <stop offset="100%" stopColor="#1c82bd" />
        </linearGradient>

        {/* C Top Inner Fold */}
        <linearGradient id={topFoldId} x1="175" y1="45" x2="225" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#081a33" />
          <stop offset="100%" stopColor="#14588a" />
        </linearGradient>

        {/* C Diagonal Spine */}
        <linearGradient id={spineGradId} x1="115" y1="20" x2="175" y2="178" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#071324" />
          <stop offset="55%" stopColor="#0d2a4d" />
          <stop offset="100%" stopColor="#071426" />
        </linearGradient>

        {/* C Bottom Arm */}
        <linearGradient id={bottomGradId} x1="162" y1="178" x2="225" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#071324" />
          <stop offset="50%" stopColor="#0e3b6b" />
          <stop offset="100%" stopColor="#165a96" />
        </linearGradient>
      </defs>

      {/* 1. Crossbar of 'A' (Behind the spine of C) */}
      <path
        d="M24 169 L68 128 L134 102 L144 128 L66 164 C48 172 34 172 24 169 Z"
        fill={`url(#${barGradId})`}
      />

      {/* 2. Left Pillar of 'A' */}
      <path
        d="M98 12 L134 12 L64 152 C56 168 42 172 24 169 L92 22 C95 15 98 12 98 12 Z"
        fill={`url(#${leftGradId})`}
      />
      {/* Subtle fold shadow at bottom of A's left leg */}
      <path
        d="M64 152 L77 125 L44 139 L24 169 C42 172 56 168 64 152 Z"
        fill="#0d1e66"
        opacity="0.55"
      />

      {/* 3. Top Arm of 'C' */}
      <path
        d="M126 12 L188 12 C197 12 203 17 208 26 L227 66 L192 66 L181 44 L136 44 Z"
        fill={`url(#${topGradId})`}
      />
      {/* Fold crease on Top Arm of 'C' */}
      <path
        d="M181 44 L217 44 L227 66 L192 66 Z"
        fill={`url(#${topFoldId})`}
      />

      {/* 4. Bottom Arm of 'C' */}
      <path
        d="M158 178 L192 178 C201 178 207 173 212 164 L230 124 L195 124 L184 146 L150 146 Z"
        fill={`url(#${bottomGradId})`}
      />

      {/* 5. Main Diagonal Spine of 'C' (Overlapping A's crossbar & C joints) */}
      <path
        d="M126 12 C118 12 112 18 108 27 L101 42 L152 167 C156 175 162 178 170 178 L192 178 C184 178 179 173 175 164 L121 31 C118 22 121 15 128 12 Z"
        fill={`url(#${spineGradId})`}
      />
      {/* Inner dark ribbon thickness for C spine */}
      <path
        d="M128 12 L145 12 L195 146 L184 146 L175 164 L121 31 C118 22 121 15 128 12 Z"
        fill="#0b2342"
      />
    </svg>
  );
}

/**
 * Top Right Tech Dot Matrix & Vertical Accent Line
 */
export function AnayaTopRightDecor({ className = 'w-24 h-32', idPrefix = 'ac_decor_tr' }) {
  const dotGradId = `${idPrefix}_dotGradTR`;
  const lineGradId = `${idPrefix}_lineGradTR`;

  return (
    <svg className={className} viewBox="0 0 140 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={dotGradId} x1="0" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5cc5ef" />
          <stop offset="100%" stopColor="#174988" />
        </linearGradient>
        <linearGradient id={lineGradId} x1="0" y1="40" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0d2342" />
          <stop offset="100%" stopColor="#48b8ea" />
        </linearGradient>
      </defs>
      {/* Horizontal Dot Matrix Rows */}
      <g fill={`url(#${dotGradId})`}>
        {/* Row 1 */}
        <circle cx="10" cy="10" r="2.2" /><circle cx="20" cy="10" r="2.2" /><circle cx="30" cy="10" r="2.2" />
        <circle cx="40" cy="10" r="2.2" /><circle cx="50" cy="10" r="2.2" /><circle cx="60" cy="10" r="2.2" />
        <circle cx="70" cy="10" r="2.2" /><circle cx="80" cy="10" r="2.5" /><circle cx="90" cy="10" r="2.8" />
        <circle cx="102" cy="10" r="3.2" /><circle cx="115" cy="10" r="3.8" />
        {/* Row 2 */}
        <circle cx="60" cy="22" r="2.2" /><circle cx="70" cy="22" r="2.2" /><circle cx="80" cy="22" r="2.5" />
        <circle cx="90" cy="22" r="2.5" /><circle cx="102" cy="22" r="3" /><circle cx="115" cy="22" r="3.6" />
        {/* Row 3 */}
        <circle cx="10" cy="34" r="2.2" /><circle cx="20" cy="34" r="2.2" /><circle cx="30" cy="34" r="2.2" />
        <circle cx="40" cy="34" r="2.2" /><circle cx="50" cy="34" r="2.2" /><circle cx="60" cy="34" r="2.2" />
        <circle cx="70" cy="34" r="2.2" /><circle cx="80" cy="34" r="2.2" /><circle cx="90" cy="34" r="2.2" />
        <circle cx="102" cy="34" r="3" /><circle cx="115" cy="34" r="3.6" />
      </g>
      {/* Vertical Accent Line & Trailing Dots */}
      <rect x="104" y="48" width="2.5" height="90" rx="1.25" fill={`url(#${lineGradId})`} />
      <g fill={`url(#${lineGradId})`}>
        <circle cx="115" cy="68" r="2.4" />
        <circle cx="115" cy="78" r="2.4" />
        <circle cx="115" cy="88" r="2.4" />
        <circle cx="115" cy="98" r="2.4" />
        <circle cx="115" cy="108" r="2.4" />
        <circle cx="115" cy="118" r="2.4" />
        <circle cx="115" cy="128" r="2.4" />
        <circle cx="115" cy="138" r="2.4" />
        <circle cx="115" cy="148" r="2.4" />
      </g>
    </svg>
  );
}

/**
 * Bottom Left L-Shaped Tech Dot Matrix
 */
export function AnayaBottomLeftDecor({ className = 'w-24 h-20', idPrefix = 'ac_decor_bl' }) {
  const dotGradId = `${idPrefix}_dotGradBL`;

  return (
    <svg className={className} viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={dotGradId} x1="0" y1="0" x2="120" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#45b7ea" />
          <stop offset="100%" stopColor="#184e91" />
        </linearGradient>
      </defs>
      <g fill={`url(#${dotGradId})`}>
        {/* Vertical column 1 */}
        <circle cx="10" cy="10" r="2.2" /><circle cx="10" cy="20" r="2.2" /><circle cx="10" cy="30" r="2.2" />
        <circle cx="10" cy="40" r="2.2" /><circle cx="10" cy="50" r="2.2" /><circle cx="10" cy="60" r="2.4" />
        <circle cx="10" cy="70" r="2.8" /><circle cx="10" cy="80" r="3.4" /><circle cx="10" cy="91" r="4" />
        {/* Vertical column 2 */}
        <circle cx="22" cy="40" r="2.2" /><circle cx="22" cy="50" r="2.2" /><circle cx="22" cy="60" r="2.4" />
        <circle cx="22" cy="70" r="2.8" /><circle cx="22" cy="80" r="3.2" /><circle cx="22" cy="91" r="3.8" />
        {/* Horizontal bottom rows */}
        <circle cx="34" cy="80" r="2.8" /><circle cx="45" cy="80" r="2.6" /><circle cx="56" cy="80" r="2.5" />
        <circle cx="67" cy="80" r="2.3" /><circle cx="78" cy="80" r="2.2" /><circle cx="89" cy="80" r="2.1" />
        <circle cx="100" cy="80" r="2" /><circle cx="111" cy="80" r="1.8" /><circle cx="122" cy="80" r="1.6" />

        <circle cx="34" cy="91" r="3.2" /><circle cx="45" cy="91" r="3" /><circle cx="56" cy="91" r="2.8" />
        <circle cx="67" cy="91" r="2.5" /><circle cx="78" cy="91" r="2.3" /><circle cx="89" cy="91" r="2.1" />
        <circle cx="100" cy="91" r="1.9" />
      </g>
    </svg>
  );
}

/**
 * Bottom Right Circuit Trace Line & Module
 */
export function AnayaBottomRightDecor({ className = 'w-24 h-24', idPrefix = 'ac_decor_br' }) {
  const circuitGradId = `${idPrefix}_circuitGrad`;

  return (
    <svg className={className} viewBox="0 0 140 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={circuitGradId} x1="125" y1="15" x2="25" y2="135" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34b3eb" />
          <stop offset="50%" stopColor="#14589c" />
          <stop offset="100%" stopColor="#0b2342" />
        </linearGradient>
      </defs>
      {/* Circuit Trace */}
      <path
        d="M126 65 L126 116 L112 130 L64 130 L56 138 L22 138"
        stroke={`url(#${circuitGradId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Circuit Node */}
      <circle cx="20" cy="138" r="4.5" fill="#2382c9" />
      {/* Vertical Circuit Module */}
      <rect x="121" y="15" width="9" height="52" rx="2" fill={`url(#${circuitGradId})`} />
      {/* Module Cutout Ticks */}
      <rect x="124" y="21" width="3" height="5" rx="1" fill="#f3f3ef" />
      <rect x="124" y="29" width="3" height="5" rx="1" fill="#f3f3ef" />
      <rect x="124" y="37" width="3" height="5" rx="1" fill="#f3f3ef" />
      <rect x="124" y="45" width="3" height="5" rx="1" fill="#f3f3ef" />
    </svg>
  );
}

/**
 * Anaya Craft Complete Brand Lockup
 * Exact typography from provided HTML:
 * - Exo 2 font for brand wordmark (Anaya in gradient, Craft in #0b1b32)
 * - Montserrat font for Primary Tagline (ALL KINDS OF IT SOLUTIONS)
 * - Montserrat font for Secondary Tagline (TECHNOLOGY • BUILT AROUND YOU)
 */
export function AnayaCraftBrandLockup({
  size = 'md',
  className = '',
  idPrefix = 'ac_brand'
}) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const monogramSize = isSm ? 'w-12 h-auto' : isLg ? 'w-24 h-auto' : 'w-16 sm:w-20 h-auto';
  const titleSize = isSm ? 'text-base sm:text-lg' : isLg ? 'text-3xl' : 'text-xl sm:text-2xl';
  const tagMainSize = isSm ? 'text-[9.5px]' : isLg ? 'text-[15px]' : 'text-[11px] sm:text-[12px]';
  const tagSubSize = isSm ? 'text-[7.5px]' : isLg ? 'text-[11px]' : 'text-[8.5px] sm:text-[9.5px]';

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Folded Ribbon AC Monogram SVG */}
      <div className="mb-1 flex items-center justify-center">
        <AnayaCraftMonogram className={monogramSize} idPrefix={idPrefix} />
      </div>

      {/* Brand Title: Anaya Craft in Exo 2 font */}
      <div
        style={{ fontFamily: "'Exo 2', sans-serif" }}
        className={`font-extrabold flex items-center justify-center gap-1.5 leading-none ${titleSize}`}
      >
        <span
          style={{
            background: 'linear-gradient(180deg, #1b65b8 0%, #104282 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Anaya
        </span>
        <span className="text-[#0b1b32] dark:text-slate-100">
          Craft
        </span>
      </div>

      {/* Primary Tagline in Montserrat font */}
      <p
        style={{ fontFamily: "'Montserrat', sans-serif" }}
        className={`font-extrabold uppercase text-[#111827] dark:text-slate-200 tracking-[0.4px] mt-1.5 leading-tight ${tagMainSize}`}
      >
        ALL KINDS OF IT SOLUTIONS
      </p>

      {/* Secondary Tagline in Montserrat font */}
      <p
        style={{ fontFamily: "'Montserrat', sans-serif" }}
        className={`font-bold uppercase text-[#1f2937] dark:text-slate-400 tracking-[0.5px] flex items-center justify-center gap-1.5 mt-0.5 ${tagSubSize}`}
      >
        <span>TECHNOLOGY</span>
        <span className="text-[#0b1b32] dark:text-slate-300 font-extrabold">&bull;</span>
        <span>BUILT AROUND YOU</span>
      </p>
    </div>
  );
}

/**
 * Anaya Craft Poster Card (Exact presentation card matching user HTML snippet)
 */
export function AnayaCraftPosterCard({ className = '', idPrefix = 'ac_card' }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #f3f3ef 0%, #efefeb 100%)',
        boxShadow: '0 20px 50px rgba(13, 27, 46, 0.12)'
      }}
      className={`relative w-full max-w-[420px] rounded-[14px] flex flex-col items-center justify-center p-8 sm:p-10 overflow-hidden select-none ${className}`}
    >
      {/* Decorative Corner Elements */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <AnayaTopRightDecor className="w-24 h-32" idPrefix={`${idPrefix}_tr`} />
      </div>
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <AnayaBottomLeftDecor className="w-24 h-20" idPrefix={`${idPrefix}_bl`} />
      </div>
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <AnayaBottomRightDecor className="w-24 h-24" idPrefix={`${idPrefix}_br`} />
      </div>

      {/* Central Brand Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <AnayaCraftMonogram className="w-44 sm:w-52 h-auto mb-3" idPrefix={`${idPrefix}_mono`} />

        <h1
          style={{ fontFamily: "'Exo 2', sans-serif" }}
          className="font-extrabold leading-[0.96] tracking-[-0.5px] mb-3 text-center"
        >
          <span
            style={{
              background: 'linear-gradient(180deg, #1b65b8 0%, #104282 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
            className="block text-4xl sm:text-5xl"
          >
            Anaya
          </span>
          <span className="block text-4xl sm:text-5xl text-[#0b1b32] mt-1">
            Craft
          </span>
        </h1>

        <p
          style={{ fontFamily: "'Montserrat', sans-serif" }}
          className="text-base sm:text-lg font-extrabold text-[#111827] leading-tight tracking-[0.4px] uppercase mb-2 text-center"
        >
          ALL KINDS OF IT<br />
          SOLUTIONS
        </p>

        <p
          style={{ fontFamily: "'Montserrat', sans-serif" }}
          className="text-xs font-bold text-[#1f2937] tracking-[0.5px] uppercase flex items-center justify-center flex-wrap gap-1.5 text-center"
        >
          <span>TECHNOLOGY</span>
          <span className="text-[#0b1b32] font-extrabold">&bull;</span>
          <span>BUILT AROUND YOU</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Main AnayaCraftLogo default export
 * Integrates seamlessly with existing calls:
 * <AnayaCraftLogo variant="brand-card" size="md" />
 */
export default function AnayaCraftLogo({
  variant = 'brand-card',
  size = 'md',
  theme = 'light',
  className = ''
}) {
  if (variant === 'card' || variant === 'poster') {
    return <AnayaCraftPosterCard className={className} />;
  }

  if (variant === 'emblem') {
    return (
      <AnayaCraftMonogram
        className={size === 'sm' ? 'w-8 h-auto' : size === 'lg' ? 'w-20 h-auto' : 'w-12 h-auto'}
      />
    );
  }

  // Brand card (clean lockup without card wrapper, ideal for login screen below helpdesk)
  return <AnayaCraftBrandLockup size={size} className={className} />;
}
