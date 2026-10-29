import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { questionId } = await params;
  const comments = await prisma.comentarioQuestao.findMany({ where: { questaoId: questionId, status: 'PUBLICADO', paiId: null }, orderBy: { criadoEm: 'asc' }, take: 100, include: { usuario: { select: { id: true, nome: true } }, curtidas: { select: { usuarioId: true } }, respostas: { where: { status: 'PUBLICADO' }, orderBy: { criadoEm: 'asc' }, include: { usuario: { select: { id: true, nome: true } }, curtidas: { select: { usuarioId: true } } } } } });
  const format = (c: typeof comments[number]) => ({ id: c.id, conteudo: c.conteudo, criadoEm: c.criadoEm, autor: c.usuario.nome, curtidas: c.curtidas.length, curtidoPorMim: c.curtidas.some(l => l.usuarioId === usuarioId), respostas: c.respostas.map(r => ({ id: r.id, conteudo: r.conteudo, criadoEm: r.criadoEm, autor: r.usuario.nome, curtidas: r.curtidas.length, curtidoPorMim: r.curtidas.some(l => l.usuarioId === usuarioId) })) });
  return NextResponse.json({ comments: comments.map(format) });
}

export async function POST(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const usuarioId = await getAuthenticatedUserId();
  if (!usuarioId) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const { questionId } = await params;
  const body = await request.json().catch(() => null);
  const conteudo = typeof body?.conteudo === 'string' ? body.conteudo.trim() : '';
  if (!conteudo || conteudo.length > 5000) return NextResponse.json({ error: 'Escreva um comentário de até 5.000 caracteres.' }, { status: 400 });
  if (body.paiId) {
    const parent = await prisma.comentarioQuestao.findFirst({ where: { id: body.paiId, questaoId: questionId, status: 'PUBLICADO' }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: 'Comentário de referência inválido.' }, { status: 400 });
  }
  const comment = await prisma.comentarioQuestao.create({ data: { questaoId: questionId, usuarioId, paiId: body.paiId || null, conteudo }, include: { usuario: { select: { nome: true } } } });
  return NextResponse.json({ comment }, { status: 201 });
}
