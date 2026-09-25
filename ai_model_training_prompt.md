# AGENT PROMPT — FIRE EVENT AI CONFIDENCE MODEL (TRAINING PIPELINE)

============================================================
ROLE
============================================================

You are a senior ML engineer building the AI anomaly-detection
component of an academic prototype: a **Blockchain-Based
Automated Fire Insurance Claim System**.

Your scope is ONLY the AI training pipeline. You are not
building the blockchain, smart contract, frontend, or the
FastAPI routes — only the model that will sit behind a single
function interface:

    predict_fire_confidence(sensor_data) -> {
        "fire_confidence": float,   # 0.0 - 1.0
        "classification": str       # e.g. NORMAL / POSSIBLE_FIRE / CONFIRMED_FIRE / ANOMALY
    }

FastAPI integration is explicitly OUT OF SCOPE for this task.
Do not build `app.py`, routes, request/response models, or any
API layer — that is a separate follow-up task once the AI
pipeline is validated and deployable on its own.

Treat this as production-grade ML engineering work, but built
in two stages: prototype and validate the full pipeline in a
Jupyter notebook first, then refactor the proven logic into
deployable modules. Every step must be reproducible, logged,
and testable — in both the notebook and the final modules.

============================================================
CONTEXT / CONSTRAINTS (DO NOT VIOLATE)
============================================================

- This is an academic prototype. The AI must ENHANCE fire
  verification, never independently make irreversible
  insurance decisions.
- Acceptable model families: Isolation Forest, Random Forest,
  Logistic Regression, or a simple anomaly detector. Do NOT
  introduce a deep-learning model unless you can clearly
  justify why the classical models are insufficient.
- The model must be replaceable — nothing outside
  `ai_service.py` may depend on a specific model type or
  library.
- Do not hardcode thresholds, paths, or hyperparameters in
  code. Use a config file.
- Label the model and all outputs clearly as a prototype
  (e.g. in model metadata / README), not a production-grade
  fraud detector.

============================================================
DATASET
============================================================

Input file: `fire_sensor_training_data.csv`

Columns:
- event_id (string)
- device_id (string)
- property_id (string)
- temperature (float, °C)
- smoke_level (int, MQ-2 raw reading)
- flame_detected (bool)
- duration_seconds (int, how long the reading persisted)
- latitude, longitude (float)
- timestamp (ISO datetime)
- label (string): NORMAL / POSSIBLE_FIRE / CONFIRMED_FIRE / ANOMALY

~1,800 rows, synthetically generated across the four scenario
classes described in the project report. Treat `label` as
available for evaluation and for training a supervised
baseline, but also build the intended unsupervised approach
(Isolation Forest trained on NORMAL rows only) since that is
the primary approach specified in the report.

============================================================
DEVELOPMENT APPROACH — NOTEBOOK FIRST, THEN DEPLOY
============================================================

Work in two clearly separated stages. Do not jump straight to
production files.

**STAGE 1 — Notebook (`notebooks/fire_ai_pipeline_dev.ipynb`)**

Build and run phases 1–7 below entirely inside a single Jupyter
notebook first. This is where you explore, validate assumptions,
inspect data, compare candidate models, and confirm the whole
pipeline actually produces a good model — before any of it is
locked into production files. Use real markdown cells to narrate
each phase and real executed output cells (tables, confusion
matrices, MLflow run summaries) — not just code with no output.
Nothing in Stage 1 needs to be "clean" module code yet; it needs
to be correct and clearly reasoned.

**STAGE 2 — Deployable files**

Only once the notebook shows the pipeline works end-to-end and
you've picked a final best model, extract the proven logic into
the modular file structure under DELIVERABLES below (phases 8–9).
This is a refactor of code that already works in the notebook —
not a rewrite from scratch. The goal of Stage 2 is purely to make
the trained model deployable: a loadable model artifact plus the
`predict_fire_confidence()` function and its tests. Do not build
anything beyond what's needed to deploy the model at this point
(no API layer — see FastAPI note above).

============================================================
REQUIRED PIPELINE
============================================================

Execute every phase for real, show your actual output/metrics at
each step, and do not skip ahead. Phases 1–7 happen in the Stage 1
notebook; phases 8–9 happen in Stage 2 after the refactor.

### 1. Data preprocessing

- Load and validate the CSV (dtypes, nulls, range sanity
  checks on temperature/smoke_level).
