import {afterEach,describe,it,expect,vi} from 'vitest';
import {NextRequest,type NextFetchEvent} from 'next/server';
import {proxy} from './proxy';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('optional analytics proxy',()=>{
 it('makes no network requests until an analytics endpoint and site are configured',()=>{vi.stubEnv('UMAMI_URL','');vi.stubEnv('UMAMI_WEBSITE_ID','');const fetcher=vi.fn(async()=>new Response());vi.stubGlobal('fetch',fetcher);proxy(new NextRequest('https://botazez.example/'),{waitUntil:vi.fn()} as unknown as NextFetchEvent);expect(fetcher).not.toHaveBeenCalled();});
 it('sends one page event only to the configured endpoint without invented screen data or a raw-IP event',async()=>{vi.stubEnv('UMAMI_URL','https://analytics.example');vi.stubEnv('UMAMI_WEBSITE_ID','fixture-id');const fetcher=vi.fn(async()=>new Response());vi.stubGlobal('fetch',fetcher);const waitUntil=vi.fn();proxy(new NextRequest('https://botazez.example/?private=value',{headers:{'x-forwarded-for':'192.0.2.10'}}),{waitUntil} as unknown as NextFetchEvent);expect(fetcher).toHaveBeenCalledTimes(1);const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(url).toBe('https://analytics.example/api/send');const event=JSON.parse(String(options.body));expect(event.payload.url).toBe('/');expect(event.payload).not.toHaveProperty('screen');expect(JSON.stringify(event)).not.toContain('192.0.2.10');await Promise.all(waitUntil.mock.calls.map(([p])=>p));});
});
