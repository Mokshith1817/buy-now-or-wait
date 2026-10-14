# System Architecture & Technical Design

This document details the software architecture, repository organization, end-to-end data flows, and modification guide for **"Buy Now or Wait" (*కొనాలా? ఆగాలా?*)**.

---

## 1. Directory & File Organization

```
buy-now-or-wait/
├── .editorconfig                # Global indentation and formatting standard
├── .env.example                 # Documented template for optional environment variables
├── .gitignore                   # Ignores node_modules, .next, and live .env files
├── next.config.mjs              # Next.js 15 configuration with root trace resolution
├── package.json                 # Minimal dependencies (Next.js, React, Vitest, TSX)
├── tsconfig.json                # Strict TypeScript configuration with @/* path alias
├── vitest.config.ts             # Vitest test runner configuration
│
├── data/
│   ├── DATA_SOURCE.txt          # Flags data as "synthetic" or live source name
│   └── prices.csv               # 4-year weekly price history (208 weeks x 8 items)
│
├── docs/
│   ├── ARCHITECTURE.md          # Complete architectural overview and data flow (this file)
│   ├── BUILD_REPORT.md          # Comprehensive build report, curl logs, and demo script
│   ├── CHANGELOG_ATTEMPT2.md    # Log of refactoring, modularization, and improvements
│   ├── EVALUATION.md            # 12-week rolling backtest accuracy report vs naive baseline
│   └── notes/                   # 10 curated agricultural market notes with YAML frontmatter
│       ├── 01-onion-nashik-rainfall.md
│       ├── 02-seasonal-peaks-top.md
│       ├── 03-lean-season-pressure.md
│       ├── 04-farmer-share-consumer-rupee.md
│       ├── 05-retail-wholesale-monitoring.md
│       ├── 06-arrivals-ease-spikes.md
│       ├── 07-festival-demand-surge.md
│       ├── 08-storage-durability.md
│       ├── 09-perishable-buying-strategy.md
│       └── 10-how-to-read-forecast.md
│
├── scripts/
│   ├── evaluate.ts              # Evaluates 12-week backtest MAPE and updates EVALUATION.md
│   └── generate-sample-data.ts  # Deterministic Mulberry32 PRNG agricultural time-series generator
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── advice/route.ts   # POST /api/advice: verdict, explanation, and reasons
│   │   │   ├── forecast/route.ts # GET /api/forecast: 52-wk history and 4-wk bands
│   │   │   └── health/route.ts   # GET /api/health: system status and datasource flag
│   │   ├── globals.css          # Plain CSS (no Tailwind/UI libraries), mobile-first, high contrast
│   │   ├── layout.tsx           # Root layout with responsive viewport and metadata
│   │   └── page.tsx             # Thin view wiring hooks and modular components
│   │
│   ├── components/              # Small, reusable, accessible UI components
│   │   ├── AboutPrediction.tsx  # Expandable panel with backtest accuracy and disclaimer
│   │   ├── DemoBanner.tsx       # Synthetic data disclosure warning banner
│   │   ├── Header.tsx           # App title, tagline, and LanguageToggle
│   │   ├── ItemGrid.tsx         # 8-item vegetable selection button grid
│   │   ├── LanguageToggle.tsx   # Bilingual TE/EN toggle button
│   │   ├── PriceChart.tsx       # Hand-drawn SVG time series chart with shaded fan
│   │   ├── PriceStats.tsx       # Current price, forecasted price, and confidence badge
│   │   ├── QuickActions.tsx     # "Try an example" button and voice search mic
│   │   ├── ReasonsList.tsx      # RAG-retrieved explanations and source links
│   │   ├── SkeletonLoader.tsx   # Shimmer animated placeholder card
│   │   ├── VerdictCard.tsx      # Main composite result presentation card
│   │   ├── VoiceControls.tsx    # Text-to-speech audio controls and voice notices
│   │   └── WhoIsThisFor.tsx     # 5 community persona benefit cards
│   │
│   ├── hooks/                   # Custom React state and lifecycle hooks
│   │   ├── useAdvice.ts         # Asynchronous forecast/advice data fetching and caching
│   │   └── useSpeech.ts         # Web Speech API synthesis and recognition management
│   │
│   └── lib/                     # Pure domain logic and mathematical utilities
│       ├── api-error.ts         # Centralized error handler returning uniform JSON
│       ├── chart-utils.ts       # Coordinate mapping and SVG path math
│       ├── constants.ts         # Centralized thresholds, parameters, and time constants
│       ├── explain.ts           # Bilingual template generator + optional Gemini REST call
│       ├── forecast.ts          # Holt-Winters Additive model and rolling backtest
│       ├── i18n.ts              # Localization strings, commodity metadata, and personas
│       ├── rag.ts               # TF-IDF vectorizer, cosine similarity, and contextual boosts
│       ├── types.ts             # Shared domain TypeScript interfaces (zero `any`)
│       └── verdict.ts           # Pure business rules mapping price change to verdict
│
└── tests/                       # Automated Vitest test suites (36 tests)
    ├── api.test.ts              # API routes, error shapes, validation, and status codes
    ├── chart-utils.test.ts      # Bounds calculation, coordinate mapping, SVG paths
    ├── determinism.test.ts      # Verifies 100% deterministic reproducibility
    ├── forecast.test.ts         # Mathematical boundaries, intervals, and MAPE finiteness
    ├── i18n.test.ts             # Bidirectional key coverage, personas, and Telugu strings
    ├── rag.test.ts              # Markdown parsing, Nashik retrieval, and fallback robustness
    └── verdict.test.ts          # Threshold boundary table tests and confidence downgrades
```

---

## 2. End-to-End Data Flow

The system operates across three decoupled, deterministic pipelines:

