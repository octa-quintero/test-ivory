# Mini Feed API

API REST que alimenta una app React Native con feed paginado, likes idempotentes y comentarios.

---

## Arranque rápido

### Local (sin Docker)

```bash
cp .env.example .env   # ajusta JWT_SECRET antes de arrancar
npm install
npm run dev            # http://localhost:3000
```

> Redis es opcional en local. Si no está corriendo, el cache falla silenciosamente y la API funciona igual sin él.

### Docker (API + Redis)

```bash
docker compose up --build        # build + arrancar (logs en consola)
docker compose up --build -d     # en background
docker compose logs -f           # ver logs en vivo
docker compose down              # detener
```

El compose levanta dos servicios: `api` (Node.js) y `redis` (Redis 7 Alpine). La API espera a que Redis pase su healthcheck antes de arrancar (`depends_on: condition: service_healthy`).

### Variables de entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `JWT_SECRET` | Sí | — | Mínimo 16 caracteres |
| `JWT_EXPIRES_IN` | No | `7d` | Expiración del token |
| `PORT` | No | `3000` | Puerto del servidor |
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `REDIS_URL` | No | `redis://localhost:6379` | URL de conexión a Redis |

---

## Endpoints

Base URL: `http://localhost:3000`

Todos los endpoints con 🔒 requieren el header:
```
Authorization: Bearer <accessToken>
```

---

### GET `/health`

Estado del servidor. Sin autenticación.

**Respuesta 200**
```json
{
  "status": "ok",
  "uptime": 42,
  "startedAt": "2026-06-10T10:00:00.000Z",
  "redis": "ok",
  "version": "1.0.0"
}
```

`redis` puede ser `"ok"` o `"unavailable"`. La API funciona en ambos casos.

```bash
curl http://localhost:3000/health
```

---

### POST `/v1/auth/login`

Login mock por email. Devuelve un **JWT** firmado con HS256, válido 7 días.

**Body**
```json
{ "email": "ada@ivory.test" }
```

**Respuesta 200**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "user-1", "email": "ada@ivory.test", "name": "Ada Lovelace", "role": "admin" }
}
```

El payload del token contiene `{ sub: userId, role, iat, exp }`. El middleware verifica la firma sin consultar ningún store — stateless.

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ada@ivory.test"}'
```

Usuarios seed disponibles:

| Email | Rol |
|-------|-----|
| `ada@ivory.test` | `admin` |
| `alan@ivory.test` | `user` |

---

### GET `/v1/feed`

Feed paginada con cursor, ordenada de más reciente a más antigua.

La primera página sin autenticación se sirve desde **caché Redis** (TTL 60s). Se invalida automáticamente al hacer like, unlike o comentar.

**Query params**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `limit` | number | 10 | Máximo 20 |
| `cursor` | string | — | ID del último post recibido |

**Respuesta 200**
```json
{
  "posts": [
    {
      "id": "post-10",
      "authorId": "user-2",
      "body": "Primer día en el nuevo proyecto...",
      "createdAt": "2026-06-10T08:45:00.000Z",
      "likesCount": 62,
      "commentsCount": 0,
      "author": { "id": "user-2", "email": "alan@ivory.test", "name": "Alan Turing", "role": "user" },
      "likedByMe": false
    }
  ],
  "nextCursor": "post-9"
}
```

`nextCursor` es `null` cuando no hay más páginas.

```bash
# Primera página (cacheada en Redis)
curl "http://localhost:3000/v1/feed?limit=3"

# Siguiente página
curl "http://localhost:3000/v1/feed?limit=3&cursor=post-8"
```

---

### POST `/v1/posts/:postId/like` 🔒

Agrega un like. Idempotente: llamar dos veces con el mismo usuario no duplica el contador. Invalida el caché del feed.

**Respuesta 200**
```json
{ "success": true }
```

```bash
curl -X POST http://localhost:3000/v1/posts/post-1/like \
  -H "Authorization: Bearer <token>"
```

---

### DELETE `/v1/posts/:postId/like` 🔒

Elimina el like. Idempotente: llamar dos veces no rompe el estado. Invalida el caché del feed.

**Respuesta 200**
```json
{ "success": true }
```

```bash
curl -X DELETE http://localhost:3000/v1/posts/post-1/like \
  -H "Authorization: Bearer <token>"
```

