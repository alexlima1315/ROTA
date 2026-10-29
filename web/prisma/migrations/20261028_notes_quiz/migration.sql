-- Execute depois de atualizar o model AnotacaoUsuario no schema.prisma com:
-- @@unique([usuarioId, artigoId])
-- Isso permite uma anotação-resumo por usuário e artigo e torna o upsert seguro.
CREATE UNIQUE INDEX "anotacoes_usuarios_usuarioId_artigoId_key"
  ON "anotacoes_usuarios" ("usuarioId", "artigoId");
