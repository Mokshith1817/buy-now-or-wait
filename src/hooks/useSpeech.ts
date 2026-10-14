/**
 * @file useSpeech.ts
 * @description Custom React hook managing SpeechSynthesis (voice read aloud) and SpeechRecognition (voice search).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Language } from "@/lib/types";

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

export interface UseSpeechReturn {
  isSpeaking: boolean;
  isListeningMic: boolean;
  speechRecognitionSupported: boolean;
  teluguVoiceAvailable: boolean;
  speakText: (text: string, forceLang?: "en-IN" | "te-IN") => void;
  startVoiceSearch: (onMatch: (spokenText: string) => void) => void;
}

/**
 * Manages speech synthesis audio read-aloud and voice recognition microphone input.
 *
 * @param lang Current UI language.
 * @returns State and controller functions for voice synthesis and voice search.
 */
export function useSpeech(lang: Language): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState<boolean>(false);
  const [teluguVoiceAvailable, setTeluguVoiceAvailable] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("speechSynthesis" in window) {
      const checkVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const hasTe = voices.some((v) => v.lang.toLowerCase().includes("te"));
          setTeluguVoiceAvailable(hasTe);
        }
      };

      checkVoices();
      window.speechSynthesis.onvoiceschanged = checkVoices;
    }

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const hasRecognition = Boolean(
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition
    );
    setSpeechRecognitionSupported(hasRecognition);
  }, []);

  const speakText = useCallback(
    (text: string, forceLang?: "en-IN" | "te-IN") => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      if (!text) return;

      const targetLangCode = forceLang || (lang === "te" ? "te-IN" : "en-IN");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLangCode;
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.lang.toLowerCase().includes(targetLangCode.slice(0, 2)));
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, lang]
  );

  const startVoiceSearch = useCallback(
    (onMatch: (spokenText: string) => void) => {
      if (typeof window === "undefined") return;

      const windowWithSpeech = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };

      const RecognitionConstructor =
        windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

      if (!RecognitionConstructor) return;

      try {
        const recognition = new RecognitionConstructor();
        recognition.lang = lang === "te" ? "te-IN" : "en-IN";
        recognition.continuous = false;
        recognition.interimResults = false;

        setIsListeningMic(true);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          setIsListeningMic(false);
          const transcript = event.results[0]?.[0]?.transcript?.toLowerCase()?.trim() || "";
          if (transcript) {
            onMatch(transcript);
          }
        };

        recognition.onerror = () => setIsListeningMic(false);
        recognition.onend = () => setIsListeningMic(false);

        recognition.start();
      } catch {
        setIsListeningMic(false);
      }
    },
    [lang]
  );

  return {
    isSpeaking,
    isListeningMic,
    speechRecognitionSupported,
    teluguVoiceAvailable,
    speakText,
    startVoiceSearch,
  };
}
