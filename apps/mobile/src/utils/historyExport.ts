import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface HistoryExportItem {
  id: string | number;
  creado_en?: string | number;
  createdAt?: string | number;
  line?: string;
  mensaje?: string;
  entidad?: string;
  target_nombre?: string;
  operacion?: string;
  actor_nombre?: string;
  usuario_nombre?: string;
  actor_rol?: string;
  tipo_usuario?: string;
  status?: string;
  message?: string;
  formularioTitulo?: string;
}

function formatDate(value?: string | number): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEntityLabel(entity?: string): string {
  if (!entity) return 'Sistema';
  const ent = entity.toLowerCase();
  if (ent.includes('campesino')) return 'Campesino';
  if (ent.includes('usuario')) return 'Usuario';
  if (ent.includes('consejo')) return 'Consejo';
  if (ent.includes('formulario')) return 'Formulario';
  return entity.charAt(0).toUpperCase() + entity.slice(1);
}

export async function exportHistoryToPDF(items: HistoryExportItem[], title: string = 'Historial de Cambios') {
  try {
    if (!items.length) {
      Alert.alert('Exportar PDF', 'No hay registros en el historial para exportar.');
      return;
    }

    const generatedAt = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const rowsHtml = items
      .map((item, index) => {
        const date = formatDate(item.creado_en || item.createdAt);
        const entityType = formatEntityLabel(item.entidad);
        const targetName = item.target_nombre || item.formularioTitulo || 'N/A';
        const description = item.line || item.mensaje || item.message || 'Cambio registrado';
        const userType = item.actor_rol || item.tipo_usuario || 'Usuario';
        const userName = item.actor_nombre || item.usuario_nombre || 'Usuario';
        const bgClass = index % 2 === 0 ? 'bg-even' : 'bg-odd';

        return `
          <tr class="${bgClass}">
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${date}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #166534;">${entityType}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #0f172a;">${targetName}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #1e293b;">${description}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #1d4ed8;">${userType}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">${userName}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 20px; color: #1e293b; }
            .header { border-bottom: 3px solid #166534; padding-bottom: 10px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 800; color: #166534; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
            .summary { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #14532d; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background-color: #166534; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; font-weight: 700; }
            .bg-even { background-color: #ffffff; }
            .bg-odd { background-color: #f8fafc; }
            .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Censo Campesino - ${title}</h1>
            <div class="subtitle">Reporte detallado de historial de cambios y auditoría</div>
          </div>
          
          <div class="summary">
            <span><strong>Total Registros:</strong> ${items.length}</span>
            <span><strong>Fecha de Generación:</strong> ${generatedAt}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 18%;">Fecha/Hora</th>
                <th style="width: 12%;">Entidad</th>
                <th style="width: 18%;">Nombre Entidad</th>
                <th style="width: 28%;">Detalle/Mensaje</th>
                <th style="width: 12%;">Tipo Usuario</th>
                <th style="width: 12%;">Nombre Usuario</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Generado automáticamente por el Sistema Censo Campesino Ezequiel Zamora.
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `${safeTitle}_${Date.now()}.pdf`;

    await saveFileWithFolderChoice(uri, fileName, 'application/pdf', `${title} (PDF)`);
  } catch (error: any) {
    Alert.alert('Error al exportar PDF', error?.message || 'No se pudo generar el documento PDF');
  }
}

export async function exportHistoryToExcel(items: HistoryExportItem[], title: string = 'Historial de Cambios') {
  try {
    if (!items.length) {
      Alert.alert('Exportar Excel', 'No hay registros en el historial para exportar.');
      return;
    }

    // CSV Header with BOM for UTF-8 Excel support
    let csv = '\uFEFF';
    csv += 'ID;Fecha/Hora;Entidad;Nombre de la entidad;Detalle/Mensaje;Tipo de usuario;Nombre del usuario\n';

    items.forEach((item) => {
      const id = String(item.id || '').replace(/;/g, ',');
      const date = formatDate(item.creado_en || item.createdAt).replace(/;/g, ',');
      const entity = formatEntityLabel(item.entidad).replace(/;/g, ',');
      const targetName = String(item.target_nombre || item.formularioTitulo || 'N/A').replace(/;/g, ',');
      const detail = String(item.line || item.mensaje || item.message || '').replace(/[\r\n]+/g, ' ').replace(/;/g, ',');
      const userType = String(item.actor_rol || item.tipo_usuario || 'Usuario').replace(/;/g, ',');
      const userName = String(item.actor_nombre || item.usuario_nombre || 'Usuario').replace(/;/g, ',');

      csv += `"${id}";"${date}";"${entity}";"${targetName}";"${detail}";"${userType}";"${userName}"\n`;
    });

    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `${safeTitle}_${Date.now()}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await saveFileWithFolderChoice(fileUri, fileName, 'text/csv', `${title} (Excel/CSV)`);
  } catch (error: any) {
    Alert.alert('Error al exportar Excel', error?.message || 'No se pudo generar el archivo Excel');
  }
}

async function saveFileWithFolderChoice(
  sourceUri: string,
  fileName: string,
  mimeType: string,
  dialogTitle: string,
) {
  const saf = (FileSystem as any).StorageAccessFramework;
  if (saf?.requestDirectoryPermissionsAsync && saf?.createFileAsync) {
    try {
      const permissions = await saf.requestDirectoryPermissionsAsync();
      if (permissions.granted && permissions.directoryUri) {
        const destUri = await saf.createFileAsync(permissions.directoryUri, fileName, mimeType);
        const isPdf = mimeType.includes('pdf');
        const fileContent = await FileSystem.readAsStringAsync(sourceUri, {
          encoding: isPdf ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
        });
        await FileSystem.writeAsStringAsync(destUri, fileContent, {
          encoding: isPdf ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
        });
        Alert.alert('Éxito', 'El archivo se guardó correctamente en la carpeta seleccionada.');
        return;
      }
    } catch {
      // Fallback si el usuario cancela o SAF falla
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(sourceUri, {
      UTI: mimeType.includes('pdf') ? '.pdf' : 'public.comma-separated-values-text',
      mimeType,
      dialogTitle,
    });
    Alert.alert('Éxito', 'El archivo se ha exportado correctamente.');
  } else {
    Alert.alert('Éxito', `El archivo se guardó en: ${sourceUri}`);
  }
}

