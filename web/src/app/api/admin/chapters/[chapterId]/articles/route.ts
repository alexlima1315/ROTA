import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAdmin } from '@/server/auth/current-user';

type RouteContext = { params: Promise<{ chapterId: string }> };
type IncisoInput = { tipo: 'PARAGRAFO' | 'INCISO' | 'ALINEA' | 'ITEM'; rotulo: string; texto: string; ordem?: number };
type ArticleInput = { numero: string; titulo?: string; textoCaput?: string; ordem?: number; incisos?: IncisoInput[] };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INCISO_TYPES = new Set(['PARAGRAFO', 'INCISO', 'ALINEA', 'ITEM']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateArticle(value: unknown): value is ArticleInput {
  if (!isRecord(value) || typeof value.numero !== 'string' || !value.numero.trim() || value.numero.length > 40) return false;
  if (value.titulo !== undefined && (typeof value.titulo !== 'string' || value.titulo.length > 300)) return false;
  if (value.textoCaput !== undefined && (typeof value.textoCaput !== 'string' || value.textoCaput.length > 40000)) return false;
  if (value.ordem !== undefined && (!Number.isInteger(value.ordem) || Number(value.ordem) < 1)) return false;
  if (value.incisos === undefined) return true;
  if (!Array.isArray(value.incisos) || value.incisos.length > 500) return false;
  return value.incisos.every((item) => isRecord(item)
    && typeof item.tipo === 'string' && INCISO_TYPES.has(item.tipo)
    && typeof item.rotulo === 'string' && item.rotulo.trim().length > 0 && item.rotulo.length <= 40
    && typeof item.texto === 'string' && item.texto.length > 0 && item.texto.length <= 40000
    && (item.ordem === undefined || (Number.isInteger(item.ordem) && Number(item.ordem) >= 1)));
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
  const { chapterId } = await params;
  if (!UUID_PATTERN.test(chapterId)) return NextResponse.json({ error: 'ID de capítulo inválido.' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'O corpo da requisição deve ser JSON válido.' }, { status: 400 });
  }
  if (!isRecord(body) || !Array.isArray(body.artigos) || body.artigos.length < 1 || body.artigos.length > 100
    || !body.artigos.every(validateArticle)) {
    return NextResponse.json({ error: 'Envie de 1 a 100 artigos válidos em artigos[]. Verifique número, texto e incisos.' }, { status: 400 });
  }

  const articles = body.artigos;
  const numbers = articles.map((article) => article.numero.trim());
  if (new Set(numbers).size !== numbers.length) return NextResponse.json({ error: 'O lote contém números de artigo repetidos.' }, { status: 400 });

  try {
    const chapter = await prisma.capitulo.findUnique({
      where: { id: chapterId },
      select: { id: true, lei: { select: { titulo: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'Capítulo não encontrado.' }, { status: 404 });
    const highestOrder = await prisma.artigo.aggregate({ where: { capituloId: chapterId }, _max: { ordem: true } });
    const firstOrder = highestOrder._max.ordem ?? 0;

    const created = await prisma.$transaction(async (transaction) => {
      const result: { id: string; numero: string }[] = [];
      for (const [index, article] of articles.entries()) {
        const row = await transaction.artigo.create({
          data: {
            capituloId: chapterId,
            numero: article.numero.trim(),
            titulo: article.titulo?.trim() || null,
            textoCaput: article.textoCaput?.trim() || null,
            ordem: article.ordem ?? firstOrder + index + 1,
            situacao: 'VIGENTE',
            ...(article.incisos?.length ? { incisos: { create: article.incisos.map((item, incisoIndex) => ({
              tipo: item.tipo,
              rotulo: item.rotulo.trim(),
              texto: item.texto.trim(),
              ordem: item.ordem ?? incisoIndex + 1,
              situacao: 'VIGENTE' as const,
            })) } } : {}),
          },
          select: { id: true, numero: true },
        });
        result.push(row);
      }
      return result;
    });

    return NextResponse.json({ createdCount: created.length, artigos: created, lei: chapter.lei.titulo }, { status: 201 });
  } catch (error) {
    if (isRecord(error) && error.code === 'P2002') {
      return NextResponse.json({ error: 'Um número de artigo ou ordem já existe neste capítulo. Nenhum item do lote foi salvo.' }, { status: 409 });
    }
    console.error('Falha na importação em lote de artigos.', error);
    return NextResponse.json({ error: 'Falha ao importar o lote. Nenhum item foi salvo.' }, { status: 500 });
  }
}
