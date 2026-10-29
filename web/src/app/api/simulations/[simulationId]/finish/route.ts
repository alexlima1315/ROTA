import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function POST(_: Request, { params }: { params: Promise<{ simulationId: string }> }) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { simulationId } = await params;
  const sim = await prisma.simulado.findFirst({ where: { id: simulationId, usuarioId }, include: { questoes: { orderBy: { ordem: 'asc' }, include: { questao: { select: { enunciado: true, explicacao: true, alternativas: { orderBy: { ordem: 'asc' }, select: { codigo: true, texto: true, correta: true } } } } } } });
  if (!sim) return NextResponse.json({ error: 'Simulado não encontrado.' }, { status: 404 });
  if (sim.status === 'EM_ANDAMENTO') {
    const expired = sim.terminaEm <= new Date();
    const score = sim.questoes.filter(x => x.correta === true).length;
    await prisma.simulado.update({ where: { id: sim.id }, data: { status: expired ? 'EXPIRADO' : 'CONCLUIDO', concluidoEm: new Date(), totalAcertos: score } });
    return NextResponse.json({ status: expired ? 'EXPIRADO' : 'CONCLUIDO', totalAcertos: score, total: sim.totalQuestoes, questions: sim.questoes.map(x => ({ id: x.questaoId, ordem: x.ordem, enunciado: x.questao.enunciado, resposta: x.alternativaSelecionada, correta: x.questao.alternativas.find(a => a.correta)?.codigo ?? null, explicacao: x.questao.explicacao })) });
  }
  return NextResponse.json({ status: sim.status, totalAcertos: sim.totalAcertos, total: sim.totalQuestoes, questions: sim.questoes.map(x => ({ id: x.questaoId, ordem: x.ordem, resposta: x.alternativaSelecionada, correta: x.questao.alternativas.find(a => a.correta)?.codigo ?? null, explicacao: x.questao.explicacao })) });
}
