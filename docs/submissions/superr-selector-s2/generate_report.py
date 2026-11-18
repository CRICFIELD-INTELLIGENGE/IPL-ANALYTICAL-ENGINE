"""
Generates the SupeRR Selector Season 2 (Round 1, IPL 2027) charts and Word report:
  docs/submissions/superr-selector-s2/CricField_RR_IPL2027_Pressure_Intelligence_Methodology.docx
Run with:
  uv run --with python-docx --with matplotlib python docs/submissions/superr-selector-s2/generate_report.py
"""
import csv
import json
import os
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[3]
SUB_DIR = Path(__file__).resolve().parent
CHARTS_DIR = SUB_DIR / "charts"
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

pri_data = json.loads((ROOT / "artifacts/ipl-analytics/public/data/pri-benchmark-2027.json").read_text(encoding="utf-8"))
val_data = json.loads((SUB_DIR / "model_validation_results.json").read_text(encoding="utf-8"))
gaps_data = json.loads((SUB_DIR / "franchise_squad_gaps.json").read_text(encoding="utf-8"))

with open(SUB_DIR / "auction_eligible_shortlist.csv", encoding="utf-8") as f:
    shortlist_rows = list(csv.DictReader(f))

# ─── 1. GENERATE CHARTS ──────────────────────────────────────────────────────
plt.rcParams.update({
    "figure.facecolor": "#081322",
    "axes.facecolor": "#0D1B2E",
    "axes.edgecolor": "#334155",
    "axes.labelcolor": "#E2E8F0",
    "xtick.color": "#CBD5E1",
    "ytick.color": "#F8FAFC",
    "text.color": "#F8FAFC",
    "font.size": 10,
})

# Chart 1: Top 10 Batters
bat10 = list(reversed(pri_data["top10Batters"]))
fig, ax = plt.subplots(figsize=(8.5, 4.6), dpi=220)
names = [f"{b['rank']}. {b['player']} ({b['team']})" for b in bat10]
vals = [b["adjustedPer100"] for b in bat10]
errs_low = [b["adjustedPer100"] - b["interval90"][0] for b in bat10]
errs_high = [b["interval90"][1] - b["adjustedPer100"] for b in bat10]
bars = ax.barh(names, vals, xerr=[errs_low, errs_high], color="#00D2FF", edgecolor="#38BDF8", height=0.62, capsize=3, error_kw={"ecolor": "#94A3B8", "lw": 1.1})
for bar, b in zip(bars, bat10):
    ax.text(bar.get_width() + 0.8, bar.get_y() + bar.get_height()/2, f"PRI {b['pri']} (+{b['adjustedPer100']:.1f})", va="center", fontsize=8.5, color="#E2E8F0")
ax.set_xlabel("Empirical-Bayes Adjusted Pressure Impact (Runs / 100 Pressure Balls, 90% CI)")
ax.set_title("Top 10 Batters Under Pressure (IPL + Full-Member T20Is, 2022–2026)", fontweight="bold", pad=12)
ax.set_xlim(0, 68)
fig.tight_layout()
chart_bat = CHARTS_DIR / "top10_batters_pri.png"
fig.savefig(chart_bat, dpi=220)
plt.close(fig)

# Chart 2: Top 10 Bowlers
bowl10 = list(reversed(pri_data["top10Bowlers"]))
fig, ax = plt.subplots(figsize=(8.5, 4.6), dpi=220)
names = [f"{b['rank']}. {b['player']} ({b['team']})" for b in bowl10]
vals = [b["adjustedPer100"] for b in bowl10]
errs_low = [b["adjustedPer100"] - b["interval90"][0] for b in bowl10]
errs_high = [b["interval90"][1] - b["adjustedPer100"] for b in bowl10]
bars = ax.barh(names, vals, xerr=[errs_low, errs_high], color="#E879F9", edgecolor="#F472B6", height=0.62, capsize=3, error_kw={"ecolor": "#94A3B8", "lw": 1.1})
for bar, b in zip(bars, bowl10):
    ax.text(bar.get_width() + 0.6, bar.get_y() + bar.get_height()/2, f"PRI {b['pri']} (+{b['adjustedPer100']:.1f})", va="center", fontsize=8.5, color="#E2E8F0")
ax.set_xlabel("Empirical-Bayes Adjusted Pressure Impact (Runs Saved / 100 Pressure Balls, 90% CI)")
ax.set_title("Top 10 Bowlers Under Pressure (IPL + Full-Member T20Is, 2022–2026)", fontweight="bold", pad=12)
ax.set_xlim(0, 42)
fig.tight_layout()
chart_bowl = CHARTS_DIR / "top10_bowlers_pri.png"
fig.savefig(chart_bowl, dpi=220)
plt.close(fig)

