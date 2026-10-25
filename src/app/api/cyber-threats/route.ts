import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OSIRIS / BOTAZEZ — Cyber Threat & CVE Intelligence
 * Authoritative US DHS CISA Known Exploited Vulnerabilities (KEV)
 */

export async function GET() {
  try {
    const results: any = { threats: [], stats: {}, timestamp: new Date().toISOString() };

    // 1. CISA Known Exploited Vulnerabilities (authoritative US govt source)
    try {
      const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'OSIRIS-Botazez/5.0', 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const allVulns = data.vulnerabilities || [];
        
        // Filter by last 60 days or take the latest 25
        let recent = allVulns
          .filter((v: any) => {
            const added = new Date(v.dateAdded);
            const daysAgo = (Date.now() - added.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 60;
          });
        
        if (recent.length < 15) {
          recent = allVulns.slice(-25).reverse();
        }

        results.threats = recent.slice(0, 25).map((v: any) => ({
          id: v.cveID,
          name: v.vulnerabilityName,
          vendor: v.vendorProject,
          product: v.product,
          description: v.shortDescription,
          severity: 'CRITICAL',
          date: v.dateAdded,
          due: v.dueDate,
          source: 'CISA KEV',
        }));
        results.stats.cisa_total = allVulns.length;
      }
    } catch (e) {
      console.warn('[OSIRIS] CISA KEV fetch error:', e instanceof Error ? e.message : e);
    }

    // 2. Aggregate stats
    results.stats.active_cves = results.threats.length;
    results.stats.threat_level = results.threats.length >= 8 ? 'CRITICAL' : results.threats.length >= 4 ? 'HIGH' : 'ELEVATED';

    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ threats: [], stats: {}, error: 'Failed' }, { status: 500 });
  }
}
