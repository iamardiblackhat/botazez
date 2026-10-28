import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const SOURCE = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
function day(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
function text(value: unknown, limit = 2000): string {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}
/** KEV establishes known exploitation, not CVSS severity or a global threat level. */
export async function GET() {
  try {
    const response = await fetch(SOURCE, { signal: AbortSignal.timeout(8000), redirect: 'error', headers: { Accept: 'application/json', 'User-Agent': 'BOTAZEZ/5.0' } });
    if (!response.ok) throw new Error('Source unavailable');
    const body: unknown = await response.json();
    const rows = body && typeof body === 'object' && 'vulnerabilities' in body ? body.vulnerabilities : null;
    if (!Array.isArray(rows) || rows.length > 50_000) throw new Error('Invalid source');
    const now = Date.now();
    const seen = new Set<string>();
    const records = rows.flatMap((row: unknown) => {
      if (!row || typeof row !== 'object') return [];
      const v = row as Record<string, unknown>;
      const id = text(v.cveID, 32), date = day(v.dateAdded);
      if (!/^CVE-\d{4}-\d{4,19}$/.test(id) || !date || Date.parse(date) > now || seen.has(id)) return [];
      seen.add(id);
      return [{ id, name: text(v.vulnerabilityName), vendor: text(v.vendorProject, 200), product: text(v.product, 200), description: text(v.shortDescription), severity: null, exploitation: 'Known exploited', date, due: day(v.dueDate), source: 'CISA KEV', sourceUrl: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${id}` }];
    }).sort((a, b) => b.date.localeCompare(a.date));
    if (rows.length && !records.length) throw new Error('No usable source records');
    const recent = records.filter(v => now - Date.parse(v.date) <= 60 * 86400_000);
    const threats = (recent.length >= 15 ? recent : records).slice(0, 25);
    return NextResponse.json({ connected: true, threats, stats: { cisa_total: records.length, returned_records: threats.length, threat_level: null }, timestamp: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch {
    return NextResponse.json({ connected: false, threats: [], stats: {}, error: 'The vulnerability source is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
