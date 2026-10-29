'use client';
import { useEffect, useState } from 'react';

export function StudyTimer() {
  const [session, setSession] = useState<{ sessionId: string; startedAt: string } | null>(null); const [seconds, setSeconds] = useState(0); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { const stored = sessionStorage.getItem('codex-study-session'); if (stored) { try { setSession(JSON.parse(stored)); } catch { sessionStorage.removeItem('codex-study-session'); } } }, []);
  useEffect(() => { if (!session) return; const tick = () => setSeconds(Math.min(43200, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))); tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer); }, [session]);
  const clock = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  async function start() { setBusy(true); const r = await fetch('/api/study-sessions', { method: 'POST' }); const d = await r.json().catch(() => null); setBusy(false); if (!r.ok || !d) { setMessage('Entre na conta para registrar seu tempo.'); return; } sessionStorage.setItem('codex-study-session', JSON.stringify(d)); setSession(d); setMessage(''); }
  async function stop() { if (!session) return; setBusy(true); const r = await fetch(`/api/study-sessions/${session.sessionId}/finish`, { method: 'POST' }); setBusy(false); if (!r.ok) { setMessage('Não foi possível salvar o tempo. Tente novamente.'); return; } sessionStorage.removeItem('codex-study-session'); setSession(null); setSeconds(0); setMessage('Tempo de estudo salvo no seu painel.'); }
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3"><span className="font-mono text-lg" aria-live="polite">{clock}</span><button disabled={busy} onClick={() => void (session ? stop() : start())} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Salvando…' : session ? 'Encerrar estudo' : 'Iniciar estudo'}</button>{message && <small role="status">{message}</small>}</div>;
}
