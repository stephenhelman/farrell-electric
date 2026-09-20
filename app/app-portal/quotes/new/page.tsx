import { getRepo } from "@/lib/app/repo";
import { QuoteBuilder } from "../QuoteBuilder";

function projectDetailsNotes(details: { type: "lighting" | "electrical" }): string {
  if (details.type === "lighting") {
    return (details as unknown as { projectDetails: string }).projectDetails ?? "";
  }
  return (details as unknown as { description: string }).description ?? "";
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const repo = await getRepo();
  const catalogItems = await repo.listCatalogItems();

  const lead = leadId ? await repo.getLeadById(leadId) : null;

  return (
    <QuoteBuilder
      catalogItems={catalogItems}
      initialQuote={null}
      leadId={lead?.id ?? null}
      leadPrefill={
        lead
          ? {
              customerName: lead.name,
              customerPhone: lead.phone,
              customerEmail: lead.email ?? "",
              customerAddress: lead.propertyAddress ?? "",
              notes: projectDetailsNotes(lead.details),
            }
          : null
      }
    />
  );
}
