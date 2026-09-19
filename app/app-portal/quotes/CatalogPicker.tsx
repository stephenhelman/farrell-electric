"use client";

import { useMemo, useState } from "react";
import type { RepoCatalogItem } from "@/lib/app/repo/types";
import { formatCalcType } from "@/lib/app/catalog/format";
import { formatMoney } from "@/lib/app/format";
import styles from "./CatalogPicker.module.css";

export function CatalogPicker({
  items,
  onAdd,
}: {
  items: RepoCatalogItem[];
  onAdd: (item: RepoCatalogItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => formatCalcType(item.calcType)));
    return ["All", ...Array.from(unique).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!item.active) return false;
      const matchesCategory = category === "All" || formatCalcType(item.calcType) === category;
      const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
      const matchesSearch = query === "" || haystack.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, category]);

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search price book..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={styles.select}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.grid}>
        {filtered.map((item) => (
          <button key={item.id} type="button" className={styles.item} onClick={() => onAdd(item)}>
            <div className={styles.itemHeader}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.price}>{formatMoney(item.price)}</span>
            </div>
            <div className={styles.desc}>{item.description || formatCalcType(item.calcType)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
