import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAdmin } from '@/server/auth/current-user';

type RouteContext = { params: Promise<{ lawId: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteContext) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
  const { lawId } = await params;
  if (!UUID_PATTERN.test(lawId)) return NextResponse.json({ error: 'ID de lei inválido.' }, { status: 400 });

  try {
    const lei = await prisma.lei.findUnique({
      where: { id: lawId },
      select: {
        id: true,
        titulo: true,
        capitulos: {
          orderBy: { ordem: 'asc' },
          select: {
            id: true,
            rotulo: true,
            titulo: true,
            ordem: true,
            artigos: {
              orderBy: { ordem: 'asc' },
              select: {
                id: true,
                numero: true,
                titulo: true,
                textoCaput: true,
                situacao: true,
                ordem: true,
                incisos: {
                  orderBy: { ordem: 'asc' },
                  select: { id: true, tipo: true, rotulo: true, texto: true, ordem: true, situacao: true },
                },
              },
            },
          },
        },
      },
    });
    if (!lei) return NextResponse.json({ error: 'Lei não encontrada.' }, { status: 404 });
    return NextResponse.json(lei);
  } catch (error) {
    console.error('Falha ao carregar a estrutura da lei.', error);
    return NextResponse.json({ error: 'Não foi possível carregar capítulos e artigos.' }, { status: 500 });
  }
}
