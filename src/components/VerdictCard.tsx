/**
 * @file VerdictCard.tsx
 * @description Primary result card orchestrating the colored verdict badge, stats, interactive chart, explanation, and voice controls.
 */

"use client";

import React from "react";
import { Language, ForecastApiResponse, AdviceApiResponse } from "@/lib/types";
import { PriceStats } from "./PriceStats";
import { PriceChart } from "./PriceChart";
import { ReasonsList } from "./ReasonsList";
import { VoiceControls } from "./VoiceControls";
import { AboutPrediction } from "./AboutPrediction";

interface VerdictCardProps {
  lang: Language;
  forecastData: ForecastApiResponse;
  adviceData: AdviceApiResponse;
  t: {
    buyNow: string;
    wait: string;
    buyLittle: string;
    next7Days: string;
    currentPrice: string;
    predictedPrice: string;
    confidence: string;
    confidenceHigh: string;
    confidenceMedium: string;
    confidenceLow: string;
    perKg: string;
    priceChartTitle: string;
    chartSrDescription: string;
    why: string;
    source: string;
    generalGuidance: string;
    listen: string;
    teluguVoiceMissing: string;
    readInEnglish: string;
    aboutPrediction: string;
    modelMethod: string;
    backtestAccuracy: string;
    modelMape: string;
    naiveMape: string;
    beatsNaive: string;
    yes: string;
    no: string;
    guideNotGuarantee: string;
  };
  isSpeaking: boolean;
  teluguVoiceAvailable: boolean;
  onListen: (forceLang?: "en-IN" | "te-IN") => void;
}

export function VerdictCard({
  lang,
  forecastData,
  adviceData,
  t,
  isSpeaking,
  teluguVoiceAvailable,
  onListen,
}: VerdictCardProps) {
  const getVerdictWord = () => {
    switch (adviceData.verdict) {
      case "BUY_NOW":
        return t.buyNow;
      case "WAIT":
        return t.wait;
      case "BUY_LITTLE":
        return t.buyLittle;
    }
  };

  const getConfidenceText = () => {
    switch (adviceData.confidence) {
      case "High":
        return t.confidenceHigh;
      case "Medium":
        return t.confidenceMedium;
      case "Low":
        return t.confidenceLow;
    }
  };

  return (
    <article className="result-card" aria-live="polite" aria-atomic="true">
      {/* Big Colored Verdict Banner */}
      <div className={`verdict-banner verdict-${adviceData.verdict}`}>
        <div className="verdict-main">
          <span className="verdict-icon" aria-hidden="true">
            {adviceData.verdict === "BUY_NOW" && "🟢 🛒"}
            {adviceData.verdict === "WAIT" && "🛑 ⏳"}
            {adviceData.verdict === "BUY_LITTLE" && "⚖️ 🤏"}
          </span>
          <span className="verdict-word">{getVerdictWord()}</span>
        </div>

        <div className="verdict-change">
          {t.next7Days}: {adviceData.change7 > 0 ? "+" : ""}
          {Math.round(adviceData.change7)}%
        </div>
      </div>

      {/* Numerical Price Stats & Confidence */}
      <PriceStats
        currentPrice={forecastData.latestPrice}
        predictedPrice={forecastData.forecast[0].point}
        confidence={adviceData.confidence}
        currentPriceLabel={t.currentPrice}
        predictedPriceLabel={t.predictedPrice}
        confidenceLabel={t.confidence}
        confidenceText={getConfidenceText()}
        perKgText={t.perKg}
      />

      {/* SVG Price History & Forecast Line Chart */}
      <PriceChart
        history={forecastData.history}
        forecast={forecastData.forecast}
        lang={lang}
        title={t.priceChartTitle}
        chartSrDescription={t.chartSrDescription}
      />

      {/* Why Section with Retrieved Knowledge Notes */}
      <ReasonsList
        whyTitle={t.why}
        explanation={adviceData.explanation}
        reasons={adviceData.reasons}
        sourceLabel={t.source}
        generalGuidanceLabel={t.generalGuidance}
      />

      {/* Text-to-speech Audio Playback */}
      <VoiceControls
        lang={lang}
        isSpeaking={isSpeaking}
        listenText={t.listen}
        teluguVoiceAvailable={teluguVoiceAvailable}
        teluguVoiceMissingNotice={t.teluguVoiceMissing}
        readInEnglishText={t.readInEnglish}
        onListen={onListen}
      />

      {/* Expandable Model Methodology & Honest Backtest Disclosure */}
      <AboutPrediction
        summaryTitle={t.aboutPrediction}
        modelMethodText={t.modelMethod}
        backtestAccuracyText={t.backtestAccuracy}
        modelMapeLabel={t.modelMape}
        naiveMapeLabel={t.naiveMape}
        beatsNaiveLabel={t.beatsNaive}
        yesText={t.yes}
        noText={t.no}
        backtest={forecastData.backtest}
        dataSource={forecastData.dataSource}
        disclaimerText={t.guideNotGuarantee}
      />
    </article>
  );
}
