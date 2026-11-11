export interface FranchiseTheme {
  name: string;
  primary: string;    // Saturated franchise brand shade
  secondary: string;  // Deep shadow / contrasting tint
  glow: string;       // Drop-shadow rgba
  baseText: string;   // Clean white or metallic tint
}

export const FRANCHISE_THEMES: Record<string, FranchiseTheme> = {
  default: {
    name: 'CricField Neon',
    primary: '#a3e635',     // Lime Green (#b8f35b)
    secondary: '#15803d',
    glow: 'rgba(163, 230, 53, 0.45)',
    baseText: '#ffffff',
  },
  srh: {
    name: 'Sunrisers Hyderabad',
    primary: '#f97316',
    secondary: '#fde047',
    glow: 'rgba(249, 115, 22, 0.45)',
    baseText: '#ffffff',
  },
  csk: {
    name: 'Chennai Super Kings',
    primary: '#facc15',
    secondary: '#1d4ed8',
    glow: 'rgba(250, 204, 21, 0.45)',
    baseText: '#ffffff',
  },
  rcb: {
    name: 'Royal Challengers Bengaluru',
    primary: '#ef4444',
    secondary: '#eab308',
    glow: 'rgba(239, 68, 68, 0.45)',
    baseText: '#ffffff',
  },
  mi: {
    name: 'Mumbai Indians',
    primary: '#004ba0',
    secondary: '#d1ab3e',
    glow: 'rgba(0, 75, 160, 0.45)',
    baseText: '#ffffff',
  },
  kkr: {
    name: 'Kolkata Knight Riders',
    primary: '#7c3aed',
    secondary: '#f59e0b',
    glow: 'rgba(124, 58, 237, 0.45)',
    baseText: '#ffffff',
  },
  rr: {
    name: 'Rajasthan Royals',
    primary: '#ec4899',
    secondary: '#2563eb',
    glow: 'rgba(236, 72, 153, 0.45)',
    baseText: '#ffffff',
  },
  dc: {
    name: 'Delhi Capitals',
    primary: '#004C97',
    secondary: '#0369a1',
    glow: 'rgba(0, 76, 151, 0.45)',
    baseText: '#ffffff',
  },
  pbks: {
    name: 'Punjab Kings',
    primary: '#C8102E',
    secondary: '#991b1b',
    glow: 'rgba(200, 16, 46, 0.45)',
    baseText: '#ffffff',
  },
  gt: {
    name: 'Gujarat Titans',
    primary: '#1B2133',
    secondary: '#115e59',
    glow: 'rgba(27, 33, 51, 0.45)',
    baseText: '#ffffff',
  },
  lsg: {
    name: 'Lucknow Super Giants',
    primary: '#0057A6',
    secondary: '#0e7490',
    glow: 'rgba(0, 87, 166, 0.45)',
    baseText: '#ffffff',
  },
};
