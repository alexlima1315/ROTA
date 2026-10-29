# Códex Dinâmico · Fase 4

## Arquivos

- `src/app/admin/page.tsx` — página protegida por papel administrativo.
- `src/app/admin/ContentManager.tsx` — CMS de leis, artigos, dispositivos, trilhas e mídia.
- `src/app/api/admin/catalog/route.ts` — lista de leis e trilhas.
- `src/app/api/admin/laws/[lawId]/catalog/route.ts` — capítulos, artigos e dispositivos da lei escolhida.
- `src/app/api/admin/chapters/[chapterId]/articles/route.ts` — importação transacional de até 100 artigos por lote, com parágrafos/incisos.
- `src/app/api/admin/articles/[articleId]/route.ts` e `src/app/api/admin/incisos/[incisoId]/route.ts` — atualização de estado vigente/revogado.
- `src/app/api/admin/media/route.ts` — importação em lote de vídeos e anexos para artigo ou trilha.
- `src/server/auth/current-user.ts` — resolução da sessão e verificação de papel `ADMIN`.
- `src/server/db/prisma.ts` — cliente Prisma 7 para PostgreSQL.

## Aplicação

1. Aplique as mudanças de `prisma/schema-extensions.md` ao schema principal.
2. Execute a migração `prisma/migrations/20261029_admin_cms/migration.sql` e regenere o Prisma Client.
3. Configure um usuário administrador por uma operação segura no banco. O formulário nunca pode promover a própria conta.
4. O CMS importa no máximo 100 artigos por transação. Para cada artigo, pode receber `incisos[]` com `tipo`, `rotulo`, `texto` e `ordem`.
5. Mídias aceitam URLs HTTPS. O servidor extrai IDs de formatos comuns (`watch?v=`, `youtu.be`, `embed`, `shorts` e `live`) e rejeita o lote inteiro se alguma URL de vídeo for inválida.

As APIs conferem a permissão `ADMIN` em toda requisição; esconder a página no navegador não é usado como controle de acesso.
