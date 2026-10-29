import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { questionId } = await params;
  const body = await request.json().catch(() => null);
  const question = await prisma.bancoQuestao.findFirst({ where: { id: questionId, status: 'PUBLICADA', tipo: 'MULTIPLA_ESCOLHA' }, select: { id: true, explicacao: true, alternativas: { select: { codigo: true, correta: true } } } });
  if (!question) return NextResponse.json({ error: 'Questão não encontrada.' }, { status: 404 });
  const choice = question.alternativas.find(a => a.codigo === body?.alternativa);
  if (!choice) return NextResponse.json({ error: 'Alternativa inválida.' }, { status: 400 });
  const correct = question.alternativas.find(a => a.correta)?.codigo ?? null;
  await prisma.tentativaQuestao.create({ data: { usuarioId, questaoId: question.id, alternativaSelecionada: choice.codigo, correta: choice.correta, respondidaEm: new Date() } });
  return NextResponse.json({ correta: choice.correta, gabarito: correct, explicacao: question.explicacao });
}
