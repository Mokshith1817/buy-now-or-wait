/**
 * @file useAdvice.ts
 * @description Custom React hook managing asynchronous fetching and state for commodity forecasts and buying advice.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Language, ForecastApiResponse, AdviceApiResponse } from "@/lib/types";

export interface UseAdviceReturn {
  forecastData: ForecastApiResponse | null;
  adviceData: AdviceApiResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetches forecast and advice data for the given commodity and language.
 *
 * @param selectedItem Identifier of chosen vegetable.
 * @param lang Current user interface language.
 * @param retryErrorMessage Localized error message to display on fetch failure.
 * @returns State object containing forecastData, adviceData, loading, error, and reload callback.
 */
export function useAdvice(
  selectedItem: string,
  lang: Language,
  retryErrorMessage: string
): UseAdviceReturn {
  const [forecastData, setForecastData] = useState<ForecastApiResponse | null>(null);
  const [adviceData, setAdviceData] = useState<AdviceApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [forecastRes, adviceRes] = await Promise.all([
        fetch(`/api/forecast?item=${encodeURIComponent(selectedItem)}`),
        fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: selectedItem, lang }),
        }),
      ]);

      if (!forecastRes.ok || !adviceRes.ok) {
        throw new Error("API request failed");
      }

      const fcJson: ForecastApiResponse = await forecastRes.json();
      const adJson: AdviceApiResponse = await adviceRes.json();

      setForecastData(fcJson);
      setAdviceData(adJson);
    } catch {
      setError(retryErrorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedItem, lang, retryErrorMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    forecastData,
    adviceData,
    loading,
    error,
    reload: fetchData,
  };
}
