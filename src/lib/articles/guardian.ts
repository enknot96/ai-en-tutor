import { shuffle } from "@/lib/shuffle";
import type { Article, ArticleSource, ArticleSummary } from "./types";

const BASE_URL = "https://content.guardianapis.com";

const SECTION_POOL = [
  "world",
  "technology",
  "science",
  "environment",
  "business",
  "society",
  "education",
  "media",
  "law",
  "inequality",
  "global-development",
  "politics",
  "money",
  "cities",
  "culture",
  "film",
  "music",
  "books",
  "stage",
  "artanddesign",
  "tv-and-radio",
  "food",
  "travel",
  "lifeandstyle",
  "fashion",
  "wellness",
  "animals-farmed",
  "sport",
  "football",
];

const WORD_RANGE = { min: 500, max: 900 };
const CANDIDATE_COUNT = 3;

// Raw shape of one item in the Guardian search response
type GuardianResult = {
  id: string;
  type: string;
  sectionId: string;
  webTitle: string;
  webUrl: string;
  fields: {
    trailText?: string;
    byline?: string;
    wordcount?: string;
    bodyText?: string;
  };
};

// Convert one raw Guardian item into our ArticleSummary
function toSummary(r: GuardianResult): ArticleSummary {
  return {
    id: r.id,
    title: r.webTitle,
    trailText: r.fields.trailText ?? "",
    wordCount: Number(r.fields.wordcount ?? 0),
    section: r.sectionId,
    url: r.webUrl,
  };
}

// Build the search URL for one section
function buildSearchUrl(section: string): string {
  const key = process.env.GUARDIAN_API_KEY;
  if (!key) {
    throw new Error("GUARDIAN_API_KEY is not set");
  }

  const params = new URLSearchParams({
    section,
    "order-by": "newest",
    "page-size": "30",
    "show-fields": "trailText,byline,wordcount",
    "api-key": key,
  });

  return `${BASE_URL}/search?${params}`;
}

// Fetch the newest items of one section from the Guardian search API
async function searchSection(section: string): Promise<GuardianResult[]> {
  const res = await fetch(buildSearchUrl(section));
  if (!res.ok) {
    throw new Error(`Guardian search failed: ${res.status}`);
  }
  const data = await res.json();
  return data.response.results as GuardianResult[];
}

// Pick the newest regular article whose word count is in range
function pickNewest(
  results: GuardianResult[],
  range: { min: number; max: number },
): ArticleSummary | undefined {
  return results
    .filter((r) => r.type === "article")
    .map(toSummary)
    .find((s) => s.wordCount >= range.min && s.wordCount <= range.max);
}

// Collect candidates from random sections, retrying other sections when none fit
async function listCandidates(): Promise<ArticleSummary[]> {
  const queue = shuffle(SECTION_POOL);
  const found: ArticleSummary[] = [];

  while (found.length < CANDIDATE_COUNT && queue.length > 0) {
    const need = CANDIDATE_COUNT - found.length;
    const batch = queue.splice(0, need);
    const lists = await Promise.all(batch.map((s) => searchSection(s)));
    for (const results of lists) {
      const pick = pickNewest(results, WORD_RANGE);
      if (pick) found.push(pick);
    }
  }

  return found;
}

export class GuardianSource implements ArticleSource {
  listCandidates(): Promise<ArticleSummary[]> {
    return listCandidates();
  }

  getArticle(id: string): Promise<Article> {
    throw new Error(`getArticle is not implemented yet: ${id}`);
  }
}
