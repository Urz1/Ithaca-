import { debug } from "@/lib/debug";

// =============================================================================
// REPOSITORY DIRECTORY & CONFIGURATION
// =============================================================================

export interface InstitutionalRepositoryConfig {
  slug: string;
  name: string;
  baseUrl: string;
  country: string;
  description: string;
  defaultSet?: string;
  institutionalDomain?: string;
}

export type SovereignRepositoryConfig = InstitutionalRepositoryConfig;

export const INSTITUTIONAL_REPOSITORIES: Record<
  string,
  InstitutionalRepositoryConfig
> = {
  // Global Open-Access Repositories
  arxiv: {
    slug: "arxiv",
    name: "arXiv Open Access Archive",
    baseUrl: "https://export.arxiv.org/oai2",
    country: "GLOBAL",
    description:
      "Cornell University open-access repository of 2M+ physics, math, and CS e-prints.",
    institutionalDomain: "arxiv.org",
  },
  zenodo: {
    slug: "zenodo",
    name: "Zenodo Open Science Repository",
    baseUrl: "https://zenodo.org/oai2d",
    country: "GLOBAL",
    description:
      "CERN-backed open-access repository for multidisciplinary datasets, software, and papers.",
    institutionalDomain: "zenodo.org",
  },
  europe_pmc: {
    slug: "europe_pmc",
    name: "Europe PubMed Central OAI Repository",
    baseUrl: "https://europepmc.org/oai.cgi",
    country: "EU",
    description:
      "Worldwide life sciences repository supported by 36 international biomedical funders.",
    institutionalDomain: "europepmc.org",
  },
  // Academic Partner Repositories
  aau: {
    slug: "aau",
    name: "Addis Ababa University Institutional Repository",
    baseUrl: "http://etd.aau.edu.et/oai/request",
    country: "ET",
    description:
      "National repository for AAU Master's theses and PhD dissertations.",
    institutionalDomain: "aau.edu.et",
  },
  jimma: {
    slug: "jimma",
    name: "Jimma University Institutional Repository",
    baseUrl: "https://opendocs.ju.edu.et/oai/request",
    country: "ET",
    description:
      "Theses, dissertations, and research papers from Jimma University.",
    institutionalDomain: "ju.edu.et",
  },
  hawassa: {
    slug: "hawassa",
    name: "Hawassa University Institutional Repository",
    baseUrl: "https://ir.hu.edu.et/oai/request",
    country: "ET",
    description:
      "Agricultural, health, and engineering theses from Hawassa University.",
    institutionalDomain: "hu.edu.et",
  },
  astu: {
    slug: "astu",
    name: "Adama Science and Technology University IR",
    baseUrl: "https://repository.astu.edu.et/oai/request",
    country: "ET",
    description: "Science, engineering, and technology theses from ASTU.",
    institutionalDomain: "astu.edu.et",
  },
  gondar: {
    slug: "gondar",
    name: "University of Gondar Institutional Repository",
    baseUrl: "https://ir.uog.edu.et/oai/request",
    country: "ET",
    description: "Medical, biomedical, and veterinary research from Gondar.",
    institutionalDomain: "uog.edu.et",
  },
  nadre: {
    slug: "nadre",
    name: "National Academic Digital Repository of Ethiopia (EthERNet)",
    baseUrl: "https://nadre.ethernet.edu.et/oai/request",
    country: "ET",
    description:
      "Centralized national federated academic archive connecting Ethiopian universities.",
    institutionalDomain: "ethernet.edu.et",
  },
};

/**
 * Backward compatibility alias for Sovereign Repositories
 */
export const SOVEREIGN_REPOSITORIES = INSTITUTIONAL_REPOSITORIES;

/**
 * Dynamically register a new institutional repository partner
 */
export function registerPartnerRepository(
  config: InstitutionalRepositoryConfig,
): void {
  INSTITUTIONAL_REPOSITORIES[config.slug.toLowerCase()] = config;
}

// =============================================================================
// TYPES
// =============================================================================

