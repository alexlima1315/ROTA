import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '../../../../../server/auth/current-user';
import { prisma } from '../../../../../server/db/prisma';

type RouteContext = { params: Promise<{ articleId: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteContext) {
  const { articleId } = await params;
  if (!UUID_PATTERN.test(articleId)) return NextResponse.json({ error: 'ID de artigo inválido.' }, { status: 400 });

  try {
    const usuarioId = await getAuthenticatedUserId();
    if (!usuarioId) return NextResponse.json({ error: 'É necessário entrar na conta.' }, { status: 401 });

    const note = await prisma.anotacaoUsuario.findUnique({
      where: { usuarioId_artigoId: { usuarioId, artigoId: articleId } },
      select: { id: true, artigoId: true, titulo: true, conteudo: true, atualizadaEm: true },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Falha ao carregar anotação do artigo.', error);
    return NextResponse.json({ error: 'Não foi possível carregar a anotação.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { articleId } = await params;
  if (!UUID_PATTERN.test(articleId)) return NextResponse.json({ error: 'ID de artigo inválido.' }, { status: 400 });

  try {
    const usuarioId = await getAuthenticatedUserId();
    if (!usuarioId) return NextResponse.json({ error: 'É necessário entrar na conta.' }, { status: 401 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('conteudo' in body) || typeof body.conteudo !== 'string') {
      return NextResponse.json({ error: 'Envie o texto da anotação no campo conteudo.' }, { status: 400 });
    }
    if (body.conteudo.length > 20000) return NextResponse.json({ error: 'A anotação deve ter até 20.000 caracteres.' }, { status: 413 });

    const articleExists = await prisma.artigo.findUnique({ where: { id: articleId }, select: { id: true } });
    if (!articleExists) return NextResponse.json({ error: 'Artigo não encontrado.' }, { status: 404 });

    const note = await prisma.anotacaoUsuario.upsert({
      where: { usuarioId_artigoId: { usuarioId, artigoId } },
      create: { usuarioId, artigoId, conteudo: body.conteudo },
      update: { conteudo: body.conteudo },
      select: { id: true, artigoId: true, titulo: true, conteudo: true, atualizadaEm: true },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Falha ao salvar anotação do artigo.', error);
    return NextResponse.json({ error: 'Não foi possível salvar a anotação.' }, { status: 500 });
  }
}