- Convert `flame_detected` to numeric, parse `timestamp`.
- Handle outliers explicitly (justify any clipping/removal —
  don't silently drop rows).
- Produce a short data-quality report (row counts per class,
  missing values, basic stats) as a saved artifact.

### 2. Feature engineering

- Engineer features beyond the raw four sensor fields where it
  adds real signal, e.g.:
  - temperature/smoke interaction term
  - rate-of-change proxies if temporal ordering per device is
    usable
  - binned/categorical versions of continuous features if it
    helps the chosen model family
- Justify every engineered feature in one sentence — no
  feature added "just in case."
- Persist the exact feature list and any fitted transformers
  (scalers/encoders) as artifacts so inference can reproduce
  them exactly.

### 3. Train/test split

- Stratified split on `label` (e.g. 80/15/5 or 70/15/15 for
  train/val/test — pick and justify one).
- Fix a random seed everywhere for reproducibility.
- Report class balance in each split.

### 4. Cross-validation

- Use stratified k-fold (k=5 minimum) on the training set for
  model selection — not just a single train/test check.
- Report mean ± std of the chosen metrics across folds.

### 5. Model training with hyperparameter tuning

- Train and compare at least two candidate approaches:
  1. Isolation Forest (unsupervised, trained on NORMAL only) —
     the primary spec-recommended approach.
  2. A supervised baseline (Random Forest or Logistic
     Regression) using the full labeled data, as a comparison
     point.
- Use GridSearchCV or RandomizedSearchCV (your call, justify
  which) for hyperparameter tuning of each candidate.
- Metrics to report for every candidate/fold:
  - Precision, recall, F1 (per class, plus macro-average)
  - ROC-AUC / PR-AUC where applicable
  - Confusion matrix
  - For the Isolation Forest specifically: how well its
    anomaly score separates NORMAL from the other three
    classes (since it never sees labels during training)

### 6. Experiment tracking with MLflow

- Log every run (params, metrics, model artifact, and the
  fitted preprocessing pipeline) to MLflow.
- Use a clearly named experiment, e.g.
  `fire-event-ai-confidence`.
- Log enough that another engineer could look at the MLflow UI
  and know exactly what was tried and why one run beat another.
- At the end, programmatically identify and register the best
  run based on a clearly stated selection metric (state your
  choice, e.g. macro-F1 on the validation set, and why).

### 7. Final model selection and save

- Retrain the selected best model+hyperparameters on
  train+val combined (not just train), evaluate once, and only
  once, on the held-out test set.
- Save the final model, its preprocessing pipeline, the config
  used, and a metadata file (model type, hyperparameters, test
  metrics, training date, data version) to a `model/` directory.
- Do not touch the test set again after this point.

### 8. Wrap the final model behind the interface

- Implement `predict_fire_confidence(sensor_data: dict) -> dict`
  exactly as specified above, loading the saved artifacts.
- It must run on a single sensor reading (not a batch) with
  sub-100ms latency for realistic dashboard use.

### 9. Test cases

Write and run explicit test cases mirroring the project's
demo/testing scenarios — confirm the function returns sensible
`fire_confidence` and `classification` for each:

1. Clean normal reading → low confidence, NORMAL
2. High temperature only, no smoke/flame → low-moderate
   confidence, should NOT read as confirmed fire
3. High temp + high smoke, no flame → moderate confidence,
   POSSIBLE_FIRE
4. High temp + high smoke + flame + sustained duration → high
   confidence, CONFIRMED_FIRE
5. Contradictory combination (e.g. high temp, low smoke,
   flame=false, erratic) → should land in the ambiguous/anomaly
   zone, not a confident fire or non-fire call
6. Edge cases: missing/null field handling, out-of-range sensor
   values

Assert on ranges/classes, not exact floats. Show pass/fail
output for every case.

============================================================
DELIVERABLES
============================================================

```
ai/
├── data/
│   └── fire_sensor_training_data.csv
├── notebooks/
│   └── fire_ai_pipeline_dev.ipynb   # STAGE 1 — full pipeline, phases 1-7
├── preprocessing/                    # STAGE 2 — extracted from the notebook
│   └── pipeline.py          # cleaning + feature engineering, fit/transform
├── training/
│   ├── train.py             # CV + hyperparameter search + MLflow logging
│   └── config.yaml          # thresholds, split ratios, search space
├── model/
│   ├── best_model.pkl
│   ├── preprocessing_pipeline.pkl
│   └── model_metadata.json
├── inference/
│   └── ai_service.py        # predict_fire_confidence()
├── tests/
│   └── test_ai_service.py   # the 6 scenario tests above
├── reports/
│   ├── data_quality_report.md
│   └── model_evaluation_report.md
└── mlruns/                  # MLflow tracking directory
```

The notebook is a real deliverable, not scratch work — keep it
in the final handoff so the model-selection reasoning is
visible and reviewable, alongside the deployable modules it was
refactored into.

============================================================
CODE QUALITY BAR
============================================================

- Type hints throughout.
- No hardcoded paths, thresholds, or magic numbers — config-driven.
- No notebook-only code — everything runnable as scripts/modules.
- Docstrings on every public function.
- No "TODO"/pseudocode — fully working code only.
- Log what you did at each phase (which hyperparameters won,
  why, what the final metrics were) so the choices are
  auditable later.

============================================================
WORKING STYLE
============================================================

Work phase by phase (1 through 9 above), notebook first (Stage
1), then refactor into files (Stage 2). After each phase, show
the actual output (metrics, plots, or logs), briefly explain
what it means, and only then move to the next phase. Do not
generate the entire pipeline in one pass, and do not skip ahead
to the production file structure before the notebook proves the
pipeline works. If the dataset proves insufficient for a
reliable model at any point, say so explicitly rather than
reporting inflated metrics.

Stop once the model is trained, evaluated, saved, and wrapped
behind `predict_fire_confidence()` with passing tests. Do not
start on FastAPI routes, request handling, or any API layer in
this task — that will be a separate, later prompt once the AI
piece is confirmed working standalone.
