import { prisma } from '@/server/db/prisma';

const FREE_DAILY_LIMIT = 10;
function utcDateKey(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Atomically reserves question impressions; use before returning question content. */
export async function reserveQuestionAccess(userId: string, amount: number) {
  if (!Number.isInteger(amount) || amount < 1) throw new Error('A quantidade de questões precisa ser positiva.');
  const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { plano: true } });
  if (!user) return { allowed: false as const, reason: 'USER_NOT_FOUND', used: 0, limit: FREE_DAILY_LIMIT };
  const date = utcDateKey();
  if (user.plano === 'PREMIUM') return { allowed: true as const, premium: true, used: 0, limit: null };

  // Atomic conditional UPDATE prevents concurrent tabs from overspending the daily allowance.
  await prisma.usoQuestaoDiario.upsert({ where: { usuarioId_data: { usuarioId: userId, data: date } }, create: { usuarioId: userId, data: date, quantidade: 0 }, update: {} });
  const changed = await prisma.usoQuestaoDiario.updateMany({
    where: { usuarioId: userId, data: date, quantidade: { lte: FREE_DAILY_LIMIT - amount } },
    data: { quantidade: { increment: amount } },
  });
  const row = await prisma.usoQuestaoDiario.findUnique({ where: { usuarioId_data: { usuarioId: userId, data: date } }, select: { quantidade: true } });
  if (changed.count === 1) return { allowed: true as const, premium: false, used: row?.quantidade ?? amount, limit: FREE_DAILY_LIMIT };
  const used = row?.quantidade ?? 0;
  return { allowed: false as const, reason: 'DAILY_LIMIT', premium: false, used, remaining: Math.max(0, FREE_DAILY_LIMIT - used), limit: FREE_DAILY_LIMIT };
}
