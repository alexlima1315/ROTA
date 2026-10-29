import { createHash } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { prisma } from '../db/prisma';

/**
 * Resolves the opaque, HttpOnly session cookie created by the authentication flow.
 * The database stores only its SHA-256 digest, never the browser token itself.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const bearer = requestHeaders.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const rawToken = bearer ?? cookieStore.get('__Host-codex-session')?.value;
  if (!rawToken) return null;

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const session = await prisma.authSessao.findUnique({
    where: { token: tokenHash },
    select: { usuarioId: true, expiraEm: true },
  });

  if (!session || session.expiraEm <= new Date()) return null;
  return session.usuarioId;
}

export async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string }
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, status: 401, message: 'Autenticação necessária.' };

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { papel: true },
  });
  if (user?.papel !== 'ADMIN') return { ok: false, status: 403, message: 'Acesso restrito a administradores.' };
  return { ok: true, userId };
}
