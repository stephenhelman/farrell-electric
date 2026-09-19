import { getRepo } from "@/lib/app/repo";
import { EstimatorForm } from "../EstimatorForm";

export default async function EstimateQuotePage() {
  const repo = await getRepo();
  const [options, catalogItems] = await Promise.all([repo.listOptions(), repo.listCatalogItems()]);

  return <EstimatorForm options={options} catalogItems={catalogItems} />;
}
