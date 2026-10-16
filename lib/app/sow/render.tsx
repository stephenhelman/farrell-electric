import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { PublicQuote } from "@/lib/app/repo/types";
import { COMPANY_LICENSE, COMPANY_NAME, COMPANY_SITE, COMPANY_TIME_ZONE, SOW_COLORS as C } from "./constants";

/**
 * Economics-safe by construction: the input is the public quote shape plus
 * acceptance facts. There is no cost/profit/margin/revenue anywhere in this
 * type, so none can reach the PDF.
 */
export interface SowInput {
  quote: Pick<
    PublicQuote,
    "number" | "customerName" | "customerAddress" | "lineItems" | "discount" | "subtotal" | "total" | "scopeOfWork"
  >;
  /** Printed as "QUOTE #<ref>" and in the accepted stamp. */
  referenceNumber: string;
  /** Not persisted on the Quote today (no acceptedAt/source columns), so the caller supplies them. */
  acceptance: {
    acceptedByName: string;
    acceptedAt: Date;
    source: "customer" | "rep";
  };
}

// Inter (OFL) — bundled so rendering never depends on system fonts. Run from
// process.cwd() (the project root locally and on Vercel); the font files must
// be included in the serverless trace of whatever route calls this.
const FONT_DIR = path.join(process.cwd(), "lib", "app", "sow", "fonts");
let fontsRegistered = false;
function registerFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONT_DIR, "Inter-Regular.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Inter-Bold.woff"), fontWeight: 700 },
    ],
  });
  // Never hyphenate names/addresses mid-word.
  Font.registerHyphenationCallback((word) => [word]);
}

const money = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: COMPANY_TIME_ZONE, year: "numeric", month: "long", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { timeZone: COMPANY_TIME_ZONE, hour: "numeric", minute: "2-digit" });
}

/** One scope line per non-empty line; strips a leading typed bullet ("•", "-", "*") — the bullet is drawn. */
function scopeLines(scopeOfWork: string): string[] {
  return scopeOfWork
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean);
}

const PAGE_PAD = 40;
const FOOTER_H = 34;

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: C.text, paddingBottom: FOOTER_H + 16 },
  header: { backgroundColor: C.charcoal, paddingHorizontal: PAGE_PAD, paddingTop: 28, paddingBottom: 22, flexDirection: "row", justifyContent: "space-between" },
  brand: { color: C.white, fontSize: 20, fontWeight: 700, letterSpacing: 1.5 },
  eyebrow: { color: "#aeb4bf", fontSize: 8, fontWeight: 700, letterSpacing: 1.2, marginTop: 6, flexDirection: "row", alignItems: "center" },
  eyebrowDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#aeb4bf", marginHorizontal: 6 },
  headerRight: { alignItems: "flex-end" },
  quoteNo: { color: C.white, fontSize: 12, fontWeight: 700, letterSpacing: 0.8 },
  headerMeta: { color: "#aeb4bf", fontSize: 8.5, marginTop: 4 },
  accentRule: { height: 4, backgroundColor: C.blue },
  body: { paddingHorizontal: PAGE_PAD, paddingTop: 24 },
  label: { fontSize: 8, fontWeight: 700, letterSpacing: 1.2, color: C.blue, marginBottom: 6 },
  customerName: { fontSize: 14, fontWeight: 700 },
  customerAddress: { fontSize: 10, color: C.muted, marginTop: 3 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: C.charcoal, paddingBottom: 6, marginTop: 24 },
  th: { fontSize: 8, fontWeight: 700, letterSpacing: 1, color: C.muted },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: C.rule, paddingVertical: 9 },
  colDesc: { flex: 1, minWidth: 0, paddingRight: 14 },
  colQty: { width: 36, flexShrink: 0, textAlign: "right" },
  colUnit: { width: 86, flexShrink: 0, textAlign: "right" },
  colTotal: { width: 92, flexShrink: 0, textAlign: "right" },
  itemName: { fontSize: 10, fontWeight: 700 },
  itemDesc: { fontSize: 8.5, color: C.muted, marginTop: 2, lineHeight: 1.35 },
  totals: { marginTop: 14, alignItems: "flex-end" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", width: 230, paddingVertical: 3 },
  sumLabel: { color: C.muted },
  totalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: 230, backgroundColor: C.blue, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14, marginTop: 6 },
  totalLabel: { color: C.white, fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  totalValue: { color: C.white, fontSize: 15, fontWeight: 700 },
  scope: { marginTop: 26 },
  scopeRow: { flexDirection: "row", marginBottom: 5, paddingRight: 8 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.blue, marginTop: 4.5, marginRight: 9 },
  scopeText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  stamp: { marginTop: 22, backgroundColor: C.band, borderLeftWidth: 3, borderLeftColor: C.blue, paddingVertical: 10, paddingHorizontal: 12 },
  stampText: { fontSize: 8.5, color: C.text, lineHeight: 1.45 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, height: FOOTER_H, backgroundColor: C.charcoal, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  footerText: { color: "#aeb4bf", fontSize: 8, letterSpacing: 0.6 },
  footerSep: { width: 1, height: 9, backgroundColor: "#4a4f58", marginHorizontal: 10 },
});

