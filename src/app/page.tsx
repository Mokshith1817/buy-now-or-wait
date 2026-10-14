/**
 * @file page.tsx
 * @description Root application view wiring modular components and reactive hooks for price forecasting and purchase advice.
 */

"use client";

import React, { useState } from "react";
import { Language } from "@/lib/types";
import { ITEMS, TRANSLATIONS } from "@/lib/i18n";
import { useAdvice } from "@/hooks/useAdvice";
import { useSpeech } from "@/hooks/useSpeech";
import { Header } from "@/components/Header";
import { DemoBanner } from "@/components/DemoBanner";
import { WhoIsThisFor } from "@/components/WhoIsThisFor";
import { QuickActions } from "@/components/QuickActions";
import { ItemGrid } from "@/components/ItemGrid";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { VerdictCard } from "@/components/VerdictCard";

export default function Home() {
  // Default language is strictly Telugu on first load
  const [lang, setLang] = useState<Language>("te");
  const [selectedItem, setSelectedItem] = useState<string>("tomato");

  const t = TRANSLATIONS[lang];

  // Custom data fetching hook
  const { forecastData, adviceData, loading, error, reload } = useAdvice(
    selectedItem,
    lang,
    t.tapToRetry
  );

  // Custom audio playback and voice search hook
  const {
    isSpeaking,
    isListeningMic,
    speechRecognitionSupported,
    teluguVoiceAvailable,
    speakText,
    startVoiceSearch,
  } = useSpeech(lang);

  const handleToggleLang = () => {
    setLang((prev) => (prev === "te" ? "en" : "te"));
  };

  const handleMicSearch = () => {
    startVoiceSearch((spokenText) => {
      const matched = ITEMS.find((it) =>
        it.keywords.some((kw) => spokenText.includes(kw.toLowerCase()))
      );
      if (matched) {
        setSelectedItem(matched.id);
      }
    });
  };

  const handleListen = (forceLang?: "en-IN" | "te-IN") => {
    if (adviceData?.explanation) {
      speakText(adviceData.explanation, forceLang);
    }
  };

  return (
    <>
      {/* 1. Header with Language Switcher */}
      <Header
        appName={t.appName}
        tagline={t.tagline}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* 2. Synthetic Demo Data Disclosure Banner */}
      <DemoBanner
        isVisible={Boolean(adviceData?.isSynthetic ?? true)}
        message={t.demoDataBanner}
      />

      {/* 3. Community Impact: Who is this for? */}
      <WhoIsThisFor
        lang={lang}
        title={t.whoIsThisFor}
        subtitle={t.whoIsThisForSubtitle}
      />

      {/* 4. Quick Actions: Try Example & Voice Recognition */}
      <QuickActions
        tryExampleText={t.tryExample}
        onTryExample={() => setSelectedItem("tomato")}
        speechRecognitionSupported={speechRecognitionSupported}
        isListeningMic={isListeningMic}
        listeningText={t.listening}
        speakNowText={t.speakNow}
        onMicClick={handleMicSearch}
      />

      {/* 5. Commodity Selector Grid (8 Vegetables) */}
      <ItemGrid
        items={ITEMS}
        selectedItem={selectedItem}
        lang={lang}
        onSelectItem={setSelectedItem}
      />

      {/* 6. Error Feedback State */}
      {error && !loading && (
        <div className="error-box" role="alert">
          <p>{error}</p>
          <button type="button" className="retry-btn" onClick={reload}>
            {t.tapToRetry}
          </button>
        </div>
      )}

      {/* 7. Asynchronous Shimmer Loading State */}
      {loading && <SkeletonLoader />}

      {/* 8. Final Result Card with Verdict, Price Chart, RAG Reasons, Voice, and Backtest Info */}
      {!loading && !error && adviceData && forecastData && (
        <VerdictCard
          lang={lang}
          forecastData={forecastData}
          adviceData={adviceData}
          t={t}
          isSpeaking={isSpeaking}
          teluguVoiceAvailable={teluguVoiceAvailable}
          onListen={handleListen}
        />
      )}
    </>
  );
}
