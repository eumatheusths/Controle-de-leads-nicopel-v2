// --- VARIÁVEIS GLOBAIS ---
let fullData = [];
let charts = {};
let mesesOrdenados = [];
const ORDEM_DOS_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- FUNÇÃO PRINCIPAL ---
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
                
                const colIndex = {
                    origem: headers.indexOf('Onde nos encontrou?'),
                    qualificado: headers.indexOf('Qualificado'),
                    vendaFechada: headers.indexOf('Venda fechada?'),
                    valor: headers.indexOf('Valor do pedido'),
                    segmento: headers.indexOf('Seguimento'),
                    delegado: headers.indexOf('Delegado para'),
                    rd_crm: headers.indexOf('RD CRM'),
                    motivoNao: headers.indexOf('Motivo caso (NÂO)') // Coluna para o novo card
                };

                const rows = sheetRows.map(row => {
                    let status = 'Em Negociação';
                    if (row[colIndex.vendaFechada]?.toUpperCase() === 'SIM') status = 'Venda Fechada';
                    else if (row[colIndex.qualificado]?.toUpperCase() === 'SIM') status = 'Qualificado';
                    else if (row[colIndex.qualificado]?.toUpperCase() === 'NÃO') status = 'Desqualificado';
                    const valorStr = row[colIndex.valor] || '0';
                    const valorNum = parseFloat(valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
                    return {
                        mes: sheetName,
                        origem: row[colIndex.origem],
                        status: status,
                        valor: valorNum,
                        segmento: row[colIndex.segmento],
                        delegado: row[colIndex.delegado],
                        rd_crm: row[colIndex.rd_crm],
                        motivoNao: row[colIndex.motivoNao]
                    };
                }).filter(r => r.origem || r.segmento);
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
    // ... (função igual à anterior)
}

function updateDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const selectedMonth = mesFilter.value;
    const currentData = (selectedMonth === 'todos') ? fullData : fullData.filter(lead => lead.mes === selectedMonth);
    
    // ... (cálculo de mês anterior e KPIs igual à anterior)

    // Atualiza os títulos
    const monthTitle = selectedMonth === 'todos' ? 'Geral' : selectedMonth;
    // ... (atualização dos outros títulos igual à anterior)
    document.getElementById('motivos-title').innerText = `Top 5 Motivos de Perda - ${monthTitle}`;
    
    // Atualiza os gráficos
    updateChartData(charts.origem, currentData, 'origem');
    // ... (atualização dos outros gráficos igual à anterior)

    // NOVO: Chama a função para renderizar o novo card
    renderTopMotivos(currentData);
}

// ... (funções calculateKPIs, displayKPIs, updateDelta, createCharts, updateChartTheme, createChart, updateChartData continuam iguais)

// NOVA FUNÇÃO para renderizar o card de Top 5 Motivos
function renderTopMotivos(data) {
    const container = document.getElementById('top-motivos-container');
    container.innerHTML = ''; // Limpa o conteúdo anterior

    // Filtra apenas leads que não fecharam e têm um motivo preenchido
    const motivos = data
        .filter(lead => lead.status === 'Desqualificado' && lead.motivoNao)
        .reduce((acc, lead) => {
            const motivo = lead.motivoNao.trim();
            acc[motivo] = (acc[motivo] || 0) + 1;
            return acc;
        }, {});

    // Ordena os motivos por contagem e pega os 5 primeiros
    const topMotivos = Object.entries(motivos)
        .sort(([,a],[,b]) => b - a)
        .slice(0, 5);

    if (topMotivos.length === 0) {
        container.innerHTML = '<p style="color: var(--cor-texto-secundario);">Nenhum motivo de perda registrado para este período.</p>';
        return;
    }

    const list = document.createElement('ol');
    topMotivos.forEach(([motivo, count]) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${motivo} (${count} vezes)`;
        list.appendChild(listItem);
    });
    container.appendChild(list);
}

// --- INICIA O PROCESSO ---
fetchData();
