import { parseBibTeX } from "@/lib/formats/bibtex";
import { canonicalizeDoi, canonicalizeOpenAlexId } from "./identifiers";
import type {
  ImportedPaper,
  PaperImportError,
  PaperImportFormat,
  PaperImportOptions,
  PaperImportResult,
} from "./types";

interface RawPaper {
  row: number;
  doi?: string;
  openAlex?: string;
  title?: string;
  authors?: string[];
  year?: string;
  venue?: string;
  abstract?: string;
  sourceUpdatedAt?: string;
}

interface ParseResult {
  rows: RawPaper[];
  errors: PaperImportError[];
  totalRows: number;
}

export function importPapers(
  format: PaperImportFormat,
  input: string,
  options: PaperImportOptions = {},
): PaperImportResult {
  if (!input.trim()) {
    return {
      papers: [],
      errors: [{ row: 0, code: "EMPTY_INPUT", message: "Input is empty." }],
      totalRows: 0,
      duplicateRows: [],
    };
  }

  const parsed = parseInput(format, input);
  const source = options.source ?? format;
  const importedAt = toIsoDate(options.importedAt) ?? new Date().toISOString();
  const papers: ImportedPaper[] = [];
  const paperByKey = new Map<string, ImportedPaper>();
  const errors = [...parsed.errors];
  const duplicateRows: number[] = [];

  for (const raw of parsed.rows) {
    const normalized = normalizePaper(raw, format, source, importedAt, errors);
    if (!normalized) continue;

    const keys = paperKeys(normalized);
    const matchedKey = keys.find((key) => paperByKey.has(key));
    const existing = matchedKey ? paperByKey.get(matchedKey) : undefined;
    if (existing) {
      duplicateRows.push(raw.row);
      errors.push({
        row: raw.row,
        code: "DUPLICATE",
        message: `Duplicate paper matched ${matchedKey}.`,
      });
      mergePaper(existing, normalized);
      paperKeys(existing).forEach((key) => paperByKey.set(key, existing));
    } else {
      papers.push(normalized);
      keys.forEach((key) => paperByKey.set(key, normalized));
    }
  }

  return {
    papers,
    errors,
    totalRows: parsed.totalRows,
    duplicateRows,
  };
}

function parseInput(format: PaperImportFormat, input: string): ParseResult {
  if (format === "doi") return parseDoiList(input);
  if (format === "zotero") {
    const trimmed = input.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      return parseZoteroJsonInput(trimmed);
    }
    return parseBibtexInput(input);
  }
  if (format === "bibtex") return parseBibtexInput(input);
  if (format === "ris") return parseRis(input);
  return parseCsv(input);
}

function parseZoteroJsonInput(input: string): ParseResult {
  const errors: PaperImportError[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          code: "MALFORMED_BIBTEX",
          message: "Failed to parse Zotero JSON input: invalid JSON format.",
        },
      ],
      totalRows: 0,
    };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const rows: RawPaper[] = [];

  items.forEach((item, index) => {
    const row = index + 1;
    if (!item || typeof item !== "object") {
      errors.push({
        row,
        code: "MALFORMED_BIBTEX",
        message: "Invalid Zotero item entry",
      });
      return;
    }

    const record = item as Record<string, unknown>;
    const data =
      record.data && typeof record.data === "object"
        ? (record.data as Record<string, unknown>)
        : record;

    const rawDoi = data.DOI ?? data.doi ?? record.DOI ?? record.doi;
    const rawOpenAlex =
      data.openAlex ?? data.openAlexId ?? record.openAlex ?? record.openAlexId;
    const rawTitle = data.title ?? record.title;

    // Authors
    let authors: string[] | undefined;
    if (Array.isArray(data.creators)) {
      authors = (data.creators as Array<Record<string, unknown>>)
        .map((c) => {
          if (c.name && typeof c.name === "string") return c.name;
          const first = typeof c.firstName === "string" ? c.firstName : "";
          const last = typeof c.lastName === "string" ? c.lastName : "";
          return [first, last].filter(Boolean).join(" ");
        })
        .filter(Boolean);
    } else if (Array.isArray(data.author)) {
      authors = (data.author as Array<Record<string, unknown>>)
        .map((c) => {
          if (c.name && typeof c.name === "string") return c.name;
          const given = typeof c.given === "string" ? c.given : "";
          const family = typeof c.family === "string" ? c.family : "";
          return [given, family].filter(Boolean).join(" ");
        })
        .filter(Boolean);
    }

    // Year
    let year: string | undefined;
    if (data.date && typeof data.date === "string") {
      const match = data.date.match(/\b(19\d\d|20\d\d)\b/);
      if (match) year = match[1];
    } else if (
      data.issued &&
      typeof data.issued === "object" &&
      Array.isArray((data.issued as Record<string, unknown>)["date-parts"])
    ) {
      const parts = (data.issued as { "date-parts"?: unknown[][] })[
        "date-parts"
      ];
      if (parts?.[0]?.[0]) {
        year = String(parts[0][0]);
      }
    }

    const venue =
      data.publicationTitle ??
      data["container-title"] ??
      data.journal ??
      data.venue;
    const abstract = data.abstractNote ?? data.abstract;

    rows.push({
      row,
      doi: typeof rawDoi === "string" ? rawDoi : undefined,
      openAlex: typeof rawOpenAlex === "string" ? rawOpenAlex : undefined,
      title: typeof rawTitle === "string" ? rawTitle : undefined,
      authors: authors && authors.length > 0 ? authors : undefined,
      year,
      venue: typeof venue === "string" ? venue : undefined,
      abstract: typeof abstract === "string" ? abstract : undefined,
      sourceUpdatedAt:
        typeof data.dateModified === "string"
          ? data.dateModified
          : typeof record.dateModified === "string"
            ? record.dateModified
            : undefined,
    });
  });

  return { rows, errors, totalRows: rows.length };
}

