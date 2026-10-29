import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function GET() {
  if (!await getAuthenticatedUserId()) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const [banks, subjects, years, difficulties] = await Promise.all([
    prisma.bancaExaminadora.findMany({ where: { questoes: { some: { status: 'PUBLICADA' } } }, orderBy: { nome: 'asc' }, select: { id: true, nome: true, slug: true, _count: { select: { questoes: { where: { status: 'PUBLICADA' } } } } } }),
    prisma.bancoQuestao.findMany({ where: { status: 'PUBLICADA', assunto: { not: null } }, distinct: ['assunto'], orderBy: { assunto: 'asc' }, select: { assunto: true } }),
    prisma.bancoQuestao.findMany({ where: { status: 'PUBLICADA', ano: { not: null } }, distinct: ['ano'], orderBy: { ano: 'desc' }, select: { ano: true } }),
    prisma.bancoQuestao.findMany({ where: { status: 'PUBLICADA' }, distinct: ['dificuldade'], select: { dificuldade: true } }),
  ]);
  return NextResponse.json({ banks, subjects: subjects.map(x => x.assunto).filter(Boolean), years: years.map(x => x.ano).filter(Boolean), difficulties: difficulties.map(x => x.dificuldade) });
}