export interface HarvestedSovereignRecord {
  identifier: string;
  datestamp: string;
  title: string;
  authors: string[];
  advisors: string[];
  abstract?: string;
  year?: number;
  dateIssued?: string;
  subjects: string[];
  handleUri?: string;
  doi?: string;
  pdfUrl?: string;
  type?: string;
  publisher?: string;
  language?: string;
  institutionSlug: string;
  institutionName: string;
  dedupeKey: string;
}

export interface OaiHarvestResult {
  records: HarvestedSovereignRecord[];
  resumptionToken?: string;
  completeListSize?: number;
  cursor?: number;
  hasMore: boolean;
  repositorySlug: string;
  repositoryName: string;
}

export interface HarvestOptions {
  repositorySlug: string;
  from?: string; // YYYY-MM-DD
  until?: string; // YYYY-MM-DD
  set?: string;
  resumptionToken?: string;
  metadataPrefix?: string;
  timeoutMs?: number;
  customFetch?: typeof fetch;
}

// =============================================================================
// XML UNESCAPING & UTILITIES
// =============================================================================

function unescapeXml(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function cleanText(content: string): string {
  const unescaped = unescapeXml(content);
  // Remove possible CDATA wrappers
  return unescaped.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim();
}

function extractAllTags(xml: string, tagName: string): string[] {
  // Matches <(optional_ns:)tagName...>content</(optional_ns:)tagName>
  const escaped = tagName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(
    `<(?:[a-zA-Z0-9_]+:)?${escaped}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${escaped}>`,
    "gi",
  );

  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const val = cleanText(match[1]);
    if (val) results.push(val);
  }
  return results;
}

function extractFirstTag(xml: string, tagName: string): string | undefined {
  const tags = extractAllTags(xml, tagName);
  return tags.length > 0 ? tags[0] : undefined;
}

/**
 * Generate a consistent deduplication key for sovereign papers
 */
