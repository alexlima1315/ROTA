# Extensões necessárias ao `schema.prisma` da Fase 1

Adicione estes campos antes de gerar o Prisma Client e aplicar a migração.

```prisma
enum PapelUsuario {
  ESTUDANTE
  ADMIN
}

model Usuario {
  // ...campos existentes
  papel PapelUsuario @default(ESTUDANTE)

  // ...relações existentes

  @@index([papel])
}

model Inciso {
  // ...campos existentes
  situacao   SituacaoArtigo @default(VIGENTE)
  revogadoEm DateTime?      @db.Timestamptz(6)
}
```

Depois de aplicar a migração, promova a conta administrativa inicial por uma operação segura de manutenção, por exemplo atualizando o campo `papel` do usuário escolhido para `ADMIN`. Não atribua esse papel a partir de dados enviados pelo navegador.
