# Ivory Mini Feed — React Native + Backend

Test tecnico Ivory: mini API REST (Node.js + TypeScript + Express) e app mobile (React Native + Expo) con login mock, feed paginata con cursor, like/unlike idempotente e commenti.

```
test-ivory/
├── backend/    # API Express + TypeScript (store in memoria)
├── mobile/     # App React Native (Expo Router + Zustand + Axios)
└── README.md
```

---

## 1. Installazione

### Prerequisiti

- Node.js 20 LTS o superiore (`node -v`)
- npm (`npm -v`)
- Expo Go sul device, oppure Android Emulator / iOS Simulator
- (Opzionale) Redis — usato solo come cache della feed; **se non c'è, l'app funziona lo stesso**

### Backend

```bash
cd backend
npm install
cp .env.example .env   # su Windows: copy .env.example .env
```

Nel file `.env` l'unica variabile obbligatoria è `JWT_SECRET` (minimo 16 caratteri):

```env
PORT=3000
JWT_SECRET=una-stringa-segreta-di-almeno-16-caratteri
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
```

### Mobile

```bash
cd mobile
npm install
```

---

## 2. Avvio

| Operazione | Comando |
|---|---|
| Backend (porta 3000) | `cd backend && npm run dev` |
| Mobile (Expo) | `cd mobile && npx expo start` |
| Test backend | `cd backend && npm test` |

Con Expo avviato: premere `a` per Android Emulator, `i` per iOS Simulator, oppure scansionare il QR con Expo Go.

---

## 3. URL backend dal mobile

L'app seleziona l'URL automaticamente in base alla piattaforma (`mobile/api/client.ts` usa `Platform.select`):

| Ambiente | URL |
|---|---|
| Android Emulator | `http://10.0.2.2:3000` (già configurato) |
| iOS Simulator (macOS) | `http://localhost:3000` (già configurato) |
| Device fisico / Expo Go | sostituire con l'IP locale del computer, es. `http://192.168.1.xxx:3000` |

Per device fisico, modificare `BASE_URL` in `mobile/api/client.ts`.

---

## 4. Utenti seed

| Email | Password | Ruolo |
|---|---|---|
| `ada@ivory.test` | `ivory1234` | admin |
| `alan@ivory.test` | `ivory1234` | user |

Il login è **mock via email**: la password è **opzionale**. Senza password si entra solo con l'email (come da spec); se viene inviata, deve essere corretta.

```bash
# Login solo con email (spec)
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@ivory.test"}'

# Login con password (usato dalla app)
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@ivory.test","password":"ivory1234"}'
```

> **Nota sul token:** il backend emette **JWT firmati** invece di un token mock arbitrario. È una scelta deliberata (vedi Scelte tecniche): un token inventato tipo `Bearer mock-token-user-1` viene rifiutato con 401. Usare l'`accessToken` restituito dal login.

---

## 5. Endpoint

### Richiesti dalla spec

| Metodo | Rotta | Auth | Descrizione |
|---|---|---|---|
| POST | `/v1/auth/login` | No | Login mock. Ritorna `accessToken` (JWT) e `user` |
| GET | `/v1/feed?limit=3&cursor=...` | No* | Feed paginata, `limit` max 20, `likedByMe`, `likesCount`, `commentsCount`, `nextCursor` |
| POST | `/v1/posts/:postId/like` | Sì | Idempotente: doppia chiamata non duplica |
| DELETE | `/v1/posts/:postId/like` | Sì | Idempotente: doppia chiamata resta coerente |
| GET | `/v1/posts/:postId/comments` | No | Lista commenti. 404 se il post non esiste |
| POST | `/v1/posts/:postId/comments` | Sì | Body non vuoto, max 500 caratteri. Ritorna commento + `commentsCount` |

\* La feed è pubblica; con token, `likedByMe` riflette l'utente autenticato.

### Extra implementati (oltre la spec)

