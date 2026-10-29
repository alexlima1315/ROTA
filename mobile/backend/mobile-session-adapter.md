# Acesso mobile às APIs autenticadas

O app guarda o token opaco de sessão no `expo-secure-store` e o envia em `Authorization: Bearer <token>`. As rotas web existentes validam o mesmo token pelo hash SHA-256 guardado em `AuthSessao`; portanto, adapte `getAuthenticatedUserId()` em `src/server/auth/current-user.ts` para aceitar o header Bearer além do cookie:

```ts
import { headers, cookies } from 'next/headers';
// Dentro de getAuthenticatedUserId():
const authorization = (await headers()).get('authorization');
const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
const cookieStore = await cookies();
const rawToken = bearer ?? cookieStore.get('__Host-codex-session')?.value;
if (!rawToken) return null;
// Continue com o mesmo SHA-256 e a mesma busca de AuthSessao usados no web.
```

O fluxo de login mobile deve obter uma sessão opaca do backend e chamar `saveSessionToken(token)`. Não grave senha ou token em AsyncStorage. Configure `EXPO_PUBLIC_API_URL` com a origem HTTPS da API. Essa adaptação é necessária porque o cookie HttpOnly do navegador não é automaticamente disponibilizado ao `fetch` do React Native.