export function buildSovereignDedupeKey(
  institutionSlug: string,
  handleUri?: string,
  title?: string,
  identifier?: string,
): string {
  if (handleUri) {
    const handleClean = handleUri.toLowerCase().replace(/^https?:\/\//, "");
    return `sovereign:${institutionSlug}:handle:${handleClean}`;
  }
  if (identifier) {
    return `sovereign:${institutionSlug}:oai:${identifier.toLowerCase().trim()}`;
  }
  const cleanTitle = (title || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 100);
  return `sovereign:${institutionSlug}:title:${cleanTitle}`;
}

// =============================================================================
// XML PARSER
// =============================================================================

/**
 * Parses raw OAI-PMH XML response into HarvestedSovereignRecord list
 */
export function parseOaiPmhXml(
  xmlText: string,
  institutionSlug: string,
): {
  records: HarvestedSovereignRecord[];
  resumptionToken?: string;
  completeListSize?: number;
  cursor?: number;
  error?: { code: string; message: string };
} {
  const repo = SOVEREIGN_REPOSITORIES[institutionSlug] || {
    slug: institutionSlug,
    name: `${institutionSlug.toUpperCase()} Repository`,
  };

  // 1. Check for OAI error element
  const errorMatch =
    /<error(?:\s+code="([^"]*)")?[^>]*>([\s\S]*?)<\/error>/i.exec(xmlText);
  if (errorMatch) {
    return {
      records: [],
      error: {
        code: errorMatch[1] || "unknown_error",
        message: cleanText(errorMatch[2]),
      },
    };
  }

  // 2. Extract resumptionToken if present
  let resumptionToken: string | undefined;
  let completeListSize: number | undefined;
  let cursor: number | undefined;

  const tokenMatch =
    /<resumptionToken([^>]*)>([\s\S]*?)<\/resumptionToken>/i.exec(xmlText);
  if (tokenMatch) {
    const attrs = tokenMatch[1];
    const tokenVal = cleanText(tokenMatch[2]);
    if (tokenVal) resumptionToken = tokenVal;

    const sizeMatch = /completeListSize="(\d+)"/i.exec(attrs);
    if (sizeMatch) completeListSize = parseInt(sizeMatch[1], 10);

    const cursorMatch = /cursor="(\d+)"/i.exec(attrs);
    if (cursorMatch) cursor = parseInt(cursorMatch[1], 10);
  }

  // 3. Extract individual <record> nodes
  const recordMatches = xmlText.match(/<record[\s\S]*?<\/record>/gi) || [];
  const records: HarvestedSovereignRecord[] = [];

  for (const recordXml of recordMatches) {
    // Skip deleted records
    if (/<header[^>]*status="deleted"/i.test(recordXml)) {
      continue;
    }

    const headerMatch = /<header[\s\S]*?<\/header>/i.exec(recordXml);
    const headerXml = headerMatch ? headerMatch[0] : "";
    const identifier =
      extractFirstTag(headerXml, "identifier") ||
      `record-${records.length + 1}`;
    const datestamp =
      extractFirstTag(headerXml, "datestamp") || new Date().toISOString();

    const metadataMatch = /<metadata[\s\S]*?<\/metadata>/i.exec(recordXml);
    const metadataXml = metadataMatch ? metadataMatch[0] : "";

    // Extract Dublin Core fields
    const titles = extractAllTags(metadataXml, "title");
    const title = titles.length > 0 ? titles[0] : "Untitled Research";

    const creators = extractAllTags(metadataXml, "creator");
    const contributors = extractAllTags(metadataXml, "contributor");

    // DSpace frequently distinguishes advisors using dc:contributor.advisor or in contributor strings
    const authors: string[] = [...creators];
    const advisors: string[] = [];

    contributors.forEach((contributor) => {
      if (
        /advisor|supervisor|promoter/i.test(contributor) ||
        recordXml.includes(`contributor.advisor>${contributor}`)
      ) {
        advisors.push(
          contributor.replace(/\s*\([^)]*advisor[^)]*\)/gi, "").trim(),
        );
      } else if (authors.length === 0) {
        authors.push(contributor);
      }
    });

    const abstracts = extractAllTags(metadataXml, "description");
    const abstract = abstracts.join("\n\n").trim() || undefined;

    const subjects = extractAllTags(metadataXml, "subject");
    const dates = extractAllTags(metadataXml, "date");
    const dateIssued = dates[0] || undefined;

    // Parse year from date string (e.g., "2023-06-15" or "2021")
    let year: number | undefined;
    if (dateIssued) {
      const yearMatch = /\b(19\d\d|20\d\d)\b/.exec(dateIssued);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
    }

    const identifiers = extractAllTags(metadataXml, "identifier");
    let handleUri: string | undefined;
    let doi: string | undefined;
    let pdfUrl: string | undefined;

    identifiers.forEach((idVal) => {
      if (/hdl\.handle\.net/i.test(idVal) || /handle\/\d+/i.test(idVal)) {
        handleUri = idVal;
      } else if (/doi\.org\//i.test(idVal) || /^10\.\d{4,}/.test(idVal)) {
        doi = idVal;
      } else if (/\.pdf$/i.test(idVal)) {
        pdfUrl = idVal;
      }
    });

    const types = extractAllTags(metadataXml, "type");
    const publishers = extractAllTags(metadataXml, "publisher");
    const languages = extractAllTags(metadataXml, "language");

    const dedupeKey = buildSovereignDedupeKey(
      institutionSlug,
      handleUri,
      title,
      identifier,
    );

    records.push({
      identifier,
      datestamp,
      title,
      authors: authors.length > 0 ? authors : ["Ethiopian Academic Scholar"],
      advisors,
      abstract,
      year,
      dateIssued,
      subjects,
      handleUri,
      doi,
      pdfUrl,
      type: types[0] || "Thesis",
      publisher: publishers[0] || repo.name,
      language: languages[0] || "en",
      institutionSlug,
      institutionName: repo.name,
      dedupeKey,
    });
  }

  return {
    records,
    resumptionToken,
    completeListSize,
    cursor,
  };
}

