"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import type { RepoQuoteRender } from "@/lib/app/repo/types";
import { RENDER_CONTENT_TYPES, RENDER_MAX_BYTES, RENDER_MAX_COUNT } from "@/lib/app/quotes/renders";
import { attachQuoteRenderAction, deleteQuoteRenderAction, reorderQuoteRendersAction, type RenderActionResult } from "./actions";
import styles from "./QuoteRenders.module.css";

/**
 * Rep-only render gallery editor. Files go browser → Blob directly (token from
 * /api/quote-renders/upload), then each URL is attached via a server action.
 * Order is edited with move buttons; delete removes the row and the blob.
 */
export function QuoteRenders({ quoteId, initialRenders }: { quoteId: string; initialRenders: RepoQuoteRender[] }) {
  const [renders, setRenders] = useState(initialRenders);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || isPending;

  function apply(result: RenderActionResult) {
    if (result.ok) setRenders(result.renders);
    else setError(result.error);
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setError(null);
    if (renders.length + files.length > RENDER_MAX_COUNT) {
      setError(`A quote can have at most ${RENDER_MAX_COUNT} renders.`);
      return;
    }
    const bad = files.find((f) => !(RENDER_CONTENT_TYPES as readonly string[]).includes(f.type) || f.size > RENDER_MAX_BYTES);
    if (bad) {
      setError(`${bad.name}: use a JPEG, PNG, WebP or AVIF under ${RENDER_MAX_BYTES / 1024 / 1024} MB.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/quote-renders/upload",
          contentType: file.type,
        });
        const result = await attachQuoteRenderAction(quoteId, blob.url);
        apply(result);
        if (!result.ok) break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, delta: -1 | 1) {
    const ids = renders.map((r) => r.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setError(null);
    startTransition(async () => apply(await reorderQuoteRendersAction(quoteId, ids)));
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => apply(await deleteQuoteRenderAction(quoteId, id)));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.title}>Renders</h2>
        <span className={styles.count}>
          {renders.length}/{RENDER_MAX_COUNT}
        </span>
      </div>

      <div
        className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) void addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id="render-files"
          type="file"
          multiple
          accept={RENDER_CONTENT_TYPES.join(",")}
          className={styles.fileInput}
          disabled={busy || renders.length >= RENDER_MAX_COUNT}
          onChange={(e) => e.target.files && void addFiles(e.target.files)}
        />
        <label htmlFor="render-files" className={styles.dropLabel}>
          {uploading ? "Uploading…" : "Add renders — choose images or drag them here"}
        </label>
        <p className={styles.hint}>Customers see these on the quote page, in this order.</p>
      </div>

      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}

      {renders.length > 0 ? (
        <ul className={styles.grid}>
          {renders.map((render, i) => (
            <li key={render.id} className={styles.item}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={render.url} alt={`Render ${i + 1}`} className={styles.thumb} loading="lazy" />
              <div className={styles.controls}>
                <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move render ${i + 1} earlier`}>
                  ←
                </button>
                <button type="button" disabled={busy || i === renders.length - 1} onClick={() => move(i, 1)} aria-label={`Move render ${i + 1} later`}>
                  →
                </button>
                <button type="button" disabled={busy} onClick={() => remove(render.id)} aria-label={`Delete render ${i + 1}`} className={styles.delete}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