function parseDoiList(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const rows = lines
    .map((doi, index) => ({ row: index + 1, doi: doi.trim() }))
    .filter(({ doi }) => doi.length > 0);
  return { rows, errors: [], totalRows: rows.length };
}

function parseBibtexInput(input: string): ParseResult {
  const entries = parseBibTeX(input);
  const errors: PaperImportError[] = [];
  const entryMarkers = input.match(/@[\w-]+\s*[{(]/g)?.length ?? 0;

  if (entries.length !== entryMarkers || entries.length === 0) {
    errors.push({
      row: Math.max(entries.length + 1, 1),
      code: "MALFORMED_BIBTEX",
      message: "One or more BibTeX entries could not be parsed.",
    });
  }

  const rows = entries.map(({ fields }, index) => ({
    row: index + 1,
    doi: fields.doi,
    openAlex: fields.openalex ?? fields.openalex_id,
    title: fields.title,
    authors: splitAuthors(fields.author),
    year: fields.year,
    venue: fields.journal ?? fields.booktitle,
    abstract: fields.abstract,
    sourceUpdatedAt: fields.updated ?? fields.timestamp,
  }));
  return { rows, errors, totalRows: Math.max(entries.length, entryMarkers) };
}

function parseRis(input: string): ParseResult {
  const records: Array<Record<string, string[]>> = [];
  const errors: PaperImportError[] = [];
  let current: Record<string, string[]> | undefined;
  let recordStart = 1;

  input.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(/^([A-Z0-9]{2})\s*-\s?(.*)$/);
    if (!match) {
      if (line.trim()) {
        errors.push({
          row: index + 1,
          code: "MALFORMED_RIS",
          message: "Expected an RIS tag followed by '  - '.",
          value: line,
        });
      }
      return;
    }
    const [, tag, value] = match;
    if (tag === "TY") {
      if (current) {
        errors.push({
          row: recordStart,
          code: "MALFORMED_RIS",
          message: "RIS record is missing an ER terminator.",
        });
      }
      current = { TY: [value] };
      recordStart = index + 1;
    } else if (!current) {
      errors.push({
        row: index + 1,
        code: "MALFORMED_RIS",
        message: "RIS record must start with TY.",
      });
    } else if (tag === "ER") {
      records.push(current);
      current = undefined;
    } else {
      (current[tag] ??= []).push(value.trim());
    }
  });

  if (current) {
    errors.push({
      row: recordStart,
      code: "MALFORMED_RIS",
      message: "RIS record is missing an ER terminator.",
    });
    records.push(current);
  }

  const rows = records.map((record, index) => ({
    row: index + 1,
    doi: first(record, "DO"),
    openAlex: first(record, "AN")?.match(/(?:openalex\.org\/)?(W\d+)/i)?.[1],
    title: first(record, "TI", "T1"),
    authors: [...(record.AU ?? []), ...(record.A1 ?? [])],
    year: first(record, "PY", "Y1")?.match(/\d{4}/)?.[0],
    venue: first(record, "JO", "JF", "T2"),
    abstract: first(record, "AB", "N2"),
    sourceUpdatedAt: first(record, "DA", "Y2"),
  }));
  return { rows, errors, totalRows: records.length };
}

function parseCsv(input: string): ParseResult {
  const parsed = parseCsvRows(input);
  if (parsed.rows.length === 0) {
    return { rows: [], errors: parsed.errors, totalRows: 0 };
  }

  const headers = parsed.rows[0].values.map(normalizeHeader);
  const rows = parsed.rows.slice(1).map(({ values, line }) => {
    const value = (...names: string[]) => {
      const index = headers.findIndex((header) => names.includes(header));
      return index === -1 ? undefined : values[index]?.trim() || undefined;
    };
    return {
      row: line,
      doi: value("doi"),
      openAlex: value("openalex", "openalexid", "openalex_id"),
      title: value("title"),
      authors: splitAuthors(value("authors", "author"), /;|\band\b/i),
      year: value("year", "publicationyear"),
      venue: value("venue", "journal", "container"),
      abstract: value("abstract"),
      sourceUpdatedAt: value("updated", "updatedat", "sourceupdatedat"),
    };
  });
  return { rows, errors: parsed.errors, totalRows: rows.length };
}

