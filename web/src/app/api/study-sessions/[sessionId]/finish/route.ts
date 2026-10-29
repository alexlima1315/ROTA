import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function POST(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { sessionId } = await params;
  const session = await prisma.registroEstudo.findFirst({ where: { id: sessionId, usuarioId }, select: { id: true, iniciadoEm: true, encerradoEm: true, segundosLiquidos: true } });
  if (!session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 });
  if (session.encerradoEm) return NextResponse.json({ segundosLiquidos: session.segundosLiquidos });
  const ended = new Date(); const seconds = Math.min(12 * 3600, Math.max(0, Math.floor((ended.getTime() - session.iniciadoEm.getTime()) / 1000)));
  const saved = await prisma.registroEstudo.updateMany({ where: { id: session.id, usuarioId, encerradoEm: null }, data: { encerradoEm: ended, segundosLiquidos: seconds } });
  if (!saved.count) { const current = await prisma.registroEstudo.findUnique({ where: { id: session.id }, select: { segundosLiquidos: true } }); return NextResponse.json({ segundosLiquidos: current?.segundosLiquidos ?? seconds }); }
  return NextResponse.json({ segundosLiquidos: seconds });
}
