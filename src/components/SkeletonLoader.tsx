/**
 * @file SkeletonLoader.tsx
 * @description Accessible animated shimmer placeholder for asynchronous result loading.
 */

"use client";

import React from "react";

export function SkeletonLoader() {
  return (
    <div className="result-card" aria-busy="true" aria-label="Loading prediction results">
      <div className="skeleton-box" style={{ height: "70px" }} />
      <div className="skeleton-box" style={{ height: "90px" }} />
      <div className="skeleton-box" style={{ height: "200px" }} />
      <div className="skeleton-box" style={{ height: "120px" }} />
    </div>
  );
}
