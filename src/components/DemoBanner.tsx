/**
 * @file DemoBanner.tsx
 * @description Notification banner indicating synthetic demo data to ensure user honesty.
 */

"use client";

import React from "react";

interface DemoBannerProps {
  isVisible: boolean;
  message: string;
}

export function DemoBanner({ isVisible, message }: DemoBannerProps) {
  if (!isVisible) return null;

  return (
    <section className="demo-banner" role="status" aria-label="Demo data disclosure">
      <span className="banner-icon" aria-hidden="true">
        ℹ️
      </span>
      <span>{message}</span>
    </section>
  );
}
