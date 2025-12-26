import invoices from "../data/invoices_extracted.json";
import corrections from "../data/human_corrections.json";
import { processInvoice, learnFromHuman } from "./agent/invoiceProcessor";

// Pick Supplier GmbH invoices
const firstInvoice = invoices.find(i => i.invoiceId === "INV-A-001");
const secondInvoice = invoices.find(i => i.invoiceId === "INV-A-002");

console.log("=== FIRST RUN (NO MEMORY) ===");
console.log(JSON.stringify(processInvoice(firstInvoice), null, 2));

console.log("\n=== APPLYING HUMAN CORRECTION ===");
learnFromHuman(corrections.find(c => c.invoiceId === "INV-A-001"));

console.log("\n=== SECOND RUN (AFTER LEARNING) ===");
console.log(JSON.stringify(processInvoice(secondInvoice), null, 2));
