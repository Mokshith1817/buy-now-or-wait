/**
 * @file LanguageToggle.tsx
 * @description Language switcher button toggling between Telugu and English.
 */

"use client";

import React from "react";
import { Language } from "@/lib/types";

interface LanguageToggleProps {
  currentLang: Language;
  onToggle: () => void;
}

export function LanguageToggle({ currentLang, onToggle }: LanguageToggleProps) {
  return (
    <button
      type="button"
      className="lang-toggle-btn"
      onClick={onToggle}
      aria-label={currentLang === "te" ? "Switch to English" : "తెలుగులోకి మార్చండి"}
    >
      🌐 {currentLang === "te" ? "English" : "తెలుగు"}
    </button>
  );
}
