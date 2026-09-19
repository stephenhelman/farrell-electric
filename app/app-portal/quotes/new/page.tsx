import { getRepo } from "@/lib/app/repo";
import { QuoteBuilder } from "../QuoteBuilder";

export default async function NewQuotePage() {
  const repo = await getRepo();
  const catalogItems = await repo.listCatalogItems();

  return <QuoteBuilder catalogItems={catalogItems} initialQuote={null} />;
}
