/**
 * @file i18n.ts
 * @description Bilingual localization dictionaries (Telugu & English), commodity metadata, and audience persona definitions.
 */

import { Language, ItemDefinition, TargetPersona } from "./types";

export type { Language, ItemDefinition, TargetPersona };

/**
 * Metadata definition for 8 tracked essential vegetable commodities.
 */
export const ITEMS: ItemDefinition[] = [
  {
    id: "tomato",
    name_en: "Tomato",
    name_te: "టమాటా",
    emoji: "🍅",
    keywords: ["tomato", "tamata", "tamatar", "టమాటా", "టమోటా"],
  },
  {
    id: "onion",
    name_en: "Onion",
    name_te: "ఉల్లిపాయ",
    emoji: "🧅",
    keywords: ["onion", "ullipaya", "ulli", "pyaz", "ఉల్లిపాయ", "ఉల్లి"],
  },
  {
    id: "potato",
    name_en: "Potato",
    name_te: "బంగాళదుంప",
    emoji: "🥔",
    keywords: ["potato", "bangaladumpa", "aloo", "బంగాళదుంప", "ఆలూ"],
  },
  {
    id: "brinjal",
    name_en: "Brinjal",
    name_te: "వంకాయ",
    emoji: "🍆",
    keywords: ["brinjal", "eggplant", "vankaya", "baingan", "వంకాయ"],
  },
  {
    id: "okra",
    name_en: "Okra",
    name_te: "బెండకాయ",
    emoji: "🥬",
    keywords: ["okra", "bendakaya", "bhindi", "ladies finger", "బెండకాయ"],
  },
  {
    id: "green_chilli",
    name_en: "Green Chilli",
    name_te: "పచ్చిమిర్చి",
    emoji: "🌶️",
    keywords: ["green chilli", "pachimiri", "pachimirchi", "mirchi", "hari mirch", "పచ్చిమిర్చి", "మిర్చి"],
  },
  {
    id: "cabbage",
    name_en: "Cabbage",
    name_te: "క్యాబేజీ",
    emoji: "🥗",
    keywords: ["cabbage", "kyabeji", "patta gobhi", "క్యాబేజీ"],
  },
  {
    id: "carrot",
    name_en: "Carrot",
    name_te: "క్యారెట్",
    emoji: "🥕",
    keywords: ["carrot", "kyaret", "gajar", "క్యారెట్"],
  },
];

/** Allowlist of supported item identifiers for fast validation. */
export const VALID_ITEM_IDS = new Set<string>(ITEMS.map((item) => item.id));

/**
 * 5 Audience Persona definitions for the "Who is this for?" section.
 * Aligns directly with the problem statement and community impact goals.
 */
export const TARGET_PERSONAS: TargetPersona[] = [
  {
    id: "homemakers",
    emoji: "👩‍🍳",
    title_en: "Homemakers",
    title_te: "గృహిణులు",
    benefit_en: "Weekly budget planning",
    benefit_te: "వారపు బడ్జెట్ ప్లాన్ చేసుకోవడానికి",
  },
  {
    id: "elderly",
    emoji: "👴",
    title_en: "Elderly people",
    title_te: "వృద్ధులు",
    benefit_en: "One clear answer with voice",
    benefit_te: "ఒకే స్పష్టమైన సమాధానం, వినే సౌకర్యం",
  },
  {
    id: "students",
    emoji: "🎓",
    title_en: "Students",
    title_te: "విద్యార్థులు",
    benefit_en: "Shopping on a small budget",
    benefit_te: "తక్కువ బడ్జెట్లో కొనుగోలు",
  },
  {
    id: "working_families",
    emoji: "👨‍👩‍👧",
    title_en: "Working families",
    title_te: "ఉద్యోగ కుటుంబాలు",
    benefit_en: "Quick decisions",
    benefit_te: "త్వరగా నిర్ణయం తీసుకోవడానికి",
  },
  {
    id: "vendors",
    emoji: "🏪",
    title_en: "Small vendors",
    title_te: "చిన్న వ్యాపారులు",
    benefit_en: "See price trends",
    benefit_te: "ధరల ధోరణి తెలుసుకోవడానికి",
  },
];

/**
 * Complete bilingual translations for UI copy.
 */
