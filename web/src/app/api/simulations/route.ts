import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';
import { reserveQuestionAccess } from '@/server/paywall/question-quota';

export async function POST(request: Request) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const banks = Array.isArray(body?.bancas) ? body.bancas.filter((x: unknown): x is string => typeof x === 'string').slice(0, 20) : [];
  const subjects = Array.isArray(body?.assuntos) ? body.assuntos.filter((x: unknown): x is string => typeof x === 'string').slice(0, 50) : [];
  const difficulties = Array.isArray(body?.dificuldades) ? body.dificuldades.filter((x: string) => ['FACIL', 'MEDIA', 'DIFICIL'].includes(x)).slice(0, 3) : [];
  const yearFrom = Number.isInteger(body?.anoDe) ? body.anoDe : null; const yearTo = Number.isInteger(body?.anoAte) ? body.anoAte : null;
  const cargo = typeof body?.cargo === 'string' ? body.cargo.trim().slice(0, 180) : '';
  const timeLimit = Number.isInteger(body?.tempoLimiteSegundos) ? Math.min(21600, Math.max(60, body.tempoLimiteSegundos)) : 7200;
  const conditions = [Prisma.sql`q."status" = 'PUBLICADA' AND q."tipo" = 'MULTIPLA_ESCOLHA'`];
  if (banks.length) conditions.push(Prisma.sql`b."slug" IN (${Prisma.join(banks)})`);
  if (subjects.length) conditions.push(Prisma.sql`q."assunto" IN (${Prisma.join(subjects)})`);
  if (difficulties.length) conditions.push(Prisma.sql`q."dificuldade"::text IN (${Prisma.join(difficulties)})`);
  if (yearFrom !== null) conditions.push(Prisma.sql`q."ano" >= ${yearFrom}`);
  if (yearTo !== null) conditions.push(Prisma.sql`q."ano" <= ${yearTo}`);
  if (cargo) conditions.push(Prisma.sql`q."cargo" ILIKE ${`%${cargo.replace(/[%_\\]/g, '\\$&')}%`}`);
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT q."id" FROM "banco_questoes" q LEFT JOIN "bancas_examinadoras" b ON b."id" = q."bancaId" WHERE ${Prisma.join(conditions, ' AND ')} ORDER BY random() LIMIT 51`);
  if (rows.length < 50) return NextResponse.json({ error: 'Ainda não há 50 questões publicadas que correspondam aos filtros.', disponiveis: rows.length }, { status: 409 });
  const quota = await reserveQuestionAccess(usuarioId, 50);
  if (!quota.allowed) return NextResponse.json({ error: 'O simulado tem 50 questões e excede sua cota gratuita diária de 10. Assine o Premium para simulados completos.', code: 'DAILY_QUESTION_LIMIT', usada: quota.used, limite: quota.limit, upgradeUrl: '/plans' }, { status: 429 });
  const startedAt = new Date(); const endsAt = new Date(startedAt.getTime() + timeLimit * 1000);
  const filters = { bancas: banks, assuntos: subjects, dificuldades, anoDe: yearFrom, anoAte: yearTo, cargo };
  const sim = await prisma.simulado.create({ data: { usuarioId, filtros: filters, totalQuestoes: 50, tempoLimiteSegundos: timeLimit, iniciadoEm: startedAt, terminaEm: endsAt, questoes: { create: rows.slice(0, 50).map((q, index) => ({ questaoId: q.id, ordem: index + 1 })) } }, select: { id: true, terminaEm: true, totalQuestoes: true } });
  return NextResponse.json({ simulationId: sim.id, total: sim.totalQuestoes, expiresAt: sim.terminaEm }, { status: 201 });
}
