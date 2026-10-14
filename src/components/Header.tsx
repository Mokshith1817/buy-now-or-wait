/**
 * @file Header.tsx
 * @description Accessible header section containing app title, tagline, and language switcher.
 */

"use client";

import React from "react";
import { Language } from "@/lib/types";
import { LanguageToggle } from "./LanguageToggle";

interface HeaderProps {
  appName: string;
  tagline: string;
  lang: Language;
  onToggleLang: () => void;
}

export function Header({ appName, tagline, lang, onToggleLang }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <h1 className="app-title">{appName}</h1>
        <p className="app-tagline">{tagline}</p>
      </div>
      <LanguageToggle currentLang={lang} onToggle={onToggleLang} />
    </header>
  );
}
