import { getRepo } from "@/lib/app/repo";
import { formatOptionInputType } from "@/lib/app/catalog/format";
import { formatMoney } from "@/lib/app/format";
import styles from "../price-book/PriceBookList.module.css";
import pageStyles from "../price-book/page.module.css";

export default async function OptionsPage() {
  const repo = await getRepo();
  const options = await repo.listOptions();

  return (
    <div>
      <h1 className={pageStyles.heading}>Options &amp; Packages</h1>
      {options.length === 0 ? (
        <p className={styles.empty}>No options yet.</p>
      ) : (
        <ul className={styles.list}>
          {options.map((option) => (
            <li key={option.id} className={styles.row}>
              <div className={styles.rowHeader}>
                <div className={styles.name}>{option.name}</div>
                <div className={styles.price}>
                  {option.defaultUnitPrice !== null ? formatMoney(option.defaultUnitPrice) : "TODO: pricing"}
                </div>
              </div>
              <div className={styles.meta}>
                {formatOptionInputType(option.inputType)}
                {" · "}
                Labor/unit: {option.laborPerUnit !== null ? formatMoney(option.laborPerUnit) : "TODO: owner-provided"}
              </div>
              <div className={styles.description}>{option.customerDescription}</div>
              <div className={styles.reviewNotes}>
                Built from: {option.components.map((c) => `${c.qtyPerUnit}× ${c.catalogItemName}`).join(", ")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
