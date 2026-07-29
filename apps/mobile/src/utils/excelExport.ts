import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

type ExcelColumn = {
  key: string;
  title: string;
};

type ExcelRow = Record<string, string | number | boolean | null | undefined>;

interface ExportExcelParams {
  filePrefix: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
}

export async function exportTableToExcelCsv(params: ExportExcelParams): Promise<string> {
  const timestamp = new Date();
  const fileName = `${sanitizeFileName(params.filePrefix)}-${timestamp.getTime()}.csv`;
  const csvContent = buildCsvContent(params.columns, params.rows);

  const tempPath = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(tempPath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (Platform.OS === 'android') {
    return saveCsvToAndroidDownloads(tempPath, fileName);
  }

  const reportsDir = `${FileSystem.documentDirectory}reports/`;
  const reportsDirInfo = await FileSystem.getInfoAsync(reportsDir);
  if (!reportsDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
  }

  const targetPath = `${reportsDir}${fileName}`;
  await FileSystem.copyAsync({ from: tempPath, to: targetPath });
  return targetPath;
}

function buildCsvContent(columns: ExcelColumn[], rows: ExcelRow[]): string {
  const headerRow = columns.map((column) => escapeCsv(column.title)).join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((column) => {
        const value = row[column.key];
        return escapeCsv(value == null ? '' : String(value));
      })
      .join(','),
  );

  // Add UTF-8 BOM so Excel opens accented text correctly.
  return `\uFEFF${[headerRow, ...dataRows].join('\n')}`;
}

async function saveCsvToAndroidDownloads(sourceUri: string, fileName: string): Promise<string> {
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

  const mimeType = 'text/csv';
  const destinationUri = await storageAccessFramework.createFileAsync(
    permissions.directoryUri,
    fileName,
    mimeType,
  );

  const csvText = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await FileSystem.writeAsStringAsync(destinationUri, csvText, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return destinationUri;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
