import { getRepo } from "@/lib/app/repo";
import { EstimatorForm } from "../EstimatorForm";
import { LeadPicker } from "../LeadPicker";
import { loadQuoteLeadContext } from "../lead-context";
import { toLeadOptions } from "../lead-options";

export default async function EstimateQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const repo = await getRepo();

  const context = await loadQuoteLeadContext(repo, leadId);
  if (!context) {
    return <LeadPicker title="New Estimate" basePath="/quotes/estimate" leads={toLeadOptions(await repo.listLeads())} />;
  }

  const [options, catalogItems] = await Promise.all([repo.listOptions(), repo.listCatalogItems()]);

  return <EstimatorForm options={options} catalogItems={catalogItems} lead={context} />;
}
