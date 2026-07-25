'use client';

/*
   BOTAZEZ — Surface switcher
   Cycles Daylight (default) → Core → Ghost. Daylight is the product
   default; the two dark consoles stay available as operator choices.
*/

import { Sun, Moon, Ghost } from 'lucide-react';
import { THEME_META, nextTheme, type BotazezTheme } from '@/lib/theme';

const ICON = { light: Sun, core: Moon, ghost: Ghost } as const;

export default function ThemeSwitch({
  theme,
  setTheme,
  variant = 'rail',
}: {
  theme: BotazezTheme;
  setTheme: (t: BotazezTheme) => void;
  /** 'rail' = narrow vertical tool strip; 'row' = full-width mobile row */
  variant?: 'rail' | 'row';
}) {
  const meta = THEME_META[theme];
  const Icon = ICON[theme];
  const isDark = theme !== 'light';
  const advance = () => setTheme(nextTheme(theme));
  const title = `Surface: ${meta.label} — ${meta.hint}. Click to cycle.`;

  if (variant === 'row') {
    return (
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-[var(--border-secondary)] px-1">
        <span className="text-[12px] font-mono tracking-[0.2em] uppercase text-[var(--text-muted)]">
          Surface
        </span>
        <button
          onClick={advance}
          title={title}
          aria-label={title}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-all"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(12,108,168,0.10)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(12,108,168,0.28)'}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: meta.swatch }} />
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--text-secondary)]">
            {meta.label}
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={advance}
      title={title}
      aria-label={title}
      className="w-[60px] py-1.5 flex flex-col items-center justify-center gap-1 rounded-lg transition-all duration-500 cursor-pointer"
      style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(12,108,168,0.10)' }}
    >
      <Icon className="transition-all duration-500" style={{ width: 15, height: 15, color: meta.swatch }} />
      <span
        className="font-mono uppercase text-center leading-[1.1] text-[var(--text-muted)]"
        style={{ fontSize: 7, letterSpacing: '0.03em' }}
      >
        {meta.label}
      </span>
    </button>
  );
}
