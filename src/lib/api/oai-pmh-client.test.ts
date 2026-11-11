import { describe, expect, it, vi } from "vitest";
import {
  parseOaiPmhXml,
  buildSovereignDedupeKey,
  OaiPmhClient,
  SOVEREIGN_REPOSITORIES,
  INSTITUTIONAL_REPOSITORIES,
  registerPartnerRepository,
} from "./oai-pmh-client";

describe("OAI-PMH Sovereign Client", () => {
  const sampleAauXml = `<?xml version="1.0" encoding="UTF-8" ?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>2026-09-08T12:00:00Z</responseDate>
  <request verb="ListRecords" metadataPrefix="oai_dc">http://etd.aau.edu.et/oai/request</request>
  <ListRecords>
    <record>
      <header>
        <identifier>oai:etd.aau.edu.et:123456789/2841</identifier>
        <datestamp>2024-05-12T08:30:00Z</datestamp>
        <setSpec>com_123456789_1</setSpec>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                   xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Deep Learning Approaches for Amharic Sentiment Analysis</dc:title>
          <dc:creator>Kebede, Alazar M.</dc:creator>
          <dc:contributor>Tadesse, Yared (Advisor)</dc:contributor>
          <dc:description>This thesis investigates transformer architectures adapted for low-resource Amharic morphology.</dc:description>
          <dc:date>2023-07-20</dc:date>
          <dc:type>Thesis</dc:type>
          <dc:identifier>http://hdl.handle.net/123456789/2841</dc:identifier>
          <dc:language>en</dc:language>
          <dc:publisher>Addis Ababa University</dc:publisher>
        </oai_dc:dc>
      </metadata>
    </record>
    <record>
      <header status="deleted">
        <identifier>oai:etd.aau.edu.et:123456789/9999</identifier>
        <datestamp>2024-05-13T09:00:00Z</datestamp>
      </header>
    </record>
    <resumptionToken completeListSize="450" cursor="100">token-abc-123</resumptionToken>
  </ListRecords>
</OAI-PMH>`;

  it("parses valid Dublin Core OAI-PMH XML with full metadata", () => {
    const result = parseOaiPmhXml(sampleAauXml, "aau");

    expect(result.records).toHaveLength(1);
    const paper = result.records[0];

    expect(paper.title).toBe(
      "Deep Learning Approaches for Amharic Sentiment Analysis",
    );
    expect(paper.authors).toEqual(["Kebede, Alazar M."]);
    expect(paper.advisors).toEqual(["Tadesse, Yared"]);
    expect(paper.year).toBe(2023);
    expect(paper.abstract).toContain("transformer architectures adapted");
    expect(paper.handleUri).toBe("http://hdl.handle.net/123456789/2841");
    expect(paper.institutionSlug).toBe("aau");
    expect(paper.institutionName).toContain("Addis Ababa University");
    expect(paper.dedupeKey).toBe(
      "sovereign:aau:handle:hdl.handle.net/123456789/2841",
    );

    expect(result.resumptionToken).toBe("token-abc-123");
    expect(result.completeListSize).toBe(450);
    expect(result.cursor).toBe(100);
  });

  it("generates fallback dedupe key when handleUri is absent", () => {
    const key = buildSovereignDedupeKey(
      "jimma",
      undefined,
      "Clinical Efficacy of Artemisinin Combination Therapy",
      "oai:opendocs.ju.edu.et:123456",
    );
    expect(key).toBe("sovereign:jimma:oai:oai:opendocs.ju.edu.et:123456");
  });

  it("extracts error elements correctly (e.g. noRecordsMatch)", () => {
    const errorXml = `<?xml version="1.0" encoding="UTF-8" ?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-09-08T12:00:00Z</responseDate>
  <error code="noRecordsMatch">No records match the requested datestamp filter</error>
</OAI-PMH>`;

    const result = parseOaiPmhXml(errorXml, "jimma");
    expect(result.records).toHaveLength(0);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("noRecordsMatch");
    expect(result.error?.message).toContain("No records match");
  });

  it("harvests records using mock fetcher", async () => {
    const client = new OaiPmhClient();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => sampleAauXml,
    } as unknown as Response);

    const harvest = await client.harvestRecords({
      repositorySlug: "aau",
      from: "2023-01-01",
      customFetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(harvest.records).toHaveLength(1);
    expect(harvest.hasMore).toBe(true);
    expect(harvest.resumptionToken).toBe("token-abc-123");
    expect(harvest.repositorySlug).toBe("aau");
  });

  it("handles identify verb correctly", async () => {
    const client = new OaiPmhClient();
    const identifyXml = `<?xml version="1.0" encoding="UTF-8" ?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <Identify>
    <repositoryName>Jimma University OpenDocs</repositoryName>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>opendocs@ju.edu.et</adminEmail>
    <earliestDatestamp>2010-01-01T00:00:00Z</earliestDatestamp>
  </Identify>
</OAI-PMH>`;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => identifyXml,
    } as unknown as Response);

    const info = await client.identify("jimma", mockFetch);
    expect(info.name).toBe("Jimma University OpenDocs");
    expect(info.adminEmail).toBe("opendocs@ju.edu.et");
    expect(info.earliestDatestamp).toBe("2010-01-01T00:00:00Z");
  });

  it("contains preconfigured endpoints for Ethiopian universities", () => {
    expect(SOVEREIGN_REPOSITORIES.aau).toBeDefined();
    expect(SOVEREIGN_REPOSITORIES.jimma).toBeDefined();
    expect(SOVEREIGN_REPOSITORIES.hawassa).toBeDefined();
    expect(SOVEREIGN_REPOSITORIES.astu).toBeDefined();
    expect(SOVEREIGN_REPOSITORIES.nadre).toBeDefined();
  });

  it("contains preconfigured global open-access repositories", () => {
    expect(INSTITUTIONAL_REPOSITORIES.arxiv).toBeDefined();
    expect(INSTITUTIONAL_REPOSITORIES.arxiv.baseUrl).toBe(
      "https://export.arxiv.org/oai2",
    );
    expect(INSTITUTIONAL_REPOSITORIES.zenodo).toBeDefined();
    expect(INSTITUTIONAL_REPOSITORIES.europe_pmc).toBeDefined();
  });

  it("supports dynamic registration of partner institutional repositories", () => {
    registerPartnerRepository({
      slug: "oxford",
      name: "Oxford University Research Archive (ORA)",
      baseUrl: "https://ora.ox.ac.uk/oai2",
      country: "GB",
      description: "Institutional repository of Oxford University.",
      institutionalDomain: "ox.ac.uk",
    });

    expect(INSTITUTIONAL_REPOSITORIES.oxford).toBeDefined();
    expect(INSTITUTIONAL_REPOSITORIES.oxford.name).toBe(
      "Oxford University Research Archive (ORA)",
    );
    expect(SOVEREIGN_REPOSITORIES.oxford).toBeDefined();
  });
});
