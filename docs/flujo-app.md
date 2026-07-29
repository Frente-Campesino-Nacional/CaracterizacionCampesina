## Guardado en PostgreSQL para respuestas de formularios

Para que las respuestas de formularios se guarden en PostgreSQL, el backend debe arrancar con la conexión correcta a `DATABASE_URL`:

- `DATABASE_URL`

Flujo recomendado en Windows:

1. Configura [packages/backend/.env](../packages/backend/.env) con la base de datos nueva.
2. Asegura que `DATABASE_URL` apunte a la instancia `db_producir_vencer`.
3. Ejecuta `npm run dev:backend` desde la raíz del repo.
4. Ejecuta `npm run android --workspace=mobile` para abrir la app en el emulador.
5. Envía un formulario desde la app.
6. El backend responde con `guardado_en_postgres: true` como confirmacion de que la respuesta quedo persistida.

Comportamiento actual:

- Si el backend no está disponible, la app móvil sigue guardando el borrador y la cola localmente.
- Cuando vuelves a entrar a las pantallas de encuestador, la app reintenta sincronizar.
- El backend persiste la respuesta final en PostgreSQL.
