/**
 * OpenAlex API Type Definitions
 *
 * Types matching the OpenAlex REST API responses.
 * Docs: https://docs.openalex.org
 *
 * OpenAlex is free, no API key required, 250M+ academic works.
 */

// =============================================================================
// CORE ENTITIES
// =============================================================================

/** A single academic work (paper, article, preprint, etc.) */
export interface OpenAlexWork {
  id: string; // "https://openalex.org/W2741809807"
  doi: string | null;
  title: string | null;
  display_name: string | null;
  publication_year: number | null;
  publication_date: string | null; // "2017-06-12"
  type: string | null; // "journal-article", "preprint", etc.

  // Citation metrics
  cited_by_count: number;
  cited_by_api_url: string; // URL to fetch papers citing this one

  // References (works this paper cites)
  referenced_works: string[]; // Array of OpenAlex IDs
  related_works: string[]; // Algorithmically related

  // Authors
  authorships: OpenAlexAuthorship[];

  // Publication source
  primary_location: OpenAlexLocation | null;
  locations: OpenAlexLocation[];

  // Concepts / Topics
  concepts: OpenAlexConcept[];
  topics?: OpenAlexTopic[];

  // Abstract (stored as inverted index for compression)
  abstract_inverted_index: Record<string, number[]> | null;

  // Open Access
  open_access: {
    is_oa: boolean;
    oa_status: string | null; // "gold", "green", "hybrid", "bronze", "closed"
    oa_url: string | null;
  };

  // External IDs
  ids: {
    openalex: string;
    doi?: string;
    pmid?: string;
    pmcid?: string;
    mag?: string;
  };

  // Biblio info
  biblio: {
    volume: string | null;
    issue: string | null;
    first_page: string | null;
    last_page: string | null;
  } | null;
}

/** Author information attached to a work */
export interface OpenAlexAuthorship {
  author_position: "first" | "middle" | "last";
  author: {
    id: string;
    display_name: string;
    orcid: string | null;
  };
  institutions: {
    id: string;
    display_name: string;
    country_code: string | null;
    type: string | null;
  }[];
  raw_affiliation_strings: string[];
}

/** Where a work is published */
export interface OpenAlexLocation {
  source: {
    id: string;
    display_name: string;
    issn_l: string | null;
    issn: string[] | null;
    host_organization: string | null;
    type: string | null; // "journal", "repository", etc.
  } | null;
  landing_page_url: string | null;
  pdf_url: string | null;
  is_oa: boolean;
  version: string | null; // "publishedVersion", "acceptedVersion", etc.
}

/** Concept tag (field of study) */
export interface OpenAlexConcept {
  id: string;
  wikidata: string | null;
  display_name: string;
  level: number; // 0 = broadest, 5 = most specific
  score: number; // Relevance score 0-1
}

/** Topic tag (newer, more granular than concepts) */
export interface OpenAlexTopic {
  id: string;
  display_name: string;
  subfield: { id: string; display_name: string };
  field: { id: string; display_name: string };
  domain: { id: string; display_name: string };
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

/** Paginated list response from OpenAlex */
export interface OpenAlexListResponse<T> {
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
    next_cursor?: string;
  };
  results: T[];
}

/** Autocomplete suggestion */
export interface OpenAlexAutocomplete {
  id: string;
  display_name: string;
  cited_by_count: number;
  works_count: number;
  entity_type: string;
  external_id: string | null;
}

export interface OpenAlexAutocompleteResponse {
  meta: { count: number; db_response_time_ms: number };
  results: OpenAlexAutocomplete[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/** Cleaned/short OpenAlex ID (without URL prefix) */
export type OpenAlexId = string; // e.g., "W2741809807"

/** Extract the short ID from a full OpenAlex URL */
export function extractOpenAlexId(fullId: string): OpenAlexId {
  return fullId.replace("https://openalex.org/", "");
}
