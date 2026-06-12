# CLAUDE.md — Reglas para Claude Code · Ivory Mini Feed

> Este archivo guía a Claude Code en la generación y modificación de código para el test técnico Ivory.
> Stack backend: **Node.js + TypeScript + Express** | Stack mobile: **React Native + Expo Router + Zustand + Axios**

---

## 1. Contexto del proyecto

Mini API REST que alimenta una app React Native con:
- Autenticación mock por email
- Feed paginada con cursor
- Likes idempotentes
- Comentarios con validación

```
ivory-mini-feed-rn/
├── backend/
│   ├── src/
│   │   ├── routes/         # Definición de rutas Express
│   │   ├── controllers/    # Lógica de cada endpoint
│   │   ├── middlewares/    # Auth, validación, errores
│   │   ├── services/       # Lógica de negocio pura
│   │   ├── data/           # Store en memoria (seed de posts/usuarios)
│   │   ├── types/          # Tipos e interfaces TypeScript
│   │   └── app.ts          # Setup Express (sin listen)
│   ├── server.ts           # Entry point (llama app.listen)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   └── .prettierrc
├── mobile/
└── README.md
```

---

## 2. Endpoints requeridos

Implementar exactamente estos endpoints. No agregar ni omitir ninguno.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/v1/auth/login` | No | Login mock por email. Devuelve `accessToken` y `user` |
| GET | `/v1/feed` | No | Feed paginada con cursor. Query params: `limit` (max 20), `cursor` |
| POST | `/v1/posts/:postId/like` | Sí | Like idempotente — doble llamada no duplica |
| DELETE | `/v1/posts/:postId/like` | Sí | Unlike idempotente — doble llamada permanece coherente |
| GET | `/v1/posts/:postId/comments` | No | Lista de comentarios. 404 si el post no existe |
| POST | `/v1/posts/:postId/comments` | Sí | Crear comentario. Body no vacío, máx 500 chars. Devuelve comentario + `commentsCount` |

### Comportamiento obligatorio

- **Idempotencia likes:** `POST like` dos veces → mismo resultado que una. `DELETE like` dos veces → misma coherencia.
- **Paginación cursor:** cada respuesta de feed incluye `nextCursor` (null si no hay más). El cliente envía `cursor` para la siguiente página. `limit` máximo es 20.
- **404 real:** `GET /v1/posts/:postId/comments` con postId inexistente devuelve `{ error: "Post not found" }` con status 404.
- **Validación comentario:** body vacío o solo espacios → 400. Más de 500 caracteres → 400.
- **Token mock:** el token puede ser cualquier string no vacío devuelto en el login. El middleware de auth valida su presencia en el header `Authorization: Bearer <token>`.

---

## 3. TypeScript — reglas estrictas

```jsonc
// tsconfig.json — configuración mínima obligatoria
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**Reglas de tipado:**

- **Nunca usar `any`** — si el tipo no se conoce, usar `unknown` y narrowing.
- Todos los modelos de datos en `src/types/` con interfaces nombradas (`Post`, `User`, `Comment`, `FeedResponse`, etc.).
- Tipar explícitamente parámetros de funciones y valores de retorno.
- Usar `Request<Params, ResBody, ReqBody, Query>` de Express para tipar req/res en controllers.
- No usar type assertions (`as X`) salvo que sea estrictamente necesario y con comentario que lo justifique.

```typescript
// ✅ Correcto
interface Post {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

// ❌ Incorrecto
const post: any = { ... }
```

---

## 4. ESLint — configuración

Usar `@typescript-eslint` con las siguientes reglas activas:

```jsonc
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": "warn"
  }
}
```

Script en `package.json`:
```json
"lint": "eslint src --ext .ts",
"lint:fix": "eslint src --ext .ts --fix"
```

---

## 5. Prettier — configuración

