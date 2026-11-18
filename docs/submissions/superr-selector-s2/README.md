# CricField — SupeRR Selector Season 2 (Round 1, IPL 2027) Reproducible Submission Pack

**Model Version:** `cf-pressure.e01281a332`  
**Franchise Case Study:** Rajasthan Royals (`RR`)  
**Primary Word Report:** `docs/submissions/superr-selector-s2/CricField_RR_IPL2027_Pressure_Intelligence_Methodology.docx`

## 1. Contents of This Submission Directory

| File | Description |
| --- | --- |
| `CricField_RR_IPL2027_Pressure_Intelligence_Methodology.docx` | Full 18-section Microsoft Word methodology, validation, and Rajasthan Royals IPL 2027 auction strategy report with embedded charts. |
| `batting_pressure_rankings.csv` | All 99 qualified batters (`≥250` pressure balls, `≥20` matches, IPL + Full-Member T20Is 2022–2026) ranked by Empirical-Bayes Adjusted Pressure Impact and universal `PRI (0–100)`. |
| `bowling_pressure_rankings.csv` | All 103 qualified bowlers (`≥250` pressure balls, `≥20` matches, IPL + Full-Member T20Is 2022–2026) ranked by Empirical-Bayes Adjusted Pressure Impact and universal `PRI (0–100)`. |
| `rr_retained_player_audit.csv` | Pressure Reliability Index (`PRI`) audit of all 19 officially retained/traded-in Rajasthan Royals players for IPL 2027. |
| `auction_eligible_shortlist.csv` | Global 10-franchise eligibility-filtered auction candidate shortlist with `PRI`, `adjustedPer100`, `estCostCr`, and `valueIndex`. |
| `franchise_squad_gaps.json` | 10-franchise squad slot/purse summary and Rajasthan Royals slot-by-slot recommendations (**Best Pressure Performer** vs **Best Auction Value**). |
| `model_validation_results.json` | Reconciled delivery totals (`1,589,302` balls, `0` failures), candidate pressure definition comparison (`K` repeatability), threshold sensitivity, and out-of-sample win-probability Brier/log-loss validation. |
| `charts/*.png` | High-resolution charts generated directly from the computed outputs and embedded into the `.docx` report. |
| `generate_report.py` | Reproducible Python script that generates `charts/*.png` and `CricField_RR_IPL2027_Pressure_Intelligence_Methodology.docx`. |

## 2. Reproduction Commands

From the repository root (`c:\Users\mrdiv\IPL-ANALYTICAL-ENGINE`):

```powershell
# Step 1: Recompute the unified PRI benchmark & CSV/JSON deliverables
node scripts/generate-superr-submission.mjs

# Step 2: Regenerate all charts and the Microsoft Word (.docx) report
uv run --with python-docx --with matplotlib python docs/submissions/superr-selector-s2/generate_report.py

# Step 3: Type-check and build the CricField web application
pnpm --filter @workspace/ipl-analytics exec tsc --noEmit
pnpm --filter @workspace/ipl-analytics run build
```
