/**
 * @file ItemGrid.tsx
 * @description Accessible 8-item grid for selecting vegetable commodities with bilingual labels and large touch targets.
 */

"use client";

import React from "react";
import { Language, ItemDefinition } from "@/lib/types";

interface ItemGridProps {
  items: ItemDefinition[];
  selectedItem: string;
  lang: Language;
  onSelectItem: (itemId: string) => void;
}

export function ItemGrid({ items, selectedItem, lang, onSelectItem }: ItemGridProps) {
  return (
    <section aria-label="Vegetable selection">
      <div className="items-grid" role="group">
        {items.map((it) => {
          const isSelected = it.id === selectedItem;
          const primaryName = lang === "te" ? it.name_te : it.name_en;
          const secondaryName = lang === "te" ? it.name_en : it.name_te;

          return (
            <button
              key={it.id}
              type="button"
              className={`item-btn ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectItem(it.id)}
              aria-pressed={isSelected}
            >
              <span className="item-emoji" aria-hidden="true">
                {it.emoji}
              </span>
              <span className="item-name-primary">{primaryName}</span>
              <span className="item-name-secondary">{secondaryName}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
