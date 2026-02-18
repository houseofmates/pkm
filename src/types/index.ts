export type DocumentRecord = {
  id: string;
  title?: string;
  content?: string;
  accentColor?: string;
  [k: string]: unknown;
};

export type SearchHit = {
  id: string;
  score: number;
};
