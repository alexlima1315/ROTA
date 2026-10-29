# Extensões de dados da Fase 6

Integre estes modelos no `schema.prisma` consolidado das fases anteriores. Os nomes de enums/valores de `plano` precisam coincidir com o schema principal; a intenção é persistir `GRATUITO` ou `PREMIUM` no campo `Usuario.plano`, sem reutilizar `papel` (que representa estudante/admin).

```prisma
enum StatusAssinatura { ATIVA CANCELADA EXPIRADA }

model UsoQuestaoDiario {
  usuarioId String @db.Uuid
  data      DateTime @db.Date
  quantidade Int @default(0)
  atualizadoEm DateTime @updatedAt
  usuario   Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@id([usuarioId, data])
  @@map("uso_questao_diario")
}

model RegistroEstudo {
  id String @id @default(uuid()) @db.Uuid
  usuarioId String @db.Uuid
  iniciadoEm DateTime @db.Timestamptz(6)
  encerradoEm DateTime? @db.Timestamptz(6)
  segundosLiquidos Int @default(0)
  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@index([usuarioId, iniciadoEm])
  @@map("registros_estudo")
}

model AssinaturaPagamento {
  id String @id @default(uuid()) @db.Uuid
  usuarioId String @db.Uuid
  gateway String @db.VarChar(24) // STRIPE
  clienteGatewayId String? @db.VarChar(255)
  assinaturaGatewayId String? @unique @db.VarChar(255)
  status StatusAssinatura @default(ATIVA)
  periodoAte DateTime? @db.Timestamptz(6)
  atualizadoEm DateTime @updatedAt
  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@index([usuarioId, status])
  @@map("assinaturas_pagamento")
}

model EventoPagamentoProcessado {
  gateway String @db.VarChar(24)
  eventoId String @db.VarChar(255)
  processadoEm DateTime @default(now()) @db.Timestamptz(6)
  @@id([gateway, eventoId])
  @@map("eventos_pagamento_processados")
}
```

Acrescente em `Usuario` os arrays `usoQuestoesDiario UsoQuestaoDiario[]`, `registrosEstudo RegistroEstudo[]` e `assinaturas AssinaturaPagamento[]`. O campo de plano deve ser alterado somente pelo servidor/webhook autenticado.
