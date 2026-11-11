export type PaperImportFormat = "doi" | "bibtex" | "zotero" | "ris" | "csv";

export interface PaperIdentifiers {
  doi?: string;
  openAlex?: string;
}

export interface PaperProvenance {
  format: PaperImportFormat;
  row: number;
  source: string;
}

export interface PaperFreshness {
  importedAt: string;
  sourceUpdatedAt?: string;
}

export interface ImportedPaper {
  identifiers: PaperIdentifiers;
  title?: string;
  authors: string[];
  year?: number;
  venue?: string;
  abstract?: string;
  provenance: PaperProvenance[];
  freshness: PaperFreshness;
}

export type PaperImportErrorCode =
  | "EMPTY_INPUT"
  | "INVALID_DOI"
  | "INVALID_OPENALEX_ID"
  | "INVALID_YEAR"
  | "MALFORMED_BIBTEX"
  | "MALFORMED_RIS"
  | "MALFORMED_CSV"
  | "MISSING_IDENTIFIER"
  | "DUPLICATE";

export interface PaperImportError {
  row: number;
  code: PaperImportErrorCode;
  message: string;
  field?: string;
  value?: string;
}

export interface PaperImportResult {
  papers: ImportedPaper[];
  errors: PaperImportError[];
  totalRows: number;
  duplicateRows: number[];
}

export interface PaperImportOptions {
  source?: string;
  importedAt?: Date | string;
}
