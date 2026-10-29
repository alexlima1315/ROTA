import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function POST() {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const open = await prisma.registroEstudo.findFirst({ where: { usuarioId, encerradoEm: null }, orderBy: { iniciadoEm: 'desc' }, select: { id: true, iniciadoEm: true } });
  if (open) return NextResponse.json({ sessionId: open.id, startedAt: open.iniciadoEm });
  const session = await prisma.registroEstudo.create({ data: { usuarioId, iniciadoEm: new Date() }, select: { id: true, iniciadoEm: true } });
  return NextResponse.json({ sessionId: session.id, startedAt: session.iniciadoEm }, { status: 201 });
}
