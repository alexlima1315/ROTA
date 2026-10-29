import ContentManager from './ContentManager';
import { requireAdmin } from '@/server/auth/current-user';

export default async function AdminPage() {
  const access = await requireAdmin();
  if (!access.ok) {
    return <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center"><div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Códex Dinâmico</p><h1 className="mt-2 text-2xl font-bold">Acesso administrativo</h1><p className="mt-3 text-sm leading-6 text-slate-600">{access.status === 401 ? 'Entre com sua conta administrativa para continuar.' : 'Sua conta não tem permissão para acessar o CMS.'}</p></div></main>;
  }
  return <ContentManager />;
}
