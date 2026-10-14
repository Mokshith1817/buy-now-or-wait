# Build & Verification Report: Buy Now or Wait (కొనాలా? ఆగాలా?)

## 1. What Was Built

A full-stack, deployable, zero-Python web application built using **Next.js 15 (App Router)** and **TypeScript** with plain CSS in `globals.css` (no Tailwind, no third-party UI libraries).

- **Data Pipeline**:
  - `scripts/generate-sample-data.ts`: Deterministic 4-year weekly vegetable price generator using a seeded PRNG (Mulberry32) ending on the week of `2026-10-12`. Simulates realistic base prices, 52-week seasonality (summer/monsoon peaks for tomato, post-monsoon peaks for onion/potato), trends, noise, and agricultural supply shocks.
  - `data/prices.csv`: 208 weekly records per vegetable across 8 items (1,664 data points total).
  - `data/DATA_SOURCE.txt`: Data source indicator (`synthetic`), driving the demo banner in the UI.
- **Machine Learning Engine (`src/lib/forecast.ts`)**:
  - Built from scratch in pure TypeScript with zero ML dependencies.
  - Holt-Winters Additive model with 52-week seasonal period.
  - Parameter grid search across $\alpha \in \{0.1, 0.3, 0.5\}$, $\beta \in \{0.01, 0.05\}$, $\gamma \in \{0.1, 0.3, 0.5\}$.
  - Damped trend fallback for series shorter than 104 points.
  - 4-week ahead point forecasts with 80% prediction intervals ($\pm 1.28 \times \sigma_{\text{residual}} \times \sqrt{h}$, lower bound clamped at 0).
  - Rolling-origin 12-week backtesting against a Naive persistence baseline ($y_t = y_{t-1}$).
  - In-memory memoization cache for sub-millisecond response times.
- **Verdict Rules Engine (`src/lib/verdict.ts`)**:
  - Pure function mapping 7-day predicted price change percentage (`change7`) to decisions:
    - $\ge +8\% \to \text{"BUY\_NOW"}$
    - $\le -8\% \to \text{"WAIT"}$
    - Otherwise $\to \text{"BUY\_LITTLE"}$
  - Low-confidence downgrade protection: Automatically downgrades "BUY_NOW" and "WAIT" to "BUY_LITTLE" when backtest confidence is Low.
- **RAG Retrieval Engine (`src/lib/rag.ts`)**:
  - Pure TypeScript TF-IDF vectorizer + Cosine Similarity matching against 10 curated markdown notes in `docs/notes/`.
  - Contextual boosting for matching item tags, price direction tags (`arrivals`, `season`, `festival`), and monsoon season (`rain`).
- **Explanation Generator (`src/lib/explain.ts`)**:
  - Deterministic bilingual template fallback in Telugu and English.
  - Optional Google Gemini REST API server-side integration (`x-goog-api-key` header, 8-second timeout, markdown filtering, length validation, silent fallback).
- **API Routes**:
  - `GET /api/forecast?item=<id>`
  - `POST /api/advice` (body: `{ item, lang }`)
  - `GET /api/health`
- **Frontend & Accessibility (`src/app`)**:
  - Mobile-first, single-page UI with default Telugu language.
  - Language toggle (TE / EN) preserved in React state only (no `localStorage`).
  - Minimum 56px touch target buttons, $\ge 18\text{px}$ body font size, high-contrast badges, visible focus rings (`:focus-visible`).
  - Big colored verdict banner with icons and text (never color alone).
  - Hand-drawn SVG line chart rendering past 26 weeks history, 4-week dashed forecast, shaded confidence fan, and screen-reader accessible summary.
  - Web Speech API integration (`SpeechSynthesis` for audio playback with Telugu fallback note and English alternative; `SpeechRecognition` for spoken voice search).
  - Expandable "About this prediction" panel showing honest Holt-Winters backtest metrics.

---

## 2. Test and Build Results

### Automated Tests (`npm test`)
Vitest test suite executing 31 unit and integration tests across 6 test files:
```
✓ tests/i18n.test.ts (3 tests)
✓ tests/verdict.test.ts (16 tests)
✓ tests/rag.test.ts (3 tests)
✓ tests/forecast.test.ts (1 test)
✓ tests/determinism.test.ts (2 tests)
✓ tests/api.test.ts (6 tests)

Test Files  6 passed (6)
Tests       31 passed (31)
Duration    353ms
```

### Production Build (`npm run build`)
```
▲ Next.js 15.5.27
Creating an optimized production build ...
✓ Compiled successfully in 563ms
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (7/7)
✓ Finalizing page optimization
All routes built cleanly with zero errors and zero warnings.
```

