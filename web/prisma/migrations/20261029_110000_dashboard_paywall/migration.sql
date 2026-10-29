CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVA','CANCELADA','EXPIRADA');
CREATE TABLE "uso_questao_diario" (
  "usuarioId" UUID NOT NULL, "data" DATE NOT NULL, "quantidade" INTEGER NOT NULL DEFAULT 0,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uso_questao_diario_pkey" PRIMARY KEY ("usuarioId","data"),
  CONSTRAINT "uso_questao_diario_quantidade_check" CHECK ("quantidade" >= 0)
);
ALTER TABLE "uso_questao_diario" ADD CONSTRAINT "uso_questao_diario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "registros_estudo" (
  "id" UUID NOT NULL, "usuarioId" UUID NOT NULL, "iniciadoEm" TIMESTAMPTZ(6) NOT NULL,
  "encerradoEm" TIMESTAMPTZ(6), "segundosLiquidos" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "registros_estudo_pkey" PRIMARY KEY ("id"), CONSTRAINT "registros_estudo_segundos_check" CHECK ("segundosLiquidos" >= 0)
);
CREATE INDEX "registros_estudo_usuarioId_iniciadoEm_idx" ON "registros_estudo"("usuarioId","iniciadoEm");
ALTER TABLE "registros_estudo" ADD CONSTRAINT "registros_estudo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "assinaturas_pagamento" (
  "id" UUID NOT NULL, "usuarioId" UUID NOT NULL, "gateway" VARCHAR(24) NOT NULL,
  "clienteGatewayId" VARCHAR(255), "assinaturaGatewayId" VARCHAR(255), "status" "StatusAssinatura" NOT NULL DEFAULT 'ATIVA',
  "periodoAte" TIMESTAMPTZ(6), "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assinaturas_pagamento_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "assinaturas_pagamento_assinaturaGatewayId_key" ON "assinaturas_pagamento"("assinaturaGatewayId");
CREATE INDEX "assinaturas_pagamento_usuarioId_status_idx" ON "assinaturas_pagamento"("usuarioId","status");
ALTER TABLE "assinaturas_pagamento" ADD CONSTRAINT "assinaturas_pagamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "eventos_pagamento_processados" (
  "gateway" VARCHAR(24) NOT NULL, "eventoId" VARCHAR(255) NOT NULL, "processadoEm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eventos_pagamento_processados_pkey" PRIMARY KEY ("gateway","eventoId")
);
