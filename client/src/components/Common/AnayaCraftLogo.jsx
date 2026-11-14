import React from 'react';

/**
 * Anaya Craft Official 3D Folded Ribbon / Origami Vector Monogram ("AC")
 * Dynamic interlocking letters 'A' and 'C' with gradient mapping, inner facet shadow & cyan glow nodes
 */
export function AnayaCraftEmblem({ size = 52, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/70 flex items-center justify-center flex-shrink-0 relative select-none group ${className}`}
    >
      <img
        src="/anaya-craft-icon.png"
        alt="Anaya Craft"
        className="w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}

/**
 * Decorative Tech Graphic Elements (Corner dot matrices, circuit-traces, pin node)
 */
export function AnayaCraftTechDecor() {
  return (
    <>
      {/* Top-Right: Dot-Matrix Grid + Angular Circuit-Trace Line */}
      <svg className="absolute top-2.5 right-2.5 w-16 h-12 pointer-events-none" viewBox="0 0 64 48" fill="none">
        {/* Dot-matrix grid (cyan/blue gradient) */}
        <circle cx="28" cy="6" r="1.4" fill="#007BFF" fillOpacity="0.75" />
        <circle cx="38" cy="6" r="1.4" fill="#007BFF" fillOpacity="0.55" />
        <circle cx="48" cy="6" r="1.4" fill="#2BD2FF" fillOpacity="0.7" />
        <circle cx="58" cy="6" r="1.4" fill="#2BD2FF" fillOpacity="0.9" />

        <circle cx="28" cy="14" r="1.4" fill="#007BFF" fillOpacity="0.55" />
        <circle cx="38" cy="14" r="1.4" fill="#007BFF" fillOpacity="0.4" />
        <circle cx="48" cy="14" r="1.4" fill="#2BD2FF" fillOpacity="0.5" />
        <circle cx="58" cy="14" r="1.4" fill="#2BD2FF" fillOpacity="0.7" />

        <circle cx="38" cy="22" r="1.4" fill="#007BFF" fillOpacity="0.25" />
        <circle cx="48" cy="22" r="1.4" fill="#2BD2FF" fillOpacity="0.35" />
        <circle cx="58" cy="22" r="1.4" fill="#2BD2FF" fillOpacity="0.5" />

        {/* Angular circuit-trace line running downward along right border */}
        <path
          d="M 8 4 L 20 4 L 28 12 L 28 38 L 36 38"
          stroke="#4A90E2"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="36" cy="38" r="2" fill="#2BD2FF" fillOpacity="0.9" />
      </svg>

      {/* Bottom-Left: L-Shaped Dot-Matrix Grid Corner Pattern */}
      <svg className="absolute bottom-2.5 left-2.5 w-12 h-12 pointer-events-none" viewBox="0 0 48 48" fill="none">
        <circle cx="6" cy="42" r="1.4" fill="#2BD2FF" fillOpacity="0.85" />
        <circle cx="14" cy="42" r="1.4" fill="#2BD2FF" fillOpacity="0.65" />
        <circle cx="22" cy="42" r="1.4" fill="#007BFF" fillOpacity="0.45" />
        <circle cx="30" cy="42" r="1.4" fill="#007BFF" fillOpacity="0.25" />

        <circle cx="6" cy="34" r="1.4" fill="#2BD2FF" fillOpacity="0.75" />
        <circle cx="14" cy="34" r="1.4" fill="#2BD2FF" fillOpacity="0.5" />

        <circle cx="6" cy="26" r="1.4" fill="#2BD2FF" fillOpacity="0.55" />
        <circle cx="6" cy="18" r="1.4" fill="#4A90E2" fillOpacity="0.35" />
      </svg>

      {/* Bottom-Right: Stylized PCB / Circuit Line with Rounded Corner & Pin Node */}
      <svg className="absolute bottom-2.5 right-2.5 w-16 h-12 pointer-events-none" viewBox="0 0 64 48" fill="none">
        <path
          d="M 60 6 L 60 28 Q 60 36 52 36 L 20 36"
          stroke="#4A90E2"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Circular pin node termination */}
        <circle cx="16" cy="36" r="3.2" fill="#FFFFFF" stroke="#007BFF" strokeWidth="1.4" />
        <circle cx="16" cy="36" r="1.3" fill="#2BD2FF" />
      </svg>
    </>
  );
}

/**
 * Vertical Card Format (Developer Handoff & Design Specification)
 * Standard vertical slide/card layout with "04" index, dot matrix, circuit traces, 3D folded ribbon & typography
 */
export function AnayaCraftCard({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-300 p-4 select-none ${className}`}
    >
      {/* Decorative Tech Graphic Elements */}
      <AnayaCraftTechDecor />

      {/* Top-Left Header: Index Number "04" */}
      <div className="flex items-center space-x-1.5 mb-1 relative z-10">
        <span className="text-xl font-light tracking-tight text-[#1E293B] leading-none">
          04
        </span>
        <span className="text-[7.5px] font-mono font-bold tracking-widest text-[#475569]/70 uppercase">
          SPEC
        </span>
      </div>

      {/* Center Logo & Branding Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center py-1">
        {/* Mark / Icon: 3D Ribbon Monogram */}
        <AnayaCraftEmblem size={52} />

        {/* Brand Name (Top Line "Anaya", Bottom Line "Craft") */}
        <div className="mt-2.5 flex flex-col items-center leading-none">
          <div className="text-lg tracking-tight">
            <span className="font-semibold text-[#0072E5] block">
              Anaya
            </span>
            <span className="font-bold text-[#0F1C3F] block mt-0.5">
              Craft
            </span>
          </div>

          {/* Accent Line */}
          <div className="w-8 h-0.5 bg-gradient-to-r from-[#007BFF] via-[#2BD2FF] to-[#0F1C3F] rounded-full my-2" />

          {/* Primary Tagline: ALL KINDS OF IT SOLUTIONS */}
          <div className="font-bold text-[8.5px] tracking-[0.14em] uppercase text-[#1E242B] whitespace-nowrap">
            ALL KINDS OF IT SOLUTIONS
          </div>

          {/* Secondary Tagline: TECHNOLOGY • BUILT AROUND YOU */}
          <div className="font-medium text-[7px] tracking-[0.18em] uppercase text-[#475569] mt-1 whitespace-nowrap">
            TECHNOLOGY • BUILT AROUND YOU
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Anaya Craft Official High-Resolution Branding Card
 * Vector-sharp typography and crisp icon to guarantee 100% visible, legible text
 */
export function AnayaCraftBrandCard({ className = '', size = 'md' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconHeight = isSm ? 'h-8' : isLg ? 'h-14' : 'h-10';
  const titleSize = isSm ? 'text-xs' : isLg ? 'text-lg' : 'text-sm';
  const tagPrimary = isSm ? 'text-[8.5px]' : isLg ? 'text-[11px]' : 'text-[9.5px]';
  const tagSecondary = isSm ? 'text-[7px]' : isLg ? 'text-[9px]' : 'text-[7.5px]';
  const bannerWidth = isSm ? 'max-w-[170px]' : isLg ? 'max-w-[260px]' : 'max-w-[215px]';

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none py-1 group ${className}`}>
      {/* 3D Ribbon / Origami Vector Monogram ("AC") */}
      <img
        src="/anaya-craft-icon.png"
        alt="Anaya Craft"
        className={`${iconHeight} w-auto object-contain transition-transform duration-300 group-hover:scale-105 select-none drop-shadow-2xs`}
        loading="eager"
      />

      {/* Brand Name Typography (Crisp & High Contrast) */}
      <div className={`mt-1 flex items-center justify-center space-x-1 leading-none ${titleSize}`}>
        <span className="font-extrabold text-[#0072E5] tracking-tight">Anaya</span>
        <span className="font-black text-[#0F1C3F] dark:text-slate-100 tracking-tight">Craft</span>
      </div>

      {/* Vibrant Orange Tagline Banner with 100% Visible & Legible Text */}
      <div className={`mt-1.5 w-full ${bannerWidth} bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600 text-white rounded-lg px-2.5 py-1 shadow-xs flex flex-col items-center justify-center border border-orange-400/40`}>
        <span className={`${tagPrimary} font-black uppercase tracking-wider text-white leading-tight drop-shadow-xs whitespace-nowrap`}>
          ALL KINDS OF IT SOLUTIONS
        </span>
        <span className={`${tagSecondary} font-bold uppercase tracking-widest text-amber-100 leading-tight mt-0.5 whitespace-nowrap`}>
          TECHNOLOGY • BUILT AROUND YOU
        </span>
      </div>
    </div>
  );
}

/**
 * Anaya Craft Complete Component (Supports 'card' | 'brand-card' | 'horizontal' | 'stacked' | 'emblem')
 */
export default function AnayaCraftLogo({
  variant = 'brand-card', // 'card' | 'brand-card' | 'horizontal' | 'stacked' | 'emblem'
  size = 'md', // 'sm' | 'md' | 'lg'
  theme = 'light', // 'light' | 'dark'
  className = ''
}) {
  if (variant === 'card' || variant === 'brand-card' || variant === 'vertical' || variant === 'stacked') {
    return <AnayaCraftBrandCard className={className} size={size} />;
  }

  if (variant === 'emblem') {
    return <AnayaCraftEmblem size={size === 'sm' ? 36 : size === 'lg' ? 64 : 44} className={className} />;
  }

  const isDark = theme === 'dark';
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  // Horizontal variant (for navbar, compact headers, etc.)
  return (
    <div className={`flex items-center space-x-3 text-left select-none ${className}`}>
      <img
        src="/anaya-craft-icon.png"
        alt="Anaya Craft"
        className={`${isSm ? 'h-8' : isLg ? 'h-12' : 'h-10'} w-auto object-contain flex-shrink-0 drop-shadow-2xs`}
      />

      <div className="min-w-0 flex-1 leading-none space-y-1">
        {/* Title */}
        <div className={`tracking-tight ${isSm ? 'text-xs' : isLg ? 'text-lg' : 'text-sm'}`}>
          <span className={`font-extrabold ${isDark ? 'text-blue-400' : 'text-[#0072E5]'}`}>Anaya</span>{' '}
          <span className={`font-black ${isDark ? 'text-white' : 'text-[#0F1C3F]'}`}>Craft</span>
        </div>

        {/* Orange Tagline Banner */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600 text-white rounded-md px-2 py-0.5 inline-flex flex-col shadow-2xs">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-white leading-tight whitespace-nowrap">
            ALL KINDS OF IT SOLUTIONS
          </span>
          <span className="text-[7px] font-bold uppercase tracking-widest text-amber-100 leading-tight mt-0.5 whitespace-nowrap">
            TECHNOLOGY • BUILT AROUND YOU
          </span>
        </div>
      </div>
    </div>
  );
}
