"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ITEMS,
  TRANSLATIONS,
  Language,
  ItemDefinition,
} from "@/lib/i18n";

interface ForecastApiResponse {
  item: string;
  history: { week_start: string; price: number }[];
  forecast: {
    week: number;
    week_start: string;
    point: number;
    lower: number;
    upper: number;
  }[];
  latestPrice: number;
  change7: number;
  backtest: {
    modelMAPE: number;
    naiveMAPE: number;
    beatsNaive: boolean;
  };
  confidence: "High" | "Medium" | "Low";
  dataSource: string;
  isSynthetic: boolean;
}

interface AdviceApiResponse {
  verdict: "BUY_NOW" | "WAIT" | "BUY_LITTLE";
  change7: number;
  confidence: "High" | "Medium" | "Low";
  explanation: string;
  reasons: {
    title: string;
    source: string;
    source_url: string;
    verified: boolean;
  }[];
  usedLLM: boolean;
  dataSource: string;
  isSynthetic: boolean;
}

export default function Home() {
  const [lang, setLang] = useState<Language>("te");
  const [selectedItem, setSelectedItem] = useState<string>("tomato");
  const [forecastData, setForecastData] = useState<ForecastApiResponse | null>(null);
  const [adviceData, setAdviceData] = useState<AdviceApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Speech synthesis & recognition states
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState<boolean>(false);
  const [teluguVoiceAvailable, setTeluguVoiceAvailable] = useState<boolean>(true);

  const t = TRANSLATIONS[lang];

  // Fetch forecast and advice for the selected item
  const loadData = async (itemId: string, targetLang: Language) => {
    setLoading(true);
    setError(null);
    try {
      const [forecastRes, adviceRes] = await Promise.all([
        fetch(`/api/forecast?item=${encodeURIComponent(itemId)}`),
        fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: itemId, lang: targetLang }),
        }),
      ]);

      if (!forecastRes.ok || !adviceRes.ok) {
        throw new Error("Failed to fetch forecast or advice");
      }

      const fcJson = await forecastRes.json();
      const adJson = await adviceRes.json();

      setForecastData(fcJson);
      setAdviceData(adJson);
    } catch (err: unknown) {
      setError(t.tapToRetry);
    } finally {
      setLoading(false);
    }
  };

  // Initial load & when item/language changes
  useEffect(() => {
    loadData(selectedItem, lang);
  }, [selectedItem, lang]);

  // Check speech synthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const hasTe = voices.some((v) => v.lang.toLowerCase().includes("te"));
        setTeluguVoiceAvailable(hasTe);
      }
    };

    checkVoices();
    window.speechSynthesis.onvoiceschanged = checkVoices;

    // Check Speech Recognition support
    const hasRecognition = Boolean(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    );
    setSpeechRecognitionSupported(hasRecognition);
  }, []);

  // Text-to-speech handler
  const handleListen = (forceLang?: "en-IN" | "te-IN") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!adviceData) return;

    const targetLangCode = forceLang || (lang === "te" ? "te-IN" : "en-IN");
    const utterance = new SpeechSynthesisUtterance(adviceData.explanation);
    utterance.lang = targetLangCode;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.toLowerCase().includes(targetLangCode.slice(0, 2)));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition (Mic) handler
  const handleMicClick = () => {
    if (typeof window === "undefined") return;

    type SpeechRecognitionType = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult: (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
      onerror: () => void;
      onend: () => void;
    };

    const SpeechRecClass =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition;

    if (!SpeechRecClass) return;

    try {
      const recognition = new SpeechRecClass();
      recognition.lang = lang === "te" ? "te-IN" : "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListeningMic(true);

      recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript.toLowerCase().trim();
        setIsListeningMic(false);

        // Find matching item
        const matched = ITEMS.find((it) =>
          it.keywords.some((kw) => spoken.includes(kw.toLowerCase()))
        );

        if (matched) {
          setSelectedItem(matched.id);
        }
      };

      recognition.onerror = () => setIsListeningMic(false);
      recognition.onend = () => setIsListeningMic(false);

      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const currentItemObj = ITEMS.find((it) => it.id === selectedItem) || ITEMS[0];

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <h1 className="app-title">{t.appName}</h1>
          <p className="app-tagline">{t.tagline}</p>
        </div>
        <button
          type="button"
          className="lang-toggle-btn"
          onClick={() => setLang(lang === "te" ? "en" : "te")}
          aria-label={lang === "te" ? "Switch to English" : "తెలుగులోకి మార్చండి"}
        >
          🌐 {lang === "te" ? "English" : "తెలుగు"}
        </button>
      </header>

      {/* Demo Data Banner - shown when data is synthetic */}
      {adviceData?.isSynthetic && (
        <section className="demo-banner" role="status">
          <span className="banner-icon" aria-hidden="true">
            ℹ️
          </span>
          <span>{t.demoDataBanner}</span>
        </section>
      )}

      {/* Actions: Try Example & Voice Search */}
      <section className="action-row" aria-label="Quick actions">
        <button
          type="button"
          className="try-example-btn"
          onClick={() => setSelectedItem("tomato")}
        >
          <span>🍅</span>
          <span>{t.tryExample}</span>
        </button>

        {speechRecognitionSupported && (
          <button
            type="button"
            className={`mic-btn ${isListeningMic ? "active" : ""}`}
            onClick={handleMicClick}
            aria-label={isListeningMic ? t.listening : t.speakNow}
          >
            <span>{isListeningMic ? "🔴" : "🎤"}</span>
            <span>{isListeningMic ? t.listening : t.speakNow}</span>
          </button>
        )}
      </section>

      {/* 8 Items Grid */}
      <section aria-label="Vegetable selection">
        <div className="items-grid" role="group">
          {ITEMS.map((it) => {
            const isSelected = it.id === selectedItem;
            return (
              <button
                key={it.id}
                type="button"
                className={`item-btn ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedItem(it.id)}
                aria-pressed={isSelected}
              >
                <span className="item-emoji" aria-hidden="true">
                  {it.emoji}
                </span>
                <span className="item-name-primary">
                  {lang === "te" ? it.name_te : it.name_en}
                </span>
                <span className="item-name-secondary">
                  {lang === "te" ? it.name_en : it.name_te}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Error State */}
      {error && !loading && (
        <div className="error-box" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="retry-btn"
            onClick={() => loadData(selectedItem, lang)}
          >
            {t.tapToRetry}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="result-card" aria-busy="true">
          <div className="skeleton-box" style={{ height: "70px" }} />
          <div className="skeleton-box" style={{ height: "90px" }} />
          <div className="skeleton-box" style={{ height: "200px" }} />
          <div className="skeleton-box" style={{ height: "120px" }} />
        </div>
      )}

      {/* Result Card */}
      {!loading && !error && adviceData && forecastData && (
        <article
          className="result-card"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Big Colored Verdict */}
          <div className={`verdict-banner verdict-${adviceData.verdict}`}>
            <div className="verdict-main">
              <span className="verdict-icon" aria-hidden="true">
                {adviceData.verdict === "BUY_NOW" && "🟢 🛒"}
                {adviceData.verdict === "WAIT" && "🛑 ⏳"}
                {adviceData.verdict === "BUY_LITTLE" && "⚖️ 🤏"}
              </span>
              <span className="verdict-word">
                {adviceData.verdict === "BUY_NOW" && t.buyNow}
                {adviceData.verdict === "WAIT" && t.wait}
                {adviceData.verdict === "BUY_LITTLE" && t.buyLittle}
              </span>
            </div>

            <div className="verdict-change">
              {t.next7Days}:{" "}
              {adviceData.change7 > 0 ? "+" : ""}
              {Math.round(adviceData.change7)}%
            </div>
          </div>

          {/* Price Summary Stats */}
          <div className="stats-row">
            <div className="stat-box">
              <span className="stat-label">{t.currentPrice}</span>
              <span className="stat-value">
                ₹{forecastData.latestPrice.toFixed(2)} / {t.perKg}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t.predictedPrice}</span>
              <span className="stat-value">
                ₹{forecastData.forecast[0].point.toFixed(2)} / {t.perKg}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t.confidence}</span>
              <span className={`confidence-badge confidence-${adviceData.confidence}`}>
                {adviceData.confidence === "High" && t.confidenceHigh}
                {adviceData.confidence === "Medium" && t.confidenceMedium}
                {adviceData.confidence === "Low" && t.confidenceLow}
              </span>
            </div>
          </div>

          {/* SVG Price History & Forecast Line Chart */}
          <section className="chart-section" aria-label="Price chart">
            <h2 className="chart-title">{t.priceChartTitle}</h2>
            <div className="svg-chart-container">
              <SvgPriceChart
                history={forecastData.history}
                forecast={forecastData.forecast}
                lang={lang}
              />
            </div>
            <div className="chart-legend" aria-hidden="true">
              <span className="legend-item">
                <span className="legend-line-history" />
                <span>
                  {lang === "te" ? "గత 26 వారాలు (అసలు)" : "Past 26 weeks (Actual)"}
                </span>
              </span>
              <span className="legend-item">
                <span className="legend-line-forecast" />
                <span>
                  {lang === "te" ? "రాబోయే 4 వారాల అంచనా" : "4-week forecast"}
                </span>
              </span>
              <span className="legend-item">
                <span className="legend-band" />
                <span>
                  {lang === "te" ? "అంచనా పరిధి (80%)" : "Forecast interval"}
                </span>
              </span>
            </div>
          </section>

          {/* Why Section */}
          <section className="why-section">
            <h2 className="why-header">
              <span>💡</span>
              <span>{t.why}</span>
            </h2>

            <p className="explanation-text">{adviceData.explanation}</p>

            <div className="reasons-list">
              {adviceData.reasons.map((reason, idx) => (
                <div key={idx} className="reason-item">
                  <span className="reason-title">{reason.title}</span>
                  <div className="reason-meta">
                    {reason.verified ? (
                      <>
                        <span className="source-tag">
                          {t.source}: {reason.source}
                        </span>
                        {reason.source_url &&
                          reason.source_url.startsWith("http") && (
                            <a
                              href={reason.source_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="source-link"
                            >
                              🔗 Link
                            </a>
                          )}
                      </>
                    ) : (
                      <span className="source-tag">
                        ⚠️ {t.generalGuidance} ({reason.source})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Voice Output: Listen Button */}
          <section className="listen-row">
            <button
              type="button"
              className="listen-btn"
              onClick={() => handleListen()}
            >
              <span>{isSpeaking ? "⏹️" : "🔊"}</span>
              <span>{isSpeaking ? "Stop" : t.listen}</span>
            </button>

            {lang === "te" && !teluguVoiceAvailable && (
              <div className="voice-notice" role="status">
                <p>⚠️ {t.teluguVoiceMissing}</p>
                <button
                  type="button"
                  className="read-en-btn"
                  onClick={() => handleListen("en-IN")}
                >
                  🔊 {t.readInEnglish}
                </button>
              </div>
            )}
          </section>

          {/* Expandable Panel: About This Prediction */}
          <details className="about-panel">
            <summary className="about-summary">
              <span>{t.aboutPrediction}</span>
              <span aria-hidden="true">▾</span>
            </summary>
            <div className="about-content">
              <p>
                <strong>{t.modelMethod}</strong>
              </p>

              <div>
                <p>
                  <strong>{t.backtestAccuracy}</strong>
                </p>
                <table className="backtest-table">
                  <thead>
                    <tr>
                      <th>{t.modelMape}</th>
                      <th>{t.naiveMape}</th>
                      <th>{t.beatsNaive}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{forecastData.backtest.modelMAPE.toFixed(2)}%</td>
                      <td>{forecastData.backtest.naiveMAPE.toFixed(2)}%</td>
                      <td>
                        {forecastData.backtest.beatsNaive ? t.yes : t.no}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                <strong>Data Source:</strong> {forecastData.dataSource}
              </p>

              <div className="disclaimer-line">
                {t.guideNotGuarantee}
              </div>
            </div>
          </details>
        </article>
      )}
    </>
  );
}

/**
 * Hand-written SVG line chart component (No external chart libraries)
 * Renders last 26 weeks actual solid line + 4-week forecast dashed line + shaded band
 */
function SvgPriceChart({
  history,
  forecast,
  lang,
}: {
  history: { week_start: string; price: number }[];
  forecast: {
    week: number;
    week_start: string;
    point: number;
    lower: number;
    upper: number;
  }[];
  lang: Language;
}) {
  // Use last 26 weeks for crisp mobile visibility
  const recentHistory = history.slice(-26);
  const totalPoints = recentHistory.length + forecast.length; // 26 + 4 = 30 points

  // Compute min and max across all series
  const allValues: number[] = [
    ...recentHistory.map((h) => h.price),
    ...forecast.map((f) => f.upper),
    ...forecast.map((f) => f.lower),
    ...forecast.map((f) => f.point),
  ];

  const minVal = Math.max(0, Math.floor(Math.min(...allValues) * 0.9));
  const maxVal = Math.ceil(Math.max(...allValues) * 1.1);

  const width = 640;
  const height = 240;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (idx / (totalPoints - 1)) * plotW;

  const getY = (val: number) => {
    const range = maxVal - minVal || 1;
    return padTop + plotH - ((val - minVal) / range) * plotH;
  };

  // Build History Path (solid line)
  const historyPoints = recentHistory.map((h, i) => ({
    x: getX(i),
    y: getY(h.price),
  }));

  const historyPathD = historyPoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
    ""
  );

  // Connection point: last history point
  const lastHistoryIdx = recentHistory.length - 1;
  const lastHistPt = historyPoints[lastHistoryIdx];

  // Forecast path points (originating from last history point)
  const forecastPoints = [
    lastHistPt,
    ...forecast.map((f, i) => ({
      x: getX(recentHistory.length + i),
      y: getY(f.point),
    })),
  ];

  const forecastPathD = forecastPoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
    ""
  );

  // Forecast Shaded Band (Polygon)
  const upperPoints = [
    lastHistPt,
    ...forecast.map((f, i) => ({
      x: getX(recentHistory.length + i),
      y: getY(f.upper),
    })),
  ];

  const lowerPoints = [
    ...forecast
      .map((f, i) => ({
        x: getX(recentHistory.length + i),
        y: getY(f.lower),
      }))
      .reverse(),
    lastHistPt,
  ];

  const bandPoints = [...upperPoints, ...lowerPoints];
  const bandPathD = bandPoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
    ""
  ) + " Z";

  // Gridlines
  const yTicks = [
    minVal,
    Math.round(minVal + (maxVal - minVal) * 0.33),
    Math.round(minVal + (maxVal - minVal) * 0.66),
    maxVal,
  ];

  const latestPrice = recentHistory[recentHistory.length - 1]?.price || 0;
  const nextPrice = forecast[0]?.point || 0;

  const srSummary =
    lang === "te"
      ? `గత 26 వారాల అసలు ధర ₹${minVal} నుండి ₹${maxVal} వరకు ఉంది. ప్రస్తుత ధర ₹${latestPrice.toFixed(
          2
        )}. వచ్చే వారం అంచనా ధర ₹${nextPrice.toFixed(2)}.`
      : `Price chart: past 26-week range between ₹${minVal} and ₹${maxVal}. Latest price is ₹${latestPrice.toFixed(
          2
        )}. Next week projected price is ₹${nextPrice.toFixed(2)}.`;

  return (
    <>
      <p className="sr-only">{srSummary}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={TRANSLATIONS[lang].chartSrDescription}
      >
        <title>{TRANSLATIONS[lang].priceChartTitle}</title>
        <desc>{srSummary}</desc>

        {/* Y Gridlines and Labels */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748b"
                fontWeight="500"
              >
                ₹{tick}
              </text>
            </g>
          );
        })}

        {/* Shaded Forecast Interval Band */}
        <path
          d={bandPathD}
          fill="rgba(234, 88, 12, 0.16)"
          stroke="#fed7aa"
          strokeWidth="1"
        />

        {/* Solid Line: History */}
        <path
          d={historyPathD}
          fill="none"
          stroke="#0f766e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dashed Line: Forecast */}
        <path
          d={forecastPathD}
          fill="none"
          stroke="#ea580c"
          strokeWidth="3"
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Key Data Point Dots */}
        {/* Latest Actual Dot */}
        <circle
          cx={lastHistPt.x}
          cy={lastHistPt.y}
          r="5"
          fill="#0f766e"
          stroke="#ffffff"
          strokeWidth="2"
        />
        {/* Forecast Dots */}
        {forecast.map((f, i) => {
          const ptX = getX(recentHistory.length + i);
          const ptY = getY(f.point);
          return (
            <circle
              key={i}
              cx={ptX}
              cy={ptY}
              r={i === 0 ? "5" : "4"}
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}

        {/* X-axis labels */}
        <text
          x={padLeft}
          y={height - 12}
          textAnchor="start"
          fontSize="12"
          fill="#64748b"
          fontWeight="500"
        >
          {lang === "te" ? "-26 వారాలు" : "-26 wks"}
        </text>

        <text
          x={lastHistPt.x}
          y={height - 12}
          textAnchor="middle"
          fontSize="12"
          fill="#0f766e"
          fontWeight="700"
        >
          {lang === "te" ? "ప్రస్తుతం" : "Now"}
        </text>

        <text
          x={width - padRight}
          y={height - 12}
          textAnchor="end"
          fontSize="12"
          fill="#ea580c"
          fontWeight="700"
        >
          +4 {lang === "te" ? "వారాలు" : "wks"}
        </text>
      </svg>
    </>
  );
}
