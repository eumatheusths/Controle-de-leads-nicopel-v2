// api/getPlanilhaData.js

export default async function handler(request, response) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SPREADSHEET_ID = '1liAOj2nkSiTZrPklpG8CD4OwvPtmeRdLD2vgCQw94hc';

  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
    const metaResponse = await fetch(metaUrl);
    if (!metaResponse.ok) {
      throw new Error(`Falha ao buscar metadados da planilha: ${metaResponse.statusText}`);
    }
    const spreadsheetMeta = await metaResponse.json();
    const sheetNames = spreadsheetMeta.sheets.map(sheet => sheet.properties.title);

    const dataRange = 'A1:Z';
    const dataPromises = sheetNames.map(name => {
      const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(name)}!${dataRange}?key=${API_KEY}`;
      return fetch(dataUrl).then(res => res.json());
    });
    const allSheetData = await Promise.all(dataPromises);

    response.status(200).json({ data: allSheetData });

  } catch (error) {
    console.error("Erro no backend da Planilha:", error);
    response.status(500).json({ error: 'Falha ao buscar dados da planilha.', details: error.message });
  }
}
