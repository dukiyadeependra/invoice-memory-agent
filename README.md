# AI Memory Layer for Invoice Automation
## Author

Deependra Dukiya
AI Agent Intern Assignment

1. ## Overview
This project implements a memory-driven AI agent layer for invoice processing.
The system sits on top of invoice extraction (OCR is assumed complete) and learns from human corrections to improve automation over time.

The key idea is experience-based automation, not machine learning.

2. ## Problem Statement
A company processes hundreds of invoices daily.
Many corrections repeat across invoices (vendor-specific fields, VAT behavior, missing currency, etc.).

Currently:
• Corrections are applied manually
• The system does not learn
• Same mistakes repeat

## Goal
Build a persistent, explainable memory layer that:
• Learns from past corrections
• Applies knowledge to future invoices
• Improves automation rate over time
• Remains auditable and safe

3. ## Solution Summary
This system introduces a memory-driven AI agent that performs the following steps:

Extracted Invoice
   ↓
Recall past memory
   ↓
Apply memory + heuristics
   ↓
Decide (auto / escalate)
   ↓
Learn from human feedback

No ML training is used.
All learning is rule + memory based.

4. ## Tech Stack
• Language: TypeScript (strict mode)
• Runtime: Node.js
• Database: SQLite (better-sqlite3)
• Persistence: File-based DB (db/memory.db)

5. ## Memory Types Implemented
**5.1 Vendor Memory**
Stores vendor-specific patterns.
Examples
• Supplier GmbH → Leistungsdatum = serviceDate
• Parts AG → Prices include VAT
• Freight & Co → Shipping descriptions map to FREIGHT SKU

Stored in SQLite table: vendor_memory

**5.2 Correction Memory**
• Learns from repeated human corrections.
• What field was corrected
• Why it was corrected
• Confidence increases on approval

**5.3 Resolution Memory**
Tracks outcomes of decisions:
• Auto-applied + approved → confidence increases
• Rejected → confidence decreases
• Old memory decays over time

This prevents bad memory dominating.

6. ## Decision Logic
The system decides based on memory + confidence:
**Condition**	                                              **Action**
No issues	                                                 Auto-accept
Issue + no memory	                                         Escalate
Issue + learned memory + high confidence	                 Auto-apply
Duplicate invoice	                                         Escalate & skip learning

Important Rule:
Auto-application is never allowed without prior memory

7. ## Confidence Handling
• Initial memory confidence: 0.6
• On approval: +0.1
• Maximum confidence: 0.95
• Confidence decay:
   •If memory older than 30 days → −0.05 (applied at decision time)
• Memory ignored if effective confidence < 0.4

This ensures:
• Learning improves gradually
• Old or wrong memory fades

8. ## Duplicate Detection
Invoices are flagged as duplicates if:
• Same vendor
• Same invoiceNumber
• Previously processed

Duplicates:
• Always escalated
• Never create memory
• Prevent contradictory learning

9. ## Output Contract
For every invoice, the system outputs:
{
  "normalizedInvoice": {},
  "proposedCorrections": [],
  "requiresHumanReview": true,
  "reasoning": "Explainable decision logic",
  "confidenceScore": 0.0,
  "memoryUpdates": [],
  "auditTrail": [
    {
      "step": "recall|apply|decide|learn",
      "timestamp": "...",
      "details": "..."
    }
  ]
}

10. ## Demo Flow (Learning Over Time)
**Step 1: First Invoice (INV-A-001)**
• Missing serviceDate
• System detects issue
• Escalates for human review
• No memory exists

**Step 2: Human Correction**
• Human fills serviceDate
• Memory stored in SQLite

**Step 3: Second Invoice (INV-A-002)**
• Same vendor (Supplier GmbH)
• System recalls memory
• Auto-fills serviceDate
• Confidence increases
• No human review required

This demonstrates learning over time.

11. ## Project Structure
invoice-memory-agent/
├── src/
│   ├── agent/
│   │   └── invoiceProcessor.ts
│   ├── db/
│   │   └── sqlite.ts
│   └── index.ts
├── data/
│   ├── invoices_extracted.json
│   ├── human_corrections.json
│   ├── purchase_orders.json
│   └── delivery_notes.json
├── db/
│   └── memory.db
├── package.json
├── tsconfig.json
└── README.md

12. ## How to Run
**Install dependencies**
npm install
**Run demo**
npx ts-node src/index.ts
**SQLite database is created automatically at:**
db/memory.db

13. ## Demo Video
📹 A demo video is attached in the submission email showing:
• First run escalation
• Human correction
• Second run auto-application
• Persistent memory across runs
• Duplicate detection

14. ## Key Takeaways
• No ML required
• Learning is explainable and auditable
• Memory improves automation safely
• Designed to prevent incorrect automation
• Suitable for real-world invoice processing pipelines

15. ## Future Improvements
• Memory visualization UI
• More granular confidence decay
• Cross-vendor pattern generalization
• Human feedback weighting