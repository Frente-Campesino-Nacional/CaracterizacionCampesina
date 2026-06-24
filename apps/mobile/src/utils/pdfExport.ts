import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

type PdfColumn = {
  key: string;
  title: string;
};

type PdfRow = Record<string, string | number | boolean | null | undefined>;

interface ExportPdfParams {
  title: string;
  subtitle?: string;
  filePrefix: string;
  filters: Array<{ label: string; value: string }>;
  columns: PdfColumn[];
  rows: PdfRow[];
}

export async function exportTableToPdf(params: ExportPdfParams): Promise<string> {
  const timestamp = new Date();
  const dateText = timestamp.toLocaleString();
  const fileName = `${sanitizeFileName(params.filePrefix)}-${timestamp.getTime()}.pdf`;

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #0f172a; }
        h1 { font-size: 22px; margin: 0; }
        .subtitle { color: #475569; margin-top: 6px; margin-bottom: 12px; }
        .meta { margin-bottom: 12px; color: #334155; font-size: 12px; }
        .filters { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 14px; }
        .filters h2 { margin: 0 0 6px 0; font-size: 14px; }
        .filters ul { margin: 0; padding-left: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #e2e8f0; color: #0f172a; text-align: left; padding: 8px; border: 1px solid #cbd5e1; }
        td { padding: 8px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(params.title)}</h1>
      ${params.subtitle ? `<p class="subtitle">${escapeHtml(params.subtitle)}</p>` : ''}
      <p class="meta">Generado el: ${escapeHtml(dateText)}</p>

      <div class="filters">
        <h2>Filtros aplicados</h2>
        ${params.filters.length ? `<ul>${params.filters.map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value || 'Todos')}</li>`).join('')}</ul>` : '<p>Sin filtros.</p>'}
      </div>

      <table>
        <thead>
          <tr>${params.columns.map((column) => `<th>${escapeHtml(column.title)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${params.rows.length ? params.rows.map((row) => `<tr>${params.columns.map((column) => `<td>${escapeHtml(String(row[column.key] ?? '-'))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${params.columns.length}">Sin datos para exportar</td></tr>`}
        </tbody>
      </table>
    </body>
  </html>
  `;

  const printResult = await Print.printToFileAsync({ html });
  if (Platform.OS === 'android') {
    const savedUri = await savePdfToAndroidDownloads(printResult.uri, fileName);
    return savedUri;
  }

  const reportsDir = `${FileSystem.documentDirectory}reports/`;
  const reportsDirInfo = await FileSystem.getInfoAsync(reportsDir);
  if (!reportsDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
  }

  const targetPath = `${reportsDir}${fileName}`;
  await FileSystem.copyAsync({ from: printResult.uri, to: targetPath });
  return targetPath;
}

async function savePdfToAndroidDownloads(sourceUri: string, fileName: string): Promise<string> {
  const storageAccessFramework = (FileSystem as any).StorageAccessFramework;
  if (!storageAccessFramework?.requestDirectoryPermissionsAsync || !storageAccessFramework?.createFileAsync) {
    const reportsDir = `${FileSystem.documentDirectory}reports/`;
    const reportsDirInfo = await FileSystem.getInfoAsync(reportsDir);
    if (!reportsDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
    }

    const fallbackPath = `${reportsDir}${fileName}`;
    await FileSystem.copyAsync({ from: sourceUri, to: fallbackPath });
    return fallbackPath;
  }

  const permissions = await storageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted || !permissions.directoryUri) {
    const reportsDir = `${FileSystem.documentDirectory}reports/`;
    const reportsDirInfo = await FileSystem.getInfoAsync(reportsDir);
    if (!reportsDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
    }

    const fallbackPath = `${reportsDir}${fileName}`;
    await FileSystem.copyAsync({ from: sourceUri, to: fallbackPath });
    return fallbackPath;
  }

  const mimeType = 'application/pdf';
  const destinationUri = await storageAccessFramework.createFileAsync(
    permissions.directoryUri,
    fileName,
    mimeType,
  );

  const pdfBase64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.writeAsStringAsync(destinationUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destinationUri;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
