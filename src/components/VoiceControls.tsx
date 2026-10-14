/**
 * @file VoiceControls.tsx
 * @description Accessible text-to-speech voice controls and fallback notices for devices lacking native language packs.
 */

"use client";

import React from "react";
import { Language } from "@/lib/types";

interface VoiceControlsProps {
  lang: Language;
  isSpeaking: boolean;
  listenText: string;
  teluguVoiceAvailable: boolean;
  teluguVoiceMissingNotice: string;
  readInEnglishText: string;
  onListen: (forceLang?: "en-IN" | "te-IN") => void;
}

export function VoiceControls({
  lang,
  isSpeaking,
  listenText,
  teluguVoiceAvailable,
  teluguVoiceMissingNotice,
  readInEnglishText,
  onListen,
}: VoiceControlsProps) {
  return (
    <section className="listen-row" aria-label="Audio playback controls">
      <button
        type="button"
        className="listen-btn"
        onClick={() => onListen()}
        aria-label={isSpeaking ? "Stop audio" : listenText}
      >
        <span aria-hidden="true">{isSpeaking ? "⏹️" : "🔊"}</span>
        <span>{isSpeaking ? "Stop" : listenText}</span>
      </button>

      {lang === "te" && !teluguVoiceAvailable && (
        <div className="voice-notice" role="status">
          <p>⚠️ {teluguVoiceMissingNotice}</p>
          <button
            type="button"
            className="read-en-btn"
            onClick={() => onListen("en-IN")}
          >
            🔊 {readInEnglishText}
          </button>
        </div>
      )}
    </section>
  );
}
