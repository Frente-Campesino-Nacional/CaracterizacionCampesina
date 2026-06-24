import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import FormDraft from './models/FormDraft';
import FormSubmissionQueue from './models/FormSubmissionQueue';
import FormSubmissionHistory from './models/FormSubmissionHistory';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'censo-campesino-mobile',
  jsi: false,
  onSetUpError: (error) => {
    console.warn('WatermelonDB setup error', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [FormDraft, FormSubmissionQueue, FormSubmissionHistory],
});
