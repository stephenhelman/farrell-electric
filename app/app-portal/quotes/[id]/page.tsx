import { notFound } from "next/navigation";
import { getRepo } from "@/lib/app/repo";
import { QuoteBuilder } from "../QuoteBuilder";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const [catalogItems, quote] = await Promise.all([repo.listCatalogItems(), repo.getQuote(id)]);

  if (!quote) notFound();

  return <QuoteBuilder catalogItems={catalogItems} initialQuote={quote} />;
}
