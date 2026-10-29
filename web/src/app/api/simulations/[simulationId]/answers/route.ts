import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ simulationId: string }> }) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { simulationId } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.questaoId !== 'string' || typeof body?.alternativa !== 'string') return NextResponse.json({ error: 'Resposta inválida.' }, { status: 400 });
  const sim = await prisma.simulado.findFirst({ where: { id: simulationId, usuarioId }, select: { id: true, status: true, terminaEm: true } });
  if (!sim) return NextResponse.json({ error: 'Simulado não encontrado.' }, { status: 404 });
  if (sim.status !== 'EM_ANDAMENTO' || sim.terminaEm <= new Date()) return NextResponse.json({ error: 'Tempo encerrado ou simulado finalizado.' }, { status: 409 });
  const item = await prisma.simuladoQuestao.findFirst({ where: { simuladoId: sim.id, questaoId: body.questaoId }, select: { id: true, questao: { select: { alternativas: { select: { codigo: true, correta: true } } } } } });
  if (!item || !item.questao.alternativas.some(a => a.codigo === body.alternativa)) return NextResponse.json({ error: 'Questão ou alternativa inválida.' }, { status: 400 });
  const correta = item.questao.alternativas.find(a => a.codigo === body.alternativa)!.correta;
  await prisma.simuladoQuestao.update({ where: { id: item.id }, data: { alternativaSelecionada: body.alternativa, correta, respondidaEm: new Date() } });
  return NextResponse.json({ salva: true });
}
