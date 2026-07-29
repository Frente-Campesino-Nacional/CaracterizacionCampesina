import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'form_drafts',
      columns: [
        { name: 'campesino_id', type: 'string', isIndexed: true },
        { name: 'formulario_id', type: 'string', isIndexed: true },
        { name: 'answers_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'form_submission_queue',
      columns: [
        { name: 'campesino_id', type: 'string', isIndexed: true },
        { name: 'formulario_id', type: 'string', isIndexed: true },
        { name: 'formulario_titulo', type: 'string' },
        { name: 'respuestas_json', type: 'string' },
        { name: 'all_active_form_ids_json', type: 'string' },
        { name: 'encuestador_id', type: 'string', isOptional: true },
        { name: 'captured_at_iso', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'form_submission_history',
      columns: [
        { name: 'campesino_id', type: 'string', isIndexed: true },
        { name: 'formulario_id', type: 'string', isIndexed: true },
        { name: 'formulario_titulo', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'message', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),
  ],
});