```jsonc
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

Script en `package.json`:
```json
"format": "prettier --write src/**/*.ts",
"format:check": "prettier --check src/**/*.ts"
```

**Regla:** todo código generado debe pasar `format:check` y `lint` sin errores.

---

## 6. Estructura de archivos — responsabilidades

### `src/types/index.ts`
Solo interfaces y tipos. Sin lógica. Exportar todo.

### `src/data/store.ts`
Store en memoria. Arrays de `User[]`, `Post[]`, `Comment[]`, `Set<string>` para likes.
Seed con al menos 10 posts y 2 usuarios. Sin acceso directo desde controllers — solo a través de services.

### `src/services/`
Lógica de negocio pura. Sin `req`/`res`. Funciones que operan sobre el store y devuelven datos o lanzan errores tipados.

```typescript
// src/services/feedService.ts
export function getFeed(limit: number, cursor?: string): FeedResponse { ... }

// src/services/likeService.ts
export function addLike(postId: string, userId: string): void { ... }
export function removeLike(postId: string, userId: string): void { ... }
```

### `src/controllers/`
Solo traducen `req` → service → `res`. Sin lógica de negocio.

```typescript
// src/controllers/feedController.ts
export const getFeed = (req: Request<{}, {}, {}, FeedQuery>, res: Response): void => {
  const limit = Math.min(Number(req.query.limit) || 10, 20);
  const result = feedService.getFeed(limit, req.query.cursor);
  res.json(result);
};
```

### `src/middlewares/`

- `auth.ts` — verifica `Authorization: Bearer <token>`. 401 si ausente o inválido.
- `errorHandler.ts` — middleware global de errores Express (4 parámetros).
- `validate.ts` — helpers de validación con Zod (opcional pero recomendado).

### `src/routes/`
Solo registra rutas y asocia middlewares + controllers. Sin lógica.

```typescript
// src/routes/postRoutes.ts
router.post('/:postId/like', authMiddleware, likeController.addLike);
router.delete('/:postId/like', authMiddleware, likeController.removeLike);
```

### `src/app.ts`
Configura Express: `cors`, `helmet`, `express.json()`, monta rutas, registra error handler. Exporta `app` sin llamar `listen`.

### `server.ts`
Solo importa `app` y llama `app.listen(3000)`.

---

## 7. Manejo de errores

- Usar un `AppError` class tipado con `statusCode` y `message`.
- Todos los errores se propagan con `next(error)` hacia el error handler global.
- El error handler global siempre devuelve JSON: `{ error: string }`.
- Nunca hacer `res.status(X).json(...)` inline en controllers para errores — usar `next(new AppError(...))`.

```typescript
// src/types/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

## 8. Convenciones de código

- **Nombres:** camelCase para variables/funciones, PascalCase para tipos/clases, kebab-case para archivos.
- **Funciones:** preferir funciones nombradas sobre arrow functions en exports de módulo.
- **Imports:** primero librerías externas, luego imports internos separados por línea en blanco.
- **No magic numbers:** usar constantes nombradas (`const MAX_COMMENT_LENGTH = 500`).
- **No comentarios obvios:** comentar solo lógica no evidente (ej: por qué se usa idempotencia de cierta forma).
- **Un export por archivo** cuando sea posible (excepto `types/index.ts` y `data/store.ts`).

---

