import type Graph from "graphology";
import type { PaperNode, EdgeData } from "@/lib/api/graph-api";

export interface DebateReportClaim {
  citingId: string;
  citedId: string;
  citingTitle: string;
  citedTitle: string;
  citingYear?: number;
  citedYear?: number;
  edgeType: string;
  confidence: number;
  signalSource?: string;
  provider?: string;
  evidence: string[];
  corrected: boolean;
}

export interface DebateReport {
  title: string;
  query?: string;
  generatedAt: string;
  contestedClaims: DebateReportClaim[];
  corrections: DebateReportClaim[];
  uncertainClaims: DebateReportClaim[];
}

export interface DebateMatrixRow {
  id: string;
  sourceId: string;
  targetId: string;
  citingPaper: string;
  citingAuthors?: string;
  citingYear?: number;
  targetPaper: string;
  targetAuthors?: string;
  targetYear?: number;
  edgeType: "contradicts" | "supports" | "extends" | "cites";
  confidence: number;
  methodologyOrContext: string;
  coreClaimOrSnippet: string;
  signalSource?: string;
}

export interface DebateMatrix {
  title: string;
  topic?: string;
  generatedAt: string;
  rows: DebateMatrixRow[];
  totalDisputes: number;
  totalConfirmations: number;
}

function nodeLabel(graph: Graph, id: string): { title: string; year?: number } {
  if (!graph.hasNode(id)) return { title: id };
  const attrs = graph.getNodeAttributes(id);
  return {
    title: String(attrs.title || attrs.label || id),
    year: typeof attrs.year === "number" ? attrs.year : undefined,
  };
}

function evidenceFromAttrs(attrs: Record<string, unknown>): string[] {
  const evidence: string[] = [];
  const contexts = attrs.contexts;
  if (Array.isArray(contexts)) {
    for (const ctx of contexts) {
      if (typeof ctx === "string" && ctx.trim()) evidence.push(ctx.trim());
    }
  }
  if (typeof attrs.snippet === "string" && attrs.snippet.trim()) {
    evidence.push(attrs.snippet.trim());
  }
  return evidence.slice(0, 5);
}

function isContested(attrs: Record<string, unknown>): boolean {
  const type = String(attrs.edgeType || "");
  const provider = String(attrs.provider || "");
  const signal = String(attrs.signalSource || "");
  const confidence = Number(attrs.confidence ?? 0);
  const normalizedConfidence = confidence > 1 ? confidence / 100 : confidence;

  return (
    type === "contradicts" ||
    provider === "user-correction" ||
    signal === "user-correction" ||
    (normalizedConfidence > 0 && normalizedConfidence < 0.5)
  );
}

export function buildDebateReport(
  graph: Graph,
  options: { title?: string; query?: string } = {},
): DebateReport {
  const contestedClaims: DebateReportClaim[] = [];
  const corrections: DebateReportClaim[] = [];
  const uncertainClaims: DebateReportClaim[] = [];

  graph.forEachEdge((edge, attrs, source, target) => {
    if (attrs.hidden) return;
    if (!isContested(attrs as Record<string, unknown>)) return;

    const citing = nodeLabel(graph, source);
    const cited = nodeLabel(graph, target);
    const confidenceRaw = Number(attrs.confidence ?? 0);
    const confidence =
      confidenceRaw > 1
        ? Math.round(confidenceRaw)
        : Math.round(confidenceRaw * 100);
    const provider = String(attrs.provider || "");
    const signal = String(attrs.signalSource || "");
    const corrected =
      provider === "user-correction" || signal === "user-correction";

    const claim: DebateReportClaim = {
      citingId: source,
      citedId: target,
      citingTitle: citing.title,
      citedTitle: cited.title,
      citingYear: citing.year,
      citedYear: cited.year,
      edgeType: String(attrs.edgeType || "unknown"),
      confidence,
      signalSource: signal || undefined,
      provider: provider || undefined,
      evidence: evidenceFromAttrs(attrs as Record<string, unknown>),
      corrected,
    };

    contestedClaims.push(claim);
    if (corrected) corrections.push(claim);
    if (!corrected && confidence < 50) uncertainClaims.push(claim);
  });

  contestedClaims.sort((a, b) => {
    if (a.edgeType === "contradicts" && b.edgeType !== "contradicts") return -1;
    if (b.edgeType === "contradicts" && a.edgeType !== "contradicts") return 1;
    return a.confidence - b.confidence;
  });

  return {
    title: options.title || "Debate Report",
    query: options.query,
    generatedAt: new Date().toISOString(),
    contestedClaims,
    corrections,
    uncertainClaims,
  };
}

