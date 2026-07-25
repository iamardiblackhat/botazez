'use client';

/*
   BOTAZEZ — ARDI hero collage.
   Client-only piece of the /ardi page: mirrors the ImgWithFallback
   pattern from ArdiPanel.tsx so a missing /ardi/*.jpg degrades to a
   branded gradient tile instead of a broken image.
*/

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const IMAGES = {
  hero: '/ardi/ardi-hero.jpg',   // arms raised — energetic
  ops: '/ardi/ardi-ops.jpg',     // hooded — cyber operative (centerpiece)
  guide: '/ardi/ardi-guide.jpg', // presenter — gesturing
};

function ImgWithFallback({
  src, alt, className, style,
}: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`tl-img-fallback ${className ?? ''}`} style={style} role="img" aria-label={alt}>
        ARDI
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

export default function ArdiCollage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="tl-collage">
      <motion.div
        className="w-[86px] sm:w-[150px] md:w-[210px] -mr-3 sm:-mr-6 md:-mr-10"
        initial={reduceMotion ? false : { opacity: 0, x: 26, rotate: 3 }}
        animate={{ opacity: 1, x: 0, rotate: 3 }}
        transition={{ type: 'spring', damping: 16, stiffness: 130, delay: 0.05 }}
      >
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <ImgWithFallback
            src={IMAGES.guide}
            alt="ARDI — analyst presenting"
            className="w-full"
            style={{ filter: 'drop-shadow(0 12px 28px rgba(56,189,248,0.35))' }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 w-[120px] sm:w-[210px] md:w-[300px]"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 140 }}
      >
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ImgWithFallback
            src={IMAGES.ops}
            alt="ARDI — cyber operative"
            className="w-full"
            style={{ filter: 'drop-shadow(0 18px 40px rgba(22,163,74,0.32))' }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="w-[86px] sm:w-[150px] md:w-[210px] -ml-3 sm:-ml-6 md:-ml-10"
        initial={reduceMotion ? false : { opacity: 0, x: -26, rotate: -3 }}
        animate={{ opacity: 1, x: 0, rotate: -3 }}
        transition={{ type: 'spring', damping: 16, stiffness: 130, delay: 0.1 }}
      >
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          <ImgWithFallback
            src={IMAGES.hero}
            alt="ARDI — operator"
            className="w-full"
            style={{ filter: 'drop-shadow(0 12px 28px rgba(251,191,36,0.4))' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
