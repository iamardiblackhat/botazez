/**
 * Botazez theme surfaces.
 *
 * 'light' (Daylight) is the product default — a calm, legible monitoring
 * surface. The two dark consoles remain first-class choices, never defaults.
 */
export type BotazezTheme = 'light' | 'core' | 'ghost';

/** Class applied to <body>; the palette blocks in globals.css key off these. */
export const THEME_BODY_CLASS: Record<BotazezTheme, string> = {
  light: 'theme-light-dash',
  core: '',
  ghost: 'theme-ghost',
};

export const THEME_ORDER: BotazezTheme[] = ['light', 'core', 'ghost'];

export const THEME_META: Record<BotazezTheme, { label: string; hint: string; swatch: string }> = {
  light: { label: 'Daylight', hint: 'Default — light monitoring surface', swatch: '#0C6CA8' },
  core: { label: 'Core', hint: 'Dark console — gold on void', swatch: '#D4AF37' },
  ghost: { label: 'Ghost', hint: 'Dark console — phantom violet', swatch: '#B388FF' },
};

/** Advance to the next surface in order, wrapping. */
export function nextTheme(current: BotazezTheme): BotazezTheme {
  return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
}
