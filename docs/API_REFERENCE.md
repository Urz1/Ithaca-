# 📡 Ithaca API Reference

This document provides a comprehensive specification of Ithaca's REST and Server-Sent Event (SSE) streaming API endpoints.

All endpoints require authentication via the session cookie (`ithaca.session_token`) unless explicitly marked as **Public**.

---

## 1. Epistemic Classification & AI Analysis

### `POST /api/classify`

Classifies the epistemic relationship between a citing and cited paper pair.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "sourceDoi": "10.1038/s41586-020-2649-2",
    "targetDoi": "10.1126/science.1258092",
    "citationContext": "Contrary to the findings reported by Smith et al. (2020), our in-vivo assay observed zero therapeutic benefit at equivalent dosing.",
    "sourceTitle": "Re-evaluation of binding kinetics",
    "targetTitle": "Novel therapeutic peptide discovery"
  }
  ```
- **Response (HTTP 200 OK)**:
  ```json
  {
    "stance": "REFUTES",
    "confidence": 0.94,
    "evidenceSnippet": "our in-vivo assay observed zero therapeutic benefit at equivalent dosing",
    "reasoning": "The authors conducted an in-vivo replication and directly contradicted the therapeutic efficacy claims of the target paper.",
    "providerUsed": "gemini-2.0-flash",
    "cached": false
  }
  ```

---

### `POST /api/classify/stream` (SSE Stream)

Streams continuous epistemic classifications for a batch of citation pairs in real time as the WebGL canvas populates.

- **Headers**: `Accept: text/event-stream`
- **Request Body**:
  ```json
  {
    "pairs": [
      {
        "id": "edge-1",
        "sourceDoi": "10.1038/s41586-020-2649-2",
        "targetDoi": "10.1126/science.1258092",
        "context": "We replicated their crystallization protocol..."
      }
    ]
  }
  ```
- **Stream Events**:
  ```
  event: classification
  data: {"id":"edge-1","stance":"SUPPORTS","confidence":0.89,"evidenceSnippet":"replicated their crystallization protocol"}

  event: done
  data: {"totalProcessed":1,"elapsedMs":340}
  ```

---

### `POST /api/classify/correct`

Allows verified researchers to submit human-in-the-loop corrections to AI-classified stances, stored in the feedback loop.

- **Request Body**:
  ```json
  {
    "sourceDoi": "10.1038/s41586-020-2649-2",
    "targetDoi": "10.1126/science.1258092",
    "correctedStance": "EXTENDS",
    "rationale": "The paper does not refute the original mechanism, but limits its scope to murine models."
  }
  ```
- **Response**: `{"status": "recorded", "correctionId": "corr_cuid..."}`

---

## 2. Research & Graph Analytics

### `GET /api/research/conflict-path`

Calculates the shortest chain of contradictory citations between two research papers.

- **Query Parameters**:
  - `sourceDoi` _(string, required)_: Starting publication DOI
  - `targetDoi` _(string, required)_: Destination publication DOI
  - `maxDepth` _(number, optional, default: 4)_: Maximum hop distance
- **Response (HTTP 200 OK)**:
  ```json
  {
    "pathFound": true,
    "hops": 3,
    "nodes": [
      { "doi": "10.1038/paperA", "title": "Initial Hypothesis" },
      { "doi": "10.1016/paperB", "title": "Partial Contradiction in Mice" },
      { "doi": "10.1126/paperC", "title": "Definitive Rebuttal" }
    ],
    "edges": [
      {
        "stance": "REFUTES",
        "confidence": 0.91,
        "evidenceSnippet": "Failed to reproduce..."
      },
      {
        "stance": "REFUTES",
        "confidence": 0.88,
        "evidenceSnippet": "Directly invalidates..."
      }
    ]
  }
  ```

---

### `GET /api/research/sovereign-slice`

Determines the degree of institutional and author independence supporting a claim.

- **Query Parameters**:
  - `doi` _(string, required)_: Paper DOI to audit
- **Response (HTTP 200 OK)**:
  ```json
  {
    "doi": "10.1038/paperA",
    "independenceScore": 0.78,
    "metrics": {
      "totalSupportingCitations": 42,
      "independentInstitutions": 19,
      "coAuthorshipNetworkOverlap": 0.12,
      "isSovereignValidated": true
    }
  }
  ```

---

### `GET /api/research/extension-badge` _(Public)_

Lightweight JSON endpoint consumed by the Ithaca Browser Extension when browsing arXiv, bioRxiv, or PubMed.

- **Query Parameters**:
  - `doi` _(string, optional)_
  - `title` _(string, optional)_
- **Response**:
  ```json
  {
    "paperFound": true,
    "doi": "10.1101/2026.01.12.123456",
    "totalCitations": 68,
    "stanceBreakdown": {
      "supports": 45,
      "refutes": 8,
      "extends": 12,
      "mentions": 3
    },
    "disputeSeverity": "moderate",
    "activeDebateUrl": "https://ithaca.science/explore?doi=10.1101/2026.01.12.123456"
  }
  ```

---

## 3. Conversational AI Assistant

### `POST /api/chat/stream` (SSE Stream)

Streams an epistemic literature review conversation grounded in the active canvas graph.

- **Request Body**:
  ```json
  {
    "messages": [
      {
        "role": "user",
        "content": "What is the primary point of disagreement regarding transformer quadratic attention?"
      }
    ],
    "activeGraphContext": {
      "paperDois": ["10.1145/3318464.3389700", "10.48550/arXiv.1706.03762"],
      "focusStance": "REFUTES"
    }
  }
  ```
- **Stream Events**:
  ```
  event: delta
  data: {"text":"The primary dispute centers on whether..."}

  event: citation
  data: {"doi":"10.1145/3318464.3389700","quote":"Quadratic time complexity creates a computational wall for sequence lengths > 8k"}
  ```

---

## 4. Reference Library Sync

### `GET /api/sync/zotero`

Synchronizes papers from a connected Zotero library and checks each paper against Ithaca's dispute cache.

- **Headers**: Session cookie
- **Response**:
  ```json
  {
    "syncedItems": 124,
    "activeDisputesFound": 3,
    "disputedPapers": [
      {
        "key": "ZOTERO_ITEM_KEY_1",
        "title": "Longevity effects of Metformin in C. elegans",
        "refutationCount": 4,
        "latestContradictionYear": 2026
      }
    ]
  }
  ```

---

## 5. Billing & Subscription Webhooks

### `POST /api/billing/webhook` _(Public — Signed)_

Processes Stripe or NBE compliant subscription events (`subscription.created`, `subscription.canceled`, `invoice.payment_succeeded`).

- **Headers**: `Stripe-Signature` or `x-billing-signature`
- **Security**: Verified against `BILLING_WEBHOOK_SECRET`.

---

## 6. System Health & Observability

### `GET /api/health` _(Public)_

Liveness and readiness probe for load balancers and container orchestrators.

- **Response (HTTP 200 OK)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-08T20:00:00.000Z",
    "services": {
      "database": "connected",
      "redis": "connected",
      "llmCascade": "healthy"
    }
  }
  ```
