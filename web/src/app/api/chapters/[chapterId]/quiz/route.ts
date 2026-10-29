import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '../../../../../server/auth/current-user';
import { prisma } from '../../../../../server/db/prisma';
import { reserveQuestionAccess } from '../../../../../server/paywall/question-quota';

type RouteContext = { params: Promise<{ chapterId: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteContext) {
  const { chapterId } = await params;
  if (!UUID_PATTERN.test(chapterId)) return NextResponse.json({ error: 'ID de capítulo inválido.' }, { status: 400 });

  try {
    const usuarioId = await getAuthenticatedUserId();
    if (!usuarioId) return NextResponse.json({ error: 'É necessário entrar na conta.' }, { status: 401 });

    const chapter = await prisma.capitulo.findUnique({ where: { id: chapterId }, select: { id: true } });
    if (!chapter) return NextResponse.json({ error: 'Capítulo não encontrado.' }, { status: 404 });

    // A seleção parte dos artigos do capítulo; não há fallback para questões de outros capítulos.
    const sampled = await prisma.$queryRaw<{ id: string }[]>`
      SELECT q."id"
      FROM "banco_questoes" AS q
      INNER JOIN "artigos" AS a ON a."id" = q."artigoId"
      WHERE a."capituloId" = ${chapterId}::uuid
        AND q."tipo" = 'MULTIPLA_ESCOLHA'
        AND q."status" = 'PUBLICADA'
      ORDER BY random()
      LIMIT 3
    `;

    if (sampled.length < 3) {
      return NextResponse.json({
        error: 'Este capítulo ainda não tem três questões de múltipla escolha publicadas.',
        availableCount: sampled.length,
      }, { status: 409 });
    }

    const quota = await reserveQuestionAccess(usuarioId, sampled.length);
    if (!quota.allowed) return NextResponse.json({ error: 'O quiz excede sua cota gratuita de questões de hoje.', code: 'DAILY_QUESTION_LIMIT', usada: quota.used, limite: quota.limit, upgradeUrl: '/plans' }, { status: 429 });

    const questions = await prisma.bancoQuestao.findMany({
      where: { id: { in: sampled.map((row) => row.id) } },
      select: {
        id: true,
        enunciado: true,
        dificuldade: true,
        alternativas: {
          orderBy: { ordem: 'asc' },
          select: { id: true, codigo: true, texto: true }, // Nunca enviar `correta` antes da resposta.
        },
      },
    });
    const byId = new Map(questions.map((question) => [question.id, question]));
    return NextResponse.json({ questions: sampled.map((row) => byId.get(row.id)).filter(Boolean), quota: { premium: quota.premium, usadaHoje: quota.used, limite: quota.limit } });
  } catch (error) {
    console.error('Falha ao carregar quiz do capítulo.', error);
    return NextResponse.json({ error: 'Não foi possível carregar o quiz.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { chapterId } = await params;
  if (!UUID_PATTERN.test(chapterId)) return NextResponse.json({ error: 'ID de capítulo inválido.' }, { status: 400 });

  try {
    const usuarioId = await getAuthenticatedUserId();
    if (!usuarioId) return NextResponse.json({ error: 'É necessário entrar na conta.' }, { status: 401 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('questionId' in body) || !('optionId' in body)
      || typeof body.questionId !== 'string' || typeof body.optionId !== 'string'
      || !UUID_PATTERN.test(body.questionId) || !UUID_PATTERN.test(body.optionId)) {
      return NextResponse.json({ error: 'IDs de questão ou alternativa inválidos.' }, { status: 400 });
    }

    const question = await prisma.bancoQuestao.findFirst({
      where: {
        id: body.questionId,
        status: 'PUBLICADA',
        tipo: 'MULTIPLA_ESCOLHA',
        artigo: { capituloId: chapterId },
      },
      select: {
        id: true,
        explicacao: true,
        alternativas: { select: { id: true, codigo: true, correta: true } },
      },
    });
    if (!question) return NextResponse.json({ error: 'A questão não pertence a este capítulo ou não está disponível.' }, { status: 404 });

    const chosen = question.alternativas.find((option) => option.id === body.optionId);
    if (!chosen) return NextResponse.json({ error: 'Alternativa não encontrada para esta questão.' }, { status: 400 });

    const correctOption = question.alternativas.find((option) => option.correta);
    if (!correctOption) return NextResponse.json({ error: 'Questão sem gabarito configurado.' }, { status: 409 });

    const isCorrect = chosen.correta;
    await prisma.tentativaQuestao.create({
      data: {
        usuarioId,
        questaoId: question.id,
        alternativaSelecionada: chosen.codigo,
        correta: isCorrect,
      },
    });

    return NextResponse.json({
      result: {
        correta: isCorrect,
        alternativaCorreta: correctOption.codigo,
        explicacao: question.explicacao ?? 'Revise o artigo relacionado e tente explicar por que essa alternativa se aplica.',
      },
    });
  } catch (error) {
    console.error('Falha ao processar resposta do quiz.', error);
    return NextResponse.json({ error: 'Não foi possível registrar a resposta.' }, { status: 500 });
  }
}
