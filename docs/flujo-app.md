## Guardado en Mongo para respuestas de formularios

Para que las respuestas de formularios se guarden en MongoDB, el backend debe arrancar con estas variables configuradas:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_OPTIONAL_ENABLED=true`

Flujo recomendado en Windows:

1. Arranca MongoDB y confirma que responde en el puerto configurado.
2. Copia [packages/backend/.env.example](../packages/backend/.env.example) a `packages/backend/.env`.
3. Ajusta `MONGODB_URI` y, si aplica, `DATABASE_URL` y `JWT_SECRET`.
4. Ejecuta `npm run dev:backend` desde la raíz del repo.
5. Ejecuta `npm run android --workspace=mobile` para abrir la app en el emulador.
6. Envía un formulario desde la app.
7. Si Mongo está disponible, el backend responde con `guardado_en_mongo: true`.

Comportamiento actual:

- Si Mongo no está disponible, la app móvil sigue guardando el borrador y la cola localmente.
- Cuando vuelves a entrar a las pantallas de encuestador, la app reintenta sincronizar.
- El backend solo persiste la respuesta final en Mongo cuando `MongoOptionalService` está activo.
