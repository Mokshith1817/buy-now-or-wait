import { describe, it, expect } from "vitest";
import { retrieveRelevantNotes, loadAllNotes } from "@/lib/rag";

describe("RAG Engine", () => {
  it("loads exactly 10 curated markdown notes", () => {
    const notes = loadAllNotes();
    expect(notes.length).toBe(10);

    for (const note of notes) {
      expect(note.title).toBeTruthy();
      expect(note.source).toBeTruthy();
      expect(note.source_url).toBeTruthy();
      expect(typeof note.verified).toBe("boolean");
      expect(note.content).toBeTruthy();
    }
  });

  it("query for onion+rain+up returns the Nashik note in the top 3", () => {
    const results = retrieveRelevantNotes({
      item: "onion",
      direction: "up",
      extraQuery: "rain",
      month: 6, // July (rainy season)
    });

    expect(results.length).toBe(3);
    const titles = results.map((r) => r.title.toLowerCase());
    const hasNashik = titles.some((t) => t.includes("nashik") || t.includes("rainfall"));
    expect(hasNashik).toBe(true);

    const nashikNote = results.find(
      (r) => r.title.toLowerCase().includes("nashik") || r.title.toLowerCase().includes("rainfall")
    );
    expect(nashikNote).toBeDefined();
    expect(nashikNote?.verified).toBe(true);
    expect(nashikNote?.source).toContain("RBI");
  });

  it("gracefully handles unknown item without error and returns 3 valid notes", () => {
    const results = retrieveRelevantNotes({
      item: "unknown_vegetable_xyz",
      direction: "up",
    });

    expect(results).toBeDefined();
    expect(results.length).toBe(3);
    for (const r of results) {
      expect(r.title).toBeTruthy();
      expect(r.source).toBeTruthy();
      expect(typeof r.verified).toBe("boolean");
    }
  });
});
