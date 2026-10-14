/**
 * @file ReasonsList.tsx
 * @description Grounded RAG explanation display and retrieved reasons list with source citations.
 */

"use client";

import React from "react";
import { RetrievedReason } from "@/lib/types";

interface ReasonsListProps {
  whyTitle: string;
  explanation: string;
  reasons: RetrievedReason[];
  sourceLabel: string;
  generalGuidanceLabel: string;
}

export function ReasonsList({
  whyTitle,
  explanation,
  reasons,
  sourceLabel,
  generalGuidanceLabel,
}: ReasonsListProps) {
  return (
    <section className="why-section" aria-label="Explanation and rationale">
      <h2 className="why-header">
        <span aria-hidden="true">💡</span>
        <span>{whyTitle}</span>
      </h2>

      <p className="explanation-text">{explanation}</p>

      <div className="reasons-list">
        {reasons.map((reason, idx) => (
          <div key={idx} className="reason-item">
            <span className="reason-title">{reason.title}</span>
            <div className="reason-meta">
              {reason.verified ? (
                <>
                  <span className="source-tag">
                    {sourceLabel}: {reason.source}
                  </span>
                  {reason.source_url && reason.source_url.startsWith("http") && (
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
                  ⚠️ {generalGuidanceLabel} ({reason.source})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
