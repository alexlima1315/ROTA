'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChapterQuiz from './ChapterQuiz';

export type StudyArticle = {
  id: string;
  number: string;
  title?: string | null;
  text: string;
  status?: 'VIGENTE' | 'ATUALIZADO' | 'REVOGADO';
  revision?: number;
};

export type StudyChapter = {
  id: string;
  title: string;
  lawTitle?: string;
  articles: StudyArticle[];
};

export type StudyVideo = {
  id: string;
  youtubeId: string;
  title: string;
  channel?: string;
  articleId: string;
};

export type StudyAttachment = {
  id: string;
  title: string;
  url: string;
  type: 'PDF' | 'MAPA_MENTAL' | 'RESUMO' | 'OUTRO';
  chapterId?: string;
  articleId?: string;
};

export type GlossaryEntry = {
  term: string;
  explanation: string;
};

export type TextHighlight = {
  id: string;
  start: number;
  end: number;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  revision: number;
  quote: string;
};

type StudyRoomProps = {
  chapters: StudyChapter[];
  videos: StudyVideo[];
  attachments: StudyAttachment[];
  glossary?: GlossaryEntry[];
  initialHighlights?: Record<string, TextHighlight[]>;
  storageKey?: string;
  onHighlightsChange?: (articleId: string, highlights: TextHighlight[]) => void;
};

const highlightStyles: Record<TextHighlight['color'], string> = {
  yellow: 'bg-yellow-200/90 decoration-yellow-300',
  green: 'bg-emerald-200/80 decoration-emerald-300',
  blue: 'bg-sky-200/80 decoration-sky-300',
  pink: 'bg-pink-200/80 decoration-pink-300',
};
const EMPTY_HIGHLIGHTS: Record<string, TextHighlight[]> = {};