---

### GET `/v1/posts/:postId/comments`

Lista los comentarios de un post. Devuelve 404 si el post no existe.

**Respuesta 200**
```json
{
  "comments": [
    {
      "id": "abc123",
      "postId": "post-1",
      "authorId": "user-1",
      "body": "Gran punto.",
      "createdAt": "2026-06-10T10:00:00.000Z"
    }
  ]
}
```

```bash
curl http://localhost:3000/v1/posts/post-1/comments
```

---

### POST `/v1/posts/:postId/comments` 🔒

Crea un comentario. Body no puede estar vacío ni superar 500 caracteres. Invalida el caché del feed.

**Body**
```json
{ "body": "Gran punto." }
```

**Respuesta 201**
```json
{
  "comment": { "id": "abc123", "postId": "post-1", "authorId": "user-1", "body": "Gran punto.", "createdAt": "..." },
  "commentsCount": 1
}
```

```bash
curl -X POST http://localhost:3000/v1/posts/post-1/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body": "Gran punto."}'
```

---

### POST `/v1/posts` 🔒

Crea un nuevo post. Body no puede estar vacío ni superar 500 caracteres. Invalida el caché del feed.

**Body**
```json
{ "body": "Texto del post." }
```

**Respuesta 201**
```json
{
  "post": {
    "id": "post-uuid",
    "authorId": "user-1",
    "body": "Texto del post.",
    "createdAt": "2026-06-11T10:00:00.000Z",
    "likesCount": 0,
    "commentsCount": 0
  }
}
```

```bash
curl -X POST http://localhost:3000/v1/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body": "Texto del post."}'
```

---

### GET `/v1/posts/:postId`

Devuelve un post por ID. 404 si no existe.

**Respuesta 200**
```json
{
  "post": {
    "id": "post-1",
    "authorId": "user-1",
    "body": "TypeScript strict mode...",
    "createdAt": "2026-06-01T08:00:00.000Z",
    "likesCount": 14,
    "commentsCount": 0
  }
}
```

```bash
curl http://localhost:3000/v1/posts/post-1
```

---

### GET `/v1/admin/posts` 🔒 `admin`

Lista todos los posts del store (panel de moderación), sin paginar.

**Respuesta 200**
```json
{
  "posts": [ /* array completo de Post */ ]
}
```

```bash
curl http://localhost:3000/v1/admin/posts \
  -H "Authorization: Bearer <token-de-admin>"
```

---

### PATCH `/v1/admin/posts/:postId` 🔒 `admin`

Edita el body de un post existente. Mismas validaciones que al crear (no vacío, máx 500 chars). Invalida el caché del feed.

**Body**
```json
{ "body": "Texto corregido." }
```

**Respuesta 200**
```json
{
  "post": {
    "id": "post-1",
    "authorId": "user-1",
    "body": "Texto corregido.",
    "createdAt": "2026-06-01T08:00:00.000Z",
    "likesCount": 14,
    "commentsCount": 0
  }
}
```

```bash
curl -X PATCH http://localhost:3000/v1/admin/posts/post-1 \
  -H "Authorization: Bearer <token-de-admin>" \
  -H "Content-Type: application/json" \
  -d '{"body": "Texto corregido."}'
```

---

### DELETE `/v1/admin/posts/:postId` 🔒 `admin`

Elimina un post. Solo accesible para usuarios con rol `admin`.

**Respuesta** `204 No Content`

```bash
curl -X DELETE http://localhost:3000/v1/admin/posts/post-1 \
  -H "Authorization: Bearer <token-de-admin>"
```

---

### GET `/v1/admin/users` 🔒 `admin`

Lista todos los usuarios registrados en el store.

**Respuesta 200**
```json
{
  "users": [
    { "id": "user-1", "email": "ada@ivory.test", "name": "Ada Lovelace", "role": "admin" },
    { "id": "user-2", "email": "alan@ivory.test", "name": "Alan Turing", "role": "user" }
  ]
}
```

```bash
curl http://localhost:3000/v1/admin/users \
  -H "Authorization: Bearer <token-de-admin>"
```

---

### DELETE `/v1/admin/users/:userId` 🔒 `admin`

Elimina un usuario por ID.

