"""Step 2 of the intelligence pipeline: train and validate the auction and retention models.

Validation is expanding-window by season only. A fold for season T trains on seasons before T.
There are no random splits, because they would leak later auctions into earlier ones. The one exception is
the sold-likelihood benchmark: only the 2026 pool is on file, so it cannot be validated across years
and is published as provisional, whatever its score.

Model choice uses the selection seasons. The holdout seasons are never used to choose a model, so
their metrics are the honest ones.

sklearn's HistGradientBoosting is the LightGBM algorithm family and is what is installed here; the
project has no LightGBM or CatBoost dependency.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

SEED = 20261102
WORK = Path(sys.argv[1] if len(sys.argv) > 1 else "data/intelligence/work")
meta = json.loads((WORK / "features.json").read_text(encoding="utf-8"))

PRICE_SELECT = [2019, 2020, 2021, 2022, 2023]
PRICE_HOLDOUT = [2024, 2025, 2026]
KEEP_SELECT = [2021, 2022, 2023, 2024]
KEEP_HOLDOUT = [2025, 2026]
BANDS = [("under ₹1 Cr", 0, 100), ("₹1–5 Cr", 100, 500), ("over ₹5 Cr", 500, 1e9)]

GROUPS = {
    "Recent performance": ["rar", "rarSd", "rarBat", "rarBowl", "rarPrev", "batRate", "bowlRate", "ppSR", "midSR", "deathSR", "srVsPace", "srVsSpin", "dotPctBat", "bndPctBat", "ppEcon", "midEcon", "deathEcon", "bowlDotPct", "ballsPerWicket"],
    "IPL experience": ["sampleMatches", "matchesCareer", "matchesLast2", "seasonsPlayed", "noIplRecord"],
    "Previous price": ["priorLakh", "priorGap", "hasPrior"],
    "Role in the side": ["isBatter", "isBowler", "isAllRounder", "isKeeper", "ballsFacedPerMatch", "ballsBowledPerMatch"],
    "Overseas status": ["overseas"],
    "Age": ["age"],
    "Auction market": ["mega", "marketMedianLakh", "marketP90Lakh", "seasonIndex", "roleSupply"],
}


def design(df, cols, log_cols=("priorLakh", "marketMedianLakh", "marketP90Lakh", "baseLakh")):
    x = df.reindex(columns=cols).astype(float).copy()
    for c in log_cols:
        if c in x:
            x[c] = np.log(x[c])
    return x


def ridge():
    return make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), Ridge(alpha=30.0))


def hgb(**kw):
    return HistGradientBoostingRegressor(max_depth=3, learning_rate=0.04, max_iter=220, min_samples_leaf=15, l2_regularization=5.0, random_state=SEED, **kw)


def blend_fit(xtr, ytr):
    return ridge().fit(xtr, ytr), hgb().fit(xtr, ytr)


def price_metrics(frame):
    if frame.empty:
        return None
    err = (np.exp(frame.pred) - frame.lakh).abs() / 100
    return {
        "n": int(len(frame)),
        "maeCr": round(float(err.mean()), 3),
        "medianAeCr": round(float(err.median()), 3),
        "typicalMultiple": round(float(np.exp((frame.pred - np.log(frame.lakh)).abs().median())), 2),
        "rankCorrelation": round(float(pd.Series(frame.pred.values).corr(pd.Series(np.log(frame.lakh).values), method="spearman")), 3),
    }


def price_folds(train, cols, seasons, name_pred="pred"):
    out = []
    for t in seasons:
        tr, te = train[train.season < t], train[train.season == t]
        if te.empty:
            continue
        xtr, xte, ytr = design(tr, cols), design(te, cols), np.log(tr.lakh)
        r, h = blend_fit(xtr, ytr)
        p = te[["season", "canonicalId", "player", "team", "lakh", "role"]].copy()
        p["ridge"] = r.predict(xte)
        p["gbdt"] = h.predict(xte)
        p["blend"] = 0.5 * p.ridge + 0.5 * p.gbdt
        out.append(p)
    return pd.concat(out)


def conformal(oof, lo=0.1, hi=0.9):
    """Residual quantiles of out-of-time predictions, by predicted-price band."""
    table = {}
    for name, a, b in BANDS:
        pool = oof[(np.exp(oof.pred) >= a) & (np.exp(oof.pred) < b)]
        res = np.log(pool.lakh) - pool.pred
        if len(res) < 30:
            res = np.log(oof.lakh) - oof.pred
        table[name] = (float(res.quantile(lo)), float(res.quantile(hi)))
    return table


def band_of(lakh):
    return next(n for n, a, b in BANDS if a <= lakh < b)


def train_price():
    df = pd.read_csv(WORK / "auction-train.csv")
    df["role"] = np.select([df.isKeeper == 1, df.isAllRounder == 1, df.isBowler == 1], ["wicketkeeper", "all-rounder", "bowler"], "batter")
    cols = meta["auction"]
    folds = price_folds(df, cols, PRICE_SELECT + PRICE_HOLDOUT)

    # Benchmarks a model has to beat: the last auction's median for the role, and the player's previous contract.
    bench = []
    for t in PRICE_SELECT + PRICE_HOLDOUT:
        tr, te = df[df.season < t], df[df.season == t]
        last = tr[tr.season == tr.season.max()]
        med = last.groupby(["role", "overseas"]).lakh.median()
        fallback = last.lakh.median()
        for _, r in te.iterrows():
            base = med.get((r.role, r.overseas), fallback)
            prior = r.priorLakh if not np.isnan(r.priorLakh) else base
            bench.append({"season": t, "lakh": r.lakh, "roleMedian": np.log(base), "previousContract": np.log(prior)})
    bench = pd.DataFrame(bench)

    candidates = {}
    for m in ["ridge", "gbdt", "blend"]:
        sel = folds[folds.season.isin(PRICE_SELECT)].assign(pred=lambda x: x[m])
        candidates[m] = price_metrics(sel)
    chosen = min(candidates, key=lambda m: candidates[m]["maeCr"])
    folds["pred"] = folds[chosen]

    holdout = folds[folds.season.isin(PRICE_HOLDOUT)]
    res = {
        "chosenModel": {"ridge": "Regularised (ridge) regression", "gbdt": "Gradient-boosted trees", "blend": "Average of ridge and gradient-boosted trees"}[chosen],
        "chosenKey": chosen,
        "trainedOn": {"rows": int(len(df)), "firstSeason": int(df.season.min()), "lastSeason": int(df.season.max())},
        "selection": {"seasons": PRICE_SELECT, "candidates": candidates},
        "holdout": {"seasons": PRICE_HOLDOUT, **price_metrics(holdout)},
        "benchmarks": {},
        "bySeason": [],
        "byRole": [],
        "byBand": [],
    }
    for b in ["roleMedian", "previousContract"]:
        h = bench[bench.season.isin(PRICE_HOLDOUT)]
        res["benchmarks"][b] = price_metrics(h.assign(pred=h[b]))

    # Base price is unknown for a future auction, so the live model omits it. This shows what that costs.
    with_base = price_folds(df.dropna(subset=["baseLakh"]), cols + ["baseLakh"], PRICE_HOLDOUT)
    with_base["pred"] = with_base[chosen]
    res["withBasePrice"] = price_metrics(with_base)

    for t in PRICE_SELECT + PRICE_HOLDOUT:
        res["bySeason"].append({"season": t, "mega": bool(t in (2022, 2025)), **price_metrics(folds[folds.season == t])})
    for role, g in holdout.groupby("role"):
        res["byRole"].append({"role": role, **price_metrics(g)})
    for name, a, b in BANDS:
        g = holdout[(holdout.lakh >= a) & (holdout.lakh < b)]
        res["byBand"].append({"band": name, **price_metrics(g)})

    # Interval coverage: each season's bands come only from earlier seasons' out-of-time residuals.
    hit = tot = 0
    by = []
    for t in [2021, 2022, 2023, 2024, 2025, 2026]:
        table = conformal(folds[folds.season < t])
        g = folds[folds.season == t]
        low = g.pred + g.pred.map(lambda p: table[band_of(float(np.exp(p)))][0])
        high = g.pred + g.pred.map(lambda p: table[band_of(float(np.exp(p)))][1])
        ok = (np.log(g.lakh) >= low) & (np.log(g.lakh) <= high)
        hit += int(ok.sum())
        tot += len(g)
        by.append({"season": t, "coverage": round(float(ok.mean()), 3), "n": int(len(g))})
    res["intervalCoverage"] = {"nominal": 0.8, "measured": round(hit / tot, 3), "bySeason": by}

    # Sale price and next-season output: the test a rupee conversion of impact would have to pass.
    table = conformal(folds)
    xall, yall = design(df, cols), np.log(df.lakh)
    r, h = blend_fit(xall, yall)
    predict = {"ridge": r.predict, "gbdt": h.predict, "blend": lambda x: 0.5 * r.predict(x) + 0.5 * h.predict(x)}[chosen]

    score = pd.read_csv(WORK / "auction-score.csv")
    xs = design(score, cols)
    base = predict(xs)
    medians = xall.median()
    effects = {}
    for g, keys in GROUPS.items():
        alt = xs.copy()
        present = [k for k in keys if k in alt]
        alt[present] = medians[present].values
        effects[g] = base - predict(alt)
    preds = {}
    for i, row in score.iterrows():
        p = float(base[i])
        lo, hi = table[band_of(float(np.exp(p)))]
        top = sorted(((g, float(effects[g][i])) for g in GROUPS), key=lambda kv: -abs(kv[1]))[:3]
        preds[row.canonicalId] = {
            "lakh": round(float(np.exp(p)), 1),
            "low": round(float(np.exp(p + lo)), 1),
            "high": round(float(np.exp(p + hi)), 1),
            "factors": [{"label": g, "percent": round((np.exp(v) - 1) * 100)} for g, v in top if abs(v) >= 0.02],
        }
    res["conformal"] = {k: [round(a, 3), round(b, 3)] for k, (a, b) in table.items()}
    # Elite retained players almost never reach an auction, so the sales rarely show what they would fetch.
    res["trainingRange"] = {"rarP95": round(float(df.rar.quantile(0.95)), 3)}
    history = folds[["season", "canonicalId", "player", "team", "lakh", "pred"]].copy()
    history["pred"] = np.exp(history.pred).round(1)
    return res, preds, history.to_dict("records")


def calibration(y, p, bins=10):
    edges = np.linspace(0, 1, bins + 1)
    out, ece = [], 0.0
    for a, b in zip(edges[:-1], edges[1:]):
        m = (p >= a) & (p < b if b < 1 else p <= b)
        if m.sum():
            out.append({"from": round(float(a), 1), "to": round(float(b), 1), "n": int(m.sum()), "predicted": round(float(p[m].mean()), 3), "observed": round(float(y[m].mean()), 3)})
            ece += m.mean() * abs(p[m].mean() - y[m].mean())
    return out, round(float(ece), 4)


def clf_metrics(y, p, base_rate):
    p = np.clip(p, 1e-4, 1 - 1e-4)
    return {
        "n": int(len(y)),
        "brier": round(float(brier_score_loss(y, p)), 4),
        "logLoss": round(float(log_loss(y, p, labels=[0, 1])), 4),
        "auc": round(float(roc_auc_score(y, p)), 3),
        "baseRateBrier": round(float(brier_score_loss(y, np.full(len(y), base_rate))), 4),
    }


def fit_keep(tr, cols):
    x, y = design(tr, cols, log_cols=("contractLakh",)), tr.retained.astype(int)
    lr = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(C=0.3, max_iter=2000))
    lr.fit(x, y)
    # The trees are fitted without the latest season, then Platt-calibrated on it.
    last = tr.season.max()
    early, late = tr[tr.season < last], tr[tr.season == last]
    g = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.04, max_iter=180, min_samples_leaf=20, l2_regularization=5.0, random_state=SEED)
    g.fit(design(early, cols, log_cols=("contractLakh",)), early.retained.astype(int))
    raw = g.predict_proba(design(late, cols, log_cols=("contractLakh",)))[:, 1]
    platt = LogisticRegression(C=10.0).fit(np.log(np.clip(raw, 1e-3, 1 - 1e-3) / (1 - np.clip(raw, 1e-3, 1 - 1e-3))).reshape(-1, 1), late.retained.astype(int))

    def predict_lr(frame):
        return lr.predict_proba(design(frame, cols, log_cols=("contractLakh",)))[:, 1]

    def predict_gb(frame):
        q = np.clip(g.predict_proba(design(frame, cols, log_cols=("contractLakh",)))[:, 1], 1e-3, 1 - 1e-3)
        return platt.predict_proba(np.log(q / (1 - q)).reshape(-1, 1))[:, 1]

    return predict_lr, predict_gb, lr


def train_retention():
    df = pd.read_csv(WORK / "retention-train.csv")
    df = df[df.retained.notna()].copy()
    cols = meta["retention"]
    # Mega retention has different rules and a far lower base rate, and a three-year-apart pair of auctions
    # cannot calibrate it, so mini-auction continuation is the published model. The 2027 auction is a mini.
    mini = df[df.mega == 0]
    records = []
    for t in KEEP_SELECT + KEEP_HOLDOUT:
        if t in (2022, 2025):
            continue
        tr, te = mini[mini.season < t], mini[mini.season == t]
        plr, pgb, _ = fit_keep(tr, cols)
        p = te[["season", "team", "canonicalId", "retained"]].copy()
        p["lr"] = plr(te)
        p["gb"] = pgb(te)
        p["base"] = tr.retained.mean()
        records.append(p)
    oof = pd.concat(records)
    select = oof[oof.season.isin(KEEP_SELECT)]
    hold = oof[oof.season.isin(KEEP_HOLDOUT)]
    cand = {m: clf_metrics(select.retained, select[m].values, float(select.base.mean())) for m in ["lr", "gb"]}
    chosen = min(cand, key=lambda m: cand[m]["brier"])
    metrics = clf_metrics(hold.retained, hold[chosen].values, float(hold.base.mean()))
    table, ece = calibration(hold.retained.values, hold[chosen].values, 5)
    tableAll, eceAll = calibration(oof.retained.values, oof[chosen].values, 10)
    ok = metrics["brier"] < metrics["baseRateBrier"] and ece <= 0.08

    def classify(frame):
        said = frame[chosen].values >= 0.5
        kept = frame.retained.values == 1
        hits = int((said & kept).sum())
        return {
            "n": int(len(frame)),
            "accuracy": round(float((said == kept).mean()), 3),
            "precision": round(hits / max(1, int(said.sum())), 3),
            "recall": round(hits / max(1, int(kept.sum())), 3),
            "brier": round(float(brier_score_loss(frame.retained, np.clip(frame[chosen].values, 1e-4, 1 - 1e-4))), 4),
            "keptShare": round(float(kept.mean()), 3),
        }
    res = {
        "scope": "Mini-auction continuation: does the franchise keep this player into the next season?",
        "chosenModel": {"lr": "Logistic regression", "gb": "Calibrated gradient-boosted trees"}[chosen],
        "trainedOn": {"rows": int(len(mini)), "firstSeason": int(mini.season.min()), "lastSeason": int(mini.season.max())},
        "selection": {"seasons": [s for s in KEEP_SELECT if s != 2022], "candidates": cand},
        "holdout": {"seasons": [s for s in KEEP_HOLDOUT if s != 2025], **metrics, "ece": ece, "calibration": table},
        "allFolds": {"seasons": sorted(int(s) for s in oof.season.unique()), **clf_metrics(oof.retained, oof[chosen].values, float(oof.base.mean())), "ece": eceAll, "calibration": tableAll},
        "probabilityGate": {"passed": bool(ok), "rule": "Holdout Brier below the base-rate Brier and expected calibration error at most 0.08"},
        "classification": {"threshold": 0.5, "holdout": classify(hold), "allFolds": classify(oof)},
        "bySeason": [{"season": int(s), **classify(g)} for s, g in oof.groupby("season")],
        "byFranchise": [{"team": str(t), **classify(g)} for t, g in oof.groupby("team") if len(g) >= 20],
        "excluded": {"megaRows": int((df.mega == 1).sum()), "reason": "Formal mega-auction retention follows different rules; only two comparable events are on file (2022, 2025), which cannot be validated out of time."},
    }
    plr, pgb, lr = fit_keep(mini, cols)
    score = pd.read_csv(WORK / "retention-score.csv")
    score["mega"] = 0
    p = (plr if chosen == "lr" else pgb)(score)
    coef = lr.named_steps["logisticregression"].coef_[0]
    x = lr.named_steps["standardscaler"].transform(lr.named_steps["simpleimputer"].transform(design(score, cols, log_cols=("contractLakh",))))
    preds = {}
    for i, row in score.iterrows():
        contrib = x[i] * coef
        top = np.argsort(-np.abs(contrib))[:3]
        preds[f"{row.team}|{row.canonicalId}"] = {
            "probability": round(float(p[i]), 3),
            "factors": [{"key": cols[j], "direction": "up" if contrib[j] > 0 else "down"} for j in top if abs(contrib[j]) > 0.05],
        }
    backtest = [{"season": int(r.season), "team": r.team, "canonicalId": r.canonicalId, "retained": int(r.retained), "probability": round(float(r[chosen]), 3)} for _, r in oof.iterrows()]
    return res, preds, backtest


def train_sold():
    df = pd.read_csv(WORK / "sold-train.csv")
    cols = ["rar", "sampleMatches", "matchesCareer", "matchesLast2", "overseas", "isBatter", "isBowler", "isAllRounder", "isKeeper", "noIplRecord", "age", "hasPrior"]
    x, y = design(df, cols), df.sold.astype(int)
    model = lambda: make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(C=0.2, max_iter=2000))
    oof = np.zeros(len(df))
    for a, b in StratifiedKFold(5, shuffle=True, random_state=SEED).split(x, y):
        oof[b] = model().fit(x.iloc[a], y.iloc[a]).predict_proba(x.iloc[b])[:, 1]
    res = {
        "scope": "Benchmark on the 2026 pool only",
        "rows": int(len(df)),
        "soldShare": round(float(y.mean()), 3),
        "unmatchedListedPlayers": meta["soldListUnmatched"],
        "sameAuctionCv": clf_metrics(y, oof, float(y.mean())),
        "note": "Cross-validated inside a single auction. No earlier unsold lists are on file, so this has never been tested on a later auction.",
    }
    m = model().fit(x, y)
    score = pd.read_csv(WORK / "auction-score.csv")
    p = m.predict_proba(design(score, cols))[:, 1]
    return res, {row.canonicalId: round(float(p[i]), 3) for i, row in score.iterrows()}


price, price_pred, history = train_price()
keep, keep_pred, keep_backtest = train_retention()
sold, sold_pred = train_sold()
(WORK / "model-output.json").write_text(json.dumps({
    "metrics": {"auction": price, "retention": keep, "sold": sold},
    "auction": price_pred, "history": history, "retention": keep_pred, "retentionBacktest": keep_backtest, "sold": sold_pred,
}, ensure_ascii=False, allow_nan=False, default=float), encoding="utf-8")
print(json.dumps({"auction": {k: price[k] for k in ["chosenModel", "selection", "holdout", "benchmarks", "withBasePrice", "intervalCoverage", "byRole", "byBand", "bySeason"]}, "retention": {k: keep[k] for k in ["chosenModel", "selection", "holdout", "probabilityGate"]}, "sold": sold}, indent=1, ensure_ascii=False, default=float))
