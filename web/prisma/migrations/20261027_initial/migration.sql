CREATE TYPE "PlanoUsuario" AS ENUM ('GRATUITO','PREMIUM');
CREATE TYPE "SituacaoArtigo" AS ENUM ('VIGENTE','ATUALIZADO','REVOGADO');
CREATE TYPE "TipoInciso" AS ENUM ('CAPUT','PARAGRAFO','INCISO','ALINEA');
CREATE TYPE "TipoQuestao" AS ENUM ('MULTIPLA_ESCOLHA','CERTO_ERRADO','DISSERTATIVA');
CREATE TYPE "DificuldadeQuestao" AS ENUM ('FACIL','MEDIA','DIFICIL');
CREATE TYPE "StatusQuestao" AS ENUM ('RASCUNHO','PUBLICADA','ARQUIVADA');
CREATE TYPE "TipoAnexo" AS ENUM ('PDF','MAPA_MENTAL','RESUMO','OUTRO');

CREATE TABLE "usuarios" (
  "id" UUID NOT NULL, "nome" VARCHAR(180) NOT NULL, "email" VARCHAR(320) NOT NULL,
  "senhaHash" VARCHAR(255) NOT NULL, "plano" "PlanoUsuario" NOT NULL DEFAULT 'GRATUITO',
  "horasLiquidas" INTEGER NOT NULL DEFAULT 0, "criadoEm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

CREATE TABLE "auth_sessoes" (
  "token" VARCHAR(64) NOT NULL, "usuarioId" UUID NOT NULL, "expiraEm" TIMESTAMPTZ(6) NOT NULL,
  "criadoEm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessoes_pkey" PRIMARY KEY ("token")
);
CREATE INDEX "auth_sessoes_usuarioId_expiraEm_idx" ON "auth_sessoes"("usuarioId","expiraEm");
ALTER TABLE "auth_sessoes" ADD CONSTRAINT "auth_sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "leis" (
  "id" UUID NOT NULL, "titulo" VARCHAR(300) NOT NULL, "numero" VARCHAR(80) NOT NULL,
  "sigla" VARCHAR(80), "ano" INTEGER, "jurisdicao" VARCHAR(80), "uf" VARCHAR(2),
  CONSTRAINT "leis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leis_ano_numero_idx" ON "leis"("ano","numero");
CREATE TABLE "capitulos" (
  "id" UUID NOT NULL, "leiId" UUID NOT NULL, "rotulo" VARCHAR(80), "titulo" VARCHAR(300) NOT NULL, "ordem" INTEGER NOT NULL,
  CONSTRAINT "capitulos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "capitulos_leiId_ordem_key" ON "capitulos"("leiId","ordem");
CREATE INDEX "capitulos_leiId_ordem_idx" ON "capitulos"("leiId","ordem");
ALTER TABLE "capitulos" ADD CONSTRAINT "capitulos_leiId_fkey" FOREIGN KEY ("leiId") REFERENCES "leis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "artigos" (
  "id" UUID NOT NULL, "capituloId" UUID NOT NULL, "numero" VARCHAR(80) NOT NULL, "titulo" VARCHAR(300),
  "textoCaput" TEXT NOT NULL, "situacao" "SituacaoArtigo" NOT NULL DEFAULT 'VIGENTE', "revogadoEm" TIMESTAMPTZ(6), "ordem" INTEGER NOT NULL,
  CONSTRAINT "artigos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "artigos_capituloId_ordem_key" ON "artigos"("capituloId","ordem");
CREATE INDEX "artigos_capituloId_situacao_ordem_idx" ON "artigos"("capituloId","situacao","ordem");
ALTER TABLE "artigos" ADD CONSTRAINT "artigos_capituloId_fkey" FOREIGN KEY ("capituloId") REFERENCES "capitulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "incisos" (
  "id" UUID NOT NULL, "artigoId" UUID NOT NULL, "tipo" "TipoInciso" NOT NULL, "rotulo" VARCHAR(80) NOT NULL,
  "texto" TEXT NOT NULL, "ordem" INTEGER NOT NULL,
  CONSTRAINT "incisos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "incisos_artigoId_ordem_key" ON "incisos"("artigoId","ordem");
ALTER TABLE "incisos" ADD CONSTRAINT "incisos_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "trilhas" (
  "id" UUID NOT NULL, "titulo" VARCHAR(250) NOT NULL, "slug" VARCHAR(250) NOT NULL,
  CONSTRAINT "trilhas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "trilhas_slug_key" ON "trilhas"("slug");
CREATE TABLE "videos_youtube" (
  "id" UUID NOT NULL, "videoId" VARCHAR(11) NOT NULL, "titulo" VARCHAR(300) NOT NULL,
  "artigoId" UUID, "trilhaId" UUID,
  CONSTRAINT "videos_youtube_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "videos_youtube_videoId_artigoId_key" ON "videos_youtube"("videoId","artigoId");
CREATE INDEX "videos_youtube_artigoId_idx" ON "videos_youtube"("artigoId");
CREATE INDEX "videos_youtube_trilhaId_idx" ON "videos_youtube"("trilhaId");
ALTER TABLE "videos_youtube" ADD CONSTRAINT "videos_youtube_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "videos_youtube" ADD CONSTRAINT "videos_youtube_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "trilhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "anexos_web" (
  "id" UUID NOT NULL, "titulo" VARCHAR(300) NOT NULL, "url" VARCHAR(2048) NOT NULL, "tipo" "TipoAnexo" NOT NULL,
  "artigoId" UUID, "trilhaId" UUID,
  CONSTRAINT "anexos_web_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "anexos_web_artigoId_idx" ON "anexos_web"("artigoId");
CREATE INDEX "anexos_web_trilhaId_idx" ON "anexos_web"("trilhaId");
ALTER TABLE "anexos_web" ADD CONSTRAINT "anexos_web_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anexos_web" ADD CONSTRAINT "anexos_web_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "trilhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "anotacoes_usuarios" (
  "id" UUID NOT NULL, "usuarioId" UUID NOT NULL, "artigoId" UUID NOT NULL, "titulo" VARCHAR(250),
  "conteudo" TEXT NOT NULL, "criadaEm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizadaEm" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "anotacoes_usuarios_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "anotacoes_usuarios" ADD CONSTRAINT "anotacoes_usuarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anotacoes_usuarios" ADD CONSTRAINT "anotacoes_usuarios_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "banco_questoes" (
  "id" UUID NOT NULL, "artigoId" UUID, "autorId" UUID,
  "tipo" "TipoQuestao" NOT NULL DEFAULT 'MULTIPLA_ESCOLHA', "dificuldade" "DificuldadeQuestao" NOT NULL DEFAULT 'MEDIA',
  "status" "StatusQuestao" NOT NULL DEFAULT 'RASCUNHO', "enunciado" TEXT NOT NULL, "explicacao" TEXT,
  "criadaEm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizadaEm" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "banco_questoes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "banco_questoes_status_tipo_idx" ON "banco_questoes"("status","tipo");
ALTER TABLE "banco_questoes" ADD CONSTRAINT "banco_questoes_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "banco_questoes" ADD CONSTRAINT "banco_questoes_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "questoes_alternativas" (
  "id" UUID NOT NULL, "questaoId" UUID NOT NULL, "codigo" VARCHAR(8) NOT NULL, "texto" TEXT NOT NULL,
  "correta" BOOLEAN NOT NULL DEFAULT false, "ordem" INTEGER NOT NULL,
  CONSTRAINT "questoes_alternativas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "questoes_alternativas_questaoId_codigo_key" ON "questoes_alternativas"("questaoId","codigo");
CREATE UNIQUE INDEX "questoes_alternativas_questaoId_ordem_key" ON "questoes_alternativas"("questaoId","ordem");
ALTER TABLE "questoes_alternativas" ADD CONSTRAINT "questoes_alternativas_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "banco_questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tentativas_questoes" (
  "id" UUID NOT NULL, "usuarioId" UUID NOT NULL, "questaoId" UUID NOT NULL,
  "alternativaSelecionada" VARCHAR(8), "respostaTexto" TEXT, "correta" BOOLEAN NOT NULL,
  "duracaoSegundos" INTEGER NOT NULL DEFAULT 0, "respondidaEm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tentativas_questoes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tentativas_questoes_usuarioId_respondidaEm_idx" ON "tentativas_questoes"("usuarioId","respondidaEm");
ALTER TABLE "tentativas_questoes" ADD CONSTRAINT "tentativas_questoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tentativas_questoes" ADD CONSTRAINT "tentativas_questoes_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "banco_questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
