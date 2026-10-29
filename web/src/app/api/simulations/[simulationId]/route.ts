import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ simulationId: string }> }) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { simulationId } = await params;
  let sim = await prisma.simulado.findFirst({ where: { id: simulationId, usuarioId }, include: { questoes: { orderBy: { ordem: 'asc' }, include: { questao: { select: { id: true, enunciado: true, assunto: true, alternativas: { orderBy: { ordem: 'asc' }, select: { codigo: true, texto: true } } } } } } });
  if (!sim) return NextResponse.json({ error: 'Simulado não encontrado.' }, { status: 404 });
  if (sim.status === 'EM_ANDAMENTO' && sim.terminaEm <= new Date()) {
    sim = await prisma.simulado.update({ where: { id: sim.id }, data: { status: 'EXPIRADO', concluidoEm: new Date(), totalAcertos: sim.questoes.filter(q => q.correta).length }, include: { questoes: { orderBy: { ordem: 'asc' }, include: { questao: { select: { id: true, enunciado: true, assunto: true, alternativas: { orderBy: { ordem: 'asc' }, select: { codigo: true, texto: true } } } } } } });
  }
  return NextResponse.json({ id: sim.id, status: sim.status, expiresAt: sim.terminaEm, total: sim.totalQuestoes, score: sim.status === 'EM_ANDAMENTO' ? null : sim.totalAcertos, questions: sim.questoes.map(x => ({ id: x.questao.id, ordem: x.ordem, respondida: Boolean(x.respondidaEm), selecionada: x.alternativaSelecionada, enunciado: x.questao.enunciado, assunto: x.questao.assunto, alternativas: x.questao.alternativas })) });
}
