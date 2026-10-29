CREATE TYPE "PapelUsuario" AS ENUM ('ESTUDANTE', 'ADMIN');

ALTER TABLE "usuarios"
  ADD COLUMN "papel" "PapelUsuario" NOT NULL DEFAULT 'ESTUDANTE';

CREATE INDEX "usuarios_papel_idx" ON "usuarios" ("papel");

ALTER TABLE "incisos"
  ADD COLUMN "situacao" "SituacaoArtigo" NOT NULL DEFAULT 'VIGENTE',
  ADD COLUMN "revogadoEm" TIMESTAMPTZ(6);
