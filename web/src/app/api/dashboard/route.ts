import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function GET() {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const now = new Date(); const start = new Date(now); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - 6);
  const [user, attempts, simAnswers, sessions, quota] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nome: true, plano: true } }),
    prisma.tentativaQuestao.findMany({ where: { usuarioId, respondidaEm: { gte: start } }, select: { correta: true, respondidaEm: true, questao: { select: { assunto: true } } } }),
    prisma.simuladoQuestao.findMany({ where: { respondidaEm: { gte: start }, simulado: { usuarioId } }, select: { correta: true, respondidaEm: true, questao: { select: { assunto: true } } } }),
    prisma.registroEstudo.findMany({ where: { usuarioId, iniciadoEm: { gte: start }, encerradoEm: { not: null } }, select: { iniciadoEm: true, segundosLiquidos: true } }),
    prisma.usoQuestaoDiario.findUnique({ where: { usuarioId_data: { usuarioId, data: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) } }, select: { quantidade: true } }),
  ]);
  const allAnswers = [...attempts, ...simAnswers];
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + i); return { date: dayKey(date), label: date.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }), questoes: 0, acertos: 0, segundos: 0 }; });
  const byDate = new Map(days.map(d => [d.date, d]));
  for (const attempt of allAnswers) if (attempt.respondidaEm) { const day = byDate.get(dayKey(attempt.respondidaEm)); if (day) { day.questoes++; if (attempt.correta) day.acertos++; } }
  for (const session of sessions) { const day = byDate.get(dayKey(session.iniciadoEm)); if (day) day.segundos += session.segundosLiquidos; }
  const subjects = new Map<string, { assunto: string; total: number; acertos: number }>();
  for (const attempt of allAnswers) { const name = attempt.questao.assunto || 'Sem assunto'; const current = subjects.get(name) || { assunto: name, total: 0, acertos: 0 }; current.total++; if (attempt.correta) current.acertos++; subjects.set(name, current); }
  const total = allAnswers.length; const correct = allAnswers.filter(a => a.correta).length;
  return NextResponse.json({ student: user?.nome ?? 'Estudante', plano: user?.plano ?? 'GRATUITO', resumo: { questoes7Dias: total, acertos7Dias: correct, percentual7Dias: total ? Math.round(correct / total * 100) : 0, horasLiquidas7Dias: Math.round(sessions.reduce((n, s) => n + s.segundosLiquidos, 0) / 360) / 10 }, disciplinas: [...subjects.values()].map(s => ({ ...s, percentual: Math.round(s.acertos / s.total * 100) })).sort((a, b) => b.total - a.total), evolucao: days, cota: { usadaHoje: quota?.quantidade ?? 0, limiteGratuito: 10 } });
}