### A. Forecasting & Verdict Pipeline (Statistical ML)
```
[ data/prices.csv ]
         │ (Chronological 4-year weekly series)
         ▼
[ fitBestHW() in src/lib/forecast.ts ]
         │ 1. Grid search across alpha ∈ {0.1, 0.3, 0.5}, beta ∈ {0.01, 0.05}, gamma ∈ {0.1, 0.3, 0.5}
         │ 2. Computes in-sample Level, Trend, and 52-week Seasonals
         │ 3. Generates 4-week forecast: point ± 1.28 * std * sqrt(h)
         ▼
[ runBacktest() in src/lib/forecast.ts ]
         │ 1. Rolling-origin backtest over the last 12 weeks
         │ 2. Computes modelMAPE vs naive persistence baseline (last known price)
         │ 3. Derives confidence: High (MAPE < 6% & beats naive), Medium (MAPE < 12%), Low
         ▼
[ determineVerdict() in src/lib/verdict.ts ]
         │ 1. Calculates change7 = ((forecast[0] - latest) / latest) * 100
         │ 2. Evaluates rules: >= +8% -> BUY_NOW, <= -8% -> WAIT, else -> BUY_LITTLE
         │ 3. Confidence Safeguard: If confidence is Low, downgrades BUY_NOW/WAIT to BUY_LITTLE
         ▼
[ Final Verdict & Confidence ]
```

### B. Knowledge Retrieval & Explanation Pipeline (RAG)
```
[ docs/notes/*.md ] (10 Curated Agricultural Notes with Frontmatter)
         │
         ▼
[ loadAllNotes() in src/lib/rag.ts ]
         │ Parses YAML frontmatter (title, items, tags, source, source_url, verified)
         ▼
[ retrieveRelevantNotes() in src/lib/rag.ts ]
         │ 1. Tokenizes documents & query (item + direction keywords)
         │ 2. Computes TF-IDF vectors & cosine similarity
         │ 3. Applies Contextual Boosts:
         │    - Exact item match (+0.45) or "all" notes (+0.15)
         │    - Direction tags (up -> arrivals/season/festival; down -> arrivals/season)
         │    - Monsoon season calendar check (Jun-Oct -> rain tag boost)
         │ 4. Returns top 3 sorted notes
         ▼
[ generateExplanation() in src/lib/explain.ts ]
         │ If GEMINI_API_KEY is present:
         │    Server-side POST to Gemini REST API (8s timeout, strict plain text validation)
         │ On error, timeout, or key absence:
         │    Silently uses deterministic template fallback:
         │    "Tomato price may rise about 12% next week (confidence: Medium). Reason: <note title>."
         ▼
[ Localized Explanation Text & Citations ]
```

### C. Presentation & Interaction Pipeline (UI)
```
[ src/app/page.tsx ]
         │ 1. Initializes with default language = "te" (Telugu)
         │ 2. useAdvice hook fetches /api/forecast & /api/advice concurrently
         │ 3. useSpeech hook detects SpeechSynthesis voices and SpeechRecognition
         ▼
[ Modular Components ]
         ├── Header: Title, tagline, LanguageToggle
         ├── DemoBanner: Transparent synthetic data warning
         ├── WhoIsThisFor: 5 accessible community persona cards
         ├── QuickActions: 1-click tomato example & voice search mic
         ├── ItemGrid: 8 vegetable cards with bilingual names
         └── VerdictCard:
               ├── Big Colored Verdict Banner (icon + color + localized word)
               ├── PriceStats: Current price, forecasted price, confidence badge
               ├── PriceChart: Hand-drawn SVG with 26-wk history, 4-wk dashed line, and shaded fan
               ├── ReasonsList: Plain explanation + 3 retrieved notes with verified source links
               ├── VoiceControls: Audio read-aloud with missing Telugu voice detection
               └── AboutPrediction: Expandable panel with honest Holt-Winters backtest MAPE
```

---

## 3. Where to Change What

| Goal | Primary Files to Modify | Notes |
| :--- | :--- | :--- |
| **Replace Demo Data with Real Mandi Prices** | `data/prices.csv`, `data/DATA_SOURCE.txt` | Keep the CSV header (`week_start,item,price_inr_per_kg`). Set first line of `DATA_SOURCE.txt` to the source name (e.g., `Agmarknet DCA`) to automatically hide the synthetic banner. |
| **Tune Verdict Thresholds or Parameters** | `src/lib/constants.ts` | Adjust `VERDICT_BUY_NOW_THRESHOLD` (default: 8.0) or `VERDICT_WAIT_THRESHOLD` (default: -8.0). |
| **Add New Vegetables** | `src/lib/i18n.ts`, `data/prices.csv`, `scripts/generate-sample-data.ts` | Add new commodity object to `ITEMS` array with `id`, `name_en`, `name_te`, `emoji`, and speech recognition `keywords`. |
| **Add or Edit Agricultural Knowledge Notes** | `docs/notes/<note-name>.md` | Create a markdown file with frontmatter (`title`, `items`, `tags`, `source`, `source_url`, `verified`). The RAG engine indexes it automatically on next request. |
| **Change UI Translations or Copy** | `src/lib/i18n.ts` | Modify strings in `TRANSLATIONS.te` and `TRANSLATIONS.en`. The symmetric test suite verifies key parity. |
| **Modify Chart Sizing or Aesthetics** | `src/lib/chart-utils.ts`, `src/components/PriceChart.tsx`, `src/app/globals.css` | Canvas viewBox and padding constants are located in `DEFAULT_DIMENSIONS`. |
| **Switch or Configure LLM Provider** | `src/lib/explain.ts`, `src/lib/constants.ts` | Configured via `GEMINI_API_KEY` and `GEMINI_MODEL`. Upstream call is restricted to server-side only. |
