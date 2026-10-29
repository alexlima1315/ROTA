# Códex Dinâmico Mobile — Fase 7

Base de aplicativo React Native com Expo para Android e iOS. Usa React Navigation em abas, NativeWind para classes Tailwind, WebView para aulas do YouTube e AsyncStorage para cache de lei/anotações. As questões e vídeos continuam online; a lei seca e as anotações salvas permanecem disponíveis offline.

## Estrutura

```text
phase7/
├── App.tsx
├── app.json
├── global.css
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── eas.json
├── src/
│   ├── components/
│   │   └── MobileStudyRoom.tsx
│   ├── navigation/
│   │   ├── RootTabs.tsx
│   │   └── types.ts
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── CodexScreen.tsx
│   │   ├── QuestionsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── law-cache.ts
│   │   └── session.ts
│   └── types/study.ts
└── backend/
    ├── mobile-session-adapter.md
    └── next/src/app/api/study/catalog/route.ts
```

## Configurar e executar

1. Copie `phase7/` para um diretório independente. Preencha `.env` com `EXPO_PUBLIC_API_URL` usando a origem HTTPS da API.
2. Instale dependências compatíveis com o SDK Expo escolhido. Para pacotes nativos, prefira `npx expo install @react-native-async-storage/async-storage @react-native-community/netinfo expo-secure-store react-native-webview react-native-safe-area-context react-native-screens react-native-reanimated`.
3. Copie `backend/next/src/app/api/study/catalog/route.ts` para o backend Next.js das fases anteriores. Ele retorna lista de leis e, ao receber `?leiId=...`, capítulos, artigos, vídeos e anexos.
4. Integre o adaptador de sessão de `backend/mobile-session-adapter.md` ao `getAuthenticatedUserId()` existente. O fluxo de login mobile deve salvar a sessão opaca com `saveSessionToken`; nunca guarde senha ou token no AsyncStorage.
5. Execute `npm install`, depois `npx expo start`. Para distribuir, configure os identificadores de pacote para sua conta, instale/configure o EAS CLI e conclua credenciais, builds e envio para as lojas.

## Recursos e limites do pacote

- **Abas inferiores:** Início, Códex, Questões e Meu Perfil.
- **Leitor:** texto da lei ocupa a tela; capítulo/artigo com navegação, status de revogação, vídeos abertos em modal e botão flutuante que abre o painel inferior de anotações.
- **Notas:** usam as rotas existentes `GET/PUT /api/articles/:articleId/notes`; salvas localmente primeiro e enviadas ao servidor. Se faltar conexão, ficam pendentes e sincronizam quando a rede voltar.
- **Offline:** guarda até 30 leis abertas recentemente e o índice local; o cache não inclui anexos pesados. Vídeos e questões dependem de conexão.
- **Autenticação:** o backend atual valida cookie web. Para o app, é necessário aceitar `Authorization: Bearer` contendo o mesmo token opaco de `AuthSessao`; consulte o adaptador fornecido. O fluxo de login mobile que emite essa sessão ainda deve ser conectado ao provedor de autenticação já usado pelo produto.

## Referências de configuração

O setup NativeWind v4 segue a instalação oficial para Expo ([NativeWind](https://www.nativewind.dev/docs/getting-started/installation)); as abas usam React Navigation conforme a documentação de [tabs do Expo](https://docs.expo.dev/router/advanced/tabs/). O token fica no SecureStore do Expo, enquanto AsyncStorage é usado apenas para dados de estudo não secretos ([Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [armazenamento no Expo](https://docs.expo.dev/develop/user-interface/store-data/)).
