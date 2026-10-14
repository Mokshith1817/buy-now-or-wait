# Buy Now or Wait (కొనాలా? ఆగాలా?)

> **Simple, transparent vegetable price forecasting and buying guidance for ordinary Indian families.**

[![Vitest Tests](https://img.shields.io/badge/tests-31%20passed-brightgreen.svg)]()
[![Next.js 15](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)]()
[![Zero External ML Dependencies](https://img.shields.io/badge/ML-Pure%20TypeScript-blue.svg)]()

---

## 1. Problem and Who It Helps

Families, elderly people, homemakers, working individuals, and students living on tight monthly budgets struggle to plan their food spending because vegetable prices fluctuate violently and unpredictably from week to week. A spike in onions or tomatoes can strain a weekly household budget overnight.

### Who It Helps:
- **Homemakers & Families**: Decide whether to buy a week's supply of staple vegetables today or wait for prices to drop.
- **Elderly People & Seniors**: Simple interface, large accessible buttons (>= 56px), large readable text (>= 18px), high-contrast badges, and native Telugu voice output ("వినండి").
- **Students & Working Youth**: Quickly check price directions when budgeting groceries.
- **Small Shopkeepers & Street Vendors**: Observe medium-term weekly trends and historical patterns without navigating complex mandi spreadsheets.

---

## 2. Solution

**"Buy Now or Wait"** (*కొనాలా? ఆగాలా?*) gives clear, actionable buying advice in simple Telugu or English:
1. **Tap any of 8 essential vegetables**: Tomato, Onion, Potato, Brinjal, Okra, Green Chilli, Cabbage, or Carrot (or tap the microphone button and speak the name).
2. **Instant Forecast**: A statistical Holt-Winters additive model predicts next week's price and 4-week bounds.
3. **Clear Verdict**:
   - 🟢 **ఇప్పుడే కొనండి (Buy Now)**: If price is projected to rise by $\ge 8\%$.
   - 🛑 **ఆగండి, ధర తగ్గవచ్చు (Wait)**: If price is projected to fall by $\ge 8\%$.
   - ⚖️ **కొద్దిగా మాత్రమే కొనండి (Buy a Little)**: If prices are stable (between $-8\%$ and $+8\%$) or if forecast confidence is Low.
4. **Contextual Explanation (RAG)**: Retrieves grounded agricultural economic notes from RBI research and market observations to explain *why* the price is shifting.
5. **Speech Synthesis**: Listen to the recommendation in natural Telugu or English voice.

---

## 3. How It Works

```
                     +---------------------------------------+
                     |           Weekly Price CSV            |
                     |  (4 years, 52-week period per item)   |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         Holt-Winters Additive         |
                     |    Level + Trend + Seasonality (52)   |
                     |  Grid Search: alpha, beta, gamma fit  |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |       Rolling-Origin Backtest         |
                     |  12-week test vs Naive baseline       |
                     |  MAPE -> Confidence (High/Medium/Low) |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |             Verdict Engine            |
                     |   7-day Change % & Confidence Gate    |
                     |   (Low confidence downgrades to       |
                     |            "BUY_LITTLE")              |
                     +-------------------+-------------------+
                                         |
       +---------------------------------+---------------------------------+
       |                                                                   |
       v                                                                   v
+--------------+                                           +-------------------------------+
|  10 Curated  |                                           |     Single-Page App UI        |
|  Agri Notes  |                                           |  - Telugu / English Toggle    |
+------+-------+                                           |  - Big Colored Verdict Card   |
       |                                                   |  - Hand-drawn SVG Price Chart |
       v                                                   |  - "Why?" Grounded Notes      |
+--------------+                                           |  - Voice Synthesis ("వినండి")  |
| TF-IDF + Cos |                                           |  - "About Prediction" Honesty |
| Context Boost| ---> [ Top 3 Retrieved Notes ]            +---------------+---------------+
+--------------+             |                                             ^
                             v                                             |
             +-------------------------------+                             |
             |     Explanation Generator     |                             |
             |   - Deterministic Fallback    |-----------------------------+
             |   - Optional Gemini REST call |
             +-------------------------------+
```

---

## 4. Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components + Route Handlers) + TypeScript.
- **Styling**: Pure CSS in `globals.css` (Zero Tailwind, Zero UI frameworks, zero external CSS dependencies).
- **ML / Forecasting**: Custom TypeScript implementation of Holt-Winters Additive exponential smoothing and rolling-origin backtesting. **No Python or native C++ dependencies**, allowing fast execution on Vercel serverless functions.
- **RAG & Search**: Pure TypeScript TF-IDF vectorizer + Cosine Similarity with contextual agricultural boosting.
- **Voice**: Web Speech API (`SpeechSynthesis` for speech output, `SpeechRecognition` for Telugu/English voice search).
- **Chart**: Custom hand-crafted SVG chart (last 26 weeks history, 4-week forecast dashed line, shaded 80% prediction interval fan).
- **Testing**: Vitest 3.

---

## 5. Machine Learning Details & Honest Backtest Table

### Model Architecture
- **Additive Holt-Winters Model**:
  $$\hat{y}_{t+h} = L_t + h \cdot T_t + S_{t+h-m}$$
  $$L_t = \alpha(y_t - S_{t-m}) + (1 - \alpha)(L_{t-1} + T_{t-1})$$
  $$T_t = \beta(L_t - L_{t-1}) + (1 - \beta)T_{t-1}$$
  $$S_t = \gamma(y_t - L_t) + (1 - \gamma)S_{t-m}$$
  where seasonal period $m = 52$ weeks.
- **Hyperparameter Fitting**: In-sample grid search across:
  - $\alpha \in \{0.1, 0.3, 0.5\}$
  - $\beta \in \{0.01, 0.05\}$
  - $\gamma \in \{0.1, 0.3, 0.5\}$
  minimizing sum of squared errors.
- **Prediction Intervals**:
  $$\text{Interval}_h = \hat{y}_{N+h} \pm 1.28 \times \sigma_{\text{residual}} \times \sqrt{h} \quad (\text{clamped at } 0)$$
- **Confidence Rating**:
  - **High**: $\text{modelMAPE} < 6\%$ and beats naive baseline.
  - **Medium**: $\text{modelMAPE} < 12\%$. (Never exceeds Medium if it does not beat naive).
  - **Low**: $\text{modelMAPE} \ge 12\%$.

### Honest 12-Week Rolling-Origin Backtest Results
*(Evaluated via `npm run evaluate` across the latest 12 weeks of data)*

| Item | Telugu Name | Latest Price | Next Wk Forecast | 7-Day Change | Model MAPE | Naive MAPE | Beats Naive? | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tomato** | టమాటా | ₹25.75 | ₹18.40 | -28.5% | 28.20% | 15.65% | ❌ No | **Low** |
| **Onion** | ఉల్లిపాయ | ₹54.14 | ₹67.01 | +23.8% | 3.22% | 5.01% | ✅ Yes | **High** |
| **Potato** | బంగాళదుంప | ₹35.04 | ₹30.60 | -12.7% | 9.00% | 4.49% | ❌ No | **Medium** |
| **Brinjal** | వంకాయ | ₹31.80 | ₹31.51 | -0.9% | 5.51% | 6.61% | ✅ Yes | **High** |
| **Okra** | బెండకాయ | ₹37.82 | ₹38.19 | +1.0% | 7.69% | 6.94% | ❌ No | **Medium** |
| **Green Chilli** | పచ్చిమిర్చి | ₹49.63 | ₹56.45 | +13.7% | 8.06% | 7.64% | ❌ No | **Medium** |
| **Cabbage** | క్యాబేజీ | ₹23.03 | ₹25.08 | +8.9% | 7.79% | 8.51% | ✅ Yes | **Medium** |
| **Carrot** | క్యారెట్ | ₹28.85 | ₹29.69 | +2.9% | 6.76% | 6.57% | ❌ No | **Medium** |

- **Average Model MAPE**: 9.53%
- **Average Naive Baseline MAPE**: 7.68%
- **Items Beating Naive Baseline**: 3 / 8 (Onion, Brinjal, Cabbage)
- **Automatic Downgrade in Action**: For Tomato, recent price volatility produced a model MAPE of 28.20% (Confidence: Low). The engine automatically downgraded the raw "WAIT" signal to **"కొద్దిగా మాత్రమే కొనండి (BUY A LITTLE)"** with an explicit text explanation that caution is warranted due to forecast uncertainty.

---

## 6. RAG Details and Curated Sources

The RAG engine indexes 10 structured agricultural notes stored as markdown files in `docs/notes/` with YAML front-matter:

1. **Onion Nashik Rainfall**: RBI Working Paper 08/2024 *"Vegetables Inflation in India: A Study of Tomato, Onion and Potato"*, [RBI Publication 22723](https://rbi.org.in/scripts/PublicationsView.aspx?id=22723) (verified true).
2. **Seasonal Peaks**: ISAE India, *"Forecasting of Retail Price Rise in Tomato, Onion and Potato Commodities in India"*, [ISAE Publication](https://isaeindia.com/publication/download-pdf/345) (verified true).
3. **Lean Season Pressures**: RBI WP 08/2024 (verified true).
4. **Farmer Share of Consumer Rupee**: RBI WP 08/2024 (verified true).
5. **Retail vs Wholesale Price Monitoring**: CEDA mirror README, [CEDA Ashoka](https://dca-dev.ceda.ashoka.edu.in/README.html) (verified true).
6. **Arrivals Ease Post-Spike Prices**: General market observation (verified false).
7. **Festival Demand Surge**: General market observation (verified false).
8. **Storage Durability**: General guidance (verified false).
9. **Perishable Buying Strategy**: General guidance (verified false).
10. **How to Read the Forecast**: Guidance and probability notice (verified true).

### Retrieval Algorithm
- Documents are tokenized and scored using standard Term Frequency-Inverse Document Frequency (TF-IDF).
- Cosine similarity is computed against query terms.
- Contextual boosts are applied:
  - Specific item matches receive $+0.45$, "all" notes receive $+0.15$.
  - Upward price direction boosts notes tagged `arrivals`, `season`, `festival`.
  - Downward price direction boosts notes tagged `arrivals`, `season`.
  - Current calendar month during monsoon (June–October) boosts notes tagged `rain`.
- In the UI:
  - `verified: true` notes display a clickable **"Source"** link.
  - `verified: false` notes are clearly labelled with **"సాధారణ సూచన (General guidance)"**.

---

## 7. Responsible-Use Notes

1. **Synthetic Demo Data**: The default weekly prices dataset (`data/prices.csv`) is generated with a deterministic pseudo-random generator simulating Indian agricultural seasonality and supply disruptions. The app renders a prominent orange banner:
   - **TE**: *"ఇది డెమో డేటా (నమూనా) - నిజమైన మార్కెట్ ధరలు కాదు"*
   - **EN**: *"Demo data (synthetic sample) - not real market prices"*
   If a real dataset is placed into `data/prices.csv` with `data/DATA_SOURCE.txt` set to the real provider, the banner automatically disappears.
2. **Guidance, Not a Guarantee**: Statistical models are planning guides. Every card includes:
   - **TE**: *"ఇది ఒక అంచనా మాత్రమే, హామీ కాదు."*
   - **EN**: *"This is a guide, not a guarantee."*
3. **No Financial or Arbitrage Claims**: The app never uses words like "guaranteed savings" or "profit". It always uses "likely" or "may".
4. **Security & Input Sanitization**: Only strict allowlisted vegetable IDs and language keys are accepted by the server. Free-form user text is never accepted or passed to LLM APIs.

---

## 8. Run Locally

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### Steps
```bash
# 1. Clone repository
git clone <repo-url>
cd demo

# 2. Install dependencies
npm install

# 3. Generate sample data (if not already present)
npx tsx scripts/generate-sample-data.ts

# 4. Run automated test suite (31 tests across 6 suites)
npm test

# 5. Run 12-week backtest evaluation report
npm run evaluate

# 6. Build production bundle
npm run build

# 7. Start production server
npm run start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 9. Deploy to Vercel

The app is engineered to run out of the box on Vercel with zero external service requirements.

1. Push this repository to GitHub/GitLab.
2. Import the repository into your Vercel Dashboard.
3. Framework Preset: **Next.js**.
4. Build Command: `npm run build` (or leave default).
5. Output Directory: `.next` (default).
6. **Optional Environment Variables**:
   - `GEMINI_API_KEY`: *(Optional)* Gemini API key for enhanced natural language explanations.
   - `GEMINI_MODEL`: *(Optional, default: "gemini-2.5-flash")*.
   *(If neither variable is set, the app runs completely using its built-in deterministic bilingual template generator).*
7. Click **Deploy**.

**Live Demo Link**: `<add after deploy>`

---

## 10. Limitations and Future Work

1. **Town-Specific Mandi Data**: Current demo data simulates national seasonal trends. Future work includes integrating daily mandi-level data via Agmarknet / DCA APIs for specific districts (e.g., Bowenpally, Madanapalle, Nashik, Kolar).
2. **Additional Crops**: Expanding beyond the initial 8 vegetables to include leafy greens (spinach, coriander), pulses, and cooking oils.
3. **Additional Regional Languages**: Adding Hindi, Tamil, Kannada, and Marathi translations and voice models.
4. **Exogenous Shock Modeling**: Incorporating live weather radar / rainfall indices and diesel transport prices directly into the forecast equations.
