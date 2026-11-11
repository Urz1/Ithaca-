import type { PaperNode } from "@/lib/api/graph-api";

/**
 * Generates a BibTeX string for a list of papers.
 * @param papers Array of papers to export
 * @returns Formatted BibTeX string
 */
export function generateBibTeX(papers: PaperNode[]): string {
  return papers
    .map((paper) => {
      // Create a unique key: AuthorYearTitleWord
      const authorLast = paper.authors.split(" ")[0].replace(/[^\w]/g, "");
      const titleWord = paper.title.split(" ")[0].replace(/[^\w]/g, "");
      const key = `${authorLast}${paper.year}${titleWord}`;

      const entry = [
        `@article{${key},`,
        `  title={${escapeLatex(paper.title)}},`,
        `  author={${escapeLatex(paper.authors)}},`,
        `  year={${paper.year}},`,
        paper.venue ? `  journal={${escapeLatex(paper.venue)}},` : "",
        paper.citations ? `  note={Citations: ${paper.citations}},` : "",
        `}`,
      ]
        .filter(Boolean)
        .join("\n");

      return entry;
    })
    .join("\n\n");
}

export interface ParsedBibTeXEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

/**
 * Parses ordinary braced or quoted BibTeX entries without adding a runtime
 * dependency. The export is additive so existing BibTeX generation users are
 * unaffected.
 */
export function parseBibTeX(input: string): ParsedBibTeXEntry[] {
  const entries: ParsedBibTeXEntry[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const start = input.indexOf("@", cursor);
    if (start === -1) break;

    const header = input.slice(start).match(/^@([\w-]+)\s*([{(])/);
    if (!header) {
      cursor = start + 1;
      continue;
    }

    const opening = header[2];
    const closing = opening === "{" ? "}" : ")";
    const bodyStart = start + header[0].length;
    let depth = 1;
    let quoted = false;
    let escaped = false;
    let end = bodyStart;

    for (; end < input.length && depth > 0; end += 1) {
      const character = input[end];
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (!quoted && character === opening) {
        depth += 1;
      } else if (!quoted && character === closing) {
        depth -= 1;
      }
    }

    if (depth !== 0) {
      cursor = start + 1;
      continue;
    }

    const body = input.slice(bodyStart, end - 1);
    const comma = body.indexOf(",");
    if (comma !== -1) {
      entries.push({
        type: header[1].toLowerCase(),
        key: body.slice(0, comma).trim(),
        fields: parseBibTeXFields(body.slice(comma + 1)),
      });
    }
    cursor = end;
  }

  return entries;
}

function parseBibTeXFields(input: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let cursor = 0;

  while (cursor < input.length) {
    const match = input.slice(cursor).match(/^\s*,?\s*([\w-]+)\s*=\s*/);
    if (!match) break;
    const name = match[1].toLowerCase();
    cursor += match[0].length;

    const opening = input[cursor];
    const closing = opening === "{" ? "}" : opening === '"' ? '"' : undefined;
    let value = "";

    if (closing) {
      cursor += 1;
      let depth = opening === "{" ? 1 : 0;
      let escaped = false;
      for (; cursor < input.length; cursor += 1) {
        const character = input[cursor];
        if (escaped) {
          value += character;
          escaped = false;
        } else if (character === "\\") {
          value += character;
          escaped = true;
        } else if (opening === "{" && character === "{") {
          depth += 1;
          value += character;
        } else if (character === closing && (opening === '"' || depth === 1)) {
          cursor += 1;
          break;
        } else {
          if (opening === "{" && character === "}") depth -= 1;
          value += character;
        }
      }
    } else {
      const comma = input.indexOf(",", cursor);
      const end = comma === -1 ? input.length : comma;
      value = input.slice(cursor, end).trim();
      cursor = end;
    }

    fields[name] = value.trim();
  }

  return fields;
}

function escapeLatex(str: string): string {
  // Basic escaping. For full robustness, a library is better, but this suffices for integration ready.
  return str
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}");
}
