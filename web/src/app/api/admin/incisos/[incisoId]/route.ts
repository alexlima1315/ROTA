import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAdmin } from '@/server/auth/current-user';

type RouteContext = { params: Promise<{ incisoId: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_STATES = new Set(['VIGENTE', 'ATUALIZADO', 'REVOGADO']);

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
  const { incisoId } = await params;
  if (!UUID_PATTERN.test(incisoId)) return NextResponse.json({ error: 'ID de dispositivo inválido.' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  if (typeof body !== 'object' || body === null || !('situacao' in body)
    || typeof body.situacao !== 'string' || !DEVICE_STATES.has(body.situacao)) {
    return NextResponse.json({ error: 'Envie uma situação válida.' }, { status: 400 });
  }

  try {
    const inciso = await prisma.inciso.update({
      where: { id: incisoId },
      data: {
        situacao: body.situacao as 'VIGENTE' | 'ATUALIZADO' | 'REVOGADO',
        revogadoEm: body.situacao === 'REVOGADO' ? new Date() : null,
      },
      select: { id: true, artigoId: true, tipo: true, rotulo: true, situacao: true, revogadoEm: true },
    });
    return NextResponse.json({ inciso });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Dispositivo não encontrado.' }, { status: 404 });
    }
    console.error('Falha ao atualizar situação do dispositivo.', error);
    return NextResponse.json({ error: 'Não foi possível atualizar o dispositivo.' }, { status: 500 });
  }
}
