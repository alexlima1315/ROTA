import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAdmin } from '@/server/auth/current-user';

export async function GET(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const query = new URL(request.url).searchParams.get('q')?.trim();
  try {
    const [leis, trilhas] = await Promise.all([
      prisma.lei.findMany({
        where: query ? { OR: [
          { titulo: { contains: query, mode: 'insensitive' } },
          { numero: { contains: query, mode: 'insensitive' } },
          { sigla: { contains: query, mode: 'insensitive' } },
        ] } : undefined,
        orderBy: [{ ano: 'desc' }, { numero: 'asc' }],
        take: 500,
        select: { id: true, sigla: true, numero: true, ano: true, titulo: true, jurisdicao: true, uf: true },
      }),
      prisma.trilha.findMany({
        where: query ? { titulo: { contains: query, mode: 'insensitive' } } : undefined,
        orderBy: { titulo: 'asc' },
        take: 500,
        select: { id: true, titulo: true, slug: true },
      }),
    ]);

    return NextResponse.json({ leis, trilhas });
  } catch (error) {
    console.error('Falha ao carregar catálogo administrativo.', error);
    return NextResponse.json({ error: 'Não foi possível carregar o acervo.' }, { status: 500 });
  }
}
