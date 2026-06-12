# Pendiente

## Frontend (React Native + Expo)

- [ ] Setup inicial con `npx create-expo-app@latest mobile --template blank-typescript`
- [ ] Pantalla de login — input email, botón, guardar token en AsyncStorage/SecureStore
- [ ] Feed — lista de posts con authorId, body, fecha, likesCount, commentsCount, likedByMe
- [ ] Load more — paginación con cursor en el feed
- [ ] Like/unlike — botón conectado al backend, estado pending, prevención doble tap
- [ ] Optimistic update con rollback en like/unlike (extra)
- [ ] Pantalla/modal de comentarios — listar, crear, actualizar commentsCount
- [ ] Error en comentario vacío visible en la app
- [ ] Estados UI — loading feed, error feed, feed vacía, pending durante like/comentario
- [ ] Logout

## Configurar URL según plataforma

- Android Emulator: `http://10.0.2.2:3000`
- iOS Simulator: `http://localhost:3000`
- Expo Go / device físico: `http://<IP-local>:3000`

## Backend — nice to have

- [ ] `.env.example` con todas las variables documentadas
- [ ] `PATCH /v1/admin/posts/:postId` — editar body de un post
- [ ] `GET /v1/admin/posts` — listar todos los posts (panel de moderación)
- [ ] Actualizar README con los últimos endpoints (`POST /v1/posts`, `GET /v1/posts/:postId`, paginación comentarios, rutas admin)
- [ ] Regenerar `openapi.json` con `npm run openapi`

## Checklist entrega

- [ ] Backend avviabile — `npm run dev`
- [ ] App React Native avviabile — `npx expo start`
- [ ] App conectada realmente al backend
- [ ] 5 tests automáticos backend pasando — `npm test`
- [ ] 4 casos manuales mobile documentados en README
- [ ] No `node_modules` en la entrega
- [ ] No secretos ni claves API