| Metodo | Rotta | Descrizione |
|---|---|---|
| POST | `/v1/posts` | Crea un post (usato dal FAB nella feed) |
| GET | `/v1/posts/:postId` | Dettaglio post |
| PATCH / DELETE | `/v1/posts/:postId` | Modifica/elimina il proprio post (403 se non sei l'autore; il delete fa cascade su commenti e like) |
| PATCH / DELETE | `/v1/posts/:postId/comments/:commentId` | Modifica/elimina il proprio commento (403 se non sei l'autore) |
| GET / PATCH / DELETE | `/v1/me` | Profilo: lettura, modifica nome/email, eliminazione account (con cascade) |
| GET / PATCH / DELETE | `/v1/admin/posts[...]`, `/v1/admin/users[...]` | Pannello admin (solo ruolo `admin`) |
| GET | `/health` | Health check |
| GET | `/api-docs` | Swagger UI (OpenAPI) |

### Esempi curl

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@ivory.test"}' | python -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

curl "http://localhost:3000/v1/feed?limit=3"

curl -X POST http://localhost:3000/v1/posts/post-1/like \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:3000/v1/posts/post-1/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Ciao!"}'
```

---

## 6. Test

### Backend — 48 test automatici (Vitest + Supertest)

```bash
cd backend && npm test
```

Coprono, tra gli altri, i 5 casi richiesti:

1. `POST /v1/auth/login` con email valida → 200 + `accessToken` + `user` (anche senza password)
2. `GET /v1/feed?limit=3` → 200 + post con `likedByMe`, `likesCount`, `commentsCount`
3. `POST /v1/posts/:id/like` due volte con lo stesso utente → `likesCount` non si duplica
4. `POST /v1/posts/:id/comments` con body vuoto → 400 (e 400 oltre i 500 caratteri)
5. `GET /v1/posts/nonexistent/comments` → 404

Più: unlike idempotente, creazione post, paginazione commenti, rate limiting, autorizzazione admin, e un test di regressione che verifica che la feed **non esponga mai il campo `password`** dell'autore.

### Mobile — 4 casi manuali documentati

| # | Caso | Passi | Risultato atteso | Esito |
|---|---|---|---|---|
| 1 | Login + feed | Login con `ada@ivory.test` | Token salvato (AsyncStorage), redirect a `/feed`, lista post caricata | ✅ |
| 2 | Like → unlike → like | Tap ripetuti sul bottone like | Count aggiornato a ogni tap, nessun duplicato; il bottone si disabilita mentre la richiesta è in volo (niente doppio tap); optimistic update con rollback su errore | ✅ |
| 3 | Crea commento | Aprire commenti di un post, scrivere e inviare | Il commento appare in lista e `commentsCount` aumenta di 1 anche nella feed | ✅ |
| 4 | Commento vuoto | Inviare un commento vuoto / solo spazi | Messaggio di errore inline visibile nella app, nessun crash, UI non bloccata | ✅ |

Extra verificati manualmente: load more con cursor (nessun duplicato), stato di errore feed con bottone "Riprova", logout, creazione post dal FAB, modifica profilo, pannello admin.

---

## 7. Scelte tecniche

### Backend

| Scelta | Motivazione |
|---|---|
| **Express 5 + TypeScript strict** | Nessun `any`; tipi in `src/types/`, narrowing con `unknown` |
| **Store in memoria** | Sufficiente per il test; nessun DB reale come da consegna |
| **Architettura a layer** (routes → controllers → services → store) | I controller traducono solo req/res; la logica di business vive nei services, testabile senza HTTP |
| **JWT invece di token mock** | Scelta deliberata oltre la spec: il token trasporta `sub` e `role` firmati, evitando lookup per request e abilitando il ruolo admin. Il login resta mock (password opzionale) |
| **`AppError` + error handler globale** | Tutti gli errori escono come `{ "error": string }` con lo status corretto |
| **Zod** | Validazione di body e variabili d'ambiente |
| **Idempotenza like** | `Set<string>` con chiave `userId:postId` — il doppio POST/DELETE non altera lo stato |
| **Rate limiting** | Globale (100 req/15min) + login (5 tentativi falliti/15min, i successi non contano) |
| **Redis opzionale** | Cache della prima pagina anonima della feed (TTL 60s) con fallback silenzioso: se Redis non c'è, si serve la pagina non cacheata |
| **helmet, cors, hpp, compression, request-id, morgan+winston** | Hardening e logging strutturato |
| **Swagger / OpenAPI** | Documentazione interattiva su `/api-docs` |

### Mobile

| Scelta | Motivazione |
|---|---|
| **Expo Router** | Navigazione file-based, standard moderno di Expo |
| **Zustand** | Stato globale minimale e TypeScript-friendly (`authStore`, `feedStore`) |
| **Axios** | Singola istanza con interceptor che inietta il `Bearer` token dal getter dello store (evita dipendenze circolari) |
| **AsyncStorage** | Persistenza token per il test; in produzione: `expo-secure-store` |
| **Optimistic update con rollback** | Like/unlike aggiorna subito la UI e ripristina in caso di errore; `pendingLikes: Set` previene il doppio tap |
| **Hydrate all'avvio** | Il token viene riletto da AsyncStorage e l'utente ricaricato via `GET /v1/me`; token invalido → pulizia e ritorno al login |
| **Stati UI espliciti** | Loading iniziale, errore con retry, lista vuota, pending su like/commento/pubblicazione |

---

## 8. Uso di AI / risorse esterne

- **Claude Code (Anthropic)** — usato come pair programmer per generazione del codice, debug (inclusa l'individuazione di un leak del campo `password` nella feed, poi corretto con test di regressione), refactoring e questo README. Tutte le scelte architetturali sono state riviste e sono spiegabili in review.
- Documentazione ufficiale: Expo SDK 56, Express 5, Zustand v5, Zod.

---

## 9. Limiti e miglioramenti futuri

- **DB reale** (Postgres + migrations) al posto dello store in memoria
- **Refresh token** e `expo-secure-store` per il token sul device
- **Password hashate** (bcrypt) — ora sono in chiaro nel seed, accettabile solo perché è un login mock
- **Test mobile automatici** (Jest + React Native Testing Library, Maestro/Detox per E2E)
- **CI/CD** (lint + test su PR) e deploy (Docker)
- Paginazione cursor anche per i commenti nella UI (il backend la supporta già)
- i18n: la UI è in italiano, estraibile in file di traduzione

---

## 10. Note di consegna

- `node_modules/` esclusi dalla consegna
- Nessuna chiave API o segreto reale: `.env` locale, `.env.example` incluso come template
- Tempo di lavoro entro le 24 ore dalla ricezione
