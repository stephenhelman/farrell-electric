import { notFound } from "next/navigation";
import { getRepo } from "@/lib/app/repo";
import { QuoteBuilder } from "../QuoteBuilder";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const [catalogItems, quote, renders] = await Promise.all([repo.listCatalogItems(), repo.getQuote(id), repo.listQuoteRenders(id)]);

  if (!quote) notFound();

  return (
    <QuoteBuilder
      catalogItems={catalogItems}
      initialQuote={quote}
      initialRenders={renders}
      // With no GHL quote webhook (stub mode) nothing will ever echo back — don't gate Send on it.
      quoteSyncEnabled={Boolean(process.env.GHL_WEBHOOK_URL_QUOTE)}
    />
  );
}