# Chart 3: Pressure Definition Repeatability (K)
defs = val_data["definitionComparison"][:4]
fig, ax = plt.subplots(figsize=(8.2, 4.2), dpi=220)
labels = ["A. Rules (Selected)\n(45.2% balls)", "C. Rules Live WP\n(38.4% balls)", "B. Leverage Top 40%\n(35.2% balls)", "Leverage Top 30%\n(25.0% balls)"]
bat_k = [d["batting"]["priorStrengthBalls"] for d in defs]
bowl_k = [d["bowling"]["priorStrengthBalls"] for d in defs]
x = range(len(labels))
w = 0.35
ax.bar([i - w/2 for i in x], bat_k, width=w, label="Batting K (balls for 50% signal)", color="#38BDF8")
ax.bar([i + w/2 for i in x], bowl_k, width=w, label="Bowling K (balls for 50% signal)", color="#F59E0B")
ax.set_xticks(list(x))
ax.set_xticklabels(labels)
ax.set_ylabel("Prior Strength K (Lower = More Repeatable Signal)")
ax.set_title("Pressure Definition Validation: Match-Clustered Repeatability (K)", fontweight="bold", pad=10)
ax.legend(facecolor="#0D1B2E", edgecolor="#334155")
fig.tight_layout()
chart_defs = CHARTS_DIR / "definition_repeatability_k.png"
fig.savefig(chart_defs, dpi=220)
plt.close(fig)

# Chart 4: RR Retained Players with Pressure Sample
rr_with_pri = [r for r in pri_data["rrRetainedAudit"] if r["pri"] is not None and r["pressureBalls"] >= 30]
rr_with_pri.sort(key=lambda r: r["pri"])
fig, ax = plt.subplots(figsize=(8.2, 4.4), dpi=220)
r_names = [f"{r['player']} ({r['primaryDiscipline'][:3].upper()}, {r['pressureBalls']}b)" for r in rr_with_pri]
r_pris = [r["pri"] for r in rr_with_pri]
colors = ["#F472B6" if r["pri"] >= 75 else "#38BDF8" if r["pri"] >= 50 else "#F59E0B" for r in rr_with_pri]
bars = ax.barh(r_names, r_pris, color=colors, height=0.6)
ax.axvline(50, color="#94A3B8", linestyle="--", linewidth=1, label="Cohort Median (PRI 50)")
for bar, r in zip(bars, rr_with_pri):
    ax.text(bar.get_width() + 1.2, bar.get_y() + bar.get_height()/2, f"PRI {r['pri']:.1f} ({r['adjustedPer100']:+.1f}/100b)", va="center", fontsize=8.5)
ax.set_xlim(0, 112)
ax.set_xlabel("Pressure Reliability Index (PRI, 0–100)")
ax.set_title("Rajasthan Royals Retained Squad — Pressure Reliability Audit", fontweight="bold", pad=10)
ax.legend(facecolor="#0D1B2E", edgecolor="#334155", loc="lower right")
fig.tight_layout()
chart_rr = CHARTS_DIR / "rr_retained_vs_benchmarks.png"
fig.savefig(chart_rr, dpi=220)
plt.close(fig)

# Chart 5: Unified System Architecture Diagram
fig, ax = plt.subplots(figsize=(8.6, 3.6), dpi=220)
ax.axis("off")
boxes = [
    (0.03, 0.32, 0.20, 0.42, "#0D1B2E", "#38BDF8", "1. Warehouse & Snapshot\n• 1,589,302 T20 balls\n• 815 IPL+T20I matches\n• 0 reconciliation errors"),
    (0.28, 0.32, 0.20, 0.42, "#0D1B2E", "#E879F9", "2. Universal PRI Engine\n• Rules A (Death/RRR≥9/Collapse)\n• Context EV + Wicket Cost\n• Empirical Bayes (K=424/1122)"),
    (0.53, 0.32, 0.20, 0.42, "#0D1B2E", "#34D399", "3. Connected Modules\n• Pressure Intelligence\n• Scout Lab (Global Eligibility)\n• Squad HQ (10 Franchises)"),
    (0.78, 0.32, 0.19, 0.42, "#0D1B2E", "#F59E0B", "4. RR 2027 Decisions\n• Slot Fit (Best PRI vs Value)\n• Retained Squad Audit\n• Purse: ₹16.05 Cr / 6 Slots"),
]
for x0, y0, w0, h0, fc, ec, txt in boxes:
    rect = matplotlib.patches.FancyBboxPatch((x0, y0), w0, h0, boxstyle="round,pad=0.02,rounding_size=0.03", facecolor=fc, edgecolor=ec, linewidth=2)
    ax.add_patch(rect)
    ax.text(x0 + w0/2, y0 + h0/2, txt, ha="center", va="center", fontsize=8.5, color="#F8FAFC", fontweight="bold")
for x_arrow in [0.235, 0.485, 0.735]:
    ax.annotate("", xy=(x_arrow + 0.04, 0.53), xytext=(x_arrow, 0.53), arrowprops=dict(arrowstyle="->", color="#00D2FF", lw=2))