const colorLabels: { id: TextHighlight['color']; label: string; swatch: string }[] = [
  { id: 'yellow', label: 'Amarelo', swatch: 'bg-yellow-300' },
  { id: 'green', label: 'Verde', swatch: 'bg-emerald-300' },
  { id: 'blue', label: 'Azul', swatch: 'bg-sky-300' },
  { id: 'pink', label: 'Rosa', swatch: 'bg-pink-300' },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findTerms(text: string, glossary: GlossaryEntry[]) {
  const found: { start: number; end: number; entry: GlossaryEntry }[] = [];
  const ordered = [...glossary].filter((entry) => entry.term.trim()).sort((a, b) => b.term.length - a.term.length);

  for (const entry of ordered) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegExp(entry.term)})(?=$|[^\\p{L}\\p{N}_])`, 'giu');
    for (const match of text.matchAll(pattern)) {
      const prefixLength = match[1]?.length ?? 0;
      const start = (match.index ?? 0) + prefixLength;
      const end = start + (match[2]?.length ?? 0);
      if (found.some((range) => start < range.end && end > range.start)) continue;
      found.push({ start, end, entry });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

function renderArticleText(
  text: string,
  marks: TextHighlight[],
  glossary: GlossaryEntry[],
  onTerm: (entry: GlossaryEntry) => void,
) {
  const termRanges = findTerms(text, glossary);
  const safeMarks = marks
    .filter((mark) => mark.start >= 0 && mark.end > mark.start && mark.start < text.length)
    .map((mark) => ({ ...mark, end: Math.min(mark.end, text.length) }))
    .sort((a, b) => a.start - b.start);

  const cuts = new Set<number>([0, text.length]);
  safeMarks.forEach((mark) => { cuts.add(mark.start); cuts.add(mark.end); });
  termRanges.forEach((range) => { cuts.add(range.start); cuts.add(range.end); });
  const points = [...cuts].sort((a, b) => a - b);

  return points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const value = text.slice(start, end);
    const mark = safeMarks.find((candidate) => candidate.start <= start && candidate.end >= end);
    const termRange = termRanges.find((candidate) => candidate.start <= start && candidate.end >= end);
    const key = `${start}-${end}`;
    const content = termRange ? (
      <button
        key={`term-${key}`}
        type="button"
        onClick={() => onTerm(termRange.entry)}
        aria-label={`Explicação do termo ${termRange.entry.term}`}
        title={termRange.entry.explanation}
        className="rounded-sm border-b border-dotted border-indigo-500 bg-indigo-50/70 px-0.5 text-left text-inherit decoration-indigo-400 underline-offset-4 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {value}
      </button>
    ) : value;

    return mark ? (
      <mark key={key} className={`rounded-sm px-0.5 text-inherit ${highlightStyles[mark.color]}`}>{content}</mark>
    ) : <React.Fragment key={key}>{content}</React.Fragment>;
  });
}

export default function StudyRoom({
  chapters,
  videos,
  attachments,
  glossary = [],
  initialHighlights = EMPTY_HIGHLIGHTS,
  storageKey = 'codex-dinamico-highlights-v1',
  onHighlightsChange,
}: StudyRoomProps) {
  const allArticles = useMemo(() => chapters.flatMap((chapter) => chapter.articles), [chapters]);
  const [selectedArticleId, setSelectedArticleId] = useState(allArticles[0]?.id ?? '');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'video' | 'attachments'>('video');
  const [selectedColor, setSelectedColor] = useState<TextHighlight['color']>('yellow');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; quote: string } | null>(null);
  const [activeTerm, setActiveTerm] = useState<GlossaryEntry | null>(null);
  const [notice, setNotice] = useState('');
  const [highlightsByArticle, setHighlightsByArticle] = useState<Record<string, TextHighlight[]>>(initialHighlights);
  const [hydrated, setHydrated] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteStatus, setNoteStatus] = useState<'loading' | 'saved' | 'dirty' | 'saving' | 'error'>('loading');
  const articleTextRef = useRef<HTMLDivElement>(null);

  const selectedArticle = allArticles.find((article) => article.id === selectedArticleId) ?? allArticles[0];
  const selectedChapter = chapters.find((chapter) => chapter.articles.some((article) => article.id === selectedArticle?.id)) ?? chapters[0];
  const articleVideos = videos.filter((video) => video.articleId === selectedArticle?.id);
  const activeVideo = articleVideos.find((video) => video.id === activeVideoId) ?? articleVideos[0];
  const articleIdsInChapter = new Set(selectedChapter?.articles.map((article) => article.id) ?? []);
  const chapterAttachments = attachments.filter((attachment) =>
    attachment.chapterId === selectedChapter?.id || (attachment.articleId && articleIdsInChapter.has(attachment.articleId)),
  );
  const currentHighlights = selectedArticle ? (highlightsByArticle[selectedArticle.id] ?? []) : [];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setHighlightsByArticle({ ...initialHighlights, ...JSON.parse(saved) });
    } catch {
      setHighlightsByArticle(initialHighlights);
    } finally {
      setHydrated(true);
    }
  }, [initialHighlights, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(highlightsByArticle));
    } catch {
      setNotice('Não foi possível salvar os grifos neste navegador.');
    }
  }, [highlightsByArticle, hydrated, storageKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (allArticles.length && !allArticles.some((article) => article.id === selectedArticleId)) {
      setSelectedArticleId(allArticles[0].id);
    }
  }, [allArticles, selectedArticleId]);

  useEffect(() => {
    if (!selectedArticleId) return;
    const controller = new AbortController();
    setNoteText('');
    setNoteStatus('loading');

    fetch(`/api/articles/${encodeURIComponent(selectedArticleId)}/notes`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar a anotação.');
        setNoteText(body.note?.conteudo ?? '');
        setNoteStatus('saved');
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setNoteStatus('error');
        setNotice(cause instanceof Error ? cause.message : 'Falha ao carregar sua anotação.');
      });

    return () => controller.abort();
  }, [selectedArticleId]);

  if (!chapters.length || !allArticles.length) {
    return (
      <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
        <div><p className="text-lg font-semibold text-slate-900">Nenhum artigo disponível</p><p className="mt-2 text-sm">Carregue capítulos e artigos para abrir a sala de estudos.</p></div>
      </div>
    );
  }

  function selectArticle(articleId: string) {
    setSelectedArticleId(articleId);
    setSelectedRange(null);
    setActiveTerm(null);
    setActiveVideoId(null);
  }

  function playArticleVideo(article: StudyArticle) {
    const video = videos.find((candidate) => candidate.articleId === article.id);
    setSelectedArticleId(article.id);
    setSelectedRange(null);
    setRightTab('video');
    setActiveVideoId(video?.id ?? null);
    if (!video) setNotice('Ainda não há videoaula vinculada a este artigo.');
  }

  function captureSelection() {
    const selection = window.getSelection();
    const root = articleTextRef.current;
    if (!selection || !root || selection.isCollapsed || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;

    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(root);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const start = beforeRange.toString().length;
    const quote = selection.toString();
    if (!quote.trim()) return;
    setSelectedRange({ start, end: start + quote.length, quote });
  }

  function addHighlight() {
    if (!selectedArticle || !selectedRange) return;
    const nextHighlight: TextHighlight = {
      id: crypto.randomUUID(),
      start: selectedRange.start,
      end: selectedRange.end,
      quote: selectedRange.quote,
      color: selectedColor,
      revision: selectedArticle.revision ?? 1,
    };
    const next = [...(highlightsByArticle[selectedArticle.id] ?? []), nextHighlight];
    setHighlightsByArticle((current) => ({ ...current, [selectedArticle.id]: next }));
    onHighlightsChange?.(selectedArticle.id, next);
    setSelectedRange(null);
    window.getSelection()?.removeAllRanges();
    setNotice('Grifo salvo.');
  }

  function removeHighlight(highlightId: string) {
    if (!selectedArticle) return;
    const next = currentHighlights.filter((highlight) => highlight.id !== highlightId);
    setHighlightsByArticle((current) => ({ ...current, [selectedArticle.id]: next }));
    onHighlightsChange?.(selectedArticle.id, next);
  }

  async function saveArticleNote() {
    if (!selectedArticle) return;
    setNoteStatus('saving');
    try {
      const response = await fetch(`/api/articles/${encodeURIComponent(selectedArticle.id)}/notes`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: noteText }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível salvar a anotação.');
      setNoteText(body.note.conteudo);
      setNoteStatus('saved');
      setNotice('Anotação salva neste artigo.');
    } catch (cause) {
      setNoteStatus('error');
      setNotice(cause instanceof Error ? cause.message : 'Falha ao salvar a anotação.');
    }
  }

  const chapterChanged = (chapterId: string) => {
    const chapter = chapters.find((item) => item.id === chapterId);
    if (chapter?.articles[0]) selectArticle(chapter.articles[0].id);
  };

  const videoIdIsValid = !!activeVideo && /^[\w-]{11}$/.test(activeVideo.youtubeId);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Códex Dinâmico · sala de estudos</p>
            <h1 className="mt-1 truncate text-xl font-bold sm:text-2xl">{selectedChapter?.lawTitle ?? 'Leitor de legislação'}</h1>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="whitespace-nowrap">Capítulo</span>
            <select
              value={selectedChapter?.id ?? ''}
              onChange={(event) => chapterChanged(event.target.value)}
              className="max-w-[min(70vw,24rem)] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              aria-label="Selecionar capítulo"
            >
              {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
            </select>
          </label>
        </header>

        <div className="grid items-start gap-4 xl:grid-cols-12">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-7" aria-label="Leitor da lei">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Leitura da lei</p>
                  <h2 className="mt-1 text-lg font-bold">{selectedChapter?.title}</h2>
                </div>
                {selectedArticle.status && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedArticle.status === 'REVOGADO' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {selectedArticle.status === 'REVOGADO' ? 'Revogado' : selectedArticle.status === 'ATUALIZADO' ? 'Atualizado' : 'Vigente'}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Ferramentas de marcação">
                <span className="mr-1 text-xs text-slate-500">Marca-texto:</span>
                {colorLabels.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    title={color.label}
                    aria-label={`Selecionar marca-texto ${color.label}`}
                    aria-pressed={selectedColor === color.id}
                    onClick={() => setSelectedColor(color.id)}
                    onMouseDown={(event) => event.preventDefault()}
                    className={`h-7 w-7 rounded-full border-2 ${color.swatch} ${selectedColor === color.id ? 'border-slate-800 ring-2 ring-slate-200' : 'border-white shadow-sm'}`}
                  />
                ))}
                <button
                  type="button"
                  disabled={!selectedRange}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={addHighlight}
                  className="ml-auto rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Aplicar ao trecho selecionado
                </button>
              </div>
              {selectedRange && <p className="mt-2 truncate rounded-md bg-indigo-50 px-2 py-1.5 text-xs text-indigo-900">Trecho selecionado: “{selectedRange.quote}”</p>}
              {activeTerm && (
                <aside className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3" role="status">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{activeTerm.term}</p><p className="mt-1 text-sm leading-6 text-slate-700">{activeTerm.explanation}</p></div>
                  <button type="button" className="rounded p-1 text-slate-500 hover:bg-white" onClick={() => setActiveTerm(null)} aria-label="Fechar explicação">✕</button>
                </aside>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {selectedChapter?.articles.map((article) => {
                const isSelected = article.id === selectedArticle.id;
                const hasVideo = videos.some((video) => video.articleId === article.id);
                return (
                  <div key={article.id} className={`p-4 transition sm:p-5 ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => selectArticle(article.id)} className="text-left text-sm font-bold text-indigo-800 hover:underline">
                        Art. {article.number}{article.title ? ` — ${article.title}` : ''}
                      </button>
                      {article.status === 'REVOGADO' && <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">Revogado</span>}
                      <button
                        type="button"
                        onClick={() => playArticleVideo(article)}
                        disabled={!hasVideo}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        aria-label={hasVideo ? `Assistir aula do artigo ${article.number}` : `Nenhuma aula vinculada ao artigo ${article.number}`}
                        title={hasVideo ? 'Carregar videoaula nesta tela' : 'Ainda sem videoaula vinculada'}
                      >
                        <span aria-hidden="true">▶</span> Aula
                      </button>
                    </div>
                    <div
                      ref={isSelected ? articleTextRef : undefined}
                      onMouseUp={isSelected ? captureSelection : undefined}
                      onKeyUp={isSelected ? captureSelection : undefined}
                      className="whitespace-pre-wrap text-[15px] leading-8 text-slate-800 selection:bg-indigo-200 selection:text-slate-950"
                      tabIndex={isSelected ? 0 : undefined}
                    >
                      {renderArticleText(article.text, isSelected ? currentHighlights : [], glossary, setActiveTerm)}
                    </div>
                    {isSelected && currentHighlights.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3" aria-label="Grifos deste artigo">
                        {currentHighlights.map((highlight) => (
                          <button key={highlight.id} type="button" onClick={() => removeHighlight(highlight.id)} title="Remover grifo" className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-xs text-slate-600 hover:border-rose-300 hover:text-rose-700">
                            <span className={`mr-1 inline-block h-2.5 w-2.5 rounded-full ${colorLabels.find((item) => item.id === highlight.color)?.swatch}`} />
                            {highlight.quote} <span aria-hidden="true">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedChapter && <ChapterQuiz chapterId={selectedChapter.id} chapterTitle={selectedChapter.title} />}
          </section>

          <aside className="min-w-0 space-y-4 xl:col-span-5" aria-label="Aulas e materiais complementares">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex border-b border-slate-200">
                <button type="button" onClick={() => setRightTab('video')} className={`flex-1 px-4 py-3 text-sm font-semibold ${rightTab === 'video' ? 'border-b-2 border-indigo-700 text-indigo-800' : 'text-slate-500 hover:bg-slate-50'}`} aria-pressed={rightTab === 'video'}>Videoaulas</button>
                <button type="button" onClick={() => setRightTab('attachments')} className={`flex-1 px-4 py-3 text-sm font-semibold ${rightTab === 'attachments' ? 'border-b-2 border-indigo-700 text-indigo-800' : 'text-slate-500 hover:bg-slate-50'}`} aria-pressed={rightTab === 'attachments'}>Anexos do capítulo <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px]">{chapterAttachments.length}</span></button>
              </div>

              {rightTab === 'video' ? (
                <div className="p-4 sm:p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Art. {selectedArticle.number}</p><h2 className="mt-1 truncate font-bold">{activeVideo?.title ?? 'Aula vinculada ao artigo'}</h2>{activeVideo?.channel && <p className="mt-1 text-xs text-slate-500">{activeVideo.channel}</p>}</div>
                    {articleVideos.length > 1 && <select aria-label="Selecionar videoaula" value={activeVideo?.id ?? ''} onChange={(event) => setActiveVideoId(event.target.value)} className="max-w-36 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">{articleVideos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}</select>}
                  </div>
                  <div className="relative aspect-video min-h-[200px] overflow-hidden rounded-xl bg-slate-950">
                    {videoIdIsValid && activeVideoId === activeVideo?.id ? (
                      <iframe
                        key={activeVideo.id}
                        className="absolute inset-0 h-full w-full"
                        src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&hl=pt-BR`}
                        title={`Videoaula: ${activeVideo.title}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                        <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/15 text-2xl">▶</span><p className="mt-3 text-sm font-semibold">{activeVideo ? (videoIdIsValid ? 'Clique em “Carregar aula” para abrir o vídeo' : 'ID de vídeo inválido') : 'Escolha “Aula” ao lado de um artigo'}</p><p className="mt-1 text-xs text-slate-300">O vídeo será carregado neste painel.</p></div>
                      </div>
                    )}
                  </div>
                  {activeVideo && videoIdIsValid && activeVideoId !== activeVideo.id && <button type="button" onClick={() => setActiveVideoId(activeVideo.id)} className="mt-3 w-full rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">Carregar aula neste painel</button>}
                  {activeVideo && !videoIdIsValid && <p className="mt-3 text-xs text-rose-700">Confira o ID do YouTube recebido pela API. O componente espera o ID do vídeo, não a URL completa.</p>}
                  {articleVideos.length > 0 && <div className="mt-4 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aulas deste artigo</p>{articleVideos.map((video) => <button key={video.id} type="button" onClick={() => setActiveVideoId(video.id)} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm ${activeVideoId === video.id ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:bg-slate-50'}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-indigo-100 text-indigo-700">▶</span><span className="min-w-0 truncate">{video.title}</span></button>)}</div>}
                </div>
              ) : (
                <div className="p-4 sm:p-5">
                  <p className="mb-4 text-sm text-slate-600">Materiais relacionados a <b>{selectedChapter?.title}</b>.</p>
                  {chapterAttachments.length ? <ul className="space-y-2">{chapterAttachments.map((attachment) => <li key={attachment.id}><a href={attachment.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-lg text-indigo-700">{attachment.type === 'PDF' ? 'PDF' : attachment.type === 'MAPA_MENTAL' ? '✧' : attachment.type === 'RESUMO' ? '≡' : '↗'}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-800">{attachment.title}</span><span className="mt-0.5 block text-xs text-slate-500">{attachment.type.replace('_', ' ').toLowerCase()}</span></span><span className="text-slate-400 group-hover:text-indigo-700" aria-hidden="true">↗</span></a></li>)}</ul> : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center"><p className="text-sm font-semibold text-slate-700">Nenhum anexo neste capítulo</p><p className="mt-1 text-xs text-slate-500">PDFs e mapas mentais vinculados aparecerão aqui.</p></div>}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="article-notes-title">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Bloco de notas inteligente</p><h2 id="article-notes-title" className="mt-1 text-lg font-bold">Resumo do Art. {selectedArticle.number}</h2></div>
                <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">Vinculado ao artigo</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Esta anotação é privada e fica associada ao artigo que está selecionado.</p>
              <textarea
                value={noteText}
                onChange={(event) => { setNoteText(event.target.value); setNoteStatus('dirty'); }}
                disabled={noteStatus === 'loading'}
                maxLength={20000}
                rows={7}
                placeholder="Escreva um resumo com suas palavras, uma dúvida ou um macete para lembrar…"
                aria-label={`Anotação do artigo ${selectedArticle.number}`}
                className="mt-3 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs ${noteStatus === 'error' ? 'text-rose-700' : 'text-slate-500'}`} role="status">
                  {noteStatus === 'loading' ? 'Carregando…' : noteStatus === 'saving' ? 'Salvando…' : noteStatus === 'dirty' ? 'Alterações não salvas' : noteStatus === 'error' ? 'Falha ao sincronizar' : 'Salvo'}
                </span>
                <button type="button" onClick={saveArticleNote} disabled={noteStatus === 'loading' || noteStatus === 'saving' || noteStatus === 'error'} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300">Salvar anotação</button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meus grifos</p><p className="mt-1 text-lg font-bold">{currentHighlights.length} neste artigo</p></div><span className="text-xl" aria-hidden="true">🖍️</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Selecione um trecho da lei, escolha uma cor e aplique. Os grifos são guardados neste navegador e também enviados ao callback quando configurado.</p>
              {!hydrated && <p className="mt-2 text-xs text-slate-400">Carregando grifos salvos…</p>}
            </section>
          </aside>
        </div>
      </div>
      {notice && <div role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</div>}
    </main>
  );
}
