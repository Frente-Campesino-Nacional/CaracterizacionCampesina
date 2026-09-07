import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { CampesinoFiltroResultadoRecord } from '../services/adminService';

export async function exportFormFilterToPDF(
  results: CampesinoFiltroResultadoRecord[],
  formTitle: string,
  questionLabel: string,
) {
  try {
    if (!results.length) {
      Alert.alert('Exportar PDF', 'No hay datos en el filtro para exportar.');
      return;
    }

    const generatedAt = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const rowsHtml = results
      .map((item, index) => {
        const campesinoNombre = `${item.nombre} ${item.apellido || ''}`.trim() || 'N/A';
        const cedula = item.cedula || 'N/A';
        const telefono = item.telefono || 'Sin registro';
        const email = item.email || 'Sin registro';
        const consejo = item.consejo_nombre || 'N/A';
        const estado = item.estado || 'N/A';
        const municipio = item.municipio || 'N/A';
        const parroquia = item.parroquia || 'N/A';
        const bgClass = index % 2 === 0 ? 'bg-even' : 'bg-odd';

        return `
          <tr class="${bgClass}">
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px; font-weight: 600;">${formTitle}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px; color: #1e293b;">${questionLabel}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px; font-weight: 700; color: #166534;">${item.valor}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px; font-weight: 600; color: #334155;">${cedula}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px; font-weight: 600;">${campesinoNombre}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px;">${telefono}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px;">${email}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px;">${consejo}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px;">${estado}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px;">${municipio}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10px;">${parroquia}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Reporte de Respuestas de Formulario</title>
          <style>
            @page { size: landscape; margin: 15px; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 10px; color: #1e293b; }
            .header { border-bottom: 3px solid #166534; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: 800; color: #166534; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
            .summary { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #14532d; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9px; }
            th { background-color: #166534; color: #ffffff; text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; font-weight: 700; }
            .bg-even { background-color: #ffffff; }
            .bg-odd { background-color: #f8fafc; }
            .footer { margin-top: 16px; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Censo Campesino - Análisis de Respuestas por Formulario</h1>
            <div class="subtitle"><strong>Formulario:</strong> ${formTitle} | <strong>Pregunta:</strong> ${questionLabel}</div>
          </div>
          
          <div class="summary">
            <span><strong>Total Campesinos:</strong> ${results.length}</span>
            <span><strong>Fecha de Generación:</strong> ${generatedAt}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Formulario</th>
                <th>Pregunta</th>
                <th>Respuesta</th>
                <th>Cédula</th>
                <th>Campesino</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Consejo</th>
                <th>Estado</th>
                <th>Municipio</th>
                <th>Parroquia</th>
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

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Descargar Reporte de Respuestas (PDF)',
      });
    }

    Alert.alert('Éxito', 'Archivo descargado con éxito');
  } catch (error: any) {
    Alert.alert('Error al exportar PDF', error?.message || 'No se pudo generar el documento PDF');
  }
}

export async function exportFormFilterToExcel(
  results: CampesinoFiltroResultadoRecord[],
  formTitle: string,
  questionLabel: string,
) {
  try {
    if (!results.length) {
      Alert.alert('Exportar Excel', 'No hay datos en el filtro para exportar.');
      return;
    }

    const generatedAt = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // CSV Header block with BOM for UTF-8 Excel support
    let csv = '\uFEFF';
    csv += `"REPORTE DE RESPUESTAS POR FORMULARIO"\n`;
    csv += `"Formulario:";"${String(formTitle || '').replace(/"/g, '""')}"\n`;
    csv += `"Pregunta Filtro:";"${String(questionLabel || '').replace(/"/g, '""')}"\n`;
    csv += `"Total Registros:";"${results.length}"\n`;
    csv += `"Fecha de Generación:";"${generatedAt}"\n\n`;

    csv += 'Formulario;Pregunta Filtro;Respuesta;Cédula;Nombre del Campesino;Teléfono;Correo Electrónico;Consejo Comunal;Estado;Municipio;Parroquia\n';

    results.forEach((item) => {
      const fTitle = String(formTitle || '').replace(/;/g, ',');
      const qLabel = String(questionLabel || '').replace(/;/g, ',');
      const answer = String(item.valor || '').replace(/[\r\n]+/g, ' ').replace(/;/g, ',');
      const cedula = String(item.cedula || 'N/A').replace(/;/g, ',');
      const campesinoNombre = String(`${item.nombre} ${item.apellido || ''}`.trim() || 'N/A').replace(/;/g, ',');
      const telefono = String(item.telefono || 'Sin registro').replace(/;/g, ',');
      const email = String(item.email || 'Sin registro').replace(/;/g, ',');
      const consejo = String(item.consejo_nombre || 'N/A').replace(/;/g, ',');
      const estado = String(item.estado || 'N/A').replace(/;/g, ',');
      const municipio = String(item.municipio || 'N/A').replace(/;/g, ',');
      const parroquia = String(item.parroquia || 'N/A').replace(/;/g, ',');

      csv += `"${fTitle}";"${qLabel}";"${answer}";"${cedula}";"${campesinoNombre}";"${telefono}";"${email}";"${consejo}";"${estado}";"${municipio}";"${parroquia}"\n`;
    });

    const safeTitle = formTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `respuestas_${safeTitle}_${Date.now()}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
        dialogTitle: 'Descargar Reporte de Respuestas (Excel/CSV)',
      });
    }

    Alert.alert('Éxito', 'Archivo descargado con éxito');
  } catch (error: any) {
    Alert.alert('Error al exportar Excel', error?.message || 'No se pudo generar el archivo Excel');
  }
}
