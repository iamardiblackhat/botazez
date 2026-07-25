/*
   BOTAZEZ — marketing route-group layout.
   Scopes the light theme to a `.theme-light` wrapper so the dark
   dashboard at /dashboard keeps its `:root` tokens untouched.
*/

import Nav from '@/components/marketing/Nav';
import Footer from '@/components/marketing/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-light">
      <div className="tl-shell">
        <Nav />
        <main className="tl-main">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