function formatClaim(claim: DebateReportClaim, index: number): string {
  const citingYear = claim.citingYear ? ` (${claim.citingYear})` : "";
  const citedYear = claim.citedYear ? ` (${claim.citedYear})` : "";
  const lines = [
    `### ${index}. ${claim.edgeType} — ${claim.confidence}% confidence`,
    "",
    `- **From:** ${claim.citingTitle}${citingYear}`,
    `- **To:** ${claim.citedTitle}${citedYear}`,
    claim.corrected ? "- **Status:** Human corrected" : undefined,
    claim.signalSource ? `- **Signal:** ${claim.signalSource}` : undefined,
    "",
  ].filter(Boolean) as string[];

  if (claim.evidence.length > 0) {
    lines.push("**Evidence**", "");
    for (const snippet of claim.evidence) {
      lines.push(`> ${snippet}`, "");
    }
  } else {
    lines.push("_No citation sentence available._", "");
  }

  return lines.join("\n");
}

export function renderDebateReportMarkdown(report: DebateReport): string {
  const sections = [
    `# ${report.title}`,
    "",
    `Generated ${report.generatedAt}`,
    report.query ? `Query: ${report.query}` : undefined,
    "",
    "## Summary",
    "",
    `- Contested claims: ${report.contestedClaims.length}`,
    `- Human corrections: ${report.corrections.length}`,
    `- Uncertain (low confidence): ${report.uncertainClaims.length}`,
    "",
    "## Contested claims",
    "",
  ].filter((line) => line !== undefined);

  if (report.contestedClaims.length === 0) {
    sections.push("_No contested or uncertain claims in this graph._", "");
  } else {
    report.contestedClaims.forEach((claim, index) => {
      sections.push(formatClaim(claim, index + 1));
    });
  }

  sections.push("## Corrections", "");
  if (report.corrections.length === 0) {
    sections.push("_No human corrections recorded on this map._", "");
  } else {
    report.corrections.forEach((claim, index) => {
      sections.push(formatClaim(claim, index + 1));
    });
  }

  sections.push(
    "---",
    "",
    "_Exported from Ithaca — argumentation-aware citation map._",
    "",
  );

  return sections.join("\n");
}

/**
 * Generates a structured Debate Matrix from Graphology graph
 */
export function generateDebateMatrixFromGraph(
  graph: Graph,
  options: { title?: string; topic?: string } = {},
): DebateMatrix {
  const rows: DebateMatrixRow[] = [];
  let totalDisputes = 0;
  let totalConfirmations = 0;

  graph.forEachEdge((edge, attrs, source, target) => {
    if (attrs.hidden) return;
    const type = String(attrs.edgeType || "cites");
    if (type !== "contradicts" && type !== "supports" && type !== "extends")
      return;

    if (type === "contradicts") totalDisputes++;
    if (type === "supports") totalConfirmations++;

    const citing = graph.hasNode(source) ? graph.getNodeAttributes(source) : {};
    const targetAttrs = graph.hasNode(target)
      ? graph.getNodeAttributes(target)
      : {};

    const confidenceRaw = Number(attrs.confidence ?? 0);
    const confidence =
      confidenceRaw > 1
        ? Math.round(confidenceRaw)
        : Math.round(confidenceRaw * 100);

    const contexts =
      Array.isArray(attrs.contexts) && attrs.contexts.length > 0
        ? attrs.contexts[0]
        : "";
    const snippet = String(
      attrs.snippet ||
        contexts ||
        "Citation relationship identified in topology.",
    );

    rows.push({
      id: `matrix-${edge}`,
      sourceId: source,
      targetId: target,
      citingPaper: String(citing.title || citing.label || source),
      citingAuthors: citing.authors ? String(citing.authors) : undefined,
      citingYear: typeof citing.year === "number" ? citing.year : undefined,
      targetPaper: String(targetAttrs.title || targetAttrs.label || target),
      targetAuthors: targetAttrs.authors
        ? String(targetAttrs.authors)
        : undefined,
      targetYear:
        typeof targetAttrs.year === "number" ? targetAttrs.year : undefined,
      edgeType: type as DebateMatrixRow["edgeType"],
      confidence,
      methodologyOrContext:
        contexts || String(attrs.provider || "Empirical Citation"),
      coreClaimOrSnippet: snippet,
      signalSource: attrs.signalSource ? String(attrs.signalSource) : undefined,
    });
  });

  // Sort rows: refutations first, then confirmations, ordered by confidence
  rows.sort((a, b) => {
    if (a.edgeType === "contradicts" && b.edgeType !== "contradicts") return -1;
    if (b.edgeType === "contradicts" && a.edgeType !== "contradicts") return 1;
    return b.confidence - a.confidence;
  });

  return {
    title: options.title || "Academic Debate Matrix",
    topic: options.topic,
    generatedAt: new Date().toISOString(),
    rows,
    totalDisputes,
    totalConfirmations,
  };
}

