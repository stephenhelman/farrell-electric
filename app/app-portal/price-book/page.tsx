import { getRepo } from "@/lib/app/repo";
import { PriceBookList } from "./PriceBookList";
import styles from "./page.module.css";

export default async function PriceBookPage() {
  const repo = await getRepo();
  const items = await repo.listCatalogItems();

  return (
    <div>
      <h1 className={styles.heading}>Products &amp; Services</h1>
      <PriceBookList items={items} />
    </div>
  );
}