// =============================================================================
// OAI-PMH HARVEST CLIENT
// =============================================================================

export class OaiPmhClient {
  /**
   * Harvests a batch of records from a sovereign institutional repository
   */
  async harvestRecords(options: HarvestOptions): Promise<OaiHarvestResult> {
    const repo = SOVEREIGN_REPOSITORIES[options.repositorySlug];
    if (!repo) {
      throw new Error(
        `Unknown sovereign repository slug: ${options.repositorySlug}. Supported: ${Object.keys(SOVEREIGN_REPOSITORIES).join(", ")}`,
      );
    }

    const fetcher = options.customFetch || fetch;
    const timeoutMs = options.timeoutMs || 25000;

    // Construct OAI-PMH ListRecords URL
    const url = new URL(repo.baseUrl);
    url.searchParams.set("verb", "ListRecords");

    if (options.resumptionToken) {
      url.searchParams.set("resumptionToken", options.resumptionToken);
    } else {
      url.searchParams.set(
        "metadataPrefix",
        options.metadataPrefix || "oai_dc",
      );
      if (options.from) url.searchParams.set("from", options.from);
      if (options.until) url.searchParams.set("until", options.until);
      if (options.set) url.searchParams.set("set", options.set);
    }

    debug.log(
      `[OAI-PMH] Harvesting from ${repo.name} (${options.repositorySlug}): ${url.toString()}`,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(url.toString(), {
        method: "GET",
        headers: {
          Accept: "text/xml, application/xml, text/plain",
          "User-Agent":
            "IthacaSovereignAcademicIndexer/1.0 (+https://ithaca.rhizan.org)",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `OAI-PMH endpoint returned HTTP ${response.status} ${response.statusText}`,
        );
      }

      const xmlText = await response.text();
      const parsed = parseOaiPmhXml(xmlText, options.repositorySlug);

      if (parsed.error) {
        // "noRecordsMatch" is not fatal — simply means 0 records in given date window
        if (parsed.error.code === "noRecordsMatch") {
          return {
            records: [],
            hasMore: false,
            repositorySlug: repo.slug,
            repositoryName: repo.name,
          };
        }
        throw new Error(
          `OAI-PMH Error (${parsed.error.code}): ${parsed.error.message}`,
        );
      }

      return {
        records: parsed.records,
        resumptionToken: parsed.resumptionToken,
        completeListSize: parsed.completeListSize,
        cursor: parsed.cursor,
        hasMore: Boolean(
          parsed.resumptionToken && parsed.resumptionToken.trim(),
        ),
        repositorySlug: repo.slug,
        repositoryName: repo.name,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `OAI-PMH request to ${repo.name} timed out after ${timeoutMs}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Queries the repository's identity and capabilities
   */
  async identify(
    repositorySlug: string,
    customFetch?: typeof fetch,
  ): Promise<{
    name: string;
    protocolVersion: string;
    adminEmail?: string;
    earliestDatestamp?: string;
  }> {
    const repo = SOVEREIGN_REPOSITORIES[repositorySlug];
    if (!repo) {
      throw new Error(`Unknown sovereign repository: ${repositorySlug}`);
    }

    const fetcher = customFetch || fetch;
    const url = `${repo.baseUrl}?verb=Identify`;

    const response = await fetcher(url, {
      headers: {
        Accept: "text/xml, application/xml",
        "User-Agent": "IthacaSovereignAcademicIndexer/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Identify failed with status ${response.status}`);
    }

    const xml = await response.text();
    const name = extractFirstTag(xml, "repositoryName") || repo.name;
    const protocolVersion = extractFirstTag(xml, "protocolVersion") || "2.0";
    const adminEmail = extractFirstTag(xml, "adminEmail");
    const earliestDatestamp = extractFirstTag(xml, "earliestDatestamp");

    return {
      name,
      protocolVersion,
      adminEmail,
      earliestDatestamp,
    };
  }
}

export const oaiPmhClient = new OaiPmhClient();
