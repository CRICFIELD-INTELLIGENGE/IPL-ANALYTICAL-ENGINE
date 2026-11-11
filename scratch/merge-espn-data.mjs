import fs from "fs";

const BIO_PATH = "C:/Users/KIIT0001/Downloads/Data-Insight-Engine/Data-Insight-Engine/artifacts/ipl-analytics/public/data/player-bio.json";
const CSV_PATH = "C:/Users/KIIT0001/Downloads/Data-Insight-Engine/Data-Insight-Engine/scratch/espn-player-data.csv";

// Minimal RFC4180-ish CSV parser (handles quoted fields with embedded commas).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const header = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const normalize = (name) =>
  (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

function exactMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  return !!na && !!nb && na === nb;
}

function fuzzyMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  const pa = na.split(" "), pb = nb.split(" ");
  if (pa.length && pb.length) {
    return pa[0][0] === pb[0][0] && pa[pa.length - 1] === pb[pb.length - 1];
  }
  return false;
}

/**
 * Exact matches must be checked across the ENTIRE entry list before any
 * fuzzy fallback is attempted for ANY entry — otherwise an early fuzzy hit
 * (e.g. "R Sharma" for CSV row "RG Sharma") can shadow a later exact hit,
 * silently pasting one real person's photo/DOB onto a completely different
 * real person. (Caught this exact case: "R Sharma" is Rahul Sharma, a
 * legbreak-googly bowler — the fuzzy-first version pasted Rohit Sharma's
 * photo and birthdate onto him.)
 */
function findBioMatch(entries, csvName, csvLongName) {
  const exact = entries.find(([, e]) => exactMatch(e.playerName, csvName) || exactMatch(e.playerName, csvLongName));
  if (exact) return exact;
  // Only fuzzy-match when there is exactly one plausible candidate — if two
  // different existing entries both fuzzy-match, it's ambiguous (e.g. two
  // "Sharma"s with the same first initial) and safer to skip than guess.
  const candidates = entries.filter(([, e]) => fuzzyMatch(e.playerName, csvName) || fuzzyMatch(e.playerName, csvLongName));
  return candidates.length === 1 ? candidates[0] : null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDob(dob) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dob || "");
  if (!m) return { display: "", iso: null };
  const [, d, mo, y] = m;
  const day = parseInt(d, 10), month = parseInt(mo, 10), year = parseInt(y, 10);
  if (month < 1 || month > 12) return { display: "", iso: null };
  return { display: `${day} ${MONTHS[month - 1]} ${year}`, iso: `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

function computeAge(iso) {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// Sentence case ("right-hand bat" -> "Right-hand bat") — matches the style
// already used for the small set of pre-existing batStyle/bowlStyle values.
const sentenceCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const bio = JSON.parse(fs.readFileSync(BIO_PATH, "utf8"));
const csvRows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));

const bioEntries = Object.entries(bio); // [key, entry][]

let updated = 0;
let created = 0;
let imageFixed = 0;
let dobFixed = 0;
const ambiguous = [];

for (const row of csvRows) {
  if (!row.Name) continue;
  const csvName = row.Name.trim();
  const csvLongName = (row.longName || "").trim();
  const imgUrl = (row.imgUrl || "").trim();
  const isRealImage = imgUrl.startsWith("http") && !imgUrl.includes("lsciNone");

  // Find an existing bio entry matching either the scorecard name or long name.
  let match = findBioMatch(bioEntries, csvName, csvLongName);
  if (!match) {
    const fuzzyCandidates = bioEntries.filter(([, e]) => fuzzyMatch(e.playerName, csvName) || fuzzyMatch(e.playerName, csvLongName));
    if (fuzzyCandidates.length > 1) {
      ambiguous.push({ csv: csvName, candidates: fuzzyCandidates.map(([, e]) => e.playerName) });
      continue; // skip entirely rather than guess or create a duplicate
    }
  }

  // Note: this CSV's "playingRoles" column is not a real role (Batsman/
  // Bowler/All-rounder/Wicketkeeper) — it's a duplicate of the short
  // bowling-style code (e.g. "lws", "rm"), confirmed by spot-checking
  // multiple rows. Deliberately not used here; `role` is left untouched.
  const { display: dobDisplay, iso: dobIso } = formatDob(row.dob);
  const age = computeAge(dobIso);
  const batStyle = row.longBattingStyles && row.longBattingStyles.toLowerCase() !== "na" ? sentenceCase(row.longBattingStyles) : null;
  const bowlStyle = row.longBowlingStyles && row.longBowlingStyles.toLowerCase() !== "na" ? sentenceCase(row.longBowlingStyles) : null;

  if (match) {
    const [, entry] = match;
    if (isRealImage && entry.image !== imgUrl) { entry.image = imgUrl; imageFixed++; }
    if (dobDisplay && !entry.birthDate) { entry.birthDate = dobDisplay; dobFixed++; }
    if (age != null && !entry.age) entry.age = age;
    if (batStyle && (!entry.batStyle || entry.batStyle === "Right hand Bat")) entry.batStyle = batStyle;
    if (bowlStyle && !entry.bowlStyle) entry.bowlStyle = bowlStyle;
    if (!entry.fullName || entry.fullName === entry.playerName) entry.fullName = csvLongName || entry.fullName;
    updated++;
  } else {
    const slug = normalize(csvLongName || csvName).replace(/\s+/g, "-");
    if (bio[slug]) continue; // avoid clobbering an existing unrelated key
    bio[slug] = {
      playerId: row.ID || "",
      playerName: csvName,
      fullName: csvLongName || csvName,
      batStyle: batStyle || "",
      bowlStyle: bowlStyle || "",
      fieldPos: "",
      image: isRealImage ? imgUrl : "",
      birthDate: dobDisplay,
      birthPlace: "",
      age: age,
      country: "",
      role: "",
      iplDebut: "",
      intDebut: "",
      bio: "",
    };
    bioEntries.push([slug, bio[slug]]);
    created++;
  }
}

fs.writeFileSync(BIO_PATH, JSON.stringify(bio, null, 2));

console.log(JSON.stringify({
  csvRows: csvRows.length,
  updated,
  created,
  imagesFixed: imageFixed,
  dobFixed,
  skippedAmbiguous: ambiguous.length,
}, null, 2));
if (ambiguous.length) {
  console.log("AMBIGUOUS (skipped, needs manual review):");
  console.log(JSON.stringify(ambiguous, null, 2));
}
