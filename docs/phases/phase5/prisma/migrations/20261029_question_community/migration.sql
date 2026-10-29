CREATE TYPE "StatusComentarioQuestao" AS ENUM ('PUBLICADO','OCULTO');
CREATE TYPE "StatusSimulado" AS ENUM ('EM_ANDAMENTO','CONCLUIDO','EXPIRADO');
CREATE TABLE "bancas_examinadoras" (
  "id" UUID NOT NULL, "nome" VARCHAR(100) NOT NULL, "slug" VARCHAR(100) NOT NULL,
  CONSTRAINT "bancas_examinadoras_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bancas_examinadoras_nome_key" ON "bancas_examinadoras"("nome");
CREATE UNIQUE INDEX "bancas_examinadoras_slug_key" ON "bancas_examinadoras"("slug");
ALTER TABLE "banco_questoes" ADD COLUMN "bancaId" UUID, ADD COLUMN "ano" INTEGER, ADD COLUMN "cargo" VARCHAR(180), ADD COLUMN "assunto" VARCHAR(180);
ALTER TABLE "banco_questoes" ADD CONSTRAINT "banco_questoes_bancaId_fkey" FOREIGN KEY ("bancaId") REFERENCES "bancas_examinadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "banco_questoes_bancaId_ano_dificuldade_status_idx" ON "banco_questoes"("bancaId","ano","dificuldade","status");
CREATE INDEX "banco_questoes_assunto_status_idx" ON "banco_questoes"("assunto","status");
CREATE TABLE "comentarios_questoes" (
 "id" UUID NOT NULL, "questaoId" UUID NOT NULL, "usuarioId" UUID NOT NULL, "paiId" UUID,
 "conteudo" VARCHAR(5000) NOT NULL, "status" "StatusComentarioQuestao" NOT NULL DEFAULT 'PUBLICADO',
 "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizadoEm" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "comentarios_questoes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "comentarios_questoes_questaoId_status_criadoEm_idx" ON "comentarios_questoes"("questaoId","status","criadoEm");
ALTER TABLE "comentarios_questoes" ADD CONSTRAINT "comentarios_questoes_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "banco_questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comentarios_questoes" ADD CONSTRAINT "comentarios_questoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comentarios_questoes" ADD CONSTRAINT "comentarios_questoes_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "comentarios_questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "curtidas_comentarios" (
 "id" UUID NOT NULL, "comentarioId" UUID NOT NULL, "usuarioId" UUID NOT NULL, "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "curtidas_comentarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curtidas_comentarios_comentarioId_usuarioId_key" ON "curtidas_comentarios"("comentarioId","usuarioId");
ALTER TABLE "curtidas_comentarios" ADD CONSTRAINT "curtidas_comentarios_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "comentarios_questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curtidas_comentarios" ADD CONSTRAINT "curtidas_comentarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "simulados" (
 "id" UUID NOT NULL, "usuarioId" UUID NOT NULL, "filtros" JSONB NOT NULL, "status" "StatusSimulado" NOT NULL DEFAULT 'EM_ANDAMENTO',
 "totalQuestoes" INTEGER NOT NULL DEFAULT 50, "tempoLimiteSegundos" INTEGER NOT NULL,
 "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "terminaEm" TIMESTAMP(3) NOT NULL,
 "concluidoEm" TIMESTAMP(3), "totalAcertos" INTEGER,
 CONSTRAINT "simulados_pkey" PRIMARY KEY ("id"), CONSTRAINT "simulados_total_50_check" CHECK ("totalQuestoes" = 50),
 CONSTRAINT "simulados_tempo_check" CHECK ("tempoLimiteSegundos" BETWEEN 60 AND 21600)
);
CREATE INDEX "simulados_usuarioId_iniciadoEm_idx" ON "simulados"("usuarioId","iniciadoEm");
ALTER TABLE "simulados" ADD CONSTRAINT "simulados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "simulados_questoes" (
 "id" UUID NOT NULL, "simuladoId" UUID NOT NULL, "questaoId" UUID NOT NULL, "ordem" INTEGER NOT NULL,
 "alternativaSelecionada" VARCHAR(8), "correta" BOOLEAN, "respondidaEm" TIMESTAMP(3),
 CONSTRAINT "simulados_questoes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "simulados_questoes_simuladoId_ordem_key" ON "simulados_questoes"("simuladoId","ordem");
CREATE UNIQUE INDEX "simulados_questoes_simuladoId_questaoId_key" ON "simulados_questoes"("simuladoId","questaoId");
ALTER TABLE "simulados_questoes" ADD CONSTRAINT "simulados_questoes_simuladoId_fkey" FOREIGN KEY ("simuladoId") REFERENCES "simulados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "simulados_questoes" ADD CONSTRAINT "simulados_questoes_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "banco_questoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "bancas_examinadoras"("id","nome","slug") VALUES
('30000000-0000-4000-8000-000000000001','FGV','fgv'),('30000000-0000-4000-8000-000000000002','Cebraspe','cebraspe'),
('30000000-0000-4000-8000-000000000003','FCC','fcc'),('30000000-0000-4000-8000-000000000004','Vunesp','vunesp'),
('30000000-0000-4000-8000-000000000005','Instituto AOCP','aocp'),('30000000-0000-4000-8000-000000000006','IBFC','ibfc'),
('30000000-0000-4000-8000-000000000007','Quadrix','quadrix'),('30000000-0000-4000-8000-000000000008','Cesgranrio','cesgranrio'),
('30000000-0000-4000-8000-000000000009','IDECAN','idecan'),('30000000-0000-4000-8000-000000000010','Consulplan','consulplan')
ON CONFLICT ("slug") DO NOTHING;
