"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile widget. The parent only renders this when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so with no key there is no script,
 * no network call, and no widget at all. Bump `resetCount` after each submit —
 * tokens are single-use.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  resetCount,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  resetCount: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const render = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetId.current !== null) return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }, [siteKey, onToken]);

  // Script may already be loaded (e.g. the form remounted when the intent changed).
  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (resetCount > 0 && widgetId.current !== null) {
      window.turnstile?.reset(widgetId.current);
      onToken(null);
    }
  }, [resetCount, onToken]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={render}
      />
      <div ref={containerRef} />
    </>
  );
}
