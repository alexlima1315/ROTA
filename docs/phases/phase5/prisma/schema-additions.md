# Extensões Prisma para Fase 5

Adapte os campos relacionais aos nomes exatos do schema consolidado da Fase 1. Os snippets pressupõem `Usuario`, `BancoQuestao`, `QuestaoAlternativa`, `DificuldadeQuestao`, `StatusQuestao` e PostgreSQL.

```prisma
enum StatusComentarioQuestao { PUBLICADO OCULTO }
enum StatusSimulado { EM_ANDAMENTO CONCLUIDO EXPIRADO }

model BancaExaminadora {
  id        String @id @default(uuid()) @db.Uuid
  nome      String @unique @db.VarChar(100)
  slug      String @unique @db.VarChar(100)
  questoes  BancoQuestao[]
  @@map("bancas_examinadoras")
}

model ComentarioQuestao {
  id          String @id @default(uuid()) @db.Uuid
  questaoId   String @db.Uuid
  usuarioId   String @db.Uuid
  paiId       String? @db.Uuid
  conteudo    String @db.VarChar(5000)
  status      StatusComentarioQuestao @default(PUBLICADO)
  criadoEm    DateTime @default(now())
  atualizadoEm DateTime @updatedAt
  questao     BancoQuestao @relation(fields: [questaoId], references: [id], onDelete: Cascade)
  usuario     Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  pai         ComentarioQuestao? @relation("RespostasComentario", fields: [paiId], references: [id], onDelete: Cascade)
  respostas   ComentarioQuestao[] @relation("RespostasComentario")
  curtidas    CurtidaComentario[]
  @@index([questaoId, status, criadoEm])
  @@index([paiId])
  @@map("comentarios_questoes")
}

model CurtidaComentario {
  id          String @id @default(uuid()) @db.Uuid
  comentarioId String @db.Uuid
  usuarioId   String @db.Uuid
  criadoEm    DateTime @default(now())
  comentario ComentarioQuestao @relation(fields: [comentarioId], references: [id], onDelete: Cascade)
  usuario    Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@unique([comentarioId, usuarioId])
  @@map("curtidas_comentarios")
}

model Simulado {
  id                   String @id @default(uuid()) @db.Uuid
  usuarioId            String @db.Uuid
  filtros              Json @db.JsonB
  status               StatusSimulado @default(EM_ANDAMENTO)
  totalQuestoes         Int @default(50)
  tempoLimiteSegundos   Int
  iniciadoEm            DateTime @default(now())
  terminaEm             DateTime
  concluidoEm           DateTime?
  totalAcertos          Int?
  usuario               Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  questoes              SimuladoQuestao[]
  @@index([usuarioId, iniciadoEm])
  @@map("simulados")
}

model SimuladoQuestao {
  id                    String @id @default(uuid()) @db.Uuid
  simuladoId            String @db.Uuid
  questaoId             String @db.Uuid
  ordem                 Int
  alternativaSelecionada String? @db.VarChar(8)
  correta               Boolean?
  respondidaEm           DateTime?
  simulado              Simulado @relation(fields: [simuladoId], references: [id], onDelete: Cascade)
  questao               BancoQuestao @relation(fields: [questaoId], references: [id], onDelete: Restrict)
  @@unique([simuladoId, ordem])
  @@unique([simuladoId, questaoId])
  @@map("simulados_questoes")
}
```

Acrescente em `BancoQuestao`: `bancaId String? @db.Uuid`, `ano Int?`, `cargo String? @db.VarChar(180)`, `assunto String? @db.VarChar(180)`, relação `banca BancaExaminadora?`, `comentarios ComentarioQuestao[]`, `emSimulados SimuladoQuestao[]` e índices por banca/ano/dificuldade/status e assunto/status. Acrescente em `Usuario`: `comentariosQuestao ComentarioQuestao[]`, `curtidasComentario CurtidaComentario[]` e `simulados Simulado[]`.
