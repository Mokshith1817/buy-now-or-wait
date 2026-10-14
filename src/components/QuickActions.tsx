/**
 * @file QuickActions.tsx
 * @description Quick action controls providing 1-click example selection and optional speech recognition microphone search.
 */

"use client";

import React from "react";

interface QuickActionsProps {
  tryExampleText: string;
  onTryExample: () => void;
  speechRecognitionSupported: boolean;
  isListeningMic: boolean;
  listeningText: string;
  speakNowText: string;
  onMicClick: () => void;
}

export function QuickActions({
  tryExampleText,
  onTryExample,
  speechRecognitionSupported,
  isListeningMic,
  listeningText,
  speakNowText,
  onMicClick,
}: QuickActionsProps) {
  return (
    <section className="action-row" aria-label="Quick actions">
      <button
        type="button"
        className="try-example-btn"
        onClick={onTryExample}
      >
        <span aria-hidden="true">🍅</span>
        <span>{tryExampleText}</span>
      </button>

      {speechRecognitionSupported && (
        <button
          type="button"
          className={`mic-btn ${isListeningMic ? "active" : ""}`}
          onClick={onMicClick}
          aria-label={isListeningMic ? listeningText : speakNowText}
        >
          <span aria-hidden="true">{isListeningMic ? "🔴" : "🎤"}</span>
          <span>{isListeningMic ? listeningText : speakNowText}</span>
        </button>
      )}
    </section>
  );
}
