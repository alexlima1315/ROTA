import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';

export async function GET(request: NextRequest) {
  if (!await getAuthenticatedUserId()) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const leiId = request.nextUrl.searchParams.get('leiId');
  if (leiId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leiId)) return NextResponse.json({ error: 'ID de lei inválido.' }, { status: 400 });
  try {
    if (!leiId) {
      const leis = await prisma.lei.findMany({ orderBy: [{ ano: 'desc' }, { titulo: 'asc' }], take: 300, select: { id: true, titulo: true, sigla: true, numero: true, ano: true } });
      return NextResponse.json({ leis });
    }
    const lei = await prisma.lei.findUnique({ where: { id: leiId }, select: { id: true, titulo: true, capitulos: { orderBy: { ordem: 'asc' }, select: { id: true, titulo: true, rotulo: true, ordem: true, artigos: { orderBy: { ordem: 'asc' }, select: { id: true, numero: true, titulo: true, textoCaput: true, situacao: true, ordem: true, incisos: { orderBy: { ordem: 'asc' }, select: { rotulo: true, texto: true, situacao: true } } } } } } } });
    if (!lei) return NextResponse.json({ error: 'Lei não encontrada.' }, { status: 404 });
    const articleIds = lei.capitulos.flatMap(chapter => chapter.artigos.map(article => article.id));
    const videos = articleIds.length ? await prisma.videoYouTube.findMany({ where: { artigoId: { in: articleIds } }, select: { id: true, artigoId: true, videoId: true, titulo: true } }) : [];
    const attachments = articleIds.length ? await prisma.anexoWeb.findMany({ where: { artigoId: { in: articleIds } }, select: { id: true, artigoId: true, titulo: true, url: true, tipo: true } }) : [];
    const chapters = lei.capitulos.map(chapter => ({ id: chapter.id, title: [chapter.rotulo, chapter.titulo].filter(Boolean).join(' — ') || `Capítulo ${chapter.ordem}`, articles: chapter.artigos.map(article => ({ id: article.id, number: article.numero, title: article.titulo, status: article.situacao, text: [article.textoCaput, ...article.incisos.map(i => `${i.rotulo} ${i.texto}${i.situacao === 'REVOGADO' ? ' (REVOGADO)' : ''}`)].filter(Boolean).join('\n\n') })) }));
    return NextResponse.json({ id: lei.id, titulo: lei.titulo, chapters, videos: videos.filter(v => v.artigoId).map(v => ({ id: v.id, youtubeId: v.videoId, title: v.titulo, articleId: v.artigoId! })), attachments });
  } catch (error) {
    console.error('Falha ao carregar catálogo de estudo mobile.', error);
    return NextResponse.json({ error: 'Não foi possível carregar o conteúdo de estudo.' }, { status: 500 });
  }
}
