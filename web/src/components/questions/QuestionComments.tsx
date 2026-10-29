'use client';
import { useEffect, useState } from 'react';

type Comment = { id: string; conteudo: string; autor: string; curtidas: number; curtidoPorMim: boolean; respostas?: Comment[] };
export function QuestionComments({ questionId }: { questionId: string }) {
  const [items, setItems] = useState<Comment[]>([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function load() { const r = await fetch(`/api/questions/${questionId}/comments`); if (r.ok) setItems((await r.json()).comments); }
  useEffect(() => { void load(); }, [questionId]);
  async function post() { if (!text.trim() || busy) return; setBusy(true); setError(''); const r = await fetch(`/api/questions/${questionId}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conteudo: text }) }); setBusy(false); if (!r.ok) { setError('Não foi possível publicar. Entre novamente ou revise o texto.'); return; } setText(''); await load(); }
  async function like(c: Comment) { const r = await fetch(`/api/comments/${c.id}/likes`, { method: c.curtidoPorMim ? 'DELETE' : 'POST' }); if (r.ok) await load(); }
  const render = (c: Comment) => <article key={c.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between text-sm"><strong>{c.autor}</strong><button onClick={() => void like(c)} aria-label="Curtir comentário">♥ {c.curtidas}</button></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.conteudo}</p>{c.respostas?.map(render)}</article>;
  return <section className="mt-5 space-y-3 border-t pt-4"><h3 className="font-semibold">Discussão da questão</h3><textarea value={text} onChange={e => setText(e.target.value)} maxLength={5000} rows={3} placeholder="Compartilhe seu raciocínio com respeito…" className="w-full rounded-xl border p-3"/><div className="flex items-center justify-between"><small>{text.length}/5000</small><button disabled={busy || !text.trim()} onClick={() => void post()} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Publicando…' : 'Comentar'}</button></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="space-y-2">{items.map(render)}</div></section>;
}