## 9. Scripts `package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write src/**/*.ts",
    "format:check": "prettier --check src/**/*.ts"
  }
}
```

---

## 10. Tests requeridos (mínimo 5)

Usar **Vitest + Supertest** sobre `app` (sin levantar servidor real).

Los 5 tests obligatorios son:

1. `POST /v1/auth/login` con email válido → 200 + `{ accessToken, user }`.
2. `GET /v1/feed?limit=3` → 200 + array de posts con campos `likedByMe`, `likesCount`, `commentsCount`.
3. `POST /v1/posts/:id/like` dos veces con el mismo usuario → `likesCount` no se duplica.
4. `POST /v1/posts/:id/comments` con body vacío → 400.
5. `GET /v1/posts/nonexistent/comments` → 404.

```typescript
// Estructura mínima de test
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Auth', () => {
  it('login con email válido devuelve token', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });
});
```

---

## 11. Lo que NO hacer

- ❌ No usar base de datos real (SQLite, Postgres, etc.) — store en memoria es suficiente.
- ❌ No usar `any` en TypeScript.
- ❌ No poner lógica de negocio en routes o controllers.
- ❌ No hardcodear el token en el middleware — validar que exista y tenga formato `Bearer <algo>`.
- ❌ No subir `node_modules/` al repo.
- ❌ No incluir claves API ni secretos reales.
- ❌ No usar `console.log` en producción — si se necesita debug, usar `console.warn` con comentario o eliminar antes de entregar.
- ❌ No crear endpoints extra no solicitados.

---

## 12. Checklist antes de entregar (backend)

- [ ] `npm run lint` pasa sin errores
- [ ] `npm run format:check` pasa sin errores
- [ ] `npm test` — los 5 tests pasan
- [ ] `npm run dev` levanta en puerto 3000
- [ ] Todos los endpoints responden correctamente con `curl`
- [ ] Like idempotente verificado (doble POST no duplica count)
- [ ] Unlike idempotente verificado (doble DELETE no rompe estado)
- [ ] 404 real en comments con postId inexistente
- [ ] 400 en comentario vacío y en comentario > 500 chars
- [ ] `node_modules/` no incluido en entrega

---

---

# Parte 2 — Mobile (React Native + Expo)

> Stack: **Expo Router · Zustand · Axios · AsyncStorage**

---

## M1. Estructura de carpetas

Convención flat de Expo — sin `src/`, carpetas al mismo nivel que `app/`.

```
mobile/
├── app/                        # Expo Router — cada archivo es una ruta
│   ├── _layout.tsx             # Root layout (AuthGate + Zustand hydrate)
│   ├── index.tsx               # Redirige a /login o /feed según auth
│   ├── login.tsx               # Pantalla de login
│   ├── feed.tsx                # Feed principal
│   └── posts/
│       └── [postId]/
│           └── comments.tsx    # Pantalla de comentarios
├── components/                 # Componentes reutilizables
│   ├── PostCard.tsx            # Card de post con like button
│   ├── LikeButton.tsx          # Botón like/unlike con estado pending
│   └── CommentItem.tsx         # Item de comentario
├── stores/                     # Zustand stores
│   ├── authStore.ts            # token, user, login(), logout(), hydrate()
│   └── feedStore.ts            # posts, nextCursor, loading, error, fetchFeed(), loadMore()
├── api/                        # Capa de red
│   ├── client.ts               # Instancia axios con baseURL e interceptor de token
│   └── endpoints.ts            # Funciones tipadas por endpoint
├── types/                      # Interfaces TypeScript
│   └── index.ts                # User, Post, Comment, FeedResponse, etc.
├── constants/                  # Constantes de UI (colores, tamaños)
├── assets/                     # Imágenes, fuentes
├── app.json
├── package.json
└── tsconfig.json
```

---

## M2. Stack y decisiones

| Decisión | Elección | Razón |
|----------|----------|-------|
| Navegación | **Expo Router** | Basado en archivos, estándar moderno de Expo, sin configuración manual de stacks |
| Estado global | **Zustand** | API mínima, TypeScript natural, sin boilerplate de Context/useReducer |
| HTTP | **Axios** | Interceptores para token, tipado de respuestas, manejo de errores centralizado |
| Token storage | **AsyncStorage** | Suficiente para un test técnico; en producción: `expo-secure-store` |
| URL backend | Configurable en `src/api/client.ts` | `10.0.2.2:3000` Android · `localhost:3000` iOS |

---

## M3. API client — reglas

```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:3000',  // Cambiar según plataforma
  timeout: 10000,
});

// Interceptor: adjunta token en cada request autenticado
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

- **Una sola instancia** de axios exportada desde `client.ts`.
- Todos los endpoints en `endpoints.ts` — nunca llamar `apiClient` directamente desde componentes.
- Tipar siempre la respuesta: `apiClient.get<FeedResponse>(...)`.
- Errores de axios capturados en los stores o con `try/catch` en los endpoints.

---

