# Códex Dinâmico — Fase 6

Extensão da Fase 5: dashboard do estudante, cotas de acesso a questões e assinatura Premium via Stripe Checkout. Para integrar, mescle `src/` desta pasta ao projeto Next.js e use as extensões Prisma/migração fornecidas.

## Incluído

- `/dashboard`: desempenho por assunto, acertos e questões da semana, horas líquidas registradas e cota do dia. Gráficos são SVG/Tailwind e não exigem uma dependência de charts.
- `/api/dashboard`: métricas derivadas de tentativas e sessões do estudante autenticado.
- `StudyTimer` + `/api/study-sessions`: inicia/encerra sessões com tempo calculado no servidor.
- Limite diário de 10 questões gratuitas aplicado antes da resposta de conteúdo em `GET /api/questions`; exceder a cota retorna HTTP 429. O gerador de simulados reserva 50 questões e, portanto, exige Premium.
- `/plans` e `/api/billing/checkout`: checkout recorrente do Stripe.
- `/api/webhooks/stripe`: valida assinatura com o corpo bruto da requisição, trata atualizações de assinatura e registra IDs de evento para idempotência. O plano `Usuario.plano` é alterado apenas após evento autenticado e estado ativo/trialing no Stripe.

## Integração

1. Combine `schema-additions.md` com o schema das fases anteriores. Preserve `papel` como permissão administrativa; a assinatura usa `plano` (`GRATUITO`/`PREMIUM`). Gere o cliente Prisma e aplique a migração após conferir os nomes das tabelas existentes.
2. Instale o pacote Stripe compatível com a versão do projeto: `stripe`.
3. Configure `DATABASE_URL`, `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `STRIPE_PREMIUM_PRICE_ID` no servidor. Nunca use variáveis `NEXT_PUBLIC_` para segredos.
4. Configure no Stripe um endpoint de webhook para `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`, apontando a `/api/webhooks/stripe`. Guarde o segredo de assinatura desse endpoint em `STRIPE_WEBHOOK_SECRET`.
5. Substitua no pacote da Fase 5 as rotas `src/app/api/questions/route.ts` e `src/app/api/simulations/route.ts` pelas versões incluídas aqui; ambas invocam a reserva diária. Substitua também o endpoint de quiz por capítulo da Fase 3 pela versão incluída e copie `src/server/paywall/`.
6. O checkout exige que a sessão autenticada seja associada a um usuário e que `APP_URL` seja a origem HTTPS pública cadastrada. Configure o Price recorrente no painel do Stripe.

O webhook verifica `Stripe-Signature` com `constructEvent` e o ID do evento é persistido para permitir reentregas seguras. Consulte a documentação oficial sobre [assinatura de webhooks](https://docs.stripe.com/webhooks) e [eventos de ciclo de assinaturas](https://docs.stripe.com/billing/subscriptions/webhooks).

## Rotas

`GET /api/dashboard`, `POST /api/study-sessions`, `POST /api/study-sessions/:sessionId/finish`, `POST /api/billing/checkout` e `POST /api/webhooks/stripe`.

O contador diário usa a data UTC e registra questões entregues pela API; recarregar/fazer nova busca pode consumir nova cota. As horas contabilizam o tempo entre início e encerramento de uma sessão, com teto de 12 horas por sessão. Para um produto de produção, adicione controle de inatividade e tratamento operacional de chargebacks, além dos eventos cobertos nesta base.