function parseCsvRows(input: string): {
  rows: Array<{ values: string[]; line: number }>;
  errors: PaperImportError[];
} {
  const rows: Array<{ values: string[]; line: number }> = [];
  const errors: PaperImportError[] = [];
  let values: string[] = [];
  let value = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  for (let index = 0; index <= input.length; index += 1) {
    const character = input[index] ?? "\n";
    if (character === '"' && quoted && input[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      values.push(value);
      if (values.some((item) => item.length > 0))
        rows.push({ values, line: rowLine });
      values = [];
      value = "";
      line += 1;
      rowLine = line;
    } else {
      value += character;
      if (character === "\n") line += 1;
    }
  }

  if (quoted) {
    errors.push({
      row: rowLine,
      code: "MALFORMED_CSV",
      message: "CSV row contains an unterminated quoted field.",
    });
  }
  const width = rows[0]?.values.length;
  rows.slice(1).forEach((row) => {
    if (row.values.length !== width) {
      errors.push({
        row: row.line,
        code: "MALFORMED_CSV",
        message: `Expected ${width} columns but found ${row.values.length}.`,
      });
    }
  });
  return { rows, errors };
}

function normalizePaper(
  raw: RawPaper,
  format: PaperImportFormat,
  source: string,
  importedAt: string,
  errors: PaperImportError[],
): ImportedPaper | undefined {
  const doi = raw.doi ? canonicalizeDoi(raw.doi) : undefined;
  const openAlex = raw.openAlex
    ? canonicalizeOpenAlexId(raw.openAlex)
    : undefined;

  if (raw.doi && !doi) {
    errors.push({
      row: raw.row,
      code: "INVALID_DOI",
      field: "doi",
      value: raw.doi,
      message: "DOI is not valid.",
    });
  }
  if (raw.openAlex && !openAlex) {
    errors.push({
      row: raw.row,
      code: "INVALID_OPENALEX_ID",
      field: "openAlex",
      value: raw.openAlex,
      message: "OpenAlex identifier is not valid.",
    });
  }

  const title = cleanText(raw.title);
  if (!doi && !openAlex && !title) {
    errors.push({
      row: raw.row,
      code: "MISSING_IDENTIFIER",
      message: "A DOI, OpenAlex identifier, or title is required.",
    });
    return undefined;
  }

  const year = parseYear(raw.year, raw.row, errors);
  return {
    identifiers: { doi, openAlex },
    title,
    authors: raw.authors?.map(cleanText).filter(isDefined) ?? [],
    year,
    venue: cleanText(raw.venue),
    abstract: cleanText(raw.abstract),
    provenance: [{ format, row: raw.row, source }],
    freshness: {
      importedAt,
      sourceUpdatedAt: toIsoDate(raw.sourceUpdatedAt),
    },
  };
}

function paperKeys(paper: ImportedPaper): string[] {
  const keys: string[] = [];
  if (paper.identifiers.doi) keys.push(`doi:${paper.identifiers.doi}`);
  if (paper.identifiers.openAlex) {
    keys.push(`openalex:${paper.identifiers.openAlex}`);
  }
  if (keys.length === 0) {
    keys.push(`title:${paper.title!.toLocaleLowerCase()}:${paper.year ?? ""}`);
  }
  return keys;
}

function mergePaper(target: ImportedPaper, incoming: ImportedPaper): void {
  target.identifiers.doi ??= incoming.identifiers.doi;
  target.identifiers.openAlex ??= incoming.identifiers.openAlex;
  target.title ??= incoming.title;
  target.year ??= incoming.year;
  target.venue ??= incoming.venue;
  target.abstract ??= incoming.abstract;
  target.authors = [...new Set([...target.authors, ...incoming.authors])];
  target.provenance.push(...incoming.provenance);
  if (
    incoming.freshness.sourceUpdatedAt &&
    (!target.freshness.sourceUpdatedAt ||
      incoming.freshness.sourceUpdatedAt > target.freshness.sourceUpdatedAt)
  ) {
    target.freshness.sourceUpdatedAt = incoming.freshness.sourceUpdatedAt;
  }
}

function parseYear(
  value: string | undefined,
  row: number,
  errors: PaperImportError[],
): number | undefined {
  if (!value) return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    errors.push({
      row,
      code: "INVALID_YEAR",
      field: "year",
      value,
      message: "Year must be a four-digit integer.",
    });
    return undefined;
  }
  return year;
}

function splitAuthors(
  value: string | undefined,
  separator: RegExp = /\s+and\s+/i,
): string[] {
  return (
    value
      ?.split(separator)
      .map((author) => author.trim())
      .filter(Boolean) ?? []
  );
}

function cleanText(value: string | undefined): string | undefined {
  return value?.replace(/\s+/g, " ").trim() || undefined;
}

function first(
  record: Record<string, string[]>,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    if (record[name]?.[0]) return record[name][0];
  }
  return undefined;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "");
}

function toIsoDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
