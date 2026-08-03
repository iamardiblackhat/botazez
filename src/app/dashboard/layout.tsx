'use client';

import { useEffect } from 'react';
import { THEME_BODY_CLASS } from '@/lib/theme';

/**
 * Applies the light/grey theme by default the moment you enter the dashboard
 * section (hub, any /dashboard/[domain] page, or /dashboard/full). Runs once
 * per entry into this route segment — it does not fight the theme switcher
 * inside /dashboard/full, which can still change it for the rest of the
 * session once the user is in.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.className = THEME_BODY_CLASS.light;
  }, []);

  return <>{children}</>;
}
