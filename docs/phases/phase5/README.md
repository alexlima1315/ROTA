# Códex Dinâmico — Fase 5

Pacote incremental de questões, comunidade e simulados para o projeto Next.js + Prisma da Fase 1. Copie os diretórios `src/` e `prisma/` para o projeto, aplique o SQL após revisar os nomes reais do schema inicial e gere novamente o Prisma Client.

## Funcionalidades

- Questões publicadas filtráveis por banca, assunto, dificuldade, ano e cargo.
- Comentários públicos com curtidas únicas por usuário e respostas de primeiro nível.
- Simulado de exatamente 50 questões de múltipla escolha, sorteadas no servidor conforme filtros. Se houver menos de 50 disponíveis, a API retorna HTTP 409 e a quantidade encontrada.
- Cronômetro baseado no vencimento persistido no banco, logo não reinicia ao atualizar a página. Gabarito e explicações do simulado só são devolvidos após finalizar/expirar.
- Endpoints exigem o cookie de sessão configurado na Fase 1/4.

## Endpoints

`GET /api/questions/filters`, `GET /api/questions`, `POST /api/questions/:questionId/answers`, `GET|POST /api/questions/:questionId/comments`, `POST|DELETE /api/comments/:commentId/likes`, `POST /api/simulations`, `GET /api/simulations/:simulationId`, `POST /api/simulations/:simulationId/answers`, `POST /api/simulations/:simulationId/finish`.

## Integração e revisão

O SQL assume tabelas mapeadas como `usuarios`, `banco_questoes`, `questoes_alternativas` e campos camelCase conforme os artefatos das fases anteriores. A relação do modelo de questão com alternativas e artigo deve manter os nomes `alternativas` e `artigo`, e o identificador autor deve ser UUID. Ajuste `schema-additions.md` para o `schema.prisma` consolidado antes de executar `prisma migrate deploy`. A rota de geração usa `$queryRaw` com fragmentos parametrizados (`Prisma.sql`/`Prisma.join`) para não concatenar valores fornecidos pelo usuário no SQL. Configure rate limiting e moderação antes da exposição pública do ambiente.

## Páginas

- `/questions`: resolução filtrada e discussão por questão.
- `/simulations/[simulationId]`: execução e resultado.

O formulário de início do simulado pode chamar `POST /api/simulations` passando `{ bancas: ['fgv'], assuntos: ['Direito Constitucional'], dificuldades: ['MEDIA'], anoDe: 2020, anoAte: 2026, cargo: '', tempoLimiteSegundos: 7200 }` e redirecionar para `/simulations/{simulationId}`.
