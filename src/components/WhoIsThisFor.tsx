/**
 * @file WhoIsThisFor.tsx
 * @description Accessible 5-card persona section explaining community benefits for homemakers, elderly, students, families, and vendors.
 */

"use client";

import React from "react";
import { Language } from "@/lib/types";
import { TARGET_PERSONAS } from "@/lib/i18n";

interface WhoIsThisForProps {
  lang: Language;
  title: string;
  subtitle: string;
}

export function WhoIsThisFor({ lang, title, subtitle }: WhoIsThisForProps) {
  return (
    <section className="who-section" aria-labelledby="who-heading">
      <div className="who-header">
        <h2 id="who-heading" className="who-title">
          <span>👥</span>
          <span>{title}</span>
        </h2>
        <p className="who-subtitle">{subtitle}</p>
      </div>

      <div className="who-grid" role="list">
        {TARGET_PERSONAS.map((persona) => {
          const isTe = lang === "te";
          const primaryTitle = isTe ? persona.title_te : persona.title_en;
          const secondaryTitle = isTe ? persona.title_en : persona.title_te;
          const benefit = isTe ? persona.benefit_te : persona.benefit_en;

          return (
            <div key={persona.id} className="who-card" role="listitem">
              <span className="who-emoji" aria-hidden="true">
                {persona.emoji}
              </span>
              <div className="who-card-content">
                <div className="who-card-titles">
                  <h3 className="who-card-title">{primaryTitle}</h3>
                  <span className="who-card-subtitle">{secondaryTitle}</span>
                </div>
                <p className="who-card-benefit">{benefit}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
