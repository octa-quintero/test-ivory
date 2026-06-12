# Mini Feed API

API REST che alimenta un'app React Native con feed paginata, like idempotenti e commenti.

---

## Avvio rapido

### Locale (senza Docker)

```bash
npm install
npm run dev            # http://localhost:3000
```

Nessun `.env` necessario in sviluppo: tutte le variabili hanno un default. Per personalizzare: `cp .env.example .env`.

> Redis è opzionale in locale. Se non è in esecuzione, la cache fallisce silenziosamente e la API funziona lo stesso senza di lei.

### Docker (API + Redis)

```bash
docker compose up --build        # build + avvio (log in console)
docker compose up --build -d     # in background
docker compose logs -f           # log in tempo reale
docker compose down              # arresto
```

Il compose avvia due servizi: `api` (Node.js) e `redis` (Redis 7 Alpine). La API aspetta che Redis superi il suo healthcheck prima di partire (`depends_on: condition: service_healthy`).

### Variabili d'ambiente

| Variabile | Obbligatoria | Default | Descrizione |
|-----------|--------------|---------|-------------|
| `JWT_SECRET` | Solo in produzione | default di sviluppo | Minimo 16 caratteri |
| `JWT_EXPIRES_IN` | No | `7d` | Scadenza del token |
| `PORT` | No | `3000` | Porta del server |
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `REDIS_URL` | No | `redis://localhost:6379` | URL di connessione a Redis |

---

## Endpoint

Base URL: `http://localhost:3000`

Tutti gli endpoint con 🔒 richiedono l'header:
```
Authorization: Bearer <accessToken>
```

---

### GET `/health`

Stato del server. Senza autenticazione.

**Risposta 200**
```json
{
  "status": "ok",
  "uptime": 42,
  "startedAt": "2026-06-10T10:00:00.000Z",
  "redis": "ok",
  "version": "1.0.0"
}
```

`redis` può essere `"ok"` o `"unavailable"`. La API funziona in entrambi i casi.

```bash
curl http://localhost:3000/health
```

---

### POST `/v1/auth/login`

Login mock via email. Ritorna un **JWT** firmato con HS256, valido 7 giorni.

La **password è opzionale** (login mock come da spec): senza password si entra solo con l'email; se viene inviata, deve essere corretta.

**Body**
```json
{ "email": "ada@ivory.test" }
```

**Risposta 200**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "user-1", "email": "ada@ivory.test", "name": "Ada Lovelace", "role": "admin" }
}
```

Il payload del token contiene `{ sub: userId, role, iat, exp }`. Il middleware verifica la firma senza consultare nessuno store — stateless.

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ada@ivory.test"}'
```

Utenti seed disponibili:

| Email | Password | Ruolo |
|-------|----------|-------|
| `ada@ivory.test` | `ivory1234` | `admin` |
| `alan@ivory.test` | `ivory1234` | `user` |

---

### GET `/v1/feed`

Feed paginata con cursor, ordinata dalla più recente alla più vecchia.

La prima pagina senza autenticazione viene servita dalla **cache Redis** (TTL 60s). Si invalida automaticamente a ogni like, unlike, commento o modifica.

**Query params**

| Param | Tipo | Default | Descrizione |
|-------|------|---------|-------------|
| `limit` | number | 10 | Massimo 20 |
| `cursor` | string | — | ID dell'ultimo post ricevuto |

**Risposta 200**
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

`nextCursor` è `null` quando non ci sono altre pagine. Il campo `author` non espone mai la password.

```bash
# Prima pagina (in cache su Redis)
curl "http://localhost:3000/v1/feed?limit=3"

# Pagina successiva
curl "http://localhost:3000/v1/feed?limit=3&cursor=post-8"
```

---

### POST `/v1/posts/:postId/like` 🔒

Aggiunge un like. Idempotente: chiamare due volte con lo stesso utente non duplica il contatore. Invalida la cache della feed.

