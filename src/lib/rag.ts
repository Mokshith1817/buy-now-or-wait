/**
 * @file rag.ts
 * @description Retrieval-Augmented Generation engine using TF-IDF vectorization, cosine similarity, and agricultural seasonal boosting.
 */

import fs from "fs";
import path from "path";
import { NoteDoc, RetrievedReason, RagContext, PriceDirection } from "./types";

export type { NoteDoc, RetrievedReason, RagContext, PriceDirection };

let cachedNotes: NoteDoc[] | null = null;

/**
 * Parses front matter and body content from a markdown note file.
 *
 * @param raw Raw markdown file content string.
 * @param filename File basename for fallback identifier.
 * @returns Parsed NoteDoc structure.
 */
export function parseNoteContent(raw: string, filename: string): NoteDoc {
  const parts = raw.split(/^---$/m);
  let frontMatter = "";
  let body = raw;

  if (parts.length >= 3) {
    frontMatter = parts[1];
    body = parts.slice(2).join("---").trim();
  }

  const lines = frontMatter.split("\n");
  let title = filename;
  let items: string[] | "all" = "all";
  let tags: string[] = [];
  let source = "general guidance";
  let source_url = "general market observation";
  let verified = false;

  let parsingListKey: "items" | "tags" | null = null;
  const parsedItemsList: string[] = [];
  const parsedTagsList: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && parsingListKey) {
      const val = trimmed.slice(2).trim().replace(/^["']|["']$/g, "");
      if (parsingListKey === "items") parsedItemsList.push(val);
      if (parsingListKey === "tags") parsedTagsList.push(val);
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const val = trimmed.slice(colonIdx + 1).trim();

      parsingListKey = null;

      if (key === "title") {
        title = val.replace(/^["']|["']$/g, "");
      } else if (key === "items") {
        if (val === "all") {
          items = "all";
        } else if (val.startsWith("[") && val.endsWith("]")) {
          items = val
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
        } else {
          parsingListKey = "items";
        }
      } else if (key === "tags") {
        if (val.startsWith("[") && val.endsWith("]")) {
          tags = val
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
        } else {
          parsingListKey = "tags";
        }
      } else if (key === "source") {
        source = val.replace(/^["']|["']$/g, "");
      } else if (key === "source_url") {
        source_url = val.replace(/^["']|["']$/g, "");
      } else if (key === "verified") {
        verified = val.toLowerCase() === "true";
      }
    }
  }

  if (parsedItemsList.length > 0) items = parsedItemsList;
  if (parsedTagsList.length > 0) tags = parsedTagsList;

  return {
    id: filename.replace(/\.md$/, ""),
    title,
    items,
    tags,
    source,
    source_url,
    verified,
    content: body,
  };
}

/**
 * Loads all curated agricultural markdown notes from docs/notes/.
 *
 * @returns Array of parsed NoteDoc objects.
 */
export function loadAllNotes(): NoteDoc[] {
  if (cachedNotes) return cachedNotes;

  const notesDir = path.resolve(process.cwd(), "docs", "notes");
  if (!fs.existsSync(notesDir)) {
    return [];
  }

  const files = fs.readdirSync(notesDir).filter((f) => f.endsWith(".md"));
  const notes: NoteDoc[] = [];

  for (const f of files) {
    const filePath = path.join(notesDir, f);
    const content = fs.readFileSync(filePath, "utf8");
    notes.push(parseNoteContent(content, f));
  }

  cachedNotes = notes;
  return notes;
}

/**
 * Tokenizes text into lowercase alphanumeric keywords.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Retrieves top K relevant agricultural knowledge notes based on TF-IDF cosine similarity
 * and contextual domain boosting (item match, price direction, rainy season).
 *
 * @param context Query context with item, price direction, and calendar month.
 * @param topK Maximum number of notes to return (default: 3).
 * @returns Array of top K RetrievedReason objects sorted descending by relevance score.
 */
export function retrieveRelevantNotes(
  context: RagContext,
  topK = 3
): RetrievedReason[] {
  const notes = loadAllNotes();
  if (notes.length === 0) return [];

  const docTokens: string[][] = notes.map((doc) => {
    const itemStr = Array.isArray(doc.items) ? doc.items.join(" ") : doc.items;
    const combined = `${doc.title} ${doc.tags.join(" ")} ${itemStr} ${doc.content}`;
    return tokenize(combined);
  });

  const N = notes.length;
  const df = new Map<string, number>();

  for (const tokens of docTokens) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, count] of df.entries()) {
    idf.set(token, Math.log((1 + N) / (1 + count)) + 1.0);
  }

  const docVectors: Map<string, number>[] = docTokens.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    const vec = new Map<string, number>();
    let normSq = 0;
    for (const [t, count] of tf.entries()) {
      const weight = (count / tokens.length) * (idf.get(t) || 1.0);
      vec.set(t, weight);
      normSq += weight * weight;
    }
    const norm = Math.sqrt(normSq) || 1.0;
    for (const [t, weight] of vec.entries()) {
      vec.set(t, weight / norm);
    }
    return vec;
  });

  const queryWords = [
    context.item,
    context.direction === "up" ? "rise increase high" : "",
    context.direction === "down" ? "fall drop ease" : "",
    context.extraQuery || "",
  ].join(" ");
  const queryTokens = tokenize(queryWords);

  const queryTf = new Map<string, number>();
  for (const t of queryTokens) {
    queryTf.set(t, (queryTf.get(t) || 0) + 1);
  }
  const queryVec = new Map<string, number>();
  let qNormSq = 0;
  for (const [t, count] of queryTf.entries()) {
    const weight = (count / Math.max(1, queryTokens.length)) * (idf.get(t) || 1.0);
    queryVec.set(t, weight);
    qNormSq += weight * weight;
  }
  const qNorm = Math.sqrt(qNormSq) || 1.0;
  for (const [t, weight] of queryVec.entries()) {
    queryVec.set(t, weight / qNorm);
  }

  const month = context.month ?? new Date().getUTCMonth();
  const isRainySeason = month >= 5 && month <= 9; // June to October monsoon

  const scored = notes.map((note, idx) => {
    const docVec = docVectors[idx];
    let cosineSim = 0;
    for (const [t, qWeight] of queryVec.entries()) {
      const dWeight = docVec.get(t) || 0;
      cosineSim += qWeight * dWeight;
    }

    let score = cosineSim;

    // Item-specific boost
    if (Array.isArray(note.items)) {
      if (note.items.includes(context.item.toLowerCase())) {
        score += 0.45;
      }
    } else if (note.items === "all") {
      score += 0.15;
    }

    // Direction-specific tag boost
    if (context.direction === "up") {
      if (note.tags.includes("arrivals")) score += 0.15;
      if (note.tags.includes("season")) score += 0.15;
      if (note.tags.includes("festival")) score += 0.15;
    } else if (context.direction === "down") {
      if (note.tags.includes("arrivals")) score += 0.2;
      if (note.tags.includes("season")) score += 0.15;
    }

    // Monsoon season boost
    if (isRainySeason && note.tags.includes("rain")) {
      score += 0.35;
    }

    if (queryTokens.includes("rain") && note.tags.includes("rain")) {
      score += 0.4;
    }

    return {
      title: note.title,
      source: note.source,
      source_url: note.source_url,
      verified: note.verified,
      score: Number(score.toFixed(4)),
    };
  });

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return scored.slice(0, topK);
}
