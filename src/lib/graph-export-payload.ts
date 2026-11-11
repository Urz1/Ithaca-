import Graph from "graphology";
import type { ExportFormat, ExportOptions } from "@/lib/graph-export";

export interface GraphExportPayload {
  content: string;
  contentType: string;
  filename: string;
  encoding: "utf8" | "base64";
  sizeBytes: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildJsonPayload(
  graph: Graph,
  filename: string,
  includeHidden: boolean,
): GraphExportPayload {
  const nodes: Record<string, unknown>[] = [];
  const edges: Record<string, unknown>[] = [];

  graph.forEachNode((node, attributes) => {
    if (!includeHidden && attributes.hidden) return;
    nodes.push({ id: node, ...attributes });
  });

  graph.forEachEdge((edge, attributes, source, target) => {
    if (!includeHidden && attributes.hidden) return;
    edges.push({ id: edge, source, target, ...attributes });
  });

  const content = JSON.stringify({ nodes, edges }, null, 2);
  return {
    content,
    contentType: "application/json",
    filename: `${filename}.json`,
    encoding: "utf8",
    sizeBytes: Buffer.byteLength(content, "utf8"),
  };
}

function buildGraphmlPayload(
  graph: Graph,
  filename: string,
  includeHidden: boolean,
): GraphExportPayload {
  let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="title" for="node" attr.name="title" attr.type="string"/>
  <key id="year" for="node" attr.name="year" attr.type="int"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <key id="type" for="edge" attr.name="type" attr.type="string"/>
  <graph edgedefault="directed">
`;

  graph.forEachNode((node, attributes) => {
    if (!includeHidden && attributes.hidden) return;
    graphml += `    <node id="${escapeXml(node)}">
      <data key="label">${escapeXml(String(attributes.label ?? node))}</data>
`;
    if (attributes.title) {
      graphml += `      <data key="title">${escapeXml(String(attributes.title))}</data>
`;
    }
    if (attributes.year) {
      graphml += `      <data key="year">${attributes.year}</data>
`;
    }
    graphml += `    </node>
`;
  });

  graph.forEachEdge((edge, attributes, source, target) => {
    if (!includeHidden && attributes.hidden) return;
    graphml += `    <edge source="${escapeXml(source)}" target="${escapeXml(target)}">
      <data key="weight">${attributes.weight || 1}</data>
      <data key="type">${attributes.type || "default"}</data>
    </edge>
`;
  });

  graphml += `  </graph>
</graphml>`;

  return {
    content: graphml,
    contentType: "application/xml",
    filename: `${filename}.graphml`,
    encoding: "utf8",
    sizeBytes: Buffer.byteLength(graphml, "utf8"),
  };
}

function buildCsvPayload(
  graph: Graph,
  filename: string,
  includeHidden: boolean,
): GraphExportPayload {
  const nodeRows = ["id,label,title,year,citations"];
  graph.forEachNode((node, attributes) => {
    if (!includeHidden && attributes.hidden) return;
    nodeRows.push(
      [
        node,
        attributes.label ?? "",
        attributes.title ?? "",
        attributes.year ?? "",
        attributes.citations ?? "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
  });

  const edgeRows = ["id,source,target,type,weight"];
  graph.forEachEdge((edge, attributes, source, target) => {
    if (!includeHidden && attributes.hidden) return;
    edgeRows.push(
      [edge, source, target, attributes.type ?? "", attributes.weight ?? 1]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
  });

  const content = `# Nodes\n${nodeRows.join("\n")}\n\n# Edges\n${edgeRows.join("\n")}\n`;
  return {
    content,
    contentType: "text/csv",
    filename: `${filename}.csv`,
    encoding: "utf8",
    sizeBytes: Buffer.byteLength(content, "utf8"),
  };
}

export function buildGraphExportPayload(
  graph: Graph,
  options: Pick<ExportOptions, "format" | "filename" | "includeHidden">,
): GraphExportPayload {
  const filename = options.filename ?? "graph";
  const includeHidden = options.includeHidden ?? false;

  switch (options.format) {
    case "json":
      return buildJsonPayload(graph, filename, includeHidden);
    case "graphml":
      return buildGraphmlPayload(graph, filename, includeHidden);
    case "csv":
      return buildCsvPayload(graph, filename, includeHidden);
    default:
      throw new Error(
        `Durable export does not support ${options.format as ExportFormat} yet`,
      );
  }
}

export function isDurableExportFormat(format: ExportFormat): boolean {
  return format === "json" || format === "graphml" || format === "csv";
}