**Respuesta** `204 No Content`

```bash
curl -X DELETE http://localhost:3000/v1/admin/users/user-2 \
  -H "Authorization: Bearer <token-de-admin>"
```

---

## Middlewares

| Middleware | Descripción |
|------------|-------------|
| `requestId` | Agrega `X-Request-Id` único (UUID) a cada request y response |
| `helmet` | Headers de seguridad HTTP |
| `cors` | Whitelist de orígenes (`localhost:8081`, `localhost:3000`) |
| `compression` | Compresión gzip de responses |
| `hpp` | Protección contra HTTP Parameter Pollution |
| `morgan` | Log de requests HTTP, pipado a través de Winston |
| `globalLimiter` | Rate limit global: 100 requests / 15min |
| `authLimiter` | Rate limit en login: 5 intentos fallidos / 15min |
| `authenticate` | Verifica JWT y adjunta `userId` y `userRole` al request |
| `authorize` | Factory de control de acceso por rol |

---

## Decisiones técnicas

**Express sobre NestJS** — el revisor puede leer cualquier handler en segundos sin conocer el framework. NestJS no aporta nada a esta escala y su boilerplate escondería las decisiones de diseño.

**Persistencia en memoria con patrón service/store** — el store vive en `src/data/store.ts` y los services son la única capa que lo toca. Cambiar a PostgreSQL implica reemplazar ese archivo; el resto del código no se modifica.

**Cache Redis para el feed** — la primera página anónima (`GET /v1/feed?limit=N`) se cachea en Redis con TTL de 60s. Las requests autenticadas se sirven frescas para calcular `likedByMe` por usuario. Al hacer like, unlike o comentar, el cache se invalida con `KEYS feed:first:*` + `DEL`. En producción se reemplazaría `KEYS` por `SCAN` para no bloquear Redis.

**Idempotencia con `Set<string>`** — los likes se almacenan como `"userId:postId"`. `addLike` y `removeLike` verifican existencia antes de mutar el contador, garantizando que dobles llamadas sean no-ops sin lógica extra.

**Cursor sobre offset** — la paginación por offset desplaza resultados si se insertan posts durante la navegación. El cursor apunta al último ítem visto y es estable ante inserciones concurrentes.

**JWT stateless con HS256** — el payload lleva `{ sub, role, iat, exp }`. El middleware verifica la firma criptográficamente sin tocar ningún store. El `role` en el token evita un lookup extra por request. En producción: RS256 con clave privada para firmar y pública para verificar en cada servicio.

**Graceful shutdown** — `SIGTERM` (Docker stop) y `SIGINT` (Ctrl+C) cierran el servidor HTTP limpiamente antes de terminar el proceso, logueando cada paso con Winston.

**Zod para validación y env** — mismo patrón en controllers (body) y en `src/config/env.ts` (variables de entorno). Si arrancar falla por una variable mal configurada, el error indica exactamente qué variable y por qué.

---

## Qué falta / cómo lo completaría

| Elemento | Estado | Cómo lo completaría |
|----------|--------|---------------------|
| Base de datos | En memoria | Reemplazar `src/data/store.ts` por repositorios PostgreSQL con `pg` o Prisma |
| Autenticación real | JWT HS256 ✓ | RS256 + refresh tokens con rotación |
| Cache de feed | Redis ✓ | `SCAN` en lugar de `KEYS` para producción; cache por usuario con `likedByMe` |
| Rate limiting | `express-rate-limit` ✓ | Rate limit distribuido con Redis store para múltiples instancias |
| Paginación de comentarios | Sin paginar | Mismo patrón cursor del feed |
| Roles avanzados | `user` / `admin` ✓ | RBAC granular con permisos por recurso |

---

## Scripts disponibles

```bash
npm run dev            # servidor con hot reload
npm run build          # compila TypeScript → dist/
npm run start          # ejecuta dist/server.js
npm test               # Vitest + Supertest (22 tests)
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint sobre src/
npm run format:check   # Prettier en modo verificación
npm run openapi        # genera openapi.json desde la spec de Swagger
```

---

## Declaración de herramientas

Este proyecto fue desarrollado con asistencia de **Claude Code** (Anthropic) como herramienta de desarrollo. La arquitectura, las decisiones técnicas y la revisión del código son del candidato.
