'use client';

/*
   BOTAZEZ — reusable light-theme feature card.
   Shared by the homepage intel-domain grid and the ARDI capability grid.
   Enters staggered on scroll rather than all at once; `index` sets each
   card's place in that stagger. Hover lifts the card and nudges the icon,
   so the grid reads as composed rather than a static template.
*/

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export interface FeatureCardProps {
  /**
   * A rendered icon element, e.g. `<Plane className="w-5 h-5" strokeWidth={2} />`
   * — an already-instantiated element, not the component reference. Server
   * Components can't pass a component *function* as a prop into a Client
   * Component (this card animates, so it has to be one); an element is fine.
   */
  icon: ReactNode;
  title: string;
  description: string;
  /** Optional small uppercase footnote — e.g. the upstream data source. */
  meta?: string;
  /** Position within its grid; drives the stagger delay. */
  index?: number;
}

export default function FeatureCard({ icon, title, description, meta, index = 0 }: FeatureCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="tl-card"
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        type: 'spring',
        damping: 22,
        stiffness: 220,
        // Cap the stagger so a long grid doesn't leave the last cards
        // waiting a beat behind the ones already in view.
        delay: reduceMotion ? 0 : Math.min(index, 7) * 0.06,
      }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
    >
      <motion.span
        className="tl-card-icon"
        aria-hidden="true"
        whileHover={reduceMotion ? undefined : { scale: 1.08, rotate: -4 }}
        transition={{ type: 'spring', damping: 12, stiffness: 300 }}
      >
        {icon}
      </motion.span>
      <h3 className="tl-card-title">{title}</h3>
      <p className="tl-card-desc">{description}</p>
      {meta && <p className="tl-card-meta">{meta}</p>}
    </motion.article>
  );
}
