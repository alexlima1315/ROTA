import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

async function handle(request: Request, { params }: { params: Promise<{ commentId: string }> }, remove: boolean) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { commentId } = await params;
  const comment = await prisma.comentarioQuestao.findFirst({ where: { id: commentId, status: 'PUBLICADO' }, select: { id: true } });
  if (!comment) return NextResponse.json({ error: 'Comentário não encontrado.' }, { status: 404 });
  const where = { comentarioId_usuarioId: { comentarioId, usuarioId } };
  if (remove) await prisma.curtidaComentario.deleteMany({ where: { comentarioId, usuarioId } });
  else await prisma.curtidaComentario.upsert({ where, create: { comentarioId, usuarioId }, update: {} });
  const curtidas = await prisma.curtidaComentario.count({ where: { comentarioId } });
  return NextResponse.json({ curtidas, curtidoPorMim: !remove });
}
export async function POST(req: Request, ctx: { params: Promise<{ commentId: string }> }) { return handle(req, ctx, false); }
export async function DELETE(req: Request, ctx: { params: Promise<{ commentId: string }> }) { return handle(req, ctx, true); }
