import { describe, it, expect } from "vitest";
import { TRANSLATIONS, ITEMS, TranslationKey } from "@/lib/i18n";

describe("i18n Language Integrity", () => {
  it("every key exists in both te and en (no missing strings)", () => {
    const enKeys = Object.keys(TRANSLATIONS.en) as TranslationKey[];
    const teKeys = Object.keys(TRANSLATIONS.te) as TranslationKey[];

    expect(enKeys.sort()).toEqual(teKeys.sort());

    for (const key of enKeys) {
      expect(TRANSLATIONS.en[key]).toBeTruthy();
      expect(typeof TRANSLATIONS.en[key]).toBe("string");
      expect(TRANSLATIONS.en[key].trim().length).toBeGreaterThan(0);

      expect(TRANSLATIONS.te[key]).toBeTruthy();
      expect(typeof TRANSLATIONS.te[key]).toBe("string");
      expect(TRANSLATIONS.te[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("contains EXACT required Telugu strings per specification", () => {
    expect(TRANSLATIONS.te.appName).toBe("కొనాలా? ఆగాలా?");
    expect(TRANSLATIONS.te.buyNow).toBe("ఇప్పుడే కొనండి");
    expect(TRANSLATIONS.te.wait).toBe("ఆగండి, ధర తగ్గవచ్చు");
    expect(TRANSLATIONS.te.buyLittle).toBe("కొద్దిగా మాత్రమే కొనండి");
    expect(TRANSLATIONS.te.why).toBe("ఎందుకు?");
    expect(TRANSLATIONS.te.confidence).toBe("నమ్మకం");
    expect(TRANSLATIONS.te.confidenceLow).toBe("తక్కువ");
    expect(TRANSLATIONS.te.confidenceMedium).toBe("మధ్యస్థం");
    expect(TRANSLATIONS.te.confidenceHigh).toBe("ఎక్కువ");
    expect(TRANSLATIONS.te.next7Days).toBe("వచ్చే 7 రోజులు");
    expect(TRANSLATIONS.te.listen).toBe("వినండి");
    expect(TRANSLATIONS.te.tryExample).toBe("ఉదాహరణ చూడండి");
    expect(TRANSLATIONS.te.demoDataBanner).toBe("ఇది డెమో డేటా (నమూనా) - నిజమైన మార్కెట్ ధరలు కాదు");
    expect(TRANSLATIONS.te.guideNotGuarantee).toBe("ఇది ఒక అంచనా మాత్రమే, హామీ కాదు.");
    expect(TRANSLATIONS.te.generalGuidance).toBe("సాధారణ సూచన");
    expect(TRANSLATIONS.te.source).toBe("మూలం");
  });

  it("contains all 8 items with exact Telugu and English names", () => {
    expect(ITEMS.length).toBe(8);

    const expectedItems = [
      { id: "tomato", name_en: "Tomato", name_te: "టమాటా" },
      { id: "onion", name_en: "Onion", name_te: "ఉల్లిపాయ" },
      { id: "potato", name_en: "Potato", name_te: "బంగాళదుంప" },
      { id: "brinjal", name_en: "Brinjal", name_te: "వంకాయ" },
      { id: "okra", name_en: "Okra", name_te: "బెండకాయ" },
      { id: "green_chilli", name_en: "Green Chilli", name_te: "పచ్చిమిర్చి" },
      { id: "cabbage", name_en: "Cabbage", name_te: "క్యాబేజీ" },
      { id: "carrot", name_en: "Carrot", name_te: "క్యారెట్" },
    ];

    for (const exp of expectedItems) {
      const found = ITEMS.find((i) => i.id === exp.id);
      expect(found).toBeDefined();
      expect(found?.name_en.toLowerCase()).toBe(exp.name_en.toLowerCase());
      expect(found?.name_te).toBe(exp.name_te);
      expect(found?.emoji).toBeTruthy();
    }
  });
});
