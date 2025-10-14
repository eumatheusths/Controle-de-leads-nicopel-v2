// =================================================================================
// ÁREA DE CONFIGURAÇÃO PRINCIPAL - AJUSTE AQUI SE OS NOMES DAS SUAS COLUNAS MUDAREM
// =================================================================================
const MAPEAMENTO_DE_COLUNAS = {
    origem_geral: 'Onde nos encontrou?',
    origem_crm: 'Origem',
    status_qualificado: 'Qualificado',
    status_venda: 'Venda fechada?',
    valor: 'Valor do pedido',
    segmento: 'Seguimento',
    delegado: 'Delegado para',
    motivo_nao: 'Motivo caso (NÂO)'
};
// =================================================================================

let fullData = [];
let charts = {};
let mesesOrdenados = [];
const ORDEM_DOS_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

async function fetchData() {
    try {
        const response = await fetch('/api/getData');
        if (!response.ok) throw new Error(`Erro do servidor: ${response.statusText}`);
        const result = await response.json();
        
        let processedData = [];
        result.data.forEach(sheet => {
            if (sheet.values && sheet.values.length > 1) {
                const sheetName = sheet.range.split('!')[0].replace(/'/g, '');
                const headers = sheet.values[0];
                const sheetRows = sheet.values.slice(1);
                
                const colIndex = {};
                for (const key in MAPEAMENTO_DE_COLUNAS) {
                    colIndex[key] = headers.indexOf(MAPEAMENTO_DE_COLUNAS[key]);
                }

                const rows = sheetRows.map(row => {
                    let status = 'Em Negociação';
                    if (row[colIndex.status_venda]?.toUpperCase() === 'SIM') status = 'Venda Fechada';
                    else if (row[colIndex.status_qualificado]?.toUpperCase() === 'SIM') status = 'Qualificado';
                    else if (row[colIndex.status_qualificado]?.toUpperCase() === 'NÃO') status = 'Desqualificado';
                    
                    const valorStr = row[colIndex.valor] || '0';
                    const valorNum = parseFloat(valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
                    
                    return {
                        mes: sheetName,
                        origem_geral: row[colIndex.origem_geral],
                        origem_crm: row[colIndex.origem_crm],
                        status: status,
                        valor: valorNum,
                        segmento: row[colIndex.segmento],
                        delegado: row[colIndex.delegado],
                        motivo_nao: row[colIndex.motivo_nao]
                    };
                }).filter(r => r.origem_geral || r.segmento);
                processedData.push(...rows);
            }
        });
        
        fullData = processedData;
        document.getElementById('loading-message').style.display = 'none';
        document.getElementById('dashboard-body').style.display = 'block';
        initializeDashboard();
    } catch (error) {
        console.error("FALHA NA CONEXÃO:", error);
        document.getElementById('loading-message').innerText = `Falha na conexão: ${error.message}`;
    }
}

function initializeDashboard() {
    // (O resto do código não precisa de alterações)
}
