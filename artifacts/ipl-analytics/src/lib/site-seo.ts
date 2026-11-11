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
  '/home': { title: 'Cricket Intelligence', description: 'Explore cricket statistics, franchise stories and analytical tools on CricField.' },
  '/feed': { title: 'Cricket Feed', description: 'Explore cricket news, squad context and editorial analysis.' },
  '/feed/ipl-2027': { title: 'IPL 2027 Desk', description: 'Track IPL 2027 planning and squad context with source status.' },
  '/feed/ipl-2027/retentions': { title: 'IPL 2027 Retentions', description: 'Explore retention scenarios and reported squad decisions.' },
  '/stats': { title: 'Cricket Statistics', description: 'Explore batting, bowling and team statistics.' },
  '/pulse': { title: 'Cricket Pulse', description: 'Explore cricket results and auction context.' },
  '/scores': { title: 'Scores', description: 'Explore cricket scores and match information.' },
  '/intelligence': { title: 'Decision Intelligence', description: 'Explore cricket analysis, estimates and decision tools.' },
  '/dugout': { title: 'Dugout', description: 'Explore franchise history, milestones and editorial analysis.' },
  '/scout': { title: 'Scout Lab', description: 'Explore player profiles and compare talent across supported cricket leagues.' },
  '/scout/compare': { title: 'Compare Players', description: 'Compare player statistics in Scout Lab.' },
  '/scout/roles': { title: 'Player Roles', description: 'Explore player roles and scouting context.' },
  '/arena': { title: 'Fan Arena', description: 'Explore cricket fan features on CricField.' },
  '/arcade': { title: 'Cricket Arcade', description: 'Play cricket simulation and trivia games without real-money wagering.' },
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
  if (PUBLIC_PAGES[path]) return PUBLIC_PAGES[path];
  const section = path.startsWith('/players/') || path.startsWith('/scout/player/') ? 'Player Profile'
    : path.startsWith('/venues/') ? 'Venue Profile'
    : path.startsWith('/match/') ? 'Match Analysis'
    : path.startsWith('/dugout/') ? 'Franchise Dugout'
    : path.startsWith('/ai-analyst/') ? 'Analyst Tool'
    : path.startsWith('/arcade/') ? 'Cricket Arcade'
    : path.startsWith('/feed/') ? 'Cricket Feed' : 'Cricket Intelligence';
  return { title: section, description: `Explore ${section.toLowerCase()} on CricField, an independent cricket analytics project.` };
}
