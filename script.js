// --- VARIÁVEIS GLOBAIS ---
let fullData = [];
let charts = {};

// --- FUNÇÃO PRINCIPAL PARA BUSCAR DADOS ---
async function fetchData() {
    try {
        const response = await fetch('/api/getData');
        if (!response.ok) throw new Error(`Erro do servidor: ${response.statusText}`);
        const result = await response.json();
        
        // Processa os dados brutos, agora entendendo a estrutura específica da sua planilha
        let processedData = [];
        result.data.forEach(sheet => {
            if (sheet.values && sheet.values.length > 1) {
                const sheetName = sheet.range.split('!')[0].replace(/'/g, '');
                const headers = sheet.values[0];
                const sheetRows = sheet.values.slice(1);
                
                const colIndex = {
                    origem: headers.indexOf('Onde nos encontrou?'),
                    qualificado: headers.indexOf('Qualificado'),
                    vendaFechada: headers.indexOf('Venda fechada?'),
                    valor: headers.indexOf('Valor do pedido'),
                    segmento: headers.indexOf('Seguimento'),
                    delegado: headers.indexOf('Delegado para'),
                    motivoNao: headers.indexOf('Motivo caso (NÂO)')
                };

                const rows = sheetRows.map(row => {
                    // Lógica para derivar o Status a partir de várias colunas
                    let status = 'Em Negociação'; // Padrão
                    if (row[colIndex.vendaFechada]?.toUpperCase() === 'SIM') {
                        status = 'Venda Fechada';
                    } else if (row[colIndex.qualificado]?.toUpperCase() === 'SIM') {
                        status = 'Qualificado';
                    } else if (row[colIndex.qualificado]?.toUpperCase() === 'NÃO') {
                        status = 'Desqualificado';
                    }

                    return {
                        mes: sheetName,
                        origem: row[colIndex.origem],
                        status: status,
                        valor: row[colIndex.valor],
                        segmento: row[colIndex.segmento],
                        delegado: row[colIndex.delegado],
                    };
                });
                processedData.push(...rows);
            }
        });
        
        fullData =
