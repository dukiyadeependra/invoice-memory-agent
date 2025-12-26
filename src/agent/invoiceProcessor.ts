// This file is the "brain" of the system.
// It decides what to do with ONE invoice.
import { db } from "../db/sqlite";

type AuditStep = {
  step: "recall" | "apply" | "decide" | "learn";
  timestamp: string;
  details: string;
};
type VendorMemory = {
  id: number;
  vendor: string;
  field: string;
  reason: string;
  confidence: number;
  learnedAt: string;
};

type ProcessResult = {
  normalizedInvoice: any;
  proposedCorrections: string[];
  requiresHumanReview: boolean;
  reasoning: string;
  confidenceScore: number;
  memoryUpdates: string[];
  auditTrail: AuditStep[];
};
/**
 * MAIN FUNCTION
 * This function is called for every invoice
 */
function isDuplicateInvoice(invoice: any): boolean {
  const existing = db.prepare(`
    SELECT * FROM processed_invoices
    WHERE vendor = ? AND invoiceNumber = ?
  `).get(
    invoice.vendor,
    invoice.fields?.invoiceNumber
  );

  return !!existing;
}

export function processInvoice(invoice: any): ProcessResult {
  

  // -----------------------------
  // 1. Create audit trail
  // -----------------------------
  const auditTrail: AuditStep[] = [];

  auditTrail.push({
    step: "recall",
    timestamp: new Date().toISOString(),
    details: `Started processing invoice ${invoice.invoiceId}`
  });
if (isDuplicateInvoice(invoice)) {
  auditTrail.push({
    step: "decide",
    timestamp: new Date().toISOString(),
    details: "Duplicate invoice detected"
  });

  return {
    normalizedInvoice: invoice,
    proposedCorrections: [],
    requiresHumanReview: true,
    reasoning: "Duplicate invoice detected. Escalating and skipping learning.",
    confidenceScore: invoice.confidence ?? 0.5,
    memoryUpdates: [],
    auditTrail
  };
}

  // -----------------------------
  // 2. Prepare outputs
  // -----------------------------
  const proposedCorrections: string[] = [];
  const memoryUpdates: string[] = [];

  let requiresHumanReview = true;
  let reasoning = "";
  let confidenceScore = invoice.confidence ?? 0.5;

  // -----------------------------
  // 3. RECALL MEMORY (Vendor-based)
  // -----------------------------
 const memoriesForVendor = db
  .prepare(`SELECT * FROM vendor_memory WHERE vendor = ?`)
  .all(invoice.vendor) as VendorMemory[];

for (const memory of memoriesForVendor) {

  // ---- Confidence decay logic ----
  const ageInDays =
    (Date.now() - new Date(memory.learnedAt).getTime()) /
    (1000 * 60 * 60 * 24);

  let effectiveConfidence = memory.confidence;

  if (ageInDays > 30) {
    effectiveConfidence -= 0.05;
  }

  // Ignore weak memory
  if (effectiveConfidence < 0.4) {
    continue;
  }

  // Apply memory suggestion
  if (
    memory.field === "serviceDate" &&
    invoice.fields?.serviceDate == null
  ) {
    proposedCorrections.push(
      `Memory suggests filling ${memory.field} because: ${memory.reason}`
    );

    confidenceScore += effectiveConfidence * 0.1;
  }
}


  if (memoriesForVendor.length === 0) {
    reasoning += `No memory found for vendor ${invoice.vendor}. `;
  } else {
    reasoning += `Found ${memoriesForVendor.length} memory entries for vendor ${invoice.vendor}. `;
  }

  auditTrail.push({
    step: "recall",
    timestamp: new Date().toISOString(),
    details: `Vendor memory count: ${memoriesForVendor.length}`
  });

  // -----------------------------
  // 4. APPLY SIMPLE HEURISTICS
  // -----------------------------

  // ---- Supplier GmbH: serviceDate from "Leistungsdatum"
  if (
    invoice.vendor === "Supplier GmbH" &&
    invoice.fields?.serviceDate == null &&
    invoice.rawText?.includes("Leistungsdatum")
  ) {
    proposedCorrections.push(
      "Service date missing. Raw text contains 'Leistungsdatum'. Suggest extracting serviceDate."
    );

    reasoning += "Detected 'Leistungsdatum' in raw text for Supplier GmbH. ";
    confidenceScore += 0.05;
  }

  // ---- Parts AG: VAT already included
  if (
    invoice.vendor === "Parts AG" &&
    invoice.rawText &&
    (invoice.rawText.includes("MwSt. inkl") ||
     invoice.rawText.toLowerCase().includes("vat"))
  ) {
    proposedCorrections.push(
      "Raw text indicates prices include VAT. Recalculate tax and gross totals."
    );

    reasoning += "Detected VAT-inclusive pricing for Parts AG. ";
    confidenceScore += 0.05;
  }

  // ---- Parts AG: Missing currency
  if (
    invoice.vendor === "Parts AG" &&
    invoice.fields?.currency == null &&
    invoice.rawText?.includes("Currency")
  ) {
    proposedCorrections.push(
      "Currency missing but found in raw text. Suggest setting currency to EUR."
    );

    reasoning += "Recovered missing currency from raw text. ";
    confidenceScore += 0.05;
  }

  // ---- Freight & Co: Skonto detection
  if (
    invoice.vendor === "Freight & Co" &&
    invoice.rawText?.toLowerCase().includes("skonto")
  ) {
    proposedCorrections.push(
      "Skonto / discount terms detected in raw text."
    );

    reasoning += "Detected Skonto terms for Freight & Co. ";
    confidenceScore += 0.05;
  }

  // ---- Freight & Co: Shipping description → FREIGHT SKU
  if (
    invoice.vendor === "Freight & Co" &&
    invoice.fields?.lineItems?.[0]?.sku == null &&
    invoice.fields?.lineItems?.[0]?.description &&
    (
      invoice.fields.lineItems[0].description.toLowerCase().includes("shipping") ||
      invoice.fields.lineItems[0].description.toLowerCase().includes("seefracht")
    )
  ) {
    proposedCorrections.push(
      "Line item description maps to FREIGHT SKU."
    );

    reasoning += "Mapped shipping description to FREIGHT SKU. ";
    confidenceScore += 0.05;
  }

  auditTrail.push({
    step: "apply",
    timestamp: new Date().toISOString(),
    details: `Proposed corrections count: ${proposedCorrections.length}`
  });

  // -----------------------------
  // 5. DECISION LOGIC
  // -----------------------------
  if (proposedCorrections.length === 0) {
  requiresHumanReview = false;
  reasoning += "No issues detected. Auto-accepting invoice. ";
} else if (memoriesForVendor.length > 0 && confidenceScore >= 0.8) {
  requiresHumanReview = false;
  reasoning += "High confidence based on learned memory. Auto-applying corrections. ";
} else {
  requiresHumanReview = true;
  reasoning += "No prior memory or confidence not high enough. Escalating for human review. ";
}

  auditTrail.push({
    step: "decide",
    timestamp: new Date().toISOString(),
    details: `requiresHumanReview = ${requiresHumanReview}`
  });

  // -----------------------------
  // 6. LEARNING PLACEHOLDER
  // (Actual learning happens after human corrections)
  // -----------------------------
  auditTrail.push({
    step: "learn",
    timestamp: new Date().toISOString(),
    details: "No learning applied in this run"
  });
db.prepare(`
  INSERT INTO processed_invoices (vendor, invoiceNumber, invoiceDate)
  VALUES (?, ?, ?)
`).run(
  invoice.vendor,
  invoice.fields?.invoiceNumber,
  invoice.fields?.invoiceDate
);

  // -----------------------------
  // 7. RETURN FINAL OUTPUT
  // -----------------------------
  return {
    normalizedInvoice: invoice,
    proposedCorrections,
    requiresHumanReview,
    reasoning: reasoning.trim(),
    confidenceScore: Math.min(confidenceScore, 0.95),
    memoryUpdates,
    auditTrail
  };
}
/**
 * Learn from human-approved corrections
 */
export function learnFromHuman(humanCorrection: any) {

  if (humanCorrection.finalDecision !== "approved") {
    return;
  }

  for (const correction of humanCorrection.corrections) {

    db.prepare(`
      INSERT INTO vendor_memory (vendor, field, reason, confidence, learnedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      humanCorrection.vendor,
      correction.field,
      correction.reason,
      Math.min(0.95, 0.6 + 0.1),
      new Date().toISOString()
    );

    console.log(
      `LEARNED (DB): Vendor=${humanCorrection.vendor}, Field=${correction.field}`
    );
  }
}

