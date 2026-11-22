export type ArticleSummary = {
  id: string;
  title: string;
  trailText: string;
  wordCount: number;
  section: string;
  url: string;
};

export type Article = ArticleSummary & {
  byline: string;
  bodyText: string;
};

export interface ArticleSource {
  listCandidates(): Promise<ArticleSummary[]>;
  getArticle(id: string): Promise<Article>;
}
