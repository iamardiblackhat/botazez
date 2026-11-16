import Link from 'next/link';
import Image from 'next/image';
import type {ReactNode} from 'react';
import OmneliaBrand from './OmneliaBrand';
export default function InfoPage({title,intro,children}:{title:string;intro:string;children:ReactNode}){
 return <main className="omnelia-info"><div className="omnelia-info-inner"><nav aria-label="Botazez pages"><Link href="/">← Back to map</Link><Link href="/docs">Documentation</Link><Link href="/privacy">Privacy</Link></nav><header className="omnelia-glass"><Image width={72} height={92} unoptimized src="/brand/ardi-sec-glass.webp" alt="ARDI — Botazez by Omnelia SI" className="ardi-info-mark"/><span className="font-mono text-sm tracking-widest text-[var(--gold-primary)]">BOTAZEZ</span><div><OmneliaBrand/></div><h1>{title}</h1><p>{intro}</p></header>{children}<footer className="py-8"><OmneliaBrand/></footer></div></main>;
}
