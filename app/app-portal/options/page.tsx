import { getRepo } from "@/lib/app/repo";
import pageStyles from "../price-book/page.module.css";
import { OptionsList } from "./OptionsList";

export default async function OptionsPage() {
  const repo = await getRepo();
  const options = await repo.listOptions();

  return (
    <div>
      <h1 className={pageStyles.heading}>Options &amp; Packages</h1>
      <OptionsList options={options} />
    </div>
  );
}
