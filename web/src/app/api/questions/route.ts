import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';
import { reserveQuestionAccess } from '@/server/paywall/question-quota';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const page = Math.max(1, Number(p.get('page') || 1)); const take = Math.min(30, Math.max(1, Number(p.get('take') || 10)));
  const years = p.getAll('ano').map(Number).filter(Number.isInteger);
  const where = { status: 'PUBLICADA' as const, ...(p.getAll('banca').length ? { banca: { slug: { in: p.getAll('banca') } } } : {}), ...(p.getAll('assunto').length ? { assunto: { in: p.getAll('assunto') } } : {}), ...(p.getAll('dificuldade').length ? { dificuldade: { in: p.getAll('dificuldade') as never[] } } : {}), ...(years.length ? { ano: { in: years } } : {}), ...(p.get('cargo') ? { cargo: { contains: p.get('cargo')!, mode: 'insensitive' as const } } : {}) };
  const [items, total] = await Promise.all([
    prisma.bancoQuestao.findMany({ where, orderBy: [{ ano: 'desc' }, { id: 'asc' }], skip: (page - 1) * take, take, select: { id: true, enunciado: true, explicacao: true, dificuldade: true, ano: true, cargo: true, assunto: true, tipo: true, banca: { select: { nome: true, slug: true } }, artigo: { select: { numero: true, titulo: true } }, alternativas: { orderBy: { ordem: 'asc' }, select: { id: true, codigo: true, texto: true } } } }),
    prisma.bancoQuestao.count({ where }),
  ]);
  if (!items.length) return NextResponse.json({ items, total, page, pages: Math.ceil(total / take) });
  const quota = await reserveQuestionAccess(userId, items.length);
  if (!quota.allowed) {
    if (quota.remaining > 0) {
      const partial = await reserveQuestionAccess(userId, quota.remaining);
      if (partial.allowed) return NextResponse.json({ items: items.slice(0, quota.remaining), total, page, pages: Math.ceil(total / take), quota: { premium: false, usadaHoje: partial.used, limite: partial.limit }, aviso: 'Exibindo apenas o saldo da sua cota gratuita de hoje.' });
    }
    return NextResponse.json({ error: 'Você atingiu o limite de 10 questões gratuitas hoje.', code: 'DAILY_QUESTION_LIMIT', usada: quota.used, limite: quota.limit, upgradeUrl: '/plans' }, { status: 429 });
  }
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / take), quota: { premium: quota.premium, usadaHoje: quota.used, limite: quota.limit } });
}
