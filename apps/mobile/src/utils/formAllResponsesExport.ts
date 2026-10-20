import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { FormularioRespuestasCompletasResponse } from '../services/adminService';

function escapeCsvField(val: unknown): string {
  if (val == null) return '';
  const str = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
  return `"${str}"`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export async function exportAllFormResponsesToPDF(data: FormularioRespuestasCompletasResponse) {
  try {
    if (!data.respuestas || data.respuestas.length === 0) {
      Alert.alert('Exportar PDF', 'El formulario seleccionado no tiene respuestas registradas para exportar.');
      return;
    }

    const { formulario, respuestas } = data;
    const generatedAt = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const questions = (formulario.preguntas || []).filter((q) => !q.label.match(/^Pregunta \d{10,}/i));

    // Summary table rows
    const summaryRowsHtml = respuestas
      .map((item, idx) => {
        const bgClass = idx % 2 === 0 ? 'bg-even' : 'bg-odd';
        const c = item.campesino;
        return `
          <tr class="${bgClass}">
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td style="font-weight: 600;">${c?.cedula || 'N/A'}</td>
            <td style="font-weight: 600;">${c?.nombre_completo || 'N/A'}</td>
            <td>${c?.consejo || 'N/A'}</td>
            <td>${c?.estado || 'N/A'}</td>
            <td>${c?.municipio || 'N/A'}</td>
            <td>${item.encuestador?.nombre_completo || 'Sistema'}</td>
            <td style="font-size: 8px;">${formatDate(item.capturado_en)}</td>
          </tr>
        `;
      })
      .join('');

    // Detailed response cards
    const cardsHtml = respuestas
      .map((item, idx) => {
        const c = item.campesino;
        const e = item.encuestador;

        const answersRows = questions
          .map((q) => {
            const answer = item.valores_formateados[q.id] || '';
            const displayVal = answer.trim() ? answer : '<span style="color: #94a3b8; font-style: italic;">Sin respuesta</span>';
            return `
              <tr>
                <td class="q-label">${q.label}</td>
                <td class="a-val">${displayVal}</td>
              </tr>
            `;
          })
          .join('');

        return `
          <div class="submission-card">
            <div class="card-header">
              <span class="card-num">#${idx + 1}</span>
              <span class="card-title">${c?.nombre_completo || 'Campesino Sin Nombre'} &nbsp;•&nbsp; C.I.: ${c?.cedula || 'N/A'}</span>
              <span class="card-date">${formatDate(item.capturado_en)}</span>
            </div>
            
            <div class="card-metadata">
              <div><strong>Teléfono:</strong> ${c?.telefono || 'Sin registro'}</div>
              <div><strong>Correo:</strong> ${c?.email || 'Sin registro'}</div>
              <div><strong>Consejo Comunal:</strong> ${c?.consejo || 'Sin registro'}</div>
              <div><strong>Estado:</strong> ${c?.estado || 'Sin registro'}</div>
              <div><strong>Municipio:</strong> ${c?.municipio || 'Sin registro'}</div>
              <div><strong>Encuestador:</strong> ${e?.nombre_completo || 'Sistema'}</div>
            </div>

            <table class="card-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Pregunta del Formulario</th>
                  <th style="width: 50%;">Respuesta Capturada</th>
                </tr>
              </thead>
              <tbody>
                ${answersRows}
              </tbody>
            </table>
          </div>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Reporte Integral de Respuestas - ${formulario.titulo}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; color: #1e293b; font-size: 10px; }
            .header-banner { border-bottom: 3px solid #166534; padding-bottom: 8px; margin-bottom: 12px; }
            .main-title { font-size: 18px; font-weight: 800; color: #166534; margin: 0; }
            .sub-title { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 600; }
            
            .stats-bar {
              background-color: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #14532d;
              font-weight: 600;
            }

            .section-title {
              font-size: 12px;
              font-weight: 800;
              color: #166534;
              margin-top: 14px;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            table.summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 9px;
            }
            table.summary-table th {
              background-color: #166534;
              color: #ffffff;
              padding: 6px 8px;
              text-align: left;
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
            }
            table.summary-table td {
              padding: 5px 8px;
              border-bottom: 1px solid #cbd5e1;
            }
            .bg-even { background-color: #ffffff; }
            .bg-odd { background-color: #f8fafc; }

            .submission-card {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              margin-bottom: 16px;
              page-break-inside: avoid;
              background-color: #ffffff;
              overflow: hidden;
            }

            .card-header {
              background-color: #1e293b;
              color: #ffffff;
              padding: 8px 12px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .card-num {
              background-color: #166534;
              color: #ffffff;
              font-weight: 800;
              padding: 2px 7px;
              border-radius: 4px;
              margin-right: 8px;
              font-size: 10px;
            }
            .card-title {
              font-size: 12px;
              font-weight: 800;
              flex: 1;
            }
            .card-date {
              font-size: 9px;
              color: #94a3b8;
            }

            .card-metadata {
              background-color: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
              padding: 8px 12px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 4px 12px;
              font-size: 9px;
              color: #334155;
            }

            table.card-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9.5px;
            }
            table.card-table th {
              background-color: #f1f5f9;
              color: #334155;
              padding: 6px 12px;
              text-align: left;
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              border-bottom: 1px solid #cbd5e1;
            }
            table.card-table td {
              padding: 6px 12px;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: top;
            }
            table.card-table tr:last-child td {
              border-bottom: none;
            }
            .q-label {
              font-weight: 600;
              color: #1e293b;
            }
            .a-val {
              font-weight: 700;
              color: #166534;
            }

            .footer {
              margin-top: 18px;
              text-align: center;
              font-size: 8px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1 class="main-title">Producir es vencer FUNCN - Reporte Integral de Respuestas</h1>
            <div class="sub-title">Formulario: ${formulario.titulo} &nbsp;|&nbsp; Versión: v${formulario.version || 1}</div>
          </div>

          <div class="stats-bar">
            <span><strong>Total de Respuestas:</strong> ${respuestas.length}</span>
            <span><strong>Total de Preguntas:</strong> ${questions.length}</span>
            <span><strong>Fecha de Generación:</strong> ${generatedAt}</span>
          </div>

          <div class="section-title">1. Resumen de Campesinos Registrados</div>
          <table class="summary-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">N°</th>
                <th>Cédula</th>
                <th>Nombre del Campesino</th>
                <th>Consejo Comunal</th>
                <th>Estado</th>
                <th>Municipio</th>
                <th>Encuestador</th>
                <th>Fecha de Registro</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRowsHtml}
            </tbody>
          </table>

          <div class="section-title" style="page-break-before: auto;">2. Respuestas Detalladas por Registro</div>
          ${cardsHtml}

          <div class="footer">
            Reporte emitido automáticamente desde el Sistema Producir es vencer FUNCN.
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Descargar Reporte Completo PDF (${formulario.titulo})`,
      });
    }

    Alert.alert('Éxito', 'Reporte PDF descargado con éxito.');
  } catch (error: any) {
    Alert.alert('Error al exportar PDF', error?.message || 'No se pudo generar el documento PDF.');
  }
}

