# Rota — seu estudo, com direção

Monorepo consolidado dos artefatos disponíveis para o projeto educacional. Inclui a experiência atual em HTML, as APIs e componentes web das fases 3 a 6 e o aplicativo Expo da fase 7.

## Pastas

```text
rota-estudo/
├── web/                 # Next.js, APIs, CMS e página web atual
│   ├── public/index.html # site responsivo que estava sendo usado
│   ├── src/              # componentes e APIs das fases 3–7
│   └── prisma/           # schema consolidado e migrações incrementais
├── mobile/               # React Native + Expo + NativeWind
├── docs/phases/          # notas e migrações incrementais por fase
└── README.md
```

## Web

Na pasta `web/`, instale as dependências, configure `.env` a partir de `.env.example`, gere o Prisma Client e inicie o Next.js. A página `/` exibe a versão web existente; as APIs e componentes de estudo/CMS ficam disponíveis nas rotas e pastas de `src/`.

O site estático de estudos fica em `web/public/index.html` e inclui a Biblioteca de Materiais com links externos por matéria. O workflow `.github/workflows/pages.yml` publica esse diretório no GitHub Pages a cada atualização.

Site publicado: <https://alexlima1315.github.io/ROTA/>. O repositório foi tornado público para habilitar o GitHub Pages no plano atual; todo o código e o histórico de Actions ficam visíveis publicamente. Não inclua segredos, credenciais ou dados pessoais no repositório.

Antes de conectar um banco de produção, compare `prisma/schema.prisma` com o banco criado anteriormente. A especificação executável completa das Fases 1 e 2 não estava salva na pasta compartilhada; o schema-base aqui foi consolidado a partir dos campos exigidos pelas APIs e migrações das fases posteriores. Não aplique migrações a um banco existente sem revisar o estado atual.

## Mobile

Veja `mobile/README.md`. Defina `EXPO_PUBLIC_API_URL` para uma origem HTTPS, conecte o fluxo de login ao armazenamento seguro da sessão e integre o adaptador Bearer documentado. Leis abertas e anotações são armazenadas localmente; vídeos e questões exigem conexão.

## Dependências externas

- PostgreSQL e variável `DATABASE_URL` para APIs de estudo, CMS, questões e comunidade.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID` e `APP_URL` para checkout e webhooks.
- Conteúdo audiovisual deve ser cadastrado com IDs reais do YouTube. Links de demonstração não fazem parte do acervo.

## Estado da consolidação

Esta pasta reúne código e especificações que estavam salvos localmente. A base original das Fases 1 e 2 foi reconstruída a partir das dependências visíveis nos artefatos seguintes; configure autenticação mobile e revise o schema e as migrações antes de usar em produção. PDFs originais não foram copiados, pois não estavam disponíveis nos arquivos do projeto.

