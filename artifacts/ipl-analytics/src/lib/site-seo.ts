export const SITE_ORIGIN = 'https://www.cricfield.in';

/** No inferred hostname: preview deployments must not become canonical by accident. */
export function normalizeSiteOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export const PUBLIC_PAGES: Record<string, { title: string; description: string }> = {
  '/editorials': { title: 'Cricket Editorials & IPL Analysis', description: 'Read CricField cricket editorials, franchise analysis and data-led stories about IPL tactics, players and squad decisions.' },
  '/auction': { title: 'IPL Auction Analysis', description: 'Explore IPL auction analysis, player valuations and franchise squad-building context on CricField.' },
  '/tactics': { title: 'Cricket Tactics & Match Strategy', description: 'Explore cricket tactics, player matchups and franchise strategy through CricField analysis.' },
  '/venues': { title: 'Cricket Grounds & Venue Analysis', description: 'Explore cricket venue conditions and their influence on franchise tactics and player performance.' },
  '/storylines': { title: 'IPL Stories & Franchise Analysis', description: 'Read cricket stories and IPL franchise analysis on CricField.' },
  '/retention-room': { title: 'IPL Retention Room & Squad Planning', description: 'Explore IPL franchise squads, retention decisions and auction planning in the CricField Retention Room.' },
  '/squad-hq': { title: 'IPL Squad HQ', description: 'Explore franchise squad planning, retention context and auction decisions on CricField.' },
  '/reports': { title: 'Cricket Analytics Reports', description: 'Explore CricField reports on cricket statistics, franchise strategy and player performance.' },
  '/blogs': { title: 'Cricket Analysis Blog', description: 'Read CricField cricket analysis, player stories and data-led IPL insights.' },
  '/home': { title: 'IPL Stats, Cricket Analytics & Pressure Lab', description: 'Explore CricField for IPL batting and bowling statistics, player comparisons, auction analysis, franchise stories and T20 pressure intelligence.' },
  '/feed': { title: 'Cricket Feed', description: 'Explore cricket news, squad context and editorial analysis.' },
  '/feed/ipl-2027': { title: 'IPL 2027 Desk', description: 'Track IPL 2027 planning and squad context with source status.' },
  '/feed/ipl-2027/retentions': { title: 'IPL 2027 Retentions', description: 'Explore retention scenarios and reported squad decisions.' },
  '/stats': { title: 'IPL Statistics & Player Records', description: 'Explore IPL batting, bowling and team records. Filter cricket statistics by season and compare players, matchups and phases on CricField.' },
  '/pulse': { title: 'Cricket Pulse', description: 'Explore cricket results and auction context.' },
  '/scores': { title: 'Scores', description: 'Explore cricket scores and match information.' },
  '/intelligence': { title: 'Decision Intelligence', description: 'Explore cricket analysis, estimates and decision tools.' },
  '/dugout': { title: 'Dugout', description: 'Explore franchise history, milestones and editorial analysis.' },
  '/pressurelab': { title: 'Pressure Lab: T20 Player Analysis', description: 'Compare T20 player profiles, roles and performance across supported cricket leagues with CricField Pressure Lab.' },
  '/pressurelab/compare': { title: 'Compare Players', description: 'Compare player statistics in Pressure Lab.' },
  '/pressurelab/roles': { title: 'Player Roles', description: 'Explore player roles and scouting context.' },
  '/arena': { title: 'Fan Arena', description: 'Explore cricket fan features on CricField.' },
  '/ai-analyst': { title: 'AI Analyst', description: 'Explore cricket analytical tools and their data context.' },
  '/visualizations': { title: 'Cricket Visualizations', description: 'Explore cricket data through interactive visualizations.' },
  '/about': { title: 'About', description: 'Learn about CricField and its independent creator.' },
  '/methodology': { title: 'Methodology', description: 'Understand the methods and limitations behind CricField statistics.' },
  '/data-sources': { title: 'Data Sources', description: 'Read about the sources and coverage of CricField data.' },
  '/contact': { title: 'Contact', description: 'Find available contact channels for CricField questions and corrections.' },
  '/disclaimer': { title: 'Disclaimer', description: 'Read CricField independence, accuracy and third-party content disclosures.' },
  '/privacy': { title: 'Privacy', description: 'Understand data use and manage optional analytics, advertising and photo preferences.' },
  '/terms': { title: 'Terms of Use', description: 'Read the terms for using CricField tools, content and demonstration features.' },
};

export function pageMetadata(path: string) {
  path = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/') path = '/home';
  if (PUBLIC_PAGES[path]) return PUBLIC_PAGES[path];
  const section = path.startsWith('/players/') || path.startsWith('/pressurelab/player/') ? 'Player Profile'
    : path.startsWith('/venues/') ? 'Venue Profile'
    : path.startsWith('/match/') ? 'Match Analysis'
    : path.startsWith('/dugout/') ? 'Franchise Dugout'
    : path.startsWith('/ai-analyst/') ? 'Analyst Tool'
    : path.startsWith('/feed/') ? 'Cricket Feed' : 'Cricket Intelligence';
  return { title: section, description: `Explore ${section.toLowerCase()} on CricField, an independent cricket analytics project.` };
}
