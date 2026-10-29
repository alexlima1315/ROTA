export type StudyArticle = { id: string; number: string; title?: string | null; text: string; status?: string };
export type StudyChapter = { id: string; title: string; articles: StudyArticle[] };
export type StudyVideo = { id: string; youtubeId: string; title: string; articleId: string };
export type LawSummary = { id: string; titulo: string; sigla?: string | null; numero?: string | null; ano?: number | null };
export type LawDetail = { id: string; titulo: string; chapters: StudyChapter[]; videos: StudyVideo[] };