**Risposta 200**
```json
{ "success": true }
```

```bash
curl -X POST http://localhost:3000/v1/posts/post-1/like \
  -H "Authorization: Bearer <token>"
```

---

### DELETE `/v1/posts/:postId/like` 🔒

Rimuove il like. Idempotente: chiamare due volte non rompe lo stato. Invalida la cache della feed.

**Risposta 200**
```json
{ "success": true }
```

```bash
curl -X DELETE http://localhost:3000/v1/posts/post-1/like \
  -H "Authorization: Bearer <token>"
```

---

### GET `/v1/posts/:postId/comments`

Lista i commenti di un post, paginati con cursor. Ritorna 404 se il post non esiste.

**Query params**

| Param | Tipo | Default | Descrizione |
|-------|------|---------|-------------|
| `limit` | number | 20 | Massimo 50 |
| `cursor` | string | — | ID dell'ultimo commento ricevuto |

**Risposta 200**
```json
{
  "comments": [
    {
      "id": "abc123",
      "postId": "post-1",
      "authorId": "user-1",
      "body": "Ottimo punto.",
      "createdAt": "2026-06-10T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

```bash
curl http://localhost:3000/v1/posts/post-1/comments
```

---

### POST `/v1/posts/:postId/comments` 🔒

Crea un commento. Il body non può essere vuoto né superare i 500 caratteri. Invalida la cache della feed.

**Body**
```json
{ "body": "Ottimo punto." }
```

**Risposta 201**
```json
{
  "comment": { "id": "abc123", "postId": "post-1", "authorId": "user-1", "body": "Ottimo punto.", "createdAt": "..." },
  "commentsCount": 1
}
```

```bash
curl -X POST http://localhost:3000/v1/posts/post-1/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body": "Ottimo punto."}'
```

---

### PATCH `/v1/posts/:postId/comments/:commentId` 🔒

Modifica un commento proprio. Solo l'autore può farlo (403 altrimenti). Stesse validazioni della creazione.

**Body**
```json
{ "body": "Commento corretto." }
```

**Risposta 200**
```json
{
  "comment": { "id": "abc123", "postId": "post-1", "authorId": "user-1", "body": "Commento corretto.", "createdAt": "..." }
}
```

```bash
curl -X PATCH http://localhost:3000/v1/posts/post-1/comments/abc123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body": "Commento corretto."}'
```

---

### DELETE `/v1/posts/:postId/comments/:commentId` 🔒

Elimina un commento proprio. Solo l'autore può farlo (403 altrimenti). Ritorna il nuovo `commentsCount`.

**Risposta 200**
```json
{ "commentsCount": 0 }
```

```bash
curl -X DELETE http://localhost:3000/v1/posts/post-1/comments/abc123 \
  -H "Authorization: Bearer <token>"
