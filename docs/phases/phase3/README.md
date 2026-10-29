# Códex Dinâmico · Fase 3

Arquivos organizados para integração em um projeto Next.js App Router:

- `src/components/study/StudyRoom.tsx`: leitor com notas vinculadas ao artigo selecionado e quiz no fim do capítulo.
- `src/components/study/ChapterQuiz.tsx`: busca três questões e envia cada resposta para validação no servidor.
- `src/app/api/articles/[articleId]/notes/route.ts`: GET e PUT da anotação privada do usuário/artigo.
- `src/app/api/chapters/[chapterId]/quiz/route.ts`: GET de exatamente três questões do capítulo e POST de respostas.
- `src/server/auth/current-user.ts`: valida o cookie de sessão opaco e consulta o usuário autenticado.
- `src/server/db/prisma.ts`: cliente Prisma 7 com adaptador PostgreSQL.

## Ajustes necessários no projeto da Fase 1

1. No modelo `AnotacaoUsuario`, adicione `@@unique([usuarioId, artigoId])`. A rota usa a chave composta `usuarioId_artigoId` para manter uma anotação-resumo por artigo e usuário.
2. Aplique `prisma/notes-quiz-migration.sql` e regenere o Prisma Client.
3. Instale `@prisma/adapter-pg` e `pg` para o Prisma 7. Configure `DATABASE_URL` no ambiente do servidor.
4. O fluxo de autenticação precisa criar um token aleatório de sessão, armazenar somente seu SHA-256 em `AuthSessao.token` e definir o cookie `__Host-codex-session` com `HttpOnly`, `Secure`, `SameSite=Strict` e `Path=/`.
5. Cada capítulo precisa ter ao menos três questões `PUBLICADA` do tipo `MULTIPLA_ESCOLHA`, cada uma ligada a um artigo desse capítulo e com uma alternativa marcada como correta.

O endpoint do quiz não envia `correta` no GET. A resposta e o gabarito só são retornados depois do POST autenticado. Se o capítulo tiver menos de três questões publicadas, a API retorna `409` em vez de completar o conjunto com questões de outro capítulo.
