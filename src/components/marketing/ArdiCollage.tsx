'use client';

/*
   BOTAZEZ — ARDI hero collage.
   Client-only piece of the /ardi page: mirrors the ImgWithFallback
   pattern from ArdiPanel.tsx so a missing /ardi/*.jpg degrades to a
   branded gradient tile instead of a broken image.
*/

import { useState } from 'react';

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
  return (
    <div className="tl-collage">
      <ImgWithFallback
        src={IMAGES.guide}
        alt="ARDI — analyst presenting"
        className="w-[86px] sm:w-[150px] md:w-[210px] -mr-3 sm:-mr-6 md:-mr-10"
        style={{ transform: 'rotate(3deg)', filter: 'drop-shadow(0 12px 28px rgba(56,189,248,0.35))' }}
      />
      <ImgWithFallback
        src={IMAGES.ops}
        alt="ARDI — cyber operative"
        className="relative z-10 w-[120px] sm:w-[210px] md:w-[300px]"
        style={{ filter: 'drop-shadow(0 18px 40px rgba(22,163,74,0.32))' }}
      />
      <ImgWithFallback
        src={IMAGES.hero}
        alt="ARDI — operator"
        className="w-[86px] sm:w-[150px] md:w-[210px] -ml-3 sm:-ml-6 md:-ml-10"
        style={{ transform: 'rotate(-3deg)', filter: 'drop-shadow(0 12px 28px rgba(251,191,36,0.4))' }}
      />
    </div>
  );
}
