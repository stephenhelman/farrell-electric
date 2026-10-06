"use client";

import { useCallback, useEffect, useState } from "react";
import { getLeadSyncAction } from "../leads/actions";

const AUTO_POLL_MS = 2000;
/** After this long the skeleton gives way to a manual "not synced yet" state — GHL may be slow or down. */
const AUTO_POLL_WINDOW_MS = 20000;

/**
 * Watches the lead's GHL contact id. It only reads the DB (the New Lead
 * echo-back writes it) — it never calls GHL. Auto-polls briefly after a lead is
 * chosen, then stops; `check` is the manual re-poll.
 */
export function useLeadSync(leadId: string | null, initialContactId: string | null, enabled: boolean) {
  const [contactId, setContactId] = useState(initialContactId);
  const [autoPolling, setAutoPolling] = useState(enabled && leadId !== null && !initialContactId);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (): Promise<string | null> => {
    if (!leadId) return null;
    setChecking(true);
    try {
      const { ghlContactId } = await getLeadSyncAction(leadId);
      if (ghlContactId) {
        setContactId(ghlContactId);
        setAutoPolling(false);
      }
      return ghlContactId;
    } catch {
      return null; // A failed poll is just "not yet" — never surfaces as an error.
    } finally {
      setChecking(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!autoPolling) return;
    const interval = setInterval(() => void check(), AUTO_POLL_MS);
    const stop = setTimeout(() => setAutoPolling(false), AUTO_POLL_WINDOW_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [autoPolling, check]);

  return {
    contactId,
    /** True while the initial auto-poll window is open and no contact id has landed. */
    syncing: autoPolling && !contactId,
    checking,
    check,
  };
}