ax.set_title("CricField Unified IPL 2027 Pressure & Auction Decision Architecture", fontweight="bold", fontsize=11)
fig.tight_layout()
chart_arch = CHARTS_DIR / "architecture_flow.png"
fig.savefig(chart_arch, dpi=220)
plt.close(fig)

# ─── 2. BUILD WORD DOCUMENT (.DOCX) ──────────────────────────────────────────
doc = Document()
for section in doc.sections:
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)
    header = section.header.paragraphs[0]
    header.text = "CRICFIELD INTELLIGENCE OS  |  Rajasthan Royals SupeRR Selector Season 2 (IPL 2027)  |  Model cf-pressure.e01281a332"
    header.style.font.size = Pt(8.5)
    header.style.font.color.rgb = RGBColor(100, 116, 139)
    footer = section.footer.paragraphs[0]
    footer.text = "CricField — Beyond the Boundary · Unified Pressure Intelligence, Scout Lab & Squad HQ Methodology Report"
    footer.style.font.size = Pt(8.5)
    footer.style.font.color.rgb = RGBColor(100, 116, 139)

def shade_cell(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)

def add_styled_table(headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = str(h)
        shade_cell(hdr_cells[i], "0B192C")
        for p in hdr_cells[i].paragraphs:
            for r in p.runs:
                r.font.bold = True
                r.font.size = Pt(8.5)
                r.font.color.rgb = RGBColor(255, 255, 255)
    for r_idx, row in enumerate(rows):
        cells = table.add_row().cells
        bg = "F8FAFC" if r_idx % 2 == 0 else "EFF6FF"
        for i, val in enumerate(row):
            cells[i].text = str(val)
            shade_cell(cells[i], bg)
            for p in cells[i].paragraphs:
                for r in p.runs:
                    r.font.size = Pt(8.5)
                    r.font.color.rgb = RGBColor(15, 23, 42)
    doc.add_paragraph()

def add_sec_heading(num, title):
    h = doc.add_heading(f"{num}. {title}", level=1)
    for r in h.runs:
        r.font.color.rgb = RGBColor(11, 25, 44)
    return h

def add_formula(text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    run = p.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(3, 105, 161)

# 1. Cover Page
logo_path = ROOT / "artifacts/ipl-analytics/public/branding/cricfield-logo.png"
if logo_path.exists():
    p_logo = doc.add_paragraph()
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_logo.add_run().add_picture(str(logo_path), width=Inches(1.8))

p_cov = doc.add_paragraph()
p_cov.alignment = WD_ALIGN_PARAGRAPH.CENTER
r0 = p_cov.add_run("\nCRICFIELD — BEYOND THE BOUNDARY\n")
r0.font.size = Pt(12)
r0.font.bold = True
r0.font.color.rgb = RGBColor(2, 132, 199)

r1 = p_cov.add_run("SupeRR Selector Season 2 · Round 1\nIPL 2027 | Rajasthan Royals\n\n")
r1.font.size = Pt(22)
r1.font.bold = True
r1.font.color.rgb = RGBColor(11, 25, 44)

r2 = p_cov.add_run("Pressure Intelligence, Scouting & Auction Decision Methodology\n")
r2.font.size = Pt(14)
r2.font.bold = True
r2.font.color.rgb = RGBColor(190, 24, 93)

r3 = p_cov.add_run(
    "\nUnified Mathematical Framework Connecting:\n"
    "1. Pressure Intelligence (Universal PRI 0–100 Benchmark)\n"
    "2. Scout Lab (Global 10-Franchise Auction Eligibility & Value Engine)\n"
    "3. Squad HQ (Rajasthan Royals Retained Audit & Vacancy Optimization)\n\n"
    f"Model Version: {pri_data['modelVersion']}  |  Warehouse: 1,589,302 Validated T20 Deliveries  |  Date: November 2026"
)
r3.font.size = Pt(10)
r3.font.color.rgb = RGBColor(71, 85, 105)
doc.add_page_break()

# 2. Executive Summary
add_sec_heading(2, "Executive Summary")
doc.add_paragraph(
    "This report presents CricField's unified analytical architecture and empirical findings for the Rajasthan Royals "
    "SupeRR Selector Season 2 (Round 1, IPL 2027) challenge. Rather than treating pressure performance, player scouting, "
    "and franchise squad building as isolated dashboards, CricField connects all three into one deterministic decision engine "
    "governed by a single mathematical metric: the Pressure Reliability Index (PRI, scaled 0–100)."
)
doc.add_paragraph(
    "Key Findings & Methodology Highlights:\n"
    "• Universal Pre-Delivery Pressure Definition (Rule A): A ball is classified under pressure when bowled in the death overs (16–20), "
    "or in a chase requiring ≥9.0 runs per over, or during a batting collapse (≥3 wickets down for ≤35 runs). Across 815 IPL and "
    "Full-Member T20I matches (2022–2026), Rule A achieves substantially stronger match-to-match repeatability (batting K = 424 balls, "
    "bowling K = 1,122 balls) than win-probability leverage thresholds at equivalent ball shares (batting K = 803, bowling K = 3,214).\n"
    "• Contextual Run Value & Empirical-Bayes Shrinkage: Every ball is scored against context expectation (innings × over × wickets down, "
    "scaled by competition-season scoring factor) with explicit monotone wicket-cost tables and alternating empirical-Bayes opposition "
    "adjustments (±10.01 runs/100b bowling attacks, ±14.40 runs/100b batting line-ups).\n"
    "• Top Global Pressure Performers (≥250 pressure balls, ≥20 matches): SA Yadav leads all 99 qualified batters (+38.91 adjusted runs/100b, "
    "PRI 99.5), followed by RR Hendricks (+38.31, PRI 98.5) and R Shepherd (+32.49, PRI 97.5). JJ Bumrah leads all 103 qualified bowlers "
    "(+17.14 adjusted runs saved/100b, PRI 99.5), followed by SP Narine (+9.16, PRI 98.5) and MJ Santner (+8.25, PRI 97.6).\n"
    "• Rajasthan Royals IPL 2027 Squad Posture: RR enters the IPL 2027 auction with 19 retained/traded-in players, 6 open squad slots "
    "(3 overseas slots remaining), and a verified remaining purse of ₹27.05 Cr (2,705 Lakh). While RR's retained core boasts elite pressure performers "
    "in Jofra Archer (Bowling PRI 92.7, #8 globally), Vaibhav Sooryavanshi (Emerging Batting PRI 92.9 across 172 balls), Dasun Shanaka (Batting PRI 90.4, #10 globally), "
    "Mohammed Shami (Bowling PRI 65.0), and Yashasvi Jaiswal (Batting PRI 59.1), releasing Shimron Hetmyer, Wanindu Hasaranga, Maheesh Theekshana, Tushar Deshpande, "
    "and Nitish Rana creates clear auction priorities in middle-order finishing, spin depth, and backup death pace."
)

# 3. Problem Statement
add_sec_heading(3, "Problem Statement")
doc.add_paragraph(
    "In T20 recruitment, raw career averages and strike rates conflate low-leverage accumulation with high-leverage execution. "
    "At the same time, naive 'clutch' leaderboards built on small sample sizes suffer from severe small-sample variance, rewarding "
    "short hot streaks that fail to repeat out of sample. Furthermore, franchise recruitment decisions frequently fail to cross-check "
    "statistical shortlists against global 10-franchise retention ledgers, recommending players who are already retained elsewhere."
)
doc.add_paragraph(
    "To solve this for Rajasthan Royals ahead of the IPL 2027 auction, our system must answer two concrete questions under one consistent metric:\n"
    "1. Who fits the available slot? Among genuinely eligible auction candidates (excluding all 184 retained players across the 10 franchises, "
    "retired/unavailable players, and ineligible pools), who offers the highest reliable pressure performance versus the best financial value?\n"
    "2. Is our retained player actually reliable under pressure? How does each of RR's 19 retained players compare against both the best "
    "available auction alternative and the top overall league benchmark?"
)

# 4. CricField Engineering Architecture
add_sec_heading(4, "CricField Engineering Architecture")
doc.add_paragraph(
    "CricField's production architecture shares a single pure-TypeScript analytical kernel (artifacts/api-server/src/services/pressure/engine.ts "
    "and model.ts) and a versioned precomputed snapshot (pressure-reliability.json and pri-benchmark-2027.json) across both the backend API "
    "and the static Vercel frontend. This guarantees zero discrepancy between Pressure Intelligence (/pressurelab), Scout Lab (/scout-lab), "
    "and Squad HQ (/squad-hq/RR)."
)
doc.add_picture(str(chart_arch), width=Inches(6.5))

# 5. Dataset Description
add_sec_heading(5, "Dataset Description & Coverage")
doc.add_paragraph(
    "All ball-by-ball records are ingested from Cricsheet (ODC-BY 1.0) into CricField's SQLite warehouse and validated with zero arithmetic "
    "reconciliation failures (runs.total = batter + extras; extras = wides + no-balls + byes + leg-byes + penalty) across 1,589,302 deliveries."
)
cov_rows = []
for code, info in val_data["coverage"].items():
    cov_rows.append([
        f"{info['name']} ({code})",
        info["matches"],
        f"{info['from']} to {info['to']}",
        "Primary Ranking + Baseline Fit" if code in ("ipl", "t20i") else "Baseline Context & WP Model Fit",
    ])
add_styled_table(["Competition", "Matches", "Date Range", "Role in Model"], cov_rows)

# 6. Definition of Pressure
add_sec_heading(6, "Definition of Pressure")
doc.add_paragraph(
    "A delivery is classified as a pressure opportunity before the ball is released (strictly zero outcome leakage) when at least one of three "
    "pre-ball conditions holds:\n"
    "• Death Overs: Overs 16–20 (1-based overs 16 through 20; 0-based over index 15..19).\n"
    "• Chase Pressure: Innings 2 with required run rate RRR ≥ 9.00 runs per over.\n"
    "• Batting Collapse: At least 3 wickets down with team score ≤ 35 runs."
)
doc.add_paragraph(
    "Why Rule A was selected over Win-Probability Leverage: We evaluated six candidate definitions across the 815-match IPL + Full-Member T20I "
    "dataset (2022–2026). Because a single pressure benchmark must evaluate both batters and bowlers on the exact same deliveries, we selected "
    "Rule A because it minimizes combined match-clustered noise (K = 424 batting balls, K = 1,122 bowling balls)."
)
def_rows = []
for d in val_data["definitionComparison"]:
    def_rows.append([
        d["label"],
        f"{d['shareOfBalls']*100:.1f}%",
        d["batting"]["priorStrengthBalls"],
        d["bowling"]["priorStrengthBalls"],
        f"{d['batting']['upliftSplitHalf']:.3f}",
        f"{d['bowling']['upliftSplitHalf']:.3f}",
    ])
add_styled_table(["Candidate Definition", "Ball Share", "Bat K", "Bowl K", "Bat Uplift r", "Bowl Uplift r"], def_rows)
doc.add_picture(str(chart_defs), width=Inches(6.2))

# 7. Mathematical Methodology
add_sec_heading(7, "Mathematical Methodology")
doc.add_paragraph("7.1 Contextual Expected Value & Wicket Cost:")
add_formula("Batting Value (v_bat) = (R_bat - E[R | s, c]) - C_wkt(k, w) * (I_out - P(out | s, c))")
add_formula("Bowling Value (v_bowl) = (E[R_conc | s, c] - R_conc) + C_wkt(k, w) * (I_bowl_wkt - P(bowl_wkt | s, c))")
add_formula("Raw Pressure Impact (RPI_100) = 100 * (Sum(v_i for i in PressureBalls) / B)")
doc.add_paragraph(
    "where s = (innings, over, wickets_down in 0..6+) is the pre-delivery state, c is the competition-season scoring scalar, "
    "C_wkt(k, w) is the monotone expected remaining-runs drop from losing a wicket with k overs left and w wickets down, "
    "R_conc charges batter runs + wides + no-balls (excluding byes/leg-byes), and I_bowl_wkt excludes run-outs."
)
doc.add_paragraph("7.2 Empirical-Bayes Reliability Shrinkage & PRI Normalization:")
add_formula("K = s^2 / tau^2   (match-clustered within-player variance s^2 divided by between-player true variance tau^2)")
add_formula("Adjusted Impact (Adj_100) = mu_P + [B / (B + K)] * (RPI_100 - mu_P)")
add_formula("Posterior SD = 100 * sqrt(1 / (1 / tau^2 + B / s^2)),   90% CI = Adj_100 ± 1.645 * Posterior SD")
add_formula("PRI = 100 * PercentileRank(Adj_100 | Reference Role Cohort [B >= 250, Matches >= 20])")

b1 = pri_data["top10Batters"][0]
w1 = pri_data["top10Bowlers"][0]
doc.add_paragraph(
    f"Worked Batter Example — {b1['player']} ({b1['team']}): Across B = {b1['pressureBalls']} pressure balls in {b1['pressureMatches']} matches, "
    f"{b1['player']} records Raw Pressure Impact = +{b1['rawPer100']:.2f} runs/100b (Pressure SR {b1['pressureRate']:.2f} vs Ordinary SR {b1['ordinaryRate']:.2f}). "
    f"With Batting K = {val_data['cohort']['batting']['priorStrengthBallsK']} balls and cohort prior mean mu_P = {val_data['cohort']['batting']['priorMeanPer100']:+.2f}, "
    f"his evidence weight is B/(B+K) = {b1['evidenceWeight']:.3f}, yielding Adjusted Impact = +{b1['adjustedPer100']:.2f} runs/100b "
    f"(90% CI [{b1['interval90'][0]:+.2f}, {b1['interval90'][1]:+.2f}]) and PRI = {b1['pri']}/100 (#1 of 99 qualified batters)."
)
doc.add_paragraph(
    f"Worked Bowler Example — {w1['player']} ({w1['team']}): Across B = {w1['pressureBalls']} pressure balls in {w1['pressureMatches']} matches, "
    f"{w1['player']} records Raw Pressure Impact = +{w1['rawPer100']:.2f} runs saved/100b (Pressure Econ {w1['pressureRate']:.2f} vs Ordinary Econ {w1['ordinaryRate']:.2f}). "
    f"With Bowling K = {val_data['cohort']['bowling']['priorStrengthBallsK']} balls and evidence weight {w1['evidenceWeight']:.3f}, "
    f"his Adjusted Impact = +{w1['adjustedPer100']:.2f} runs/100b (90% CI [{w1['interval90'][0]:+.2f}, {w1['interval90'][1]:+.2f}]) and PRI = {w1['pri']}/100 (#1 of 103 qualified bowlers)."
)

# 8. Model Validation
add_sec_heading(8, "Model Validation & Sensitivity Analysis")
wp_c = val_data["winProbabilityValidation"]["chase"]
wp_f = val_data["winProbabilityValidation"]["firstInnings"]
wp_c_n = wp_c.get("n") or wp_c["model"].get("n", 0)
wp_f_n = wp_f.get("n") or wp_f["model"].get("n", 0)
doc.add_paragraph(
    f"• Out-of-Sample Win Probability Calibration (2023+ Holdout): In second-innings chases ({wp_c_n:,} balls), our logistic WP model achieves "
    f"Brier score = {wp_c['model']['brier']:.4f} (log-loss {wp_c['model']['logLoss']:.4f}) versus baseline Brier = {wp_c['baseline']['brier']:.4f}. "
    f"In first innings ({wp_f_n:,} balls), model Brier = {wp_f['model']['brier']:.4f} versus baseline {wp_f['baseline']['brier']:.4f}.\n"
    "• Threshold Sensitivity: Perturbing each pressure rule threshold independently preserves 8–10 of the Top 10 batters and 8–9 of the Top 10 bowlers."
)
sens_rows = [[s["variant"], f"{s['battingOverlap']} / 10", f"{s['bowlingOverlap']} / 10"] for s in val_data["ruleSensitivity"]]
add_styled_table(["Threshold Perturbation Variant", "Top-10 Batters Retained", "Top-10 Bowlers Retained"], sens_rows)

# 9. Top 10 Batters Under Pressure
add_sec_heading(9, "Top 10 Batters Under Pressure")
doc.add_picture(str(chart_bat), width=Inches(6.4))
bat_table = [
    [
        b["rank"], b["player"], b["team"], f"{b['pri']:.1f}", f"{b['adjustedPer100']:+.2f}",
        f"[{b['interval90'][0]:+.1f}, {b['interval90'][1]:+.1f}]", f"{b['rawPer100']:+.2f}",
        b["pressureBalls"], b["pressureMatches"], f"{b['pressureRate']:.1f}", f"{b['evidenceWeight']:.2f}"
    ]
    for b in pri_data["top10Batters"]
]
add_styled_table(["#", "Batter", "Team", "PRI", "Adj /100b", "90% CI", "Raw /100b", "Balls", "Matches", "Press SR", "Weight"], bat_table)

# 10. Top 10 Bowlers Under Pressure
add_sec_heading(10, "Top 10 Bowlers Under Pressure")
doc.add_picture(str(chart_bowl), width=Inches(6.4))
bowl_table = [
    [
        b["rank"], b["player"], b["team"], f"{b['pri']:.1f}", f"{b['adjustedPer100']:+.2f}",
        f"[{b['interval90'][0]:+.1f}, {b['interval90'][1]:+.1f}]", f"{b['rawPer100']:+.2f}",
        b["pressureBalls"], b["pressureMatches"], f"{b['pressureRate']:.2f}", f"{b['dotPct']:.1f}%", f"{b['evidenceWeight']:.2f}"
    ]
    for b in pri_data["top10Bowlers"]
]
add_styled_table(["#", "Bowler", "Team", "PRI", "Adj /100b", "90% CI", "Raw /100b", "Balls", "Matches", "Press Econ", "Dot %", "Weight"], bowl_table)

# 11. Rajasthan Royals Squad Assessment
add_sec_heading(11, "Rajasthan Royals IPL 2027 Squad Assessment")
doc.add_paragraph(
    "Based on verified retention and trade records (official-2027.json), Rajasthan Royals enter the IPL 2027 auction with 19 retained/traded-in "
    "players (5 overseas: Jofra Archer, Nandre Burger, Donovan Ferreira, Dasun Shanaka, Lhuan-dre Pretorius), leaving 6 open squad slots "
    "(up to 3 overseas slots available) and a verified remaining purse of ₹27.05 Cr (2,705 Lakh). Notably, RR reinforced its bowling and all-round "
    "core with Ravindra Jadeja (₹14.0 Cr), Mohammed Shami (₹10.0 Cr), and Ravi Bishnoi (₹7.2 Cr), while releasing Shimron Hetmyer, Wanindu Hasaranga, "
    "Maheesh Theekshana, Tushar Deshpande, Nitish Rana, Fazalhaq Farooqi, and Akash Madhwal."
)

# 12. Retained Player Pressure Audit
add_sec_heading(12, "Rajasthan Royals Retained Player Pressure Audit")
doc.add_picture(str(chart_rr), width=Inches(6.3))
rr_rows = []
for r in pri_data["rrRetainedAudit"]:
    rr_rows.append([
        r["player"],
        r["role"],
        "OS" if r["overseas"] else "IND",
        f"₹{r['contractCr']:.2f} Cr" if r["contractCr"] else "—",
        r["primaryDiscipline"][:3].upper(),
        f"{r['pri']:.1f}" if r["pri"] is not None else "—",
        f"{r['adjustedPer100']:+.2f}" if r["adjustedPer100"] is not None else "—",
        f"{r['pressureBalls']}b ({r['pressureMatches']}m)" if r["pressureBalls"] else "<15b",
        r["verdict"],
    ])
add_styled_table(["Retained Player", "Role", "Nat", "Contract", "Disc", "PRI", "Adj /100b", "Sample", "Audit Verdict"], rr_rows)

# 13. Scout Lab — Global Auction Eligibility
add_sec_heading(13, "Scout Lab — Global 10-Franchise Auction Eligibility")
doc.add_paragraph(
    "Scout Lab enforces a strict 10-franchise eligibility gate before any player can enter a recruitment shortlist:\n"
    "1. Retained / Contracted Elsewhere (184 players across all 10 IPL teams): Excluded globally.\n"
    "2. Retired / Unavailable / Uncertain (5 players in official-2027.json: MS Dhoni, Ajinkya Rahane, Mitchell Starc, Travis Head, Jacob Bethell): Excluded.\n"
    "3. Ineligible Jurisdiction (Pakistan players): Excluded.\n"
    "4. Potential Auction Candidates: Comprises the 84 eligible IPL 2027 released players plus unretained IPL 2026 auction/pool players, clearly labeled as "
    "Potential Auction Candidates until the official BCCI 2027 registered auction list is published."
)

# 14. Best Auction Targets (Best Pressure Performer vs Best Auction Value)
add_sec_heading(14, "Best Auction Targets for Rajasthan Royals Vacancies")
slot_rows = []
for s in gaps_data["rrSlotRecommendations"]:
    bp = s["bestPressurePerformer"]
    bv = s["bestAuctionValue"]
    na = s["nextAlternative"]
    slot_rows.append([
        s["roleTitle"],
        s["priority"],
        f"{bp['name']} (PRI {bp['pri']}, {bp['adjustedPer100']:+.1f}/100b, ₹{bp['estCostCr']} Cr)" if bp else "—",
        f"{bv['name']} (PRI {bv['pri']}, ValIdx {bv['valueIndex']}, ₹{bv['estCostCr']} Cr)" if bv else "—",
        f"{na['name']} (PRI {na['pri']})" if na else "—",
    ])
add_styled_table(["RR Vacancy / Role", "Priority", "Best Pressure Performer", "Best Auction Value", "Next-Best Alternative"], slot_rows)

# 15. Retained vs Potential Replacement & League Benchmark
add_sec_heading(15, "Retained vs Eligible Replacement vs League Benchmark")
comp_rows = [
    [
        "Lead Pace / Death",
        "Jofra Archer (Bowl PRI 92.7, +4.44/100b, ₹12.5 Cr)",
        "Matheesha Pathirana (PRI 94.7, +5.55/100b, Released KKR) / Akash Madhwal (PRI 92.2, Released CSK)",
        "JJ Bumrah (PRI 99.5, +17.14/100b — Retained MI, Unavailable)",
        "Retain & Back Archer (#8 globally); add Pathirana or Madhwal as death partner",
    ],
    [
        "Middle-Overs Spin",
        "Ravi Bishnoi (Bowl PRI 24.8, -5.77/100b, ₹7.2 Cr) & Ravindra Jadeja (PRI 23.8, -5.83/100b, ₹14.0 Cr)",
        "Maheesh Theekshana (PRI 61.2, -1.10/100b, 934b) / AM Ghazanfar (PRI 55.3, Released MI) / Rishad Hossain (PRI 54.9)",
        "SP Narine (PRI 98.5, +9.16/100b — Retained KKR, Unavailable)",
        "Position worth strengthening: Both Bishnoi & Jadeja grade below median under Rule A pressure; add wicket-taking spin",
    ],
    [
        "Lower-Order Finisher",
        "Dasun Shanaka (Bat PRI 90.4, +25.09/100b, ₹2.0 Cr) & Dhruv Jurel (PRI 6.6, -0.91/100b, ₹14.0 Cr)",
        "Daryl Mitchell (PRI 75.3, +18.19/100b, 614b) / Vijay Shankar (PRI 26.3, Value Index 35.1)",
        "SA Yadav (PRI 99.5, +38.91/100b — Retained MI, Unavailable)",
        "Shanaka is elite value (#10 globally); Jurel needs middle-order support",
    ],
    [
        "Top-Order Opener",
        "Yashasvi Jaiswal (Bat PRI 59.1, +15.68/100b, ₹18.0 Cr) & Vaibhav Sooryavanshi (PRI 92.9, 172b)",
        "Pathum Nissanka (PRI 96.5, +30.73/100b, Released DC) / Kusal Perera (PRI 65.2, +16.13/100b)",
        "SA Yadav (PRI 99.5, +38.91/100b — Retained MI, Unavailable)",
        "Jaiswal & Sooryavanshi form a high-upside Indian opening pair; Nissanka (#4 globally) is elite OS cover",
    ],
    [
        "Indian Seam Depth",
        "Mohammed Shami (Bowl PRI 65.0, -0.83/100b, ₹8.0 Cr) & Sandeep Sharma (PRI 49.0, -2.65/100b, ₹4.0 Cr)",
        "Akash Madhwal (PRI 92.2, +4.20/100b, Released CSK) / Shivam Mavi (PRI 57.3, Released SRH)",
        "JJ Bumrah (PRI 99.5) / Arshdeep Singh (Retained PBKS)",
        "Shami (PRI 65.0) is a strong retained option; Madhwal adds high-PRI Indian death pace",
    ],
]
add_styled_table(["Role", "RR Retained Option", "Best Eligible Auction Alternative", "League Benchmark", "Strategic Verdict"], comp_rows)

# 16. Final Rajasthan Royals Recommendations
add_sec_heading(16, "Final Rajasthan Royals IPL 2027 Auction Strategy")
doc.add_paragraph(
    "With ₹27.05 Cr (2,705 Lakh) and 6 open slots (up to 3 overseas), Rajasthan Royals can execute a high-conviction, PRI-driven auction plan:\n"
    "1. Priority 1 — High-PRI Death/Middle-Overs Bowling Upgrade (Budget ₹7.0–10.0 Cr): Matheesha Pathirana (Bowling PRI 94.7, +5.55/100b, 713 pressure balls, released by KKR) "
    "and Indian seamer Akash Madhwal (Bowling PRI 92.2, +4.20/100b, 202 balls, released by CSK) provide immediate high-leverage bowling firepower alongside Jofra Archer (PRI 92.7) and Mohammed Shami (PRI 65.0).\n"
    "2. Priority 2 — Specialist Middle-Overs Spin Partner (Budget ₹4.5–6.5 Cr): Because both Ravi Bishnoi (PRI 24.8 across 1,176 pressure balls) and Ravindra Jadeja (PRI 23.8 across 587 pressure balls) "
    "have struggled when bowling in death/high-RRR situations, targeting Maheesh Theekshana (PRI 61.2, 934 balls), AM Ghazanfar (PRI 55.3, released by MI), or Rishad Hossain (PRI 54.9) diversifies RR's spin attack.\n"
    "3. Priority 3 — Top-4 / Middle-Order Pressure Stabilizer & Finisher (Budget ₹6.0–8.5 Cr): Pathum Nissanka (Batting PRI 96.5, +30.73/100b, #4 globally, released by DC) "
    "and Daryl Mitchell (Batting PRI 75.3, +18.19/100b across 614 pressure balls) insulate Riyan Parag (PRI 25.8) and Dhruv Jurel (PRI 6.6) against high-required-rate chases while pairing with finisher Dasun Shanaka (PRI 90.4)."
)

# 17. Limitations and Future Improvements
add_sec_heading(17, "Limitations & Future Improvements")
doc.add_paragraph(
    "• Sample Size & Credible Interval Overlap: Players with <250 pressure balls exhibit wider 90% posterior intervals (±12–18 runs/100b); "
    "small PRI differences (<8 points) should not trigger release/replacement decisions without role and contract context.\n"
    "• League Comparability: While baseline expectations are scaled by competition-season, primary rankings restrict eligibility to IPL and "
    "Full-Member T20Is so domestic leagues (SMAT, BBL, CPL, SA20, ILT20) do not inflate raw rankings without overlapping calibration.\n"
    "• Auction Price Uncertainty: Actual auction clearing prices depend on live bidding order and rival franchise purse dynamics."
)

# 18. References and Reproducibility
add_sec_heading(18, "References & Reproducibility Appendix")
doc.add_paragraph(
    "Exact Commands to Reproduce All Data, Validations, Charts & This Word Report:\n"
    "1. Generate PRI Benchmark & Submission CSV/JSONs:\n"
    "   node scripts/generate-superr-submission.mjs\n"
    "2. Generate Charts & Word Report (.docx):\n"
    "   uv run --with python-docx --with matplotlib python docs/submissions/superr-selector-s2/generate_report.py\n"
    "3. Type-Check & Build Frontend + API Server:\n"
    "   pnpm --filter @workspace/ipl-analytics exec tsc --noEmit\n"
    "   pnpm --filter @workspace/ipl-analytics run build\n\n"
    "Data Sources & Provenance:\n"
    "• Ball-by-ball warehouse: Cricsheet (ODC-BY 1.0), 1,589,302 T20 deliveries (815 IPL + Full-Member T20I matches in 2022–2026 ranking cohort).\n"
    "• Official IPL 2027 Retentions & Purse Ledger: artifacts/api-server/data/retention/official-2027.json (BCCI/IPL franchise disclosures, Nov 2026)."
)

out_docx = SUB_DIR / "CricField_RR_IPL2027_Pressure_Intelligence_Methodology.docx"
doc.save(str(out_docx))
print("Saved Word report:", out_docx, "Size:", out_docx.stat().st_size, "bytes")