/**
 * Generates a structured Debate Matrix from raw nodes and edges arrays
 */
export function generateDebateMatrix(
  nodes: PaperNode[],
  edges: EdgeData[],
  options: { title?: string; topic?: string } = {},
): DebateMatrix {
  const nodeMap = new Map<string, PaperNode>(nodes.map((n) => [n.id, n]));
  const rows: DebateMatrixRow[] = [];
  let totalDisputes = 0;
  let totalConfirmations = 0;

  edges.forEach((edge) => {
    const type = edge.edgeType;
    if (type !== "contradicts" && type !== "supports" && type !== "extends")
      return;

    if (type === "contradicts") totalDisputes++;
    if (type === "supports") totalConfirmations++;

    const citing = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    const confidenceRaw = Number(edge.confidence ?? 0);
    const confidence =
      confidenceRaw > 1
        ? Math.round(confidenceRaw)
        : Math.round(confidenceRaw * 100);

    const contexts =
      (edge as any).contexts &&
      Array.isArray((edge as any).contexts) &&
      (edge as any).contexts.length > 0
        ? (edge as any).contexts[0]
        : "";
    const snippet =
      edge.snippet ||
      contexts ||
      "Citation relationship identified in topology.";

    rows.push({
      id: `matrix-${edge.id}`,
      sourceId: edge.source,
      targetId: edge.target,
      citingPaper: citing?.title || citing?.label || edge.source,
      citingAuthors: citing?.authors,
      citingYear: citing?.year,
      targetPaper: target?.title || target?.label || edge.target,
      targetAuthors: target?.authors,
      targetYear: target?.year,
      edgeType: type,
      confidence,
      methodologyOrContext: contexts || "Empirical Citation",
      coreClaimOrSnippet: snippet,
      signalSource: edge.signalSource,
    });
  });

  rows.sort((a, b) => {
    if (a.edgeType === "contradicts" && b.edgeType !== "contradicts") return -1;
    if (b.edgeType === "contradicts" && a.edgeType !== "contradicts") return 1;
    return b.confidence - a.confidence;
  });

  return {
    title: options.title || "Academic Debate Matrix",
    topic: options.topic,
    generatedAt: new Date().toISOString(),
    rows,
    totalDisputes,
    totalConfirmations,
  };
}

/**
 * Serializes a Debate Matrix into a clean, GitHub-flavored Markdown table
 */
