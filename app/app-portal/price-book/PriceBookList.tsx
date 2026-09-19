"use client";

import { useMemo, useState } from "react";
import type { RepoCatalogItem } from "@/lib/app/repo/types";
import { formatCalcType, formatUnitOfMeasure } from "@/lib/app/catalog/format";
import { formatMoney } from "@/lib/app/format";
import styles from "./PriceBookList.module.css";

export function PriceBookList({ items }: { items: RepoCatalogItem[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => formatCalcType(item.calcType)));
    return ["All", ...Array.from(unique).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
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
          placeholder="Search items..."
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

      {filtered.length === 0 ? (
        <p className={styles.empty}>No items match.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.rowHeader}>
                <div className={styles.name}>{item.name}</div>
                <div className={styles.price}>{formatMoney(item.price)}</div>
              </div>
              <div className={styles.meta}>
                {formatCalcType(item.calcType)} &middot; {formatUnitOfMeasure(item.unitOfMeasure)}
                {item.wattage !== null ? ` · ${item.wattage}W` : ""}
              </div>
              {item.description ? <div className={styles.description}>{item.description}</div> : null}

              {(item.needsReview || item.isSuspectedDuplicate || item.isPlaceholder) && (
                <div className={styles.flags}>
                  {item.isSuspectedDuplicate ? (
                    <span className={`${styles.badge} ${styles.badgeDuplicate}`}>Suspected duplicate</span>
                  ) : null}
                  {item.needsReview ? (
                    <span className={`${styles.badge} ${styles.badgeReview}`}>Needs review</span>
                  ) : null}
                  {item.isPlaceholder ? (
                    <span className={`${styles.badge} ${styles.badgePlaceholder}`}>Placeholder price</span>
                  ) : null}
                </div>
              )}

              {item.reviewNotes ? <div className={styles.reviewNotes}>{item.reviewNotes}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
