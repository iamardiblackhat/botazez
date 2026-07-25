/*
   BOTAZEZ — reusable light-theme feature card.
   Shared by the homepage intel-domain grid and the ARDI capability grid.
*/

import type { LucideIcon } from 'lucide-react';

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional small uppercase footnote — e.g. the upstream data source. */
  meta?: string;
}

export default function FeatureCard({ icon: Icon, title, description, meta }: FeatureCardProps) {
  return (
    <article className="tl-card">
      <span className="tl-card-icon" aria-hidden="true">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </span>
      <h3 className="tl-card-title">{title}</h3>
      <p className="tl-card-desc">{description}</p>
      {meta && <p className="tl-card-meta">{meta}</p>}
    </article>
  );
}
