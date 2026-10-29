import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAdmin } from '@/server/auth/current-user';

type MediaTarget = { tipo: 'ARTIGO' | 'TRILHA'; id: string };
type VideoInput = { url: string; titulo?: string };
type AttachmentInput = { url: string; titulo: string; tipo: 'PDF' | 'MAPA_MENTAL' | 'RESUMO' | 'OUTRO' };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const ATTACHMENT_TYPES = new Set(['PDF', 'MAPA_MENTAL', 'RESUMO', 'OUTRO']);

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

function extractYoutubeId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
    let id = '';
    if (url.hostname.toLowerCase() === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    else if (url.pathname === '/watch') id = url.searchParams.get('v') ?? '';
    else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/)?.[1] ?? '';
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && value.length <= 2048;
  } catch {
    return false;
  }
}

function validVideo(value: unknown): value is VideoInput {
  return isRecord(value) && typeof value.url === 'string' && value.url.length <= 2048
    && (value.titulo === undefined || (typeof value.titulo === 'string' && value.titulo.length <= 300));
}

function validAttachment(value: unknown): value is AttachmentInput {
  return isRecord(value) && typeof value.url === 'string' && value.url.length <= 2048
    && typeof value.titulo === 'string' && value.titulo.trim().length > 0 && value.titulo.length <= 300
    && typeof value.tipo === 'string' && ATTACHMENT_TYPES.has(value.tipo);
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'O corpo da requisição deve ser JSON válido.' }, { status: 400 }); }
  if (!isRecord(body) || !isRecord(body.destino) || !Array.isArray(body.videos) || !Array.isArray(body.anexos)
    || body.videos.length > 50 || body.anexos.length > 50
    || !body.videos.every(validVideo) || !body.anexos.every(validAttachment)) {
    return NextResponse.json({ error: 'Informe destino, videos[] e anexos[] válidos (até 50 de cada por lote).' }, { status: 400 });
  }

  const target = body.destino as unknown as MediaTarget;
  if (!['ARTIGO', 'TRILHA'].includes(target.tipo) || !UUID_PATTERN.test(target.id)) {
    return NextResponse.json({ error: 'Destino inválido.' }, { status: 400 });
  }
  if (!body.videos.length && !body.anexos.length) return NextResponse.json({ error: 'Adicione ao menos um vídeo ou anexo.' }, { status: 400 });

  const videoInputs = body.videos as VideoInput[];
  const attachmentInputs = body.anexos as AttachmentInput[];
  const videos = videoInputs.map((item) => ({ ...item, videoId: extractYoutubeId(item.url) }));
  if (videos.some((video) => !video.videoId)) {
    return NextResponse.json({ error: 'Uma ou mais URLs não são links válidos de vídeo do YouTube. Nenhum item foi salvo.' }, { status: 400 });
  }
  if (attachmentInputs.some((item) => !isHttpsUrl(item.url))) {
    return NextResponse.json({ error: 'Todos os anexos precisam usar uma URL HTTPS válida. Nenhum item foi salvo.' }, { status: 400 });
  }

  try {
    let articleNumber: string | null = null;
    if (target.tipo === 'ARTIGO') {
      const article = await prisma.artigo.findUnique({ where: { id: target.id }, select: { id: true, numero: true } });
      if (!article) return NextResponse.json({ error: 'Artigo de destino não encontrado.' }, { status: 404 });
      articleNumber = article.numero;
    } else {
      const track = await prisma.trilha.findUnique({ where: { id: target.id }, select: { id: true } });
      if (!track) return NextResponse.json({ error: 'Trilha de destino não encontrada.' }, { status: 404 });
    }

    const destinationFields = target.tipo === 'ARTIGO'
      ? { artigoId: target.id, trilhaId: null }
      : { artigoId: null, trilhaId: target.id };
    const uniqueVideos = [...new Map(videos.map((video) => [video.videoId!, video])).values()];
    const videoResult = uniqueVideos.length ? await prisma.videoYouTube.createMany({
      data: uniqueVideos.map((video) => ({
        videoId: video.videoId!,
        titulo: video.titulo?.trim() || `Aula do YouTube${articleNumber ? ` — Art. ${articleNumber}` : ''}`,
        ...destinationFields,
      })),
      skipDuplicates: true,
    }) : { count: 0 };

    const urls = [...new Set(attachmentInputs.map((item) => item.url.trim()))];
    const existing = urls.length ? await prisma.anexoWeb.findMany({
      where: { url: { in: urls }, ...(target.tipo === 'ARTIGO' ? { artigoId: target.id } : { trilhaId: target.id }) },
      select: { url: true },
    }) : [];
    const existingUrls = new Set(existing.map((item) => item.url));
    const uniqueAttachments = attachmentInputs.filter((item, index, list) =>
      !existingUrls.has(item.url.trim()) && list.findIndex((candidate) => candidate.url.trim() === item.url.trim()) === index,
    );
    const attachmentResult = uniqueAttachments.length ? await prisma.anexoWeb.createMany({
      data: uniqueAttachments.map((item) => ({
        titulo: item.titulo.trim(),
        tipo: item.tipo,
        url: item.url.trim(),
        ...destinationFields,
      })),
    }) : { count: 0 };

    return NextResponse.json({ videosSalvos: videoResult.count, anexosSalvos: attachmentResult.count }, { status: 201 });
  } catch (error) {
    console.error('Falha ao salvar mídia do acervo.', error);
    return NextResponse.json({ error: 'Não foi possível salvar a mídia.' }, { status: 500 });
  }
}