function SowDocument({ quote, referenceNumber, acceptance }: SowInput) {
  const lines = scopeLines(quote.scopeOfWork);
  const acceptedWhen = `${formatDate(acceptance.acceptedAt)} at ${formatTime(acceptance.acceptedAt)}`;
  const acceptedBy =
    acceptance.source === "customer" ? `online by ${acceptance.acceptedByName}` : `by ${COMPANY_NAME}`;

  return (
    <Document title={`Scope of Work — Quote #${referenceNumber}`} author={COMPANY_NAME}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{COMPANY_NAME.toUpperCase()}</Text>
            <View style={s.eyebrow}>
              <Text>LANDSCAPE LIGHTING</Text>
              <View style={s.eyebrowDot} />
              <Text>FINAL SCOPE OF WORK</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.quoteNo}>QUOTE #{referenceNumber}</Text>
            <Text style={s.headerMeta}>{formatDate(acceptance.acceptedAt)}</Text>
            <Text style={s.headerMeta}>{COMPANY_SITE}</Text>
          </View>
        </View>
        <View style={s.accentRule} />

        <View style={s.body}>
          <View wrap={false}>
            <Text style={s.label}>PREPARED FOR</Text>
            <Text style={s.customerName}>{quote.customerName}</Text>
            {quote.customerAddress ? <Text style={s.customerAddress}>{quote.customerAddress}</Text> : null}
          </View>

          <View style={s.tableHead} fixed>
            <Text style={[s.th, s.colDesc]}>DESCRIPTION</Text>
            <Text style={[s.th, s.colQty]}>QTY</Text>
            <Text style={[s.th, s.colUnit]}>UNIT</Text>
            <Text style={[s.th, s.colTotal]}>TOTAL</Text>
          </View>
          {quote.lineItems.map((item, index) => (
            <View key={index} style={s.row} wrap={false}>
              <View style={s.colDesc}>
                <Text style={s.itemName}>{item.name}</Text>
                {item.description ? <Text style={s.itemDesc}>{item.description}</Text> : null}
              </View>
              <Text style={s.colQty}>{item.qty}</Text>
              <Text style={s.colUnit}>{money(item.unitPrice)}</Text>
              <Text style={[s.colTotal, { fontWeight: 700 }]}>{money(item.qty * item.unitPrice)}</Text>
            </View>
          ))}

          <View style={s.totals} wrap={false}>
            {quote.discount > 0 ? (
              <>
                <View style={s.sumRow}>
                  <Text style={s.sumLabel}>Subtotal</Text>
                  <Text>{money(quote.subtotal)}</Text>
                </View>
                <View style={s.sumRow}>
                  <Text style={s.sumLabel}>Discount</Text>
                  <Text>-{money(quote.discount)}</Text>
                </View>
              </>
            ) : null}
            <View style={s.totalBox}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalValue}>{money(quote.total)}</Text>
            </View>
          </View>

          {lines.length > 0 ? (
            <View style={s.scope}>
              <Text style={s.label}>SCOPE OF WORK</Text>
              {lines.map((line, index) => (
                <View key={index} style={s.scopeRow} wrap={false}>
                  {/* Drawn, not the "•" character — no dependence on any glyph. */}
                  <View style={s.bullet} />
                  <Text style={s.scopeText}>{line}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={s.stamp} wrap={false}>
            <Text style={s.stampText}>
              Accepted {acceptedBy} on {acceptedWhen}
              {"  ·  "}Recorded by {COMPANY_NAME}
              {"  ·  "}Quote #{referenceNumber}
            </Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{COMPANY_NAME.toUpperCase()}</Text>
          <View style={s.footerSep} />
          <Text style={s.footerText}>{COMPANY_LICENSE}</Text>
          <View style={s.footerSep} />
          <Text style={s.footerText}>{COMPANY_SITE}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Renders the Scope-of-Work PDF. Bytes only — storage and dispatch are the caller's job. */
export async function renderSowPdf(input: SowInput): Promise<Uint8Array> {
  registerFonts();
  const buffer = await renderToBuffer(<SowDocument {...input} />);
  return new Uint8Array(buffer);
}
