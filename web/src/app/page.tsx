const links = [
  { href: '/study', title: 'Códex', detail: 'Leia leis, acompanhe aulas e faça anotações.' },
  { href: '/questions', title: 'Questões', detail: 'Treine por banca, disciplina e dificuldade.' },
  { href: '/simulations', title: 'Simulados', detail: 'Monte uma prova cronometrada com 50 questões.' },
  { href: '/dashboard', title: 'Meu progresso', detail: 'Acompanhe acertos, prática e horas de estudo.' },
];

export default function HomePage() {
  return <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900"><div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-700">Rota — seu estudo, com direção</p><h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Prepare-se para seu próximo concurso, um passo por vez.</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Lei seca, materiais de apoio, questões e seu progresso reunidos em um só lugar.</p><div className="mt-9 grid gap-4 sm:grid-cols-2">{links.map(link => <a key={link.href} href={link.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"><h2 className="text-xl font-bold">{link.title} <span aria-hidden="true">→</span></h2><p className="mt-2 text-slate-600">{link.detail}</p></a>)}</div><a href="/index.html" className="mt-8 inline-flex rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white">Abrir a trilha interativa de Língua Portuguesa</a><footer className="mt-12 border-t border-slate-200 pt-5 text-sm text-slate-500">Acesso ao acervo sujeito à autenticação. Faça pausas curtas e mantenha constância.</footer></div></main>;
}
