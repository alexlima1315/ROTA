'use client';

import { useEffect, useMemo, useState } from 'react';

type Law = { id: string; sigla: string | null; numero: string; ano: number; titulo: string; jurisdicao: string; uf: string | null };
type Inciso = { id: string; tipo: string; rotulo: string; texto: string; ordem: number; situacao: string };
type Article = { id: string; numero: string; titulo: string | null; textoCaput: string | null; situacao: string; ordem: number; incisos: Inciso[] };
type Chapter = { id: string; rotulo: string | null; titulo: string; ordem: number; artigos: Article[] };
type Track = { id: string; titulo: string; slug: string };
type Notice = { kind: 'success' | 'error'; text: string } | null;

const articleExample = `[
  {
    "numero": "1º",
    "titulo": "Dos princípios fundamentais",
    "textoCaput": "Texto integral do caput do artigo.",
    "incisos": [
      { "tipo": "PARAGRAFO", "rotulo": "§ 1º", "texto": "Texto do parágrafo.", "ordem": 1 },
      { "tipo": "INCISO", "rotulo": "I", "texto": "Texto do inciso.", "ordem": 2 }
    ]
  }
]`;

function statusLabel(status: string) {
  if (status === 'REVOGADO') return 'Revogado';
  if (status === 'ATUALIZADO') return 'Atualizado';
  return 'Vigente';
}

function parseVideoLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [url, ...titleParts] = line.split('|');
    return { url: url.trim(), titulo: titleParts.join('|').trim() };
  });
}

function parseAttachmentLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [url, title, type] = line.split('|').map((part) => part?.trim() ?? '');
    return { url, titulo: title, tipo: (type || 'PDF').toUpperCase() };
  });
}

