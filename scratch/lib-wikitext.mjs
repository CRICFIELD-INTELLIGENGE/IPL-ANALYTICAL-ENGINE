// Shared wikitext parsing helpers used by the IPL auction + retention extractors.
// Single copy on purpose: these rules (colspan expansion, template unwrapping,
// country/team canonicalisation) must not drift between the two pipelines.

/* ---------------- wikitext -> plain text ---------------- */

export function stripRefs(s) {
  return s
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<sup>[\s\S]*?<\/sup>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "");
}

// {{sortname|Jos|Buttler}} / {{sortname|1=Shane|2=Bond}} / {{sortname|A|B|dab=x}}
export function expandSortname(s) {
  return s.replace(/\{\{\s*sortname\s*\|([^{}]*)\}\}/gi, (_, args) => {
    const parts = args.split("|").map(p => p.trim());
    const named = {};
    const positional = [];
    for (const p of parts) {
      const m = p.match(/^(\d+|dab|nolink)\s*=\s*([\s\S]*)$/i);
      if (m) {
        if (/^\d+$/.test(m[1])) named[m[1]] = m[2].trim();
      } else if (p) {
        positional.push(p);
      }
    }
    const first = named["1"] ?? positional[0] ?? "";
    const last = named["2"] ?? positional[1] ?? "";
    return `${first} ${last}`.trim();
  });
}