export function exportMatrixToMarkdown(matrix: DebateMatrix): string {
  const lines: string[] = [
    `# ${matrix.title}`,
    "",
    `Generated: ${matrix.generatedAt}`,
    matrix.topic ? `Topic / Query: ${matrix.topic}` : "",
    `**Controversy Summary:** ${matrix.totalDisputes} Refutations • ${matrix.totalConfirmations} Confirmations`,
    "",
    "| Baseline / Benchmark | Challenging Work (Year) | Stance | Core Empirical Finding / Claim | Context / Evidence | Conf. |",
    "| :--- | :--- | :---: | :--- | :--- | :---: |",
  ].filter(Boolean);

  if (matrix.rows.length === 0) {
    lines.push("| _No debate rows available_ | - | - | - | - | - |");
  } else {
    for (const row of matrix.rows) {
      const stance =
        row.edgeType === "contradicts"
          ? "🔴 Refutes"
          : row.edgeType === "supports"
            ? "🟢 Confirms"
            : "🔵 Extends";
      const citingYear = row.citingYear ? ` (${row.citingYear})` : "";
      const targetYear = row.targetYear ? ` (${row.targetYear})` : "";
      const targetStr = sanitizeMd(`${row.targetPaper}${targetYear}`);
      const citingStr = sanitizeMd(`${row.citingPaper}${citingYear}`);
      const claimStr = sanitizeMd(row.coreClaimOrSnippet);
      const contextStr = sanitizeMd(row.methodologyOrContext);

      lines.push(
        `| ${targetStr} | ${citingStr} | ${stance} | ${claimStr} | ${contextStr} | ${row.confidence}% |`,
      );
    }
  }

  lines.push("", "---", "_Generated via Ithaca Academic Debate Platform_");
  return lines.join("\n");
}

function sanitizeMd(str: string): string {
  if (!str) return "";
  return str.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/**
 * Serializes a Debate Matrix into RFC 4180 compliant CSV format
 */
export function exportMatrixToCSV(matrix: DebateMatrix): string {
  const headers = [
    "Target Benchmark",
    "Target Year",
    "Challenging Paper",
    "Challenging Year",
    "Stance",
    "Confidence (%)",
    "Core Empirical Claim",
    "Citation Context / Methodology",
  ];

  const escapeCSV = (val: unknown): string => {
    if (val == null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = matrix.rows.map((row) =>
    [
      escapeCSV(row.targetPaper),
      escapeCSV(row.targetYear || ""),
      escapeCSV(row.citingPaper),
      escapeCSV(row.citingYear || ""),
      escapeCSV(row.edgeType),
      escapeCSV(row.confidence),
      escapeCSV(row.coreClaimOrSnippet),
      escapeCSV(row.methodologyOrContext),
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Serializes a Debate Matrix into publication-ready LaTeX table code
 */
export function exportMatrixToLaTeX(matrix: DebateMatrix): string {
  const escapeLaTeX = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");
  };

  const rowsLaTeX = matrix.rows
    .map((row) => {
      const stance =
        row.edgeType === "contradicts"
          ? "\\textbf{\\textcolor{red}{Refutes}}"
          : row.edgeType === "supports"
            ? "\\textbf{\\textcolor{teal}{Confirms}}"
            : "Extends";
      const target = escapeLaTeX(
        row.targetPaper + (row.targetYear ? ` (${row.targetYear})` : ""),
      );
      const citing = escapeLaTeX(
        row.citingPaper + (row.citingYear ? ` (${row.citingYear})` : ""),
      );
      const claim = escapeLaTeX(row.coreClaimOrSnippet);
      return `    ${target} & ${citing} & ${stance} & ${claim} \\\\`;
    })
    .join("\n    \\hline\n");

  return [
    "% =============================================================================",
    "% Ithaca Academic Debate Matrix — Publication Export",
    `% Generated: ${matrix.generatedAt}`,
    "% =============================================================================",
    "\\begin{table*}[htbp]",
    "\\centering",
    `\\caption{${escapeLaTeX(matrix.title)}}`,
    "\\label{tab:debate_matrix}",
    "\\small",
    "\\begin{tabular}{p{0.22\\textwidth} p{0.22\\textwidth} c p{0.45\\textwidth}}",
    "    \\hline",
    "    \\textbf{Benchmark / Target} & \\textbf{Challenging Work} & \\textbf{Stance} & \\textbf{Empirical Claim / Evidence} \\\\",
    "    \\hline",
    rowsLaTeX ||
      "    \\multicolumn{4}{c}{\\textit{No dialectic claims recorded in this network.}} \\\\",
    "    \\hline",
    "\\end{tabular}",
    "\\end{table*}",
  ].join("\n");
}