export const TRANSLATIONS = {
  te: {
    appName: "కొనాలా? ఆగాలా?",
    tagline: "సాధారణ కుటుంబాల కోసం కూరగాయల ధరల సూచన",
    buyNow: "ఇప్పుడే కొనండి",
    wait: "ఆగండి, ధర తగ్గవచ్చు",
    buyLittle: "కొద్దిగా మాత్రమే కొనండి",
    why: "ఎందుకు?",
    confidence: "నమ్మకం",
    confidenceLow: "తక్కువ",
    confidenceMedium: "మధ్యస్థం",
    confidenceHigh: "ఎక్కువ",
    next7Days: "వచ్చే 7 రోజులు",
    listen: "వినండి",
    listening: "వింటోంది...",
    speakNow: "కూరగాయ పేరు చెప్పండి (ఉదా: టమాటా)",
    tryExample: "ఉదాహరణ చూడండి",
    demoDataBanner: "ఇది డెమో డేటా (నమూనా) - నిజమైన మార్కెట్ ధరలు కాదు",
    aboutPrediction: "ఈ అంచనా గురించి",
    guideNotGuarantee: "ఇది ఒక అంచనా మాత్రమే, హామీ కాదు.",
    generalGuidance: "సాధారణ సూచన",
    source: "మూలం",
    tapToRetry: "లోడ్ చేయడం సాధ్యం కాలేదు. మళ్లీ ప్రయత్నించడానికి నొక్కండి",
    teluguVoiceMissing: "ఈ పరికరంలో తెలుగు వాయిస్ లేదు - వచనం చూపబడుతోంది.",
    readInEnglish: "ఇంగ్లీషులో వినండి",
    currentPrice: "ప్రస్తుత ధర",
    predictedPrice: "వచ్చే వారం అంచనా",
    modelMethod: "పద్ధతి: హోల్ట్-వింటర్స్ సంకలన నమూనా (52 వారాల కాలానుగుణత)",
    backtestAccuracy: "గత 12 వారాల సగటు లోపం (MAPE)",
    modelMape: "మోడల్ లోపం",
    naiveMape: "సాధారణ ఆధారం (గత వారం ధర)",
    beatsNaive: "సాధారణ ఆధారం కంటే మెరుగైనదా?",
    yes: "అవును",
    no: "కాదు",
    perKg: "కిలో",
    weeks: "వారాలు",
    priceChartTitle: "ధర చరిత్ర మరియు 4 వారాల అంచనా",
    chartSrDescription: "గత 26 వారాల అసలు ధరలు మరియు రాబోయే 4 వారాల పరిధి అంచనా గ్రాఫ్",
    priceTrendUp: "ధర పెరగవచ్చు",
    priceTrendDown: "ధర తగ్గవచ్చు",
    priceTrendStable: "ధర స్థిరంగా ఉండవచ్చు",
    lowConfidenceNotice: "నమ్మకం తక్కువగా ఉన్నందున కొద్దిగా మాత్రమే కొనడం శ్రేయస్కరం.",
    loading: "అంచనా వేస్తోంది...",
    whoIsThisFor: "ఇది ఎవరికి ఉపయోగం?",
    whoIsThisForSubtitle: "రోజువారీ ఖర్చులను నియంత్రించుకోవడానికి ప్రతి కుటుంబానికి సహాయకారి",
  },
  en: {
    appName: "Buy Now or Wait",
    tagline: "Vegetable price guidance for ordinary families",
    buyNow: "Buy now",
    wait: "Wait",
    buyLittle: "Buy a little",
    why: "Why?",
    confidence: "Confidence",
    confidenceLow: "Low",
    confidenceMedium: "Medium",
    confidenceHigh: "High",
    next7Days: "Next 7 days",
    listen: "Listen",
    listening: "Listening...",
    speakNow: "Say a vegetable name (e.g. Tomato)",
    tryExample: "Try an example",
    demoDataBanner: "Demo data (synthetic sample) - not real market prices",
    aboutPrediction: "About this prediction",
    guideNotGuarantee: "This is a guide, not a guarantee.",
    generalGuidance: "General guidance",
    source: "Source",
    tapToRetry: "Could not load. Tap to retry",
    teluguVoiceMissing: "Telugu voice is not installed on this device - text is shown instead.",
    readInEnglish: "Listen in English",
    currentPrice: "Current price",
    predictedPrice: "Next week forecast",
    modelMethod: "Method: Holt-Winters Additive model (52-week seasonality)",
    backtestAccuracy: "12-week backtest accuracy (MAPE)",
    modelMape: "Model MAPE",
    naiveMape: "Naive baseline (last week price)",
    beatsNaive: "Beats naive baseline?",
    yes: "Yes",
    no: "No",
    perKg: "per kg",
    weeks: "weeks",
    priceChartTitle: "Price history and 4-week forecast",
    chartSrDescription: "Line chart of last 26 weeks actual prices and 4 weeks forecasted range",
    priceTrendUp: "Price may rise",
    priceTrendDown: "Price may ease",
    priceTrendStable: "Price may stay stable",
    lowConfidenceNotice: "Confidence is low, so buying a little is safer.",
    loading: "Forecasting...",
    whoIsThisFor: "Who is this for?",
    whoIsThisForSubtitle: "Practical price intelligence helping everyday households plan better",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;
