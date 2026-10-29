'use client';

import { useEffect, useState } from 'react';

type PublicOption = { id: string; codigo: string; texto: string };
type PublicQuestion = {
  id: string;
  enunciado: string;
  dificuldade: 'FACIL' | 'MEDIA' | 'DIFICIL';
  alternativas: PublicOption[];
};
type AnswerResult = {
  correta: boolean;
  alternativaCorreta: string;
  explicacao: string;
};

type ChapterQuizProps = {
  chapterId: string;
  chapterTitle: string;
};

export default function ChapterQuiz({ chapterId, chapterTitle }: ChapterQuizProps) {
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setQuestions([]);
    setResults({});
    setSelected({});

    fetch(`/api/chapters/${encodeURIComponent(chapterId)}/quiz`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar o quiz.');
        setQuestions(body.questions);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Falha ao carregar as questões.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [chapterId]);

  async function submitAnswer(questionId: string, optionId: string) {
    if (results[questionId] || submitting) return;
    setSelected((current) => ({ ...current, [questionId]: optionId }));
    setSubmitting(questionId);
    setError('');

    try {
      const response = await fetch(`/api/chapters/${encodeURIComponent(chapterId)}/quiz`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível registrar a resposta.');
      setResults((current) => ({ ...current, [questionId]: body.result }));
    } catch (cause) {
      setSelected((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
      setError(cause instanceof Error ? cause.message : 'Falha ao enviar a resposta.');
    } finally {
      setSubmitting(null);
    }
  }

  const answeredCount = Object.keys(results).length;

  return (
    <section className="mt-8 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm sm:p-6" aria-labelledby="chapter-quiz-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-700">Prática imediata · capítulo</p>
          <h2 id="chapter-quiz-title" className="mt-1 text-xl font-bold text-slate-900">Fixe o que estudou</h2>
          <p className="mt-1 text-sm text-slate-600">3 questões de múltipla escolha sobre {chapterTitle}.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800 shadow-sm">{answeredCount}/3 respondidas</span>
      </div>

      {loading && <div className="mt-5 animate-pulse rounded-xl bg-white p-5 text-sm text-slate-500">Buscando questões deste capítulo…</div>}
      {!loading && error && questions.length === 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="status">
          <b>Quiz indisponível.</b> {error} O capítulo precisa ter pelo menos três questões publicadas e vinculadas aos seus artigos.
        </div>
      )}
      {!loading && questions.length > 0 && (
        <div className="mt-5 space-y-4">
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
          {questions.map((question, questionIndex) => {
            const result = results[question.id];
            return (
              <article key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Questão {questionIndex + 1}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{question.dificuldade.toLowerCase()}</span>
                </div>
                <p className="font-semibold leading-7 text-slate-900">{question.enunciado}</p>
                <div className="mt-3 space-y-2">
                  {question.alternativas.map((option) => {
                    const isSelected = selected[question.id] === option.id;
                    const isCorrectOption = result?.alternativaCorreta === option.codigo;
                    const stateClass = result
                      ? isCorrectOption
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                        : isSelected
                          ? 'border-rose-300 bg-rose-50 text-rose-950'
                          : 'border-slate-200 bg-white text-slate-500'
                      : isSelected
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-950'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50';

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={!!result || !!submitting}
                        onClick={() => submitAnswer(question.id, option.id)}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm leading-6 transition disabled:cursor-default ${stateClass}`}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold">{option.codigo}</span>
                        <span>{option.texto}</span>
                        {submitting === question.id && isSelected && <span className="ml-auto text-xs text-slate-500">Salvando…</span>}
                      </button>
                    );
                  })}
                </div>
                {result && (
                  <div className={`mt-3 rounded-lg p-3 text-sm leading-6 ${result.correta ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`} role="status">
                    <b>{result.correta ? 'Resposta correta.' : `A alternativa correta é ${result.alternativaCorreta}.`}</b> {result.explicacao}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!loading && questions.length === 0 && !error && <p className="mt-5 rounded-xl bg-white p-5 text-sm text-slate-600">Não há três questões publicadas para este capítulo.</p>}
    </section>
  );
}
