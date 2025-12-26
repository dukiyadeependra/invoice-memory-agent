# AI Memory Layer for Invoice Automation

**Author:** Deependra Dukiya  
**Role:** AI Agent Intern Assignment  

---

## 📌 Overview

This project implements a **memory-driven AI agent layer** for invoice processing.  
The system operates **after invoice extraction** (OCR accuracy is assumed) and **learns from human corrections** to improve automation over time.

The focus of this project is **experience-based learning**, not machine learning.

---

## 🎯 Problem Statement

Organizations process hundreds of invoices daily.  
Many corrections repeat across invoices, such as:

- Vendor-specific field labels  
- VAT handling differences  
- Missing currency  
- Repeated quantity or SKU mismatches  

Currently, these corrections are applied manually and then lost.

### Goal

Build a **persistent, explainable memory layer** that:

- Learns from past invoices  
- Applies knowledge to future invoices  
- Improves automation rates over time  
- Remains auditable and safe  

---

## 🧠 Solution Summary

The system introduces an **AI agent pipeline** with memory:

Extracted Invoice
↓
Recall Memory
↓
Apply Memory + Heuristics
↓
Decide (Auto / Escalate)
↓
Learn from Human Feedback


No ML training is used.  
All learning is **rule-based + memory-driven**.

---

## 🛠 Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js
- **Database:** SQLite (better-sqlite3)
- **Persistence:** File-based (`db/memory.db`)

---

## 🧩 Memory Types Implemented

### 1️⃣ Vendor Memory
Stores vendor-specific patterns.

**Examples**
- *Supplier GmbH* → `Leistungsdatum` = `serviceDate`
- *Parts AG* → Prices include VAT
- *Freight & Co* → Shipping descriptions map to `FREIGHT` SKU

Stored persistently in SQLite.

---

### 2️⃣ Correction Memory
Learns from repeated human corrections:

- Field corrected
- Reason for correction
- Confidence score

Confidence increases when humans approve similar corrections again.

---

### 3️⃣ Resolution Memory
Tracks how decisions were resolved:

- Auto-applied + approved → confidence increases
- Rejected corrections → confidence decreases
- Old memory decays over time

This prevents **bad learning from dominating**.

---

## ⚖️ Decision Logic

The system decides actions using **memory and confidence**:

| Condition | Action |
|---------|--------|
| No issues | Auto-accept |
| Issue + no memory | Escalate |
| Issue + learned memory + high confidence | Auto-apply |
| Duplicate invoice | Escalate and skip learning |

### Important Rule
> Auto-application is **never allowed without prior memory**.

---

## 📉 Confidence Handling

- Initial memory confidence: `0.6`
- Human approval: `+0.1`
- Maximum confidence: `0.95`
- Confidence decay:
  - Memory older than 30 days → −0.05 (applied at decision time)
- Memory ignored if confidence < `0.4`

This ensures:
- Gradual learning
- Safe automation
- No permanent bad memory

---

## 🔁 Duplicate Detection

Invoices are flagged as duplicates if:

- Same vendor  
- Same invoice number  
- Previously processed  

Duplicates:
- Always escalated
- Never create memory
- Prevent contradictory learning

---

## 📤 Output Contract

For every invoice, the system outputs:

```json
{
  "normalizedInvoice": {},
  "proposedCorrections": [],
  "requiresHumanReview": true,
  "reasoning": "Explainable decision logic",
  "confidenceScore": 0.0,
  "memoryUpdates": [],
  "auditTrail": [
    {
      "step": "recall | apply | decide | learn",
      "timestamp": "...",
      "details": "..."
    }
  ]
}


▶️ Demo Flow (Learning Over Time)
Step 1: First Invoice (INV-A-001)

Missing serviceDate

System detects issue

Escalates for human review

No memory exists

Step 2: Human Correction

Human fills serviceDate

Vendor memory stored in SQLite

Step 3: Second Invoice (INV-A-002)

Same vendor (Supplier GmbH)

Memory recalled

serviceDate auto-filled

Higher confidence

No human review required

This demonstrates learning over time.

📂 Project Structure
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

🚀 How to Run
Install dependencies
npm install

Run demo
npx ts-node src/index.ts


SQLite database is created automatically at:

db/memory.db

🎥 Demo Video

A demo video is included in the submission email showing:

First run escalation

Human correction

Second run auto-application

Persistent memory across runs

Duplicate detection

✅ Key Highlights

No machine learning required

Fully explainable decisions

Persistent, auditable memory

Confidence reinforcement and decay

Safe automation with human-in-the-loop

🔮 Future Improvements

Memory visualization dashboard

Advanced confidence decay strategies

Cross-vendor pattern generalization

Weighted human feedback