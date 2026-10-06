import type { RepoLead } from "@/lib/app/repo/types";
import type { LeadOption } from "./LeadPicker";

export function toLeadOptions(leads: RepoLead[]): LeadOption[] {
  return leads.map((lead) => ({
    id: lead.id,
    label: [lead.name, lead.phone, lead.propertyAddress].filter(Boolean).join(" · "),
  }));
}
