# Ithaca — Deep Competitive Analysis

> **Date:** July 2025  
> **Scope:** Every significant product in the research paper exploration, citation analysis, and academic graph visualization space  
> **Method:** Feature-level comparison based on live product research + Ithaca codebase audit

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Ithaca Feature Inventory](#ithaca-feature-inventory)
3. [Competitor Profiles](#competitor-profiles)
4. [Feature Matrix](#feature-matrix)
5. [Deep Comparison by Category](#deep-comparison-by-category)
6. [Ithaca's Unique Positioning](#ithacas-unique-positioning)
7. [Critical Gaps](#critical-gaps)
8. [Strategic Recommendations](#strategic-recommendations)

---

## Executive Summary

The academic research tool landscape has **12+ significant products** spanning three tiers:

| Tier                          | Products                                                                             | What They Do                                       |
| ----------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **Graph/Network Visualizers** | Connected Papers, Litmaps, Inciteful, Citation Gecko, VOSviewer, Open Knowledge Maps | Visualize citation/similarity networks             |
| **AI Research Assistants**    | Semantic Scholar, ResearchRabbit, Elicit, Consensus                                  | Search, recommend, summarize papers                |
| **Citation Intelligence**     | Scite.ai                                                                             | Classify citation context (supporting/contrasting) |
| **Enterprise Research AI**    | Iris.ai                                                                              | Agentic RAG for corporate R&D                      |

**Ithaca's thesis** — argumentation-aware graph visualization (edges typed as supports/contradicts/extends with confidence scores) — is **genuinely novel**. No competitor combines graph visualization + argumentation classification + evidence snippets + semantic pathfinding in a single interface. The closest overlap is with Scite.ai (citation classification) and Connected Papers (graph visualization), but neither does both.

**Current data posture (updated Jul 2026):** Ithaca uses a live OpenAlex + Semantic Scholar + LLM classification pipeline. Remaining competitive gaps are ease-of-use, reference-manager sync, alerts, and licensed full-text citation depth — not mock data. See `docs/FORWARD_PLAN.md` for the ease-first roadmap.

---

## Ithaca Feature Inventory

Cataloged from the actual codebase (`src/lib/`, `src/components/canvas/`, `src/types/`):

### Core Graph Engine

| Feature               | Implementation                                             | Status             |
| --------------------- | ---------------------------------------------------------- | ------------------ |
| Graph visualization   | Sigma.js v3 + graphology v0.25.4                           | ✅ Implemented     |
| Physics layout        | ForceAtlas2 (toggle on/off)                                | ✅ Implemented     |
| Argumentation edges   | `supports` / `contradicts` / `extends` with confidence 0–1 | ✅ Live (LLM + S2) |
| Evidence citations    | `EvidenceItem` with snippet, source, relation, confidence  | ✅ Live            |
| Semantic pathfinding  | Dijkstra's with 3 modes: shortest, conflict, consensus     | ✅ Implemented     |
| Path comparison view  | Side-by-side path visualization with statistics            | ✅ Implemented     |
| Node expansion        | Expand in/out/both, filter by edge type                    | ✅ Implemented     |
| Topic clustering      | Color-coded clusters with labels                           | ✅ Implemented     |
| Edge labels           | Inline confidence + type labels on hover                   | ✅ Implemented     |
| Edge evidence popover | Click edge → see evidence snippets                         | ✅ Implemented     |

### Canvas Interaction

| Feature            | Implementation                                          | Status         |
| ------------------ | ------------------------------------------------------- | -------------- |
| Node tooltip       | Hover → paper details (title, authors, year, citations) | ✅ Implemented |
| Multi-select       | Shift+click / lasso selection                           | ✅ Implemented |
| Selection panel    | Batch actions on selected nodes (export, compare)       | ✅ Implemented |
| Node drag          | Manual repositioning                                    | ✅ Implemented |
| Zoom indicator     | Current zoom level display                              | ✅ Implemented |
| Keyboard shortcuts | Comprehensive shortcut system (Ctrl+K, Escape, etc.)    | ✅ Implemented |
| Tutorial overlay   | Step-by-step onboarding                                 | ✅ Implemented |
| Error boundary     | Graceful crash recovery                                 | ✅ Implemented |

### Export System

| Format  | Details                                                  | Status         |
| ------- | -------------------------------------------------------- | -------------- |
| PNG     | Canvas screenshot with metadata header, legend, branding | ✅ Implemented |
| SVG     | Vector export with embedded styles                       | ✅ Implemented |
| GraphML | Standard graph interchange format                        | ✅ Implemented |
| JSON    | Full graph data (nodes + edges + attributes)             | ✅ Implemented |
| CSV     | Tabular paper data                                       | ✅ Implemented |
| PDF     | Multi-page with cover, graph image, paper table          | ✅ Implemented |

### Search & Navigation

| Feature              | Implementation                                 | Status         |
| -------------------- | ---------------------------------------------- | -------------- |
| Command bar (Ctrl+K) | Fuzzy search across papers, commands, settings | ✅ Implemented |
| Global filters       | Year range, citation count, edge type, venue   | ✅ Implemented |
| Paper list panel     | Sortable sidebar list of all visible papers    | ✅ Implemented |
| Search control       | In-graph search highlighting                   | ✅ Implemented |

### Authenticated Features

| Feature        | Implementation              | Status                    |
| -------------- | --------------------------- | ------------------------- |
| ORCID OAuth    | Custom Better Auth provider | ✅ Implemented            |
| Google OAuth   | Better Auth built-in        | ✅ Implemented            |
| Email/password | Better Auth built-in        | ✅ Implemented            |
| Projects       | Save/load graph sessions    | ✅ Implemented (UI only)  |
| Chat panel     | In-canvas AI chat interface | ✅ Implemented (UI shell) |
| Query builder  | Structured query interface  | 🚧 Coming Soon            |

### What's NOT Real

| Feature           | Reality                                            |
| ----------------- | -------------------------------------------------- |
| Paper database    | **Mock** — hardcoded arrays in `MockGraphProvider` |
| Evidence snippets | **Mock** — randomly generated from templates       |
| AI summaries      | **Mock** — template strings                        |
| Topic clusters    | **Mock** — hardcoded labels and colors             |
| Search results    | **Mock** — filtered from same hardcoded array      |
| Chat responses    | **UI shell only** — no LLM backend                 |
| Projects/saving   | **UI only** — no persistence layer                 |

---

## Competitor Profiles

### 1. Connected Papers

**URL:** connectedpapers.com  
**Data:** Semantic Scholar corpus  
**Users:** Not disclosed (very popular in academia)  
**Pricing:** Free (5 graphs/month) → $3–6/month for unlimited

**What it does:** Enter a paper → generates a visual graph of ~40–50 related papers based on **co-citation and bibliographic coupling** (NOT a direct citation tree). Uses Force-Directed Graph layout. Prior works / derivative works views available.

**Key differentiators:**

- Similarity-based connections (papers that share citation overlap), not just direct citations
- Analyzes ~50,000 papers per graph, selects strongest few dozen connections
- Clean, focused UI — one paper → one graph
- Prior Works / Derivative Works toggle

**Limitations:**

- No edge semantics (no supports/contradicts classification)
- No evidence snippets
- Limited to similarity graphs — cannot show argumentation
- No collaboration features
- No reference manager integration
- Graphs are ephemeral (no save/organize)

---

### 2. Litmaps

**URL:** litmaps.com  
**Data:** 270M+ papers (Semantic Scholar API + OpenAlex)  
**Users:** 350,000+  
**Pricing:** Free (limited) → $10/month (Researcher) → $50/team

**What it does:** Citation-based maps with a unique **date (x) vs citation count (y) scatter plot** visualization. Seed maps let you start from a single paper and discover connected literature. Zotero integration for library sync.

**Key differentiators:**

- Date × citation-count axis visualization (unique in the space)
- Seed maps from any paper
- Zotero sync (direct library import)
- Discovery feeds / monitoring for new papers
- Team collaboration features
- Annotation & tagging system

**Limitations:**

- Citation-based only — no argumentation/sentiment on edges
- No evidence-level snippets
- Visualization is 2D scatter, not force-directed network graph
- Less sophisticated graph layout than Connected Papers or Ithaca

---

### 3. Inciteful

**URL:** inciteful.xyz  
**Data:** 240M+ papers, 2B+ citations (OpenAlex)  
**Users:** Not disclosed  
**Pricing:** **Free** (open source, built in Rust)

**What it does:** Two main tools: **Paper Discovery** (enter a paper → get guided tour of citation network with "most important papers", "top authors", similar papers) and **Literature Connector** ("6 Degrees of Einstein" — find a path between any two papers through the citation network).

**Key differentiators:**

- **Literature Connector** — path finding through citation networks (closest to Ithaca's pathfinding)
- Link prediction algorithms (social-network-style "friend of friend" suggestions)
- BibTeX import → instant graph generation
- Zotero/Mendeley export
- Completely free and open source
- Built in Rust (fast)

**Limitations:**

- Citation connections only — no supports/contradicts classification
- The Literature Connector finds citation paths, not argumentation paths
- Minimal visualization (tables > graphs)
- No evidence snippets or sentiment analysis
- Simple UI compared to Ithaca's canvas

---

### 4. Semantic Scholar

**URL:** semanticscholar.org  
**Data:** 214M papers, 2.49B citations, 79M authors  
**Users:** Millions (powers many other tools)  
**Pricing:** **Free** (non-profit, Allen Institute for AI)

**What it does:** The largest open academic search engine. TLDR summaries, SPECTER2 embeddings for paper similarity, recommendations, citation context, Semantic Reader, Scholar's Hub, and a comprehensive **free API** (Academic Graph API, Recommendations API, Datasets API).

**Key differentiators:**

- **Foundation layer** — Semantic Scholar's API powers Connected Papers, Litmaps, and ResearchRabbit
- SPECTER2 embeddings for semantic similarity
- Free API with generous limits (100 req/sec authenticated)
- Open research datasets (full corpus dumps)
- TLDR auto-summaries
- Semantic Reader (augmented PDF reading)

**Limitations:**

- Search engine, not a visualization tool
- No graph visualization at all
- Citation context is basic (not classified as supports/contradicts)
- Recommendations exist but are list-based

---

### 5. ResearchRabbit

**URL:** researchrabbitapp.com  
**Data:** 270M+ papers  
**Users:** 1,000,000+  
**Pricing:** **Free** (stated as forever free)

**What it does:** "Spotify for research papers." Collection-based discovery engine: add papers to collections → get adaptive recommendations. Interactive visual maps of paper networks. Author network visualization.

**Key differentiators:**

- Collection-based workflow (build library → get recommendations)
- Adaptive algorithms that learn from your collection
- Author network visualization (who knows who)
- Interactive visual maps with timeline
- "Similar work" / "All references" / "All citations" views per paper
- Completely free
- Zotero integration

**Limitations:**

- Visual maps are simpler than force-directed graphs
- No edge semantics (no supports/contradicts)
- No evidence snippets or citation classification
- No pathfinding
- No export of graph data (only paper lists)
- Recommendation-first, not exploration-first

---

### 6. Scite.ai

**URL:** scite.ai  
**Data:** 1.5B+ Smart Citations from 200M+ sources  
**Users:** 2,000,000+  
**Pricing:** Free (limited) → $20/month (Individual) → $144/year  
**Publishers:** 30+ partnerships (Wiley, Springer Nature, etc.)

**What it does:** The **only product that classifies citation context** — every citation is tagged as **supporting**, **contrasting**, or **mentioning** with the actual citing sentence extracted. AI Assistant for Q&A. Reference Check for manuscripts. Dashboards for institutional metrics.

**Key differentiators:**

- **Smart Citations** — 1.5B+ citations classified into supporting/contrasting/mentioning (closest to Ithaca's edge types)
- Actual citing sentences extracted (closest to Ithaca's evidence snippets)
- Reference Check — paste your manuscript, see if your citations actually support your claims
- Publisher partnerships for full-text access
- Institutional dashboards
- AI Assistant (chat with papers)

**Limitations:**

- **No graph visualization** — results are lists/tables, not networks
- Classification is citation-level, not graph-path-level
- No pathfinding between papers
- No network exploration or expansion
- Paid product (no free tier beyond very limited)
- Cannot visualize argumentation chains (only individual citation contexts)

---

### 7. Open Knowledge Maps

**URL:** openknowledgemaps.org  
**Data:** PubMed, BASE (200M+ documents)  
**Users:** 2,000,000+ (claimed)  
**Pricing:** **Free** (non-profit)

**What it does:** Enter a search query → get an AI-generated **knowledge map** with bubble clusters representing sub-topics. Papers inside each bubble. Highlights open-access availability.

**Key differentiators:**

- NLP-based topic clustering (not citation-based)
- Bubble/treemap visualization style (unique)
- Open-access vs closed-access visual indicators
- Open source (Headstart framework on GitHub)
- Non-profit, free access

**Limitations:**

- Not a citation/network graph — it's a topic clustering map
- No edges between papers (no relationships shown)
- No argumentation analysis
- No pathfinding
- Static maps (no interactive expansion)
- Limited to PubMed + BASE data sources

---

### 8. Citation Gecko

**URL:** citationgecko.com  
**Data:** Semantic Scholar, Crossref, OpenCitations  
**Pricing:** **Free** (open source)

**What it does:** Enter seed papers → see their citation network. Simple tool for discovering papers through direct citation links.

**Key differentiators:**

- Seed-paper workflow (simple and clear)
- Citation network visualization
- Cross-checking multiple data sources
- Open source

**Limitations:**

- Very basic visualization
- No edge semantics
- No clustering or AI features
- Limited development/maintenance
- Smallest feature set among competitors

---

### 9. VOSviewer

**URL:** vosviewer.com  
**Data:** Web of Science, Scopus, Dimensions, OpenAlex, Crossref, Europe PMC  
**Users:** Standard academic bibliometrics tool  
**Pricing:** **Free** (desktop application + web beta)

**What it does:** The gold standard for **bibliometric network analysis**. Three types of networks: co-authorship, co-citation/bibliographic coupling, and keyword co-occurrence. Density and overlay visualizations. Advanced clustering algorithms.

**Key differentiators:**

- Most sophisticated bibliometric visualization tool available
- Multiple network types (author, keyword, citation, journal)
- Density visualization (heatmaps)
- Overlay visualization (color by year, citations, etc.)
- NLP-based term extraction and co-occurrence networks
- Thesaurus feature for data cleaning
- Handles very large networks (>100K items)
- Direct import from Web of Science, Scopus, Dimensions, OpenAlex

**Limitations:**

- **Desktop application** (not web-native)
- Bibliometric focus — designed for meta-analysis, not individual paper exploration
- No argumentation or citation sentiment
- No evidence snippets
- Steep learning curve
- Batch processing model — upload data → generate map (not live exploration)

---

### 10. Elicit

**URL:** elicit.com  
**Data:** 138M papers + 545K clinical trials  
**Users:** 5,000,000+  
**Pricing:** Free (limited) → $10/month → Enterprise

**What it does:** AI-powered systematic review automation. Semantic search → data extraction → structured tables → research reports. Up to 1,000 papers per search, 20,000 data points extracted at once. 99.4% data extraction accuracy demonstrated.

**Key differentiators:**

- **Systematic review automation** (screening + extraction)
- AI-generated research reports (customizable, multi-paper)
- Sentence-level citations in all AI output
- Rich interactive tables (not just chat)
- Research alerts for new publications
- Multi-step workflows (not just search → answer)
- Strong accuracy validation

**Limitations:**

- **No visualization at all** — tables and text only
- No graph or network view
- No argumentation graph
- Not designed for exploration (designed for structured review)
- Paid for serious use

---

### 11. Consensus

**URL:** consensus.app  
**Data:** 250M+ papers (including licensed full-text from Wiley, Taylor & Francis, SAGE, ACS)  
**Users:** 10,000,000+  
**Pricing:** Free (limited) → $8.99/month → Enterprise

**What it does:** Ask a research question → get an evidence-based answer with **Consensus Meter** (shows % of papers agreeing/disagreeing). Deep Search for comprehensive reviews. Medical mode for clinical evidence. Natural language filters.

**Key differentiators:**

- **Consensus Meter** — visual aggregation of agreement/disagreement across studies
- Licensed full-text access from major publishers
- Natural language filtering ("large studies from last 5 years on X")
- Medical mode (~50K clinical guidelines + 8M top-journal articles)
- 170+ university library partnerships
- Deep Search for multi-step literature reviews

**Limitations:**

- No visualization — answers are text/list based
- No graph or network view
- No individual citation classification (aggregate consensus only)
- No exploration/expansion workflow
- Cannot trace specific argumentation chains

---

### 12. Iris.ai

**URL:** iris.ai  
**Data:** 160M+ documents (enterprise-ingested)  
**Pricing:** Enterprise only (custom pricing, 30–90 day onboarding)

**What it does:** Enterprise RAG platform for corporate R&D. Not a consumer tool — built for L'Oréal, Mercedes-Benz, ArcelorMittal, NATO. Agentic AI workflows tailored to enterprise use cases.

**Not a direct competitor** — different market segment entirely. Included for completeness.

---

## Feature Matrix

### Core Comparison (✅ = Implemented | 🟡 = Partial | ❌ = Not Available | 🔮 = Mock/Planned)

| Feature                 | Ithaca                          | Connected Papers | Litmaps          | Inciteful               | Semantic Scholar | ResearchRabbit | Scite.ai                  | Open Knowledge Maps | Citation Gecko | VOSviewer   | Elicit            | Consensus    |
| ----------------------- | ------------------------------- | ---------------- | ---------------- | ----------------------- | ---------------- | -------------- | ------------------------- | ------------------- | -------------- | ----------- | ----------------- | ------------ |
| **DATA**                |
| Real paper database     | 🔮 Mock                         | ✅ ~200M         | ✅ 270M+         | ✅ 240M+                | ✅ 214M          | ✅ 270M+       | ✅ 200M+                  | ✅ 200M+            | ✅ via APIs    | ✅ varies   | ✅ 138M           | ✅ 250M+     |
| Real-time data          | ❌                              | ✅               | ✅               | ✅                      | ✅               | ✅             | ✅                        | ✅                  | ✅             | ❌ batch    | ✅                | ✅           |
| Full-text access        | ❌                              | ❌               | ❌               | ❌                      | 🟡 OA only       | ❌             | ✅ 30+ publishers         | 🟡 OA flagged       | ❌             | ❌          | 🟡                | ✅ licensed  |
| API available           | ❌                              | ❌               | ❌               | ❌                      | ✅ Free          | ❌             | ✅ Paid                   | ❌                  | ❌             | ❌          | ✅ Paid           | ❌           |
| **VISUALIZATION**       |
| Force-directed graph    | ✅ ForceAtlas2                  | ✅ FDG           | ❌               | ❌                      | ❌               | 🟡 simple      | ❌                        | ❌                  | 🟡 basic       | ✅ advanced | ❌                | ❌           |
| Citation network        | 🔮                              | 🟡 similarity    | ✅               | ✅                      | ❌               | ✅             | ❌                        | ❌                  | ✅             | ✅          | ❌                | ❌           |
| Timeline view           | ❌                              | 🟡 prior/derived | ✅ (x-axis=date) | ❌                      | ❌               | ✅             | ❌                        | ❌                  | ❌             | ✅ overlay  | ❌                | ❌           |
| Topic clustering        | 🔮                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ✅ (core feature)   | ❌             | ✅          | ❌                | ❌           |
| Density/heatmap         | ❌                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ✅          | ❌                | ❌           |
| Interactive expansion   | 🔮                              | ❌               | ✅ seed maps     | ✅                      | ❌               | ✅             | ❌                        | ❌                  | ✅             | ❌          | ❌                | ❌           |
| **EDGE SEMANTICS**      |
| Argumentation typing    | 🔮 supports/contradicts/extends | ❌               | ❌               | ❌                      | ❌               | ❌             | 🟡 sup/con/mention (list) | ❌                  | ❌             | ❌          | ❌                | ❌           |
| Confidence scores       | 🔮 0–1 per edge                 | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ❌          | ❌                | ❌           |
| Evidence snippets       | 🔮                              | ❌               | ❌               | ❌                      | 🟡 basic context | ❌             | ✅ citing sentences       | ❌                  | ❌             | ❌          | ✅ sentence-level | ❌           |
| Citation classification | 🔮                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ✅ (core feature)         | ❌                  | ❌             | ❌          | ❌                | 🟡 aggregate |
| **PATHFINDING**         |
| Semantic pathfinding    | ✅ 3 modes                      | ❌               | ❌               | ✅ Literature Connector | ❌               | ❌             | ❌                        | ❌                  | ❌             | ❌          | ❌                | ❌           |
| Conflict trail          | ✅                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ❌          | ❌                | ❌           |
| Consensus lineage       | ✅                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ❌          | ❌                | ❌           |
| **AI FEATURES**         |
| AI Chat                 | 🔮 UI shell                     | ❌               | ❌               | ❌                      | ❌               | ❌             | ✅ AI Assistant           | ❌                  | ❌             | ❌          | ✅                | ✅           |
| AI Summaries            | 🔮                              | ❌               | ❌               | ❌                      | ✅ TLDR          | ❌             | ❌                        | ❌                  | ❌             | ❌          | ✅ reports        | ✅ answers   |
| Recommendations         | ❌                              | ❌               | ✅ discover      | ✅ similar              | ✅               | ✅ adaptive    | ❌                        | ❌                  | ❌             | ❌          | ❌                | ❌           |
| Monitoring/Alerts       | ❌                              | ❌               | ✅               | ❌                      | ✅               | ❌             | ✅                        | ❌                  | ❌             | ❌          | ✅                | ❌           |
| **EXPORT**              |
| PNG/SVG                 | ✅ with legend                  | ❌               | ✅               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ✅          | ❌                | ❌           |
| GraphML/JSON            | ✅                              | ❌               | ❌               | ❌                      | ✅ API           | ❌             | ❌                        | ❌                  | ❌             | ✅          | ❌                | ❌           |
| CSV                     | ✅                              | ❌               | ✅               | ❌                      | ❌               | ❌             | ✅                        | ❌                  | ❌             | ✅          | ✅                | ❌           |
| PDF report              | ✅                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ❌          | ✅                | ❌           |
| BibTeX                  | ❌                              | ❌               | ❌               | ✅ import               | ❌               | ❌             | ✅                        | ❌                  | ❌             | ❌          | ✅                | ❌           |
| **INTEGRATIONS**        |
| Zotero                  | ❌                              | ❌               | ✅ sync          | ✅ export               | ❌               | ✅             | ✅                        | ❌                  | ❌             | ❌          | ❌                | ❌           |
| Mendeley                | ❌                              | ❌               | ❌               | ✅ export               | ❌               | ❌             | ❌                        | ❌                  | ❌             | ❌          | ❌                | ❌           |
| Web of Science          | ❌                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ✅          | ❌                | ❌           |
| Scopus                  | ❌                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ✅          | ❌                | ❌           |
| **PLATFORM**            |
| Web app                 | ✅                              | ✅               | ✅               | ✅                      | ✅               | ✅             | ✅                        | ✅                  | ✅             | 🟡 beta     | ✅                | ✅           |
| Desktop app             | ❌                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ✅ primary  | ❌                | ❌           |
| Open source             | ❌                              | ❌               | ❌               | ✅                      | 🟡 data/models   | ❌             | ❌                        | ✅                  | ✅             | ✅          | ❌                | ❌           |
| Free tier               | ✅                              | 🟡 5/month       | 🟡 limited       | ✅                      | ✅               | ✅             | 🟡 very limited           | ✅                  | ✅             | ✅          | 🟡 limited        | 🟡 limited   |
| ORCID auth              | ✅                              | ❌               | ❌               | ❌                      | ❌               | ❌             | ❌                        | ❌                  | ❌             | ❌          | ❌                | ❌           |

---

## Deep Comparison by Category

### A. Graph Visualization Quality

**Tier 1 — Sophisticated:**

- **VOSviewer**: Most mature. Handles 100K+ nodes. Density/overlay views. But desktop-only and batch-oriented.
- **Ithaca**: ForceAtlas2 physics, edge labeling, evidence popovers, multi-select, zoom indicator, keyboard shortcuts. Best canvas UX design. But no real data.
- **Connected Papers**: Clean FDG, but fixed ~50 nodes, no interactivity beyond hover/click.

**Tier 2 — Functional:**

- **Litmaps**: Unique date×citation scatter. Great for temporal analysis. Not a network graph.
- **ResearchRabbit**: Simple visual maps. More for orientation than deep analysis.
- **Citation Gecko**: Minimal graph renderer.

**Tier 3 — No Graph:**

- Scite.ai, Elicit, Consensus, Semantic Scholar — all list/table/text UIs.

**Verdict:** Ithaca has the most feature-rich canvas design in the space. The ForceAtlas2 + edge labels + evidence popovers + path comparison + multi-select + export system is unmatched by any web-based competitor. **If it had real data, it would be the best graph visualization tool in this market.**

---

### B. Edge Semantics & Argumentation

This is Ithaca's core thesis. Here's where every competitor stands:

| Product              | Edge Meaning                                      | Depth                                   |
| -------------------- | ------------------------------------------------- | --------------------------------------- |
| **Ithaca**           | supports / contradicts / extends + confidence 0–1 | Per-edge classification on graph        |
| **Scite.ai**         | supporting / contrasting / mentioning             | Per-citation classification in lists    |
| **Consensus**        | Consensus Meter (% agree/disagree)                | Aggregate across all papers for a query |
| **Connected Papers** | Co-citation similarity (0–1 weight)               | No semantic classification              |
| **Litmaps**          | Citation link (cites / cited-by)                  | No semantic classification              |
| **Inciteful**        | Citation link                                     | No semantic classification              |
| **All others**       | None / N/A                                        | —                                       |

**Analysis:**

- **Scite.ai** is the closest competitor on citation classification. They have **1.5B classified citations** with actual citing sentences. But they present this as a list/table — no network graph. You cannot visualize an argumentation chain.
- **Consensus** aggregates agreement/disagreement but doesn't classify individual citations or show the graph.
- **Ithaca is the only product that combines argumentation classification WITH graph visualization.** You can see that Paper A supports Paper B (green edge, 0.87 confidence), which contradicts Paper C (red edge, 0.72 confidence), and trace that chain visually.

**The gap:** Scite has the classified data but no graph. Connected Papers has the graph but no classification. Ithaca has the graph + classification design but no real data. Whoever fills their gap first wins this niche.

---

### C. Pathfinding & Discovery

| Product              | Pathfinding                                  | Mechanism                                 |
| -------------------- | -------------------------------------------- | ----------------------------------------- |
| **Ithaca**           | ✅ 3 modes (shortest / conflict / consensus) | Dijkstra's with mode-based edge weighting |
| **Inciteful**        | ✅ Literature Connector                      | Citation chain (A→B→C via citations)      |
| **Connected Papers** | ❌                                           | No path concept                           |
| **Litmaps**          | ❌                                           | No path concept                           |
| **All others**       | ❌                                           | No path concept                           |

**Ithaca's pathfinding is genuinely unique:**

- **Conflict Trail mode**: Sets contradicts edges to weight 1, all others to 20. Finds the path with the most disagreement.
- **Consensus Lineage mode**: Sets contradicts to weight 50, supports/extends to 1. Finds the chain of agreement.
- No other product offers mode-based semantic pathfinding.

**Inciteful's Literature Connector** is the only comparable feature, but it finds paths through citation links only (A cites B cites C), with no semantic weighting. It cannot find "the chain of disagreement" or "the lineage of support."

---

### D. Data Scale & Reality

| Product             | Paper Count  | Citation Count  | Data Source                 | Real-time? |
| ------------------- | ------------ | --------------- | --------------------------- | ---------- |
| Semantic Scholar    | 214M         | 2.49B           | Own corpus                  | ✅         |
| Consensus           | 250M+        | N/A             | Licensed full-text          | ✅         |
| Litmaps             | 270M+        | N/A             | Semantic Scholar + OpenAlex | ✅         |
| ResearchRabbit      | 270M+        | N/A             | Semantic Scholar            | ✅         |
| Inciteful           | 240M+        | 2B+             | OpenAlex                    | ✅         |
| Scite.ai            | 200M+        | 1.5B classified | Publisher partnerships      | ✅         |
| Open Knowledge Maps | 200M+        | N/A             | PubMed + BASE               | ✅         |
| Elicit              | 138M         | N/A             | Own index                   | ✅         |
| Connected Papers    | ~200M        | N/A             | Semantic Scholar            | ✅         |
| VOSviewer           | Varies       | Varies          | User uploads                | ❌ batch   |
| Citation Gecko      | Varies       | Varies          | S2 + Crossref               | ✅         |
| **Ithaca**          | **~50 mock** | **~100 mock**   | **Hardcoded arrays**        | **❌**     |

**This is the single biggest gap.** Every competitor has access to 100M+ real papers. Ithaca has zero. The `MockGraphProvider` class contains hardcoded arrays of ~20 paper titles, ~15 author names, and ~10 venue strings, from which it procedurally generates random graphs.

---

### E. Reference Manager Integration

| Product        | Zotero    | Mendeley  | BibTeX    | EndNote |
| -------------- | --------- | --------- | --------- | ------- |
| Litmaps        | ✅ sync   | ❌        | ❌        | ❌      |
| ResearchRabbit | ✅        | ❌        | ❌        | ❌      |
| Inciteful      | ✅ export | ✅ export | ✅ import | ❌      |
| Scite.ai       | ✅        | ❌        | ✅        | ✅      |
| Elicit         | ❌        | ❌        | ✅        | ❌      |
| **Ithaca**     | **❌**    | **❌**    | **❌**    | **❌**  |

**Ithaca has zero reference manager integration.** This is table-stakes for academic tools.

---

### F. AI & Intelligence Features

| Product          | AI Chat         | AI Summaries | AI Reports           | Smart Search  | Consensus Meter |
| ---------------- | --------------- | ------------ | -------------------- | ------------- | --------------- |
| Elicit           | ❌              | ✅           | ✅ (up to 80 papers) | ✅ semantic   | ❌              |
| Consensus        | ✅              | ✅           | ✅ Deep Search       | ✅ NL filters | ✅              |
| Scite.ai         | ✅ AI Assistant | ❌           | ❌                   | ✅            | ❌              |
| Semantic Scholar | ❌              | ✅ TLDR      | ❌                   | ✅ SPECTER2   | ❌              |
| **Ithaca**       | 🔮 UI shell     | 🔮 Mock      | ❌                   | 🔮 Mock       | ❌              |

**Ithaca's chat panel and AI summaries are empty shells.** The chat panel renders UI components but has no LLM backend. The `aiSummary` field on `PaperNode` is populated with template strings.

---

## Ithaca's Unique Positioning

### Things ONLY Ithaca Does (no competitor)

1. **Argumentation-aware graph visualization** — Edges classified as supports/contradicts/extends displayed as a force-directed network with confidence scores. Scite has classification in lists; Connected Papers has graphs without classification. Ithaca is the only product that puts both together.

2. **Mode-based semantic pathfinding** — Three Dijkstra modes (shortest/conflict/consensus) that weight edges by argumentation type. Inciteful has citation-chain pathfinding but no semantic weighting.

3. **Evidence popovers on edges** — Click an edge → see the actual evidence snippets with source context and confidence. No competitor shows evidence at the edge level in a graph.

4. **Path comparison view** — Side-by-side comparison of multiple semantic paths with statistics. Entirely unique.

5. **Comprehensive graph export** — 6 formats (PNG with legend/branding, SVG, GraphML, JSON, CSV, PDF with multi-page report). Most competitors offer 0–2 export formats.

6. **ORCID-native authentication** — Custom ORCID OAuth integration. No competitor uses ORCID for auth (they all use Google/email or institutional SSO).

### Things Ithaca Does Better Than Most

7. **Canvas interaction model** — ForceAtlas2 physics toggle, multi-select with selection panel, keyboard shortcuts, overlay zones, error boundary — the most polished graph canvas among web-based tools.

8. **Export quality** — PNG/SVG exports include metadata headers, color legends, and branding. PDF exports have cover pages and paper tables. No competitor's export is this polished.

### Things That Are Theoretically Good But Currently Fake

9. **AI summaries per paper** — `aiSummary` field exists on every node but is template text.
10. **Topic clustering** — Cluster system works but clusters are randomly assigned.
11. **Evidence snippets** — Data model supports rich evidence but snippets are generated.
12. **Node expansion** — The `expandNode` API exists with type filtering but returns random data.

---

## Critical Gaps

Ranked by severity (what would matter most to a user choosing between Ithaca and a competitor):

### 1. NO REAL DATA (Severity: 🔴 Fatal)

Every competitor has 100M–270M real papers. Ithaca has 0. This makes every other feature comparison academic. A researcher cannot use Ithaca for actual work.

**To fix:** Integrate with OpenAlex (free, 250M+ works, REST API, no auth required for basic use) or Semantic Scholar API (free, 214M papers, 100 req/sec authenticated). The `IGraphProvider` adapter pattern is already in place — implement `OpenAlexProvider` or `SemanticScholarProvider`.

### 2. NO CITATION CLASSIFICATION PIPELINE (Severity: 🔴 Critical)

Ithaca's entire value proposition is argumentation-aware edges. But there is no NLP pipeline to actually classify citations as supports/contradicts/extends. Scite.ai has spent years and publisher partnerships building their Smart Citations. Ithaca needs either:

- A fine-tuned LLM classifier (e.g., SciBERT/SPECTER2 + custom head)
- Integration with Scite.ai's API (exists, paid)
- An LLM-in-the-loop approach (send citing context to GPT-4/Claude, get classification)

### 3. NO REFERENCE MANAGER INTEGRATION (Severity: 🟡 High)

Zero integration with Zotero, Mendeley, or BibTeX. This is table-stakes — Litmaps, Inciteful, ResearchRabbit, and Scite all have it. Researchers live in reference managers.

### 4. NO MONITORING / ALERTS (Severity: 🟡 Medium)

Litmaps, Semantic Scholar, Scite, and Elicit all offer alerts when new papers appear. Ithaca has no alerting system.

### 5. NO REAL AI BACKEND (Severity: 🟡 Medium)

Chat panel is a shell. AI summaries are templates. The tools that do have AI (Elicit, Consensus, Scite) have invested heavily in LLM pipelines with citation grounding.

### 6. NO COLLABORATION (Severity: 🟢 Lower priority)

No shared workspaces, team features, or shareable links. Litmaps has team plans. But this can come later.

---

## Strategic Recommendations

### Where to Compete

Ithaca should NOT try to be another Semantic Scholar, Elicit, or Consensus. Those are well-funded products with massive data pipelines (Semantic Scholar = Allen Institute, Elicit = $72M+ raised, Consensus = 10M+ users).

**Ithaca's wedge is the intersection that nobody occupies:**

```
                    Graph Visualization
                          |
    Connected Papers ←————|————→ VOSviewer
                          |
                    Ithaca ★
                          |
    Scite.ai ←————————————|————→ Inciteful
                          |
                  Citation Intelligence
```

The strategy should be:

1. **Get real data** (OpenAlex API — free, 250M+ papers, no commercial restrictions)
2. **Build a citation classification pipeline** (LLM-in-the-loop with GPT-4o-mini for speed, upgrade later)
3. **Keep the graph visualization best-in-class** (it already is, by design)
4. **Add Zotero integration** (their API is well-documented, community expects it)
5. **Ship the pathfinding on real data** — this is the killer demo. "Find the chain of disagreement between these two papers" is something no one else can do.

### Competitive Moat Assessment

| Moat Type               | Ithaca's Position                                                  |
| ----------------------- | ------------------------------------------------------------------ |
| Data scale              | ❌ None (vs 200M+ at 6 competitors)                                |
| Network effects         | ❌ None (vs 1M+ users at ResearchRabbit, 10M+ at Consensus)        |
| Publisher relationships | ❌ None (vs 30+ at Scite)                                          |
| Technical novelty       | ✅ **Argumentation graph + semantic pathfinding**                  |
| UX quality              | ✅ **Best graph canvas in the space**                              |
| Open source             | ❌ Not open source (Inciteful, OKM, VOSviewer, Citation Gecko are) |

**Bottom line:** Ithaca has genuine technical novelty in its argumentation graph concept and the best canvas UX, but zero data moat. The first priority must be connecting to real data — everything else is secondary. With OpenAlex (free, no API key needed for basic use, permissive license) + an LLM classification step, Ithaca could have a working MVP that does something no competitor can: **visualize the argumentation structure of a research field as an interactive graph with semantic pathfinding.**

---

_This analysis is based on public product information and Ithaca codebase audit as of July 2025. Competitor features and pricing may have changed._