```

---

### POST `/v1/posts` 🔒

Crea un nuovo post. Il body non può essere vuoto né superare i 500 caratteri. Invalida la cache della feed.

**Body**
```json
{ "body": "Testo del post." }
```

**Risposta 201**
```json
{
  "post": {
    "id": "post-uuid",
    "authorId": "user-1",
    "body": "Testo del post.",
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
  -d '{"body": "Testo del post."}'
```

---

### GET `/v1/posts/:postId`

Ritorna un post per ID. 404 se non esiste.

**Risposta 200**
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

### PATCH `/v1/posts/:postId` 🔒

Modifica un post proprio. Solo l'autore può farlo (403 altrimenti). Stesse validazioni della creazione. Invalida la cache della feed.

**Body**
```json
{ "body": "Testo aggiornato." }
```

**Risposta 200** — il post aggiornato, stesso formato di `GET /v1/posts/:postId`.

```bash
curl -X PATCH http://localhost:3000/v1/posts/post-1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body": "Testo aggiornato."}'
```

---

### DELETE `/v1/posts/:postId` 🔒

Elimina un post proprio. Solo l'autore può farlo (403 altrimenti). **Cascade**: elimina anche i commenti e i like del post.

**Risposta** `204 No Content`

```bash
curl -X DELETE http://localhost:3000/v1/posts/post-1 \
  -H "Authorization: Bearer <token>"
```

---

### GET `/v1/me` 🔒

Profilo dell'utente autenticato.

**Risposta 200**
```json
{
  "user": { "id": "user-1", "email": "ada@ivory.test", "name": "Ada Lovelace", "role": "admin" }
}
```

```bash
curl http://localhost:3000/v1/me -H "Authorization: Bearer <token>"
```

---

### PATCH `/v1/me` 🔒

Modifica nome e/o email dell'utente autenticato. Email già in uso → 409.

**Body**
```json
{ "name": "Nuovo Nome", "email": "nuova@email.test" }
```

**Risposta 200** — l'utente aggiornato, stesso formato di `GET /v1/me`.

```bash
curl -X PATCH http://localhost:3000/v1/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nuovo Nome"}'
```

---

### DELETE `/v1/me` 🔒

Elimina l'account dell'utente autenticato. **Cascade**: rimuove anche i suoi post, commenti e like.

**Risposta** `204 No Content`

```bash
curl -X DELETE http://localhost:3000/v1/me -H "Authorization: Bearer <token>"
```

---

### GET `/v1/admin/posts` 🔒 `admin`

Lista tutti i post dello store (pannello di moderazione), senza paginazione.

**Risposta 200**
```json
{
  "posts": [ /* array completo di Post */ ]
}
```

```bash
curl http://localhost:3000/v1/admin/posts \
  -H "Authorization: Bearer <token-admin>"
```

---

### PATCH `/v1/admin/posts/:postId` 🔒 `admin`

Modifica il body di un post esistente (qualsiasi autore). Stesse validazioni della creazione. Invalida la cache della feed.

**Body**
```json
{ "body": "Testo corretto." }
```

**Risposta 200** — il post aggiornato.

```bash
curl -X PATCH http://localhost:3000/v1/admin/posts/post-1 \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{"body": "Testo corretto."}'
```

---

### DELETE `/v1/admin/posts/:postId` 🔒 `admin`

Elimina un post (qualsiasi autore), con cascade su commenti e like. Solo per utenti con ruolo `admin`.

**Risposta** `204 No Content`

```bash
curl -X DELETE http://localhost:3000/v1/admin/posts/post-1 \
  -H "Authorization: Bearer <token-admin>"
```

---

### GET `/v1/admin/users` 🔒 `admin`

Lista tutti gli utenti registrati nello store.

**Risposta 200**
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
  -H "Authorization: Bearer <token-admin>"
```

---

### DELETE `/v1/admin/users/:userId` 🔒 `admin`

Elimina un utente per ID, con **cascade** su post, commenti e like. Auto-eliminazione → 403.

**Risposta** `204 No Content`

```bash
curl -X DELETE http://localhost:3000/v1/admin/users/user-2 \
  -H "Authorization: Bearer <token-admin>"
```

---

## Middleware

| Middleware | Descrizione |
|------------|-------------|
| `requestId` | Aggiunge un `X-Request-Id` univoco (UUID) a ogni request e response |
| `helmet` | Header di sicurezza HTTP |
| `cors` | Whitelist di origini (`localhost:8081`, `localhost:3000`) |
| `compression` | Compressione gzip delle response |
| `hpp` | Protezione contro HTTP Parameter Pollution |
| `morgan` | Log delle request HTTP, instradato attraverso Winston |
| `globalLimiter` | Rate limit globale: 100 request / 15min |
| `authLimiter` | Rate limit sul login: 5 tentativi falliti / 15min |
| `authenticate` | Verifica il JWT e aggiunge `userId` e `userRole` alla request |
| `authorize` | Factory di controllo accessi per ruolo |

---

## Decisioni tecniche

**Express invece di NestJS** — il revisore può leggere qualsiasi handler in pochi secondi senza conoscere il framework. NestJS non aggiunge nulla a questa scala e il suo boilerplate nasconderebbe le decisioni di design.

**Persistenza in memoria con pattern service/store** — lo store vive in `src/data/store.ts` e i services sono l'unico layer che lo tocca. Passare a PostgreSQL significa sostituire quel file; il resto del codice non cambia.

**Cache Redis per la feed** — la prima pagina anonima (`GET /v1/feed?limit=N`) viene cacheata su Redis con TTL di 60s. Le request autenticate vengono servite fresche per calcolare `likedByMe` per utente. A ogni like, unlike, commento o modifica, la cache si invalida con `KEYS feed:first:*` + `DEL`. In produzione si sostituirebbe `KEYS` con `SCAN` per non bloccare Redis.

**Idempotenza con `Set<string>`** — i like sono memorizzati come `"userId:postId"`. `addLike` e `removeLike` verificano l'esistenza prima di mutare il contatore, garantendo che le doppie chiamate siano no-op senza logica extra.

**Cursor invece di offset** — la paginazione per offset sposta i risultati se vengono inseriti post durante la navigazione. Il cursor punta all'ultimo elemento visto ed è stabile rispetto a inserimenti concorrenti.

**Ownership sui contenuti propri** — `PATCH/DELETE /v1/posts/:id` e `PATCH/DELETE` sui commenti verificano che il richiedente sia l'autore (403 altrimenti); le rotte `/v1/admin/*` permettono la moderazione su qualsiasi contenuto, protette dal middleware `authorize('admin')`.

**JWT stateless con HS256** — il payload contiene `{ sub, role, iat, exp }`. Il middleware verifica la firma crittograficamente senza toccare nessuno store. Il `role` nel token evita un lookup extra per request. In produzione: RS256 con chiave privata per firmare e pubblica per verificare in ogni servizio.

**Graceful shutdown** — `SIGTERM` (Docker stop) e `SIGINT` (Ctrl+C) chiudono il server HTTP in modo pulito prima di terminare il processo, loggando ogni passo con Winston.

**Zod per validazione ed env** — stesso pattern nei controller (body) e in `src/config/env.ts` (variabili d'ambiente). Se l'avvio fallisce per una variabile mal configurata, l'errore indica esattamente quale variabile e perché.

---

## Cosa manca / come lo completerei

| Elemento | Stato | Come lo completerei |
|----------|-------|---------------------|
| Database | In memoria | Sostituire `src/data/store.ts` con repository PostgreSQL (`pg` o Prisma) |
| Autenticazione reale | JWT HS256 ✓ | RS256 + refresh token con rotazione; password hashate con bcrypt |
| Cache della feed | Redis ✓ | `SCAN` invece di `KEYS` in produzione; cache per utente con `likedByMe` |
| Rate limiting | `express-rate-limit` ✓ | Rate limit distribuito con store Redis per istanze multiple |
| Paginazione commenti | Cursor ✓ (backend) | Consumare `nextCursor` anche nella UI mobile |
| Ruoli avanzati | `user` / `admin` ✓ | RBAC granulare con permessi per risorsa |

---

## Script disponibili

```bash
npm run dev            # server con hot reload
npm run build          # compila TypeScript → dist/
npm run start          # esegue dist/server.js
npm test               # Vitest + Supertest (48 test)
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint su src/
npm run format:check   # Prettier in modalità verifica
npm run openapi        # genera openapi.json dalla spec Swagger
```

---

## Dichiarazione degli strumenti

Questo progetto è stato sviluppato con l'assistenza di **Claude Code** (Anthropic) come strumento di sviluppo. L'architettura, le decisioni tecniche e la revisione del codice sono del candidato.
