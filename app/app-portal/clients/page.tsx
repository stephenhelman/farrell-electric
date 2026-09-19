import type { RepoQuote } from "@/lib/app/repo/types";
import { getRepo } from "@/lib/app/repo";
import styles from "./page.module.css";

interface Client {
  name: string;
  phone: string;
  email: string;
  address: string;
}

function distinctClients(quotes: RepoQuote[]): Client[] {
  const seen = new Map<string, Client>();

  for (const quote of quotes) {
    const key = quote.customerPhone || quote.customerEmail || quote.customerName;
    if (!seen.has(key)) {
      seen.set(key, {
        name: quote.customerName,
        phone: quote.customerPhone,
        email: quote.customerEmail,
        address: quote.customerAddress,
      });
    }
  }

  return [...seen.values()];
}

export default async function ClientsPage() {
  const repo = await getRepo();
  const quotes = await repo.listQuotes();
  const clients = distinctClients(quotes);

  return (
    <div>
      <h1 className={styles.heading}>Clients</h1>
      <p className={styles.subhead}>Derived from quote customers — no separate client record is kept here.</p>
      {clients.length === 0 ? (
        <p className={styles.empty}>No clients yet.</p>
      ) : (
        <ul className={styles.list}>
          {clients.map((client) => (
            <li key={client.phone || client.email || client.name} className={styles.row}>
              <div className={styles.title}>{client.name}</div>
              <div className={styles.meta}>
                {[client.phone, client.address].filter(Boolean).join(" · ")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
