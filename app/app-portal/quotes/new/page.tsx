import { getRepo } from "@/lib/app/repo";
import { QuoteBuilder } from "../QuoteBuilder";
import { LeadPicker } from "../LeadPicker";
import { loadQuoteLeadContext } from "../lead-context";
import { toLeadOptions } from "../lead-options";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const repo = await getRepo();

  // No (valid) lead yet -> choose or create one first. Every quote hangs off a lead.
  const context = await loadQuoteLeadContext(repo, leadId);
  if (!context) {
    return <LeadPicker title="New Quote" basePath="/quotes/new" leads={toLeadOptions(await repo.listLeads())} />;
  }

  const catalogItems = await repo.listCatalogItems();
  return (
    <QuoteBuilder
      catalogItems={catalogItems}
      initialQuote={null}
      leadId={context.leadId}
      leadPrefill={context.leadPrefill}
      leadSync={context.leadSync}
    />
  );
}
