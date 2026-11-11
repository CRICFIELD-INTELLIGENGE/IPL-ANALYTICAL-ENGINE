// Current franchises → warehouse team ids (renamed franchises keep their history; defunct teams are excluded).
// Deccan Chargers (16) are not Sunrisers Hyderabad: a different franchise with the same city.
export const FRANCHISE_TEAM_IDS: Record<string, number[]> = {
  CSK: [9],
  MI: [4],
  RCB: [2, 15],
  KKR: [6],
  SRH: [1],
  RR: [10],
  DC: [8, 11],
  PBKS: [7, 12],
  GT: [14],
  LSG: [13],
};
