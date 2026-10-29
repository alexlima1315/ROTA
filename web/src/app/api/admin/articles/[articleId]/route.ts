import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAdmin } from '@/server/auth/current-user';

type RouteContext = { params: Promise<{ articleId: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ARTICLE_STATES = new Set(['VIGENTE', 'ATUALIZADO', 'REVOGADO']);
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
  const { articleId } = await params;
  if (!UUID_PATTERN.test(articleId)) return NextResponse.json({ error: 'ID de artigo inválido.' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  if (body.situacao !== undefined && (typeof body.situacao !== 'string' || !ARTICLE_STATES.has(body.situacao))) {
    return NextResponse.json({ error: 'Situação inválida.' }, { status: 400 });
  }
  if (body.titulo !== undefined && (typeof body.titulo !== 'string' || body.titulo.length > 300)) {
    return NextResponse.json({ error: 'Título inválido.' }, { status: 400 });
  }
  if (body.textoCaput !== undefined && (typeof body.textoCaput !== 'string' || body.textoCaput.length > 40000)) {
    return NextResponse.json({ error: 'Texto inválido.' }, { status: 400 });
  }
  if (body.situacao === undefined && body.titulo === undefined && body.textoCaput === undefined) {
    return NextResponse.json({ error: 'Nenhuma alteração recebida.' }, { status: 400 });
  }

  try {
    const article = await prisma.artigo.update({
      where: { id: articleId },
      data: {
        ...(body.situacao !== undefined ? {
          situacao: body.situacao as 'VIGENTE' | 'ATUALIZADO' | 'REVOGADO',
          revogadoEm: body.situacao === 'REVOGADO' ? new Date() : null,
        } : {}),
        ...(body.titulo !== undefined ? { titulo: body.titulo.trim() || null } : {}),
        ...(body.textoCaput !== undefined ? { textoCaput: body.textoCaput } : {}),
      },
      select: { id: true, numero: true, situacao: true, titulo: true, revogadoEm: true },
    });
    return NextResponse.json({ article });
  } catch (error) {
    if (isRecord(error) && error.code === 'P2025') return NextResponse.json({ error: 'Artigo não encontrado.' }, { status: 404 });
    console.error('Falha ao atualizar artigo.', error);
    return NextResponse.json({ error: 'Não foi possível atualizar o artigo.' }, { status: 500 });
  }
}