## M4. Zustand stores — reglas

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  login: async (email) => { /* llama endpoint, guarda en AsyncStorage */ },
  logout: async () => { /* limpia token de AsyncStorage y store */ },
  hydrate: async () => { /* lee token de AsyncStorage al arrancar */ },
}));
```

- **Sin lógica de negocio en componentes** — toda mutación de estado va en el store.
- `feedStore` maneja: `posts`, `nextCursor`, `loading`, `error`, `pendingLikes: Set<string>`.
- Idempotencia de like en cliente: usar `pendingLikes` para deshabilitar el botón mientras hay request en vuelo.
- Los stores viven en `stores/`, no en `src/stores/`.

---

## M5. Pantallas y comportamiento obligatorio

### Login (`app/login.tsx`)
- Input de email, botón "Entrar".
- Llama `authStore.login(email)`.
- En éxito: navega a `/feed` con `router.replace('/feed')`.
- En error: muestra mensaje inline (no alert).

### Feed (`app/feed.tsx`)
- Al montar: `feedStore.fetchFeed()`.
- `FlatList` con `onEndReached` → `feedStore.loadMore()` (solo si `nextCursor !== null`).
- Estados obligatorios: loading inicial (ActivityIndicator), error (texto + retry), lista vacía.
- Cada item: `PostCard` con `LikeButton`.
- Header con botón logout.

### Comments (`app/posts/[postId]/comments.tsx`)
- Al montar: `GET /v1/posts/:postId/comments`.
- `FlatList` de comentarios + input + botón enviar al fondo.
- Al crear: actualiza lista local y `commentsCount` en `feedStore`.
- Error comentario vacío: mensaje visible, no bloquea la UI.

---

## M6. Like/Unlike — comportamiento

```typescript
// Flujo en LikeButton
const handleLike = async () => {
  if (isPending) return;               // Previene doble tap
  setPending(true);
  try {
    await feedStore.toggleLike(postId, likedByMe);
  } finally {
    setPending(false);
  }
};
```

- **Prevención de doble tap**: deshabilitar botón mientras `isPending`.
- **Optimistic update (extra)**: actualizar `likedByMe` y `likesCount` antes de la respuesta; revertir en catch.
- Error visible en UI (no solo consola).

---

## M7. TypeScript — reglas mobile

- Mismas reglas estrictas que el backend: sin `any`, tipado explícito.
- Interfaces en `src/types/index.ts` — reusar los mismos nombres que el backend (`Post`, `User`, `Comment`, `FeedResponse`).
- Tipar las respuestas de axios: `axios.get<{ posts: Post[] }>`.
- Props de componentes siempre tipadas con `interface`.

```typescript
interface PostCardProps {
  post: Post;
  onLikeToggle: (postId: string, likedByMe: boolean) => Promise<void>;
}
```

---

## M8. Lo que NO hacer (mobile)

- ❌ No usar `any` en TypeScript.
- ❌ No llamar a `apiClient` directamente desde componentes — solo desde `endpoints.ts`.
- ❌ No hardcodear el token en el cliente — leerlo siempre del store.
- ❌ No usar `alert()` para errores — mostrar en la UI con texto o componente.
- ❌ No olvidar el estado `loading` y `error` en feed y comentarios.
- ❌ No permitir doble tap en like sin protección.
- ❌ No subir `node_modules/`.

---

## M9. Tests manuales requeridos (4 casos)

Documentar en README estos 4 casos con resultado esperado:

| # | Caso | Resultado esperado |
|---|------|--------------------|
| 1 | Login con `ada@ivory.test` | Token guardado, feed carga con posts |
| 2 | Like → unlike → like | Count actualiza, sin duplicados, sin doble tap |
| 3 | Crear comentario | Aparece en lista, `commentsCount` +1 |
| 4 | Enviar comentario vacío | Error visible en la app, no crash |

---

## M10. Checklist antes de entregar (mobile)

- [ ] `npx expo start` arranca sin errores
- [ ] Login funciona con `ada@ivory.test` y `alan@ivory.test`
- [ ] Feed carga y load more funciona
- [ ] Like/unlike actualiza UI, sin doble tap
- [ ] Comentarios: listar y crear funcionan
- [ ] Error en comentario vacío visible en app
- [ ] Estados loading/error/pending visibles
- [ ] URL backend correcta para el emulador usado
- [ ] `node_modules/` no incluido en entrega
- [ ] 4 casos manuales documentados en README