export default function ContentManager() {
  const [tab, setTab] = useState<'articles' | 'media'>('articles');
  const [laws, setLaws] = useState<Law[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lawId, setLawId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [articleId, setArticleId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articleJson, setArticleJson] = useState(articleExample);
  const [targetType, setTargetType] = useState<'ARTIGO' | 'TRILHA'>('ARTIGO');
  const [videoLines, setVideoLines] = useState('');
  const [attachmentLines, setAttachmentLines] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingLaw, setLoadingLaw] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentChapter = chapters.find((chapter) => chapter.id === chapterId);
  const currentArticle = currentChapter?.artigos.find((article) => article.id === articleId);
  const totalArticles = useMemo(() => chapters.reduce((count, chapter) => count + chapter.artigos.length, 0), [chapters]);

  useEffect(() => {
    const controller = new AbortController();
    const query = catalogSearch ? `?q=${encodeURIComponent(catalogSearch)}` : '';
    fetch(`/api/admin/catalog${query}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar o catálogo.');
        setLaws(body.leis);
        setTracks(body.trilhas);
        setLawId((current) => body.leis.some((law: Law) => law.id === current) ? current : body.leis[0]?.id ?? '');
        setTrackId((current) => body.trilhas.some((track: Track) => track.id === current) ? current : body.trilhas[0]?.id ?? '');
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Falha ao carregar o catálogo.' });
      })
      .finally(() => setLoadingCatalog(false));
    return () => controller.abort();
  }, [catalogSearch]);

  useEffect(() => {
    if (!lawId) { setChapters([]); setChapterId(''); setArticleId(''); return; }
    const controller = new AbortController();
    setLoadingLaw(true);
    setChapterId('');
    setArticleId('');
    fetch(`/api/admin/laws/${encodeURIComponent(lawId)}/catalog`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar a lei.');
        setChapters(body.capitulos);
        const firstChapter = body.capitulos[0];
        setChapterId(firstChapter?.id ?? '');
        setArticleId(firstChapter?.artigos[0]?.id ?? '');
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Falha ao carregar a lei.' });
      })
      .finally(() => setLoadingLaw(false));
    return () => controller.abort();
  }, [lawId]);

  function selectChapter(id: string) {
    setChapterId(id);
    setArticleId(chapters.find((chapter) => chapter.id === id)?.artigos[0]?.id ?? '');
  }

  function updateArticleInState(updated: Partial<Article> & { id: string }) {
    setChapters((current) => current.map((chapter) => ({
      ...chapter,
      artigos: chapter.artigos.map((article) => article.id === updated.id ? { ...article, ...updated } : article),
    })));
  }

  function updateIncisoInState(articleIdToUpdate: string, updated: Partial<Inciso> & { id: string }) {
    setChapters((current) => current.map((chapter) => ({
      ...chapter,
      artigos: chapter.artigos.map((article) => article.id === articleIdToUpdate
        ? { ...article, incisos: article.incisos.map((inciso) => inciso.id === updated.id ? { ...inciso, ...updated } : inciso) }
        : article),
    })));
  }

  async function importArticles() {
    if (!chapterId) { setNotice({ kind: 'error', text: 'Selecione uma lei e um capítulo primeiro.' }); return; }
    let parsed: unknown;
    try { parsed = JSON.parse(articleJson); } catch { setNotice({ kind: 'error', text: 'O lote de artigos precisa ser um JSON válido.' }); return; }
    if (!Array.isArray(parsed) || parsed.length === 0) { setNotice({ kind: 'error', text: 'Informe pelo menos um artigo no lote.' }); return; }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/chapters/${encodeURIComponent(chapterId)}/articles`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artigos: parsed }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Falha ao importar artigos.');
      setNotice({ kind: 'success', text: `${body.createdCount} artigo(s) e seus dispositivos foram adicionados.` });
      setArticleJson('[]');
      // Recarrega a estrutura atual da lei para apresentar os itens recém-criados.
      const refresh = await fetch(`/api/admin/laws/${encodeURIComponent(lawId)}/catalog`, { credentials: 'same-origin', cache: 'no-store' });
      if (refresh.ok) {
        const lawData = await refresh.json();
        setChapters(lawData.capitulos);
        const updatedChapter = lawData.capitulos.find((chapter: Chapter) => chapter.id === chapterId);
        setArticleId(updatedChapter?.artigos.at(-1)?.id ?? articleId);
      }
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Falha ao importar o lote.' });
    } finally {
      setSaving(false);
    }
  }

  async function setArticleStatus(article: Article, nextStatus: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/articles/${encodeURIComponent(article.id)}`, {
        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ situacao: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Falha ao atualizar artigo.');
      updateArticleInState(body.article);
      setNotice({ kind: 'success', text: `Art. ${article.numero}: ${statusLabel(nextStatus).toLowerCase()}.` });
    } catch (cause) { setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Falha ao atualizar artigo.' }); }
    finally { setSaving(false); }
  }

  async function setIncisoStatus(article: Article, inciso: Inciso, nextStatus: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/incisos/${encodeURIComponent(inciso.id)}`, {
        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ situacao: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Falha ao atualizar dispositivo.');
      updateIncisoInState(article.id, body.inciso);
      setNotice({ kind: 'success', text: `${inciso.rotulo}: ${statusLabel(nextStatus).toLowerCase()}.` });
    } catch (cause) { setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Falha ao atualizar dispositivo.' }); }
    finally { setSaving(false); }
  }

  async function saveMedia() {
    const targetId = targetType === 'ARTIGO' ? articleId : trackId;
    if (!targetId) { setNotice({ kind: 'error', text: targetType === 'ARTIGO' ? 'Selecione o artigo de destino.' : 'Selecione a trilha de destino.' }); return; }
    const videos = parseVideoLines(videoLines);
    const anexos = parseAttachmentLines(attachmentLines);
    if (!videos.length && !anexos.length) { setNotice({ kind: 'error', text: 'Cole ao menos uma URL de vídeo ou anexo.' }); return; }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/media', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destino: { tipo: targetType, id: targetId }, videos, anexos }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Falha ao salvar a mídia.');
      setVideoLines('');
      setAttachmentLines('');
      setNotice({ kind: 'success', text: `${body.videosSalvos} vídeo(s) e ${body.anexosSalvos} anexo(s) salvos. IDs do YouTube extraídos automaticamente.` });
    } catch (cause) { setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Falha ao salvar mídia.' }); }
    finally { setSaving(false); }
  }

  if (loadingCatalog) return <div className="p-8 text-sm text-slate-600">Carregando o acervo administrativo…</div>;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Códex Dinâmico · administração</p><h1 className="mt-1 text-3xl font-bold">Gestor do acervo</h1><p className="mt-2 text-sm text-slate-600">Importe conteúdo em lote, revise dispositivos e conecte materiais ao artigo ou à trilha.</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={(event) => { event.preventDefault(); setCatalogSearch(searchInput.trim()); }} className="flex gap-2">
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar lei ou trilha…" className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" aria-label="Buscar lei ou trilha" />
              <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Buscar</button>
              {catalogSearch && <button type="button" onClick={() => { setSearchInput(''); setCatalogSearch(''); }} className="rounded-lg px-2 text-xs font-semibold text-indigo-700">Limpar</button>}
            </form>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><b>{laws.length}</b> leis <span className="mx-2 text-slate-300">·</span><b>{totalArticles}</b> artigos carregados</div>
          </div>
        </header>

        {notice && <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`} role="status">{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button></div>}

        <div className="mb-5 flex gap-2 rounded-xl bg-slate-200/70 p-1.5 sm:w-fit">
          <button type="button" onClick={() => setTab('articles')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'articles' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600'}`}>Leis e artigos</button>
          <button type="button" onClick={() => setTab('media')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'media' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600'}`}>Trilhas e mídia</button>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Lei
              <select value={lawId} onChange={(event) => setLawId(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="">Selecione uma lei</option>{laws.map((law) => <option key={law.id} value={law.id}>{law.sigla ? `${law.sigla} · ` : ''}{law.numero}/{law.ano} — {law.titulo}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">Capítulo
              <select value={chapterId} onChange={(event) => selectChapter(event.target.value)} disabled={!chapters.length || loadingLaw} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100">
                <option value="">Selecione um capítulo</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.rotulo ? `${chapter.rotulo} · ` : ''}{chapter.titulo}</option>)}
              </select>
            </label>
          </div>
          {loadingLaw && <p className="mt-3 text-xs text-slate-500">Carregando capítulos e dispositivos…</p>}
        </section>

        {tab === 'articles' ? (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Importação em lote</h2><p className="mt-1 text-sm text-slate-600">Cole um array JSON. Cada artigo pode incluir parágrafos, incisos, alíneas e itens.</p></div><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800">até 100</span></div>
              <textarea value={articleJson} onChange={(event) => setArticleJson(event.target.value)} rows={18} spellCheck={false} className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" aria-label="JSON em lote de artigos" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">A importação é transacional: se um artigo falhar, o lote inteiro é cancelado.</p><button type="button" onClick={importArticles} disabled={saving || !chapterId} className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? 'Importando…' : 'Validar e importar'}</button></div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div><h2 className="text-lg font-bold">Artigos do capítulo</h2><p className="mt-1 text-sm text-slate-600">Selecione um artigo para revisar o estado do texto e de cada dispositivo.</p></div>
              {!currentChapter?.artigos.length ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Este capítulo ainda não tem artigos cadastrados.</div> : (
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {currentChapter.artigos.map((article) => <button key={article.id} type="button" onClick={() => setArticleId(article.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${articleId === article.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}><span className="font-bold text-indigo-800">Art. {article.numero}</span><span className="min-w-0 flex-1 truncate text-sm text-slate-700">{article.titulo || article.textoCaput || 'Sem título'}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${article.situacao === 'REVOGADO' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{statusLabel(article.situacao)}</span></button>)}
                </div>
              )}
              {currentArticle && <div className="mt-5 border-t border-slate-200 pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Art. {currentArticle.numero}</h3><p className="text-xs text-slate-500">{currentArticle.incisos.length} dispositivo(s)</p></div><button type="button" disabled={saving} onClick={() => setArticleStatus(currentArticle, currentArticle.situacao === 'REVOGADO' ? 'VIGENTE' : 'REVOGADO')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${currentArticle.situacao === 'REVOGADO' ? 'border border-emerald-300 text-emerald-800 hover:bg-emerald-50' : 'border border-rose-300 text-rose-800 hover:bg-rose-50'}`}>{currentArticle.situacao === 'REVOGADO' ? 'Restaurar artigo como vigente' : 'Marcar artigo revogado'}</button></div>
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                  {currentArticle.incisos.length ? currentArticle.incisos.map((inciso) => <div key={inciso.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">{inciso.tipo.replace('_', ' ')} · {inciso.rotulo}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{inciso.texto}</p></div><button type="button" disabled={saving} onClick={() => setIncisoStatus(currentArticle, inciso, inciso.situacao === 'REVOGADO' ? 'VIGENTE' : 'REVOGADO')} className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${inciso.situacao === 'REVOGADO' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-800'}`}>{inciso.situacao === 'REVOGADO' ? 'Revogado · restaurar' : 'Marcar revogado'}</button></div></div>) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Nenhum parágrafo ou inciso cadastrado neste artigo.</p>}
                </div>
              </div>}
            </section>
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-bold">Destino dos materiais</h2><p className="mt-1 text-sm text-slate-600">Associe cada vídeo e anexo a um artigo ou a uma trilha.</p>
              <div className="mt-4 flex gap-2"><button type="button" onClick={() => setTargetType('ARTIGO')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${targetType === 'ARTIGO' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Artigo da lei</button><button type="button" onClick={() => setTargetType('TRILHA')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${targetType === 'TRILHA' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Trilha</button></div>
              {targetType === 'ARTIGO' ? <label className="mt-4 block text-sm font-semibold text-slate-700">Artigo selecionado
                <select value={articleId} onChange={(event) => setArticleId(event.target.value)} disabled={!currentChapter?.artigos.length} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-100"><option value="">Selecione um artigo</option>{currentChapter?.artigos.map((article) => <option key={article.id} value={article.id}>Art. {article.numero} — {article.titulo || 'sem título'}</option>)}</select>
              </label> : <label className="mt-4 block text-sm font-semibold text-slate-700">Trilha
                <select value={trackId} onChange={(event) => setTrackId(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Selecione uma trilha</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.titulo}</option>)}</select>
              </label>}
              {targetType === 'ARTIGO' && currentArticle && <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">Materiais serão ligados ao Art. {currentArticle.numero} de {currentChapter?.titulo}.</p>}
            </section>

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div><h2 className="text-lg font-bold">Adicionar videoaulas</h2><p className="mt-1 text-sm text-slate-600">Uma URL por linha. Opcionalmente acrescente <code className="rounded bg-slate-100 px-1">| título da aula</code>. O servidor extrai e valida o ID do YouTube.</p><textarea value={videoLines} onChange={(event) => setVideoLines(event.target.value)} rows={5} placeholder={'https://www.youtube.com/watch?v=XXXXXXXXXXX | Aula: princípios\nhttps://youtu.be/YYYYYYYYYYY | Revisão'} className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-6 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" aria-label="URLs de vídeo do YouTube" /></div>
              <div><h2 className="text-lg font-bold">Adicionar PDFs e materiais</h2><p className="mt-1 text-sm text-slate-600">Uma linha por anexo no formato <code className="rounded bg-slate-100 px-1">URL | Título | TIPO</code>. Tipos: PDF, MAPA_MENTAL, RESUMO ou OUTRO.</p><textarea value={attachmentLines} onChange={(event) => setAttachmentLines(event.target.value)} rows={5} placeholder={'https://exemplo.gov.br/material.pdf | Lei esquematizada | PDF\nhttps://exemplo.gov.br/mapa.pdf | Mapa mental | MAPA_MENTAL'} className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-6 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" aria-label="Links de anexos" /></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><p className="text-xs text-slate-500">Links repetidos no mesmo destino são ignorados.</p><button type="button" disabled={saving} onClick={saveMedia} className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? 'Salvando lote…' : 'Validar e salvar mídia'}</button></div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