### Evaluation Script (`npm run evaluate`)
Evaluated 12-week rolling-origin backtest for all 8 items and generated `docs/EVALUATION.md`:
- Onion: Model MAPE 3.22% vs Naive 5.01% (Beats Naive: YES, Confidence: High)
- Brinjal: Model MAPE 5.51% vs Naive 6.61% (Beats Naive: YES, Confidence: High)
- Cabbage: Model MAPE 7.79% vs Naive 8.51% (Beats Naive: YES, Confidence: Medium)
- Okra: Model MAPE 7.69% vs Naive 6.94% (Beats Naive: NO, Confidence: Medium)
- Carrot: Model MAPE 6.76% vs Naive 6.57% (Beats Naive: NO, Confidence: Medium)
- Green Chilli: Model MAPE 8.06% vs Naive 7.64% (Beats Naive: NO, Confidence: Medium)
- Potato: Model MAPE 9.00% vs Naive 4.49% (Beats Naive: NO, Confidence: Medium)
- Tomato: Model MAPE 28.20% vs Naive 15.65% (Beats Naive: NO, Confidence: Low)

---

## 3. Curl Verification Results

Tested against the running Next.js production server (`http://localhost:3000`):

1. **`GET /api/health`**:
   - Status: `200 OK`
   - Body: `{"ok":true,"items":8,"dataSource":"synthetic","llm":true}`
2. **`GET /api/forecast?item=tomato`**:
   - Status: `200 OK`
   - Body contains 52-week history, 4-week point forecasts with lower/upper bands, latest price (`₹25.75`), `change7` (`-28.54%`), backtest metrics (`modelMAPE: 28.2%`, `naiveMAPE: 15.65%`), confidence (`Low`), and `dataSource: "synthetic"`.
3. **Invalid item `POST /api/advice`**:
   - Request: `{"item":"bad_item","lang":"te"}`
   - Status: `400 Bad Request`
   - Body: `{"error":"Invalid item","message":"Item must be one of: tomato, onion, potato, brinjal, okra, green_chilli, cabbage, carrot"}`
4. **Invalid lang `POST /api/advice`**:
   - Request: `{"item":"tomato","lang":"fr"}`
   - Status: `400 Bad Request`
   - Body: `{"error":"Invalid lang","message":"Language must be either \"te\" or \"en\""}`
5. **All 8 items tested in both Telugu (`te`) and English (`en`)**:
   - All 16 combinations returned `200 OK` with complete verdicts, confidence, reasons, and non-empty explanations.
   - Telugu explanations contain native Telugu script.
   - Tomato correctly exercised the low-confidence downgrade to "BUY_LITTLE" in both languages.

---

## 4. Architectural & Design Decisions

1. **Pure TypeScript Holt-Winters Implementation**: Rather than invoking Python or native bindings, the Holt-Winters algorithm was written from first principles in TypeScript. This ensures that the Next.js API routes run on standard Vercel serverless environments with zero cold-start delay and no external runtimes.
2. **Deterministic In-Memory Cache**: All forecast computations are memoized upon first request. Subsequent requests for the same vegetable execute in under 1 millisecond.
3. **Client State vs Storage**: Language preferences are kept strictly in React component state (`useState`) without using `localStorage`, adhering to privacy and stateless UI constraints.
4. **Accessible Color & Semantic Combinations**: Color alone is never used to communicate advice; every verdict combines color, high-contrast borders, SVG icons, and explicit localized text.
5. **Speech Synthesis Resilience**: If a client device (e.g. some Android or desktop setups) lacks an installed Telugu voice pack, the app detects this via `speechSynthesis.getVoices()`, displays the specified Telugu notice, and provides a one-click English audio option.
6. **Hand-Coded SVG Chart**: The price chart was hand-coded using raw SVG `<path>`, `<circle>`, `<line>`, and `<text>` elements to keep client bundle size minimal (zero chart libraries like Recharts or Chart.js).

---

## 5. Environment Variables

| Variable | Required? | Default | Description |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | *Unset* | Google Gemini API key for dynamic explanation enhancement. The app functions completely without it. |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model name for server-side generation. |

A template file `.env.example` has been created with documentation. No live API keys are stored in the repository.

---

## 6. Known Limitations

1. **Synthetic Data**: By default, prices are generated via the deterministic agricultural simulation script. Placing real mandi data in `data/prices.csv` with a source tag in `data/DATA_SOURCE.txt` seamlessly replaces it.
2. **Browser Voice Support**: Voice output quality depends on OS text-to-speech engines. Speech recognition requires browser support for Web Speech API (`SpeechRecognition`).
3. **Weekly Granularity**: Predictions are generated at weekly intervals rather than daily intraday prices.

---

## 7. Five-Line "How to Demo" Script

1. **Open the App**: Navigate to `http://localhost:3000` — notice the default Telugu interface, high-contrast layout, and synthetic demo data banner.
2. **Try an Example**: Click **"🍅 ఉదాహరణ చూడండి (Try an example)"** to instantly load Tomato. Observe the Low-confidence safeguard downgrading the signal to **"కొద్దిగా మాత్రమే కొనండి (Buy a little)"**.
3. **Select Onion**: Click **"🧅 ఉల్లిపాయ (Onion)"** to view a High-confidence **"ఇప్పుడే కొనండి (Buy now)"** verdict (+23.8%) supported by Nashik rainfall research notes.
4. **Listen to Advice**: Click **"🔊 వినండి (Listen)"** to hear the spoken audio verdict in Telugu, or tap the **"English"** toggle in the header to switch languages instantly.
5. **Inspect Methodology**: Click **"ఈ అంచనా గురించి (About this prediction)"** to review the honest 12-week Holt-Winters backtest MAPE vs the naive persistence baseline.