export async function exportAllFormResponsesToExcel(data: FormularioRespuestasCompletasResponse) {
  try {
    if (!data.respuestas || data.respuestas.length === 0) {
      Alert.alert('Exportar Excel', 'El formulario seleccionado no tiene respuestas registradas para exportar.');
      return;
    }

    const { formulario, respuestas } = data;
    const questions = (formulario.preguntas || []).filter((q) => !q.label.match(/^Pregunta \d{10,}/i));

    const generatedAt = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // CSV Header block with BOM for UTF-8 Excel support
    let csv = '\uFEFF';
    csv += `"REPORTE GENERAL DE RESPUESTAS POR FORMULARIO"\n`;
    csv += `"Formulario:";${escapeCsvField(formulario.titulo)}\n`;
    csv += `"Versión:";"v${formulario.version || 1}"\n`;
    csv += `"Total de Respuestas:";"${respuestas.length}"\n`;
    csv += `"Total de Preguntas:";"${questions.length}"\n`;
    csv += `"Fecha de Emisión:";"${generatedAt}"\n\n`;

    // Static columns header
    const staticHeaders = [
      'N°',
      'Fecha de Captura',
      'Cédula Campesino',
      'Nombre del Campesino',
      'Teléfono',
      'Correo Electrónico',
      'Consejo Comunal',
      'Estado',
      'Municipio',
      'Encuestador',
    ];

    // Dynamic question columns header
    const questionHeaders = questions.map((q) => q.label || q.id);
    const allHeaders = [...staticHeaders, ...questionHeaders];

    csv += allHeaders.map((h) => escapeCsvField(h)).join(';') + '\n';

    // Rows
    respuestas.forEach((item, idx) => {
      const c = item.campesino;
      const e = item.encuestador;

      const staticVals = [
        String(idx + 1),
        formatDate(item.capturado_en),
        c?.cedula || 'N/A',
        c?.nombre_completo || 'N/A',
        c?.telefono || 'Sin registro',
        c?.email || 'Sin registro',
        c?.consejo || 'N/A',
        c?.estado || 'N/A',
        c?.municipio || 'N/A',
        e?.nombre_completo || 'Sistema',
      ];

      const questionVals = questions.map((q) => {
        return item.valores_formateados[q.id] || '';
      });

      const fullRow = [...staticVals, ...questionVals];
      csv += fullRow.map((v) => escapeCsvField(v)).join(';') + '\n';
    });

    const safeTitle = (formulario.titulo || 'formulario')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 30);

    const fileName = `todas_respuestas_${safeTitle}_${Date.now()}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
        dialogTitle: `Descargar Reporte Completo Excel (${formulario.titulo})`,
      });
    }

    Alert.alert('Éxito', 'Reporte Excel descargado con éxito.');
  } catch (error: any) {
    Alert.alert('Error al exportar Excel', error?.message || 'No se pudo generar el archivo Excel.');
  }
}