export function expandLinks(s) {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

export function cleanCell(raw) {
  let s = raw == null ? "" : String(raw);
  s = s.replace(/\{\{\s*n\/?a\s*(\|[^{}]*)?\}\}/gi, " NA ");
  s = stripRefs(s);
  s = expandSortname(s);
  // Flag templates must be unwrapped before {{sort}}, because retention tables
  // nest them: {{sort|India|{{flagicon|South Africa}}}} -- the sort KEY is a
  // wrong nationality and only the inner flag is truthful.
  s = s.replace(/\{\{\s*(?:cr|cricon|flagicon|flagathlete|flag)\s*\|\s*([^{}|]+?)\s*(\|[^{}]*)?\}\}/gi, "$1");
  s = s.replace(/\{\{\s*sort\s*\|[^{}|]*\|([^{}]*)\}\}/gi, "$1");
  s = s.replace(/\{\{\s*(?:nbsp|·|spaces)\s*(\|[^{}]*)?\}\}/gi, " ");
  s = s.replace(/\{\{\s*INR\s*(\|[^{}]*)?\}\}/gi, "INR");
  s = s.replace(/\{\{\s*USD\s*(\|[^{}]*)?\}\}/gi, "USD");
  let prev;
  do {
    prev = s;
    s = s.replace(/\{\{[^{}]*\}\}/g, "");
  } while (s !== prev);
  s = expandLinks(s);
  s = s.replace(/'''?/g, "");
  s = s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
  s = s.replace(/ NA /g, "");
  return s.replace(/\s+/g, " ").trim();
}

/* ---------------- table structure ---------------- */

export function splitTables(wikitext) {
  const tables = [];
  let i = 0;
  while (i < wikitext.length) {
    const start = wikitext.indexOf("{|", i);
    if (start === -1) break;
    let depth = 0, tmpl = 0, j = start;
    while (j < wikitext.length) {
      // Track template nesting first: "{{flagicon image|}}" ends with "|}}",
      // whose "|}" would otherwise be read as end-of-table and truncate it.
      if (wikitext.startsWith("{{", j)) { tmpl++; j += 2; continue; }
      if (wikitext.startsWith("}}", j)) { tmpl = Math.max(0, tmpl - 1); j += 2; continue; }
      if (tmpl === 0) {
        if (wikitext.startsWith("{|", j)) { depth++; j += 2; continue; }
        if (wikitext.startsWith("|}", j)) { depth--; j += 2; if (depth === 0) break; continue; }
      }
      j++;
    }
    tables.push(wikitext.slice(start, j));
    i = j;
  }
  return tables;
}

// A colspan=N cell occupies N grid columns; ignoring that shifts every later
// cell left and silently drops rows.
function stripCellAttrs(cell) {
  const idx = cell.indexOf("|");
  if (idx === -1) return { content: cell, colspan: 1 };
  const head = cell.slice(0, idx);
  const isAttrs =
    !/[[{]/.test(head) &&
    ((/^[\s\w"'=;:%#.,()\-\/]*$/.test(head) && /=/.test(head)) || head.trim() === "");
  if (!isAttrs) return { content: cell, colspan: 1 };
  const m = head.match(/colspan\s*=\s*"?(\d+)"?/i);
  return { content: cell.slice(idx + 1), colspan: m ? Math.max(1, Number(m[1])) : 1 };
}

export function splitCells(rowText, { expandColspan = true } = {}) {
  const cells = [];
  let buf = "";
  let curly = 0, square = 0;
  let atLineStart = true;
  let started = false;
  const push = () => { cells.push(buf); buf = ""; };

  for (let i = 0; i < rowText.length; i++) {
    const c = rowText[i];
    const next = rowText[i + 1];
    if (rowText.startsWith("{{", i)) { curly++; buf += "{{"; i++; atLineStart = false; continue; }
    if (rowText.startsWith("}}", i)) { curly = Math.max(0, curly - 1); buf += "}}"; i++; atLineStart = false; continue; }
    if (rowText.startsWith("[[", i)) { square++; buf += "[["; i++; atLineStart = false; continue; }
    if (rowText.startsWith("]]", i)) { square = Math.max(0, square - 1); buf += "]]"; i++; atLineStart = false; continue; }

    const free = curly === 0 && square === 0;
    if (free && (c === "|" || c === "!") && next === c) {
      if (started) push(); else started = true;
      i++; atLineStart = false; continue;
    }
    if (free && atLineStart && (c === "|" || c === "!")) {
      if (started) push(); else started = true;
      atLineStart = false; continue;
    }
    if (c === "\n") { atLineStart = true; buf += " "; continue; }
    if (c !== "\r") { buf += c; atLineStart = false; }
  }
  if (started) push();

  const grid = [];
  for (const c of cells) {
    const { content, colspan } = stripCellAttrs(c);
    grid.push(content);
    if (expandColspan) for (let k = 1; k < colspan; k++) grid.push("");
  }
  return grid;
}

/** Row objects keep the raw text so callers can detect section-header rows. */
export function parseTableRows(tableText) {
  const body = tableText.replace(/^\{\|[^\n]*\n?/, "").replace(/\|\}\s*$/, "");
  const chunks = body.split(/^\s*\|-[^\n]*$/m);
  const rows = [];
  for (const raw of chunks) {
    if (!raw.trim()) continue;
    let text = raw;
    if (/^\s*\|\+/.test(text)) {
      const afterCaption = text.replace(/^\s*\|\+[^\n]*\n?/, "");
      if (!afterCaption.trim()) continue;
      text = afterCaption;
    }
    rows.push({ raw: text, cells: splitCells(text) });
  }
  return rows.filter(r => r.cells.length > 0);
}

export function tableCaption(tableText) {
  const m = tableText.match(/^\s*\|\+([^\n]*)/m);
  return m ? cleanCell(m[1]) : null;
}

export function normHeader(h) {
  return cleanCell(h).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/* ---------------- money ---------------- */

// {{INRConvert|18|c}} -> 18 crore, {{INRConvert|50|l}} -> 50 lakh.
export function parseInrConvert(raw) {
  const m = String(raw ?? "").match(/\{\{\s*INRConvert\s*\|\s*([\d.]+)\s*\|\s*([a-z]+)/i);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const unit = m[2].toLowerCase();
  if (unit.startsWith("c")) return { lakh: value * 100, unit: "inr_crore", value };
  if (unit.startsWith("l")) return { lakh: value, unit: "inr_lakh", value };
  return null;
}

export function parseAmount(text) {
  if (!text) return null;
  const t = cleanCell(text).replace(/,/g, "");
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/* ---------------- canonicalisation ---------------- */

const COUNTRY_MAP = {
  IND: "India", INDIA: "India",
  AUS: "Australia", AUSTRALIA: "Australia",
  ENG: "England", ENGLAND: "England",
  SA: "South Africa", RSA: "South Africa", "SOUTH AFRICA": "South Africa",
  NZ: "New Zealand", NZL: "New Zealand", "NEW ZEALAND": "New Zealand",
  SL: "Sri Lanka", SRI: "Sri Lanka", LKA: "Sri Lanka", "SRI LANKA": "Sri Lanka",
  PAK: "Pakistan", PAKISTAN: "Pakistan",
  BAN: "Bangladesh", BD: "Bangladesh", BANGLADESH: "Bangladesh",
  AFG: "Afghanistan", AFGHANISTAN: "Afghanistan",
  ZIM: "Zimbabwe", ZIMBABWE: "Zimbabwe",
  IRE: "Ireland", IRELAND: "Ireland",
  NED: "Netherlands", NETHERLANDS: "Netherlands", HOLLAND: "Netherlands", NLD: "Netherlands",
  SCO: "Scotland", SCOTLAND: "Scotland",
  USA: "United States", UAE: "United Arab Emirates",
  NAM: "Namibia", NAMIBIA: "Namibia", NEP: "Nepal", NEPAL: "Nepal",
  OMA: "Oman", OMAN: "Oman", HK: "Hong Kong", CAN: "Canada", KEN: "Kenya",
  // West Indies plays as one side but Wikipedia flags individual islands.
  WIN: "West Indies", WI: "West Indies", "WEST INDIES": "West Indies",
  JAM: "West Indies", TRI: "West Indies", BAR: "West Indies", GUY: "West Indies",
  ATG: "West Indies", LCA: "West Indies", VIN: "West Indies", DMA: "West Indies",
  GRN: "West Indies", SKN: "West Indies", ANT: "West Indies", TTO: "West Indies",
  BRB: "West Indies", VCT: "West Indies",
  "TRINIDAD AND TOBAGO": "West Indies", JAMAICA: "West Indies",
  BARBADOS: "West Indies", GUYANA: "West Indies",
};

export function normCountry(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/\s+/g, " ").trim();
  if (!s) return null;
  const direct = COUNTRY_MAP[s.toUpperCase()];
  if (direct) return direct;
  const tokens = s.split(" ");
  const tail = tokens.slice(1).join(" ");
  if (tail && COUNTRY_MAP[tail.toUpperCase()]) return COUNTRY_MAP[tail.toUpperCase()];
  if (COUNTRY_MAP[tokens[0].toUpperCase()]) return COUNTRY_MAP[tokens[0].toUpperCase()];
  return s;
}

const TEAM_CANONICAL = {
  "Delhi Daredevils": "Delhi Capitals",
  "Delhi Dardevils": "Delhi Capitals",
  "Kings XI Punjab": "Punjab Kings",
  "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
  "Rising Pune Supergiants": "Rising Pune Supergiant",
};

const KNOWN_TEAMS = [
  "Chennai Super Kings", "Delhi Capitals", "Delhi Daredevils", "Deccan Chargers",
  "Gujarat Titans", "Gujarat Lions", "Kolkata Knight Riders", "Kochi Tuskers Kerala",
  "Lucknow Super Giants", "Mumbai Indians", "Punjab Kings", "Kings XI Punjab",
  "Pune Warriors India", "Rajasthan Royals", "Rising Pune Supergiant",
  "Rising Pune Supergiants", "Royal Challengers Bangalore",
  "Royal Challengers Bengaluru", "Sunrisers Hyderabad",
];

export function normTeam(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/\s+/g, " ").trim();
  return TEAM_CANONICAL[s] ?? s;
}

/** Finds a franchise name inside arbitrary text (captions, colspan header rows). */
export function detectTeam(text) {
  const s = cleanCell(text ?? "");
  if (!s) return null;
  for (const t of KNOWN_TEAMS) {
    if (s.includes(t)) return t;
  }
  return null;
}

export { KNOWN_TEAMS };
