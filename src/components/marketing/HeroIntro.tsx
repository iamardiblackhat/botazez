'use client';

/*
   BOTAZEZ — homepage hero, left column.
   Client component so the entrance can stagger via framer-motion.
   Elements reveal in order: badge → h1 → paragraph → CTAs → stats.
   Respects prefers-reduced-motion (renders static, no transforms).
*/

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Globe, ShieldCheck } from 'lucide-react';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function HeroIntro() {
  const reduce = useReducedMotion();

  // With reduced motion, skip the animation entirely — render in place.
  const motionProps = reduce
    ? {}
    : { variants: container, initial: 'hidden' as const, animate: 'show' as const };
  const childProps = reduce ? {} : { variants: item };

  return (
    <motion.div className="tl-hero-inner" {...motionProps}>
      <motion.span className="tl-eyebrow" {...childProps}>
        Open Source Intelligence
      </motion.span>
      <motion.h1 {...childProps}>
        The whole planet,{' '}
        <span className="tl-gradient-text">one live picture.</span>
      </motion.h1>
      <motion.p {...childProps}>
        Botazez pulls flights, ships, cameras, earthquakes, wildfires, satellites, cyber threats
        and breaking news out of two dozen public feeds and renders them together on a single
        GPU-accelerated globe — free and open source. That&rsquo;s it, spinning opposite —
        live right now, not a mock-up.
      </motion.p>
      <motion.div className="tl-hero-cta" {...childProps}>
        <Link href="/dashboard" className="tl-btn-primary">
          <Globe className="w-[18px] h-[18px]" aria-hidden="true" />
          Launch Dashboard
        </Link>
        <Link href="/ardi" className="tl-btn-ghost">
          <ShieldCheck className="w-[18px] h-[18px]" aria-hidden="true" />
          Meet ARDI
        </Link>
      </motion.div>
      <motion.div className="tl-hero-stats" {...childProps}>
        <span>11 intel domains</span>
        <span>20+ live feeds</span>
        <span>WebGL rendered</span>
        <span>MIT licensed</span>
      </motion.div>
    </motion.div>
  );
}
