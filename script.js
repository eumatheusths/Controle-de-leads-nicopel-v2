// =================================================================================
// ÁREA DE CONFIGURAÇÃO PRINCIPAL - AJUSTE AQUI SE OS NOMES DAS SUAS COLUNAS MUDAREM
// =================================================================================
// Escreva EXATAMENTE como está no cabeçalho da sua planilha.
const MAPEAMENTO_DE_COLUNAS = {
    origem: 'Onde nos encontrou?',
    qualificado: 'Qualificado',
    vendaFechada: 'Venda fechada?',
    valor: 'Valor do pedido',
    segmento: 'Seguimento',
    delegado: 'Delegado para',
    rd_crm: 'RD CRM' // Adicionado para o gráfico CRM vs. Outros
};
// =================================================================================


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
                
                const rows = sheetRows.map(row => {
                    let leadData = { mes: sheetName };
                    headers.forEach((header, i) => {
                        leadData[header] = row[i];
                    });
                    return leadData;
                });
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

// --- FUNÇÃO PARA INICIAR E ATUALIZAR O DASHBOARD ---
function initializeDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const meses = [...new Set(fullData.map(lead => lead.mes))];
    meses.forEach(mes => {
        mesFilter.innerHTML += `<option value="${mes}">${mes}</option>`;
    });
    
    createCharts();
    updateDashboard();
    mesFilter.addEventListener('change', updateDashboard);
}

function updateDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const selectedMonth = mesFilter.value;
    const filteredData = (selectedMonth === 'todos') 
        ? fullData 
        : fullData.filter(lead => lead.mes === selectedMonth);

    const monthTitle = selectedMonth === 'todos' ? '' : ` - ${selectedMonth}`;
    document.getElementById('origem-title').innerText = `Origem dos Leads${monthTitle}`;
    document.getElementById('segmento-title').innerText = `Análise por Segmento${monthTitle}`;
    document.getElementById('crm-title').innerText = `CRM vs. Outros${monthTitle}`;
    document.getElementById('delegados-title').innerText = `Distribuição de Leads Delegados${monthTitle}`;

    // Lógica para derivar o Status a partir de várias colunas
    filteredData.forEach(lead => {
        if (lead[MAPEAMENTO_DE_COLUNAS.vendaFechada]?.toUpperCase() === 'SIM') {
            lead.statusCalculado = 'Venda Fechada';
        } else if (lead[MAPEAMENTO_DE_COLUNAS.qualificado]?.toUpperCase() === 'SIM') {
            lead.statusCalculado = 'Qualificado';
        } else if (lead[MAPEAMENTO_DE_COLUNAS.qualificado]?.toUpperCase() === 'NÃO') {
            lead.statusCalculado = 'Desqualificado';
        } else {
            lead.statusCalculado = 'Em Negociação';
        }
    });

    const totalLeads = filteredData.length;
    const leadsQualificados = filteredData.filter(l => l.statusCalculado === 'Qualificado').length;
    const vendasFechadas = filteredData.filter(l => l.statusCalculado === 'Venda Fechada').length;
    const leadsDesqualificados = filteredData.filter(l => l.statusCalculado === 'Desqualificado').length;
    const faturamento = filteredData
        .filter(l => l.statusCalculado === 'Venda Fechada' && l[MAPEAMENTO_DE_COLUNAS.valor])
        .reduce((sum, l) => sum + parseFloat(String(l[MAPEAMENTO_DE_COLUNAS.valor]).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()), 0);

    document.getElementById('kpi-total-leads').innerText = totalLeads;
    document.getElementById('kpi-leads-qualificados').innerText = leadsQualificados;
    document.getElementById('kpi-vendas-fechadas').innerText = vendasFechadas;
    document.getElementById('kpi-leads-desqualificados').innerText = leadsDesqualificados;
    document.getElementById('kpi-faturamento').innerText = faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    document.getElementById('delta-total-leads').innerText = '--%';
    document.getElementById('delta-leads-qualificados').innerText = '--%';
    document.getElementById('delta-vendas-fechadas').innerText = '--%';
    document.getElementById('delta-leads-desqualificados').innerText = '--%';
    document.getElementById('delta-faturamento').innerText = '--%';

    updateChartData(charts.origem, filteredData, MAPEAMENTO_DE_COLUNAS.origem);
    updateChartData(charts.segmento, filteredData, MAPEAMENTO_DE_COLUNAS.segmento);
    updateChartData(charts.crm, filteredData, MAPEAMENTO_DE_COLUNAS.rd_crm);
    updateChartData(charts.delegados, filteredData, MAPEAMENTO_DE_COLUNAS.delegado);
}

// --- FUNÇÕES DOS GRÁFICOS (CHART.JS) ---
function createCharts() {
    const textColor = '#9CA3AF';
    Chart.defaults.color = textColor;
    charts.origem = createChart('grafico-origem', 'doughnut', textColor);
    charts.segmento = createChart('grafico-segmento', 'bar', textColor);
    charts.crm = createChart('grafico-crm', 'pie', textColor);
    charts.delegados = createChart('grafico-delegados', 'bar', textColor);
}

function createChart(canvasId, type, textColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: type,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: type.includes('pie') || type.includes('doughnut') ? 'right' : 'none',
                    labels: { color: textColor }
                }
            },
            scales: type === 'bar' ? {
                y: { ticks: { color: textColor }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                x: { ticks: { color: textColor }, grid: { color: 'transparent' } }
            } : {}
        }
    });
}

function updateChartData(chart, data, property) {
    const counts = data.reduce((acc, item) => {
        const key = item[property] || 'Não preenchido';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    // A lógica do gráfico 'CRM vs. Outros' já usa a propriedade correta, não precisa de IF especial
    chart.data.labels = Object.keys(counts);
    chart.data.datasets[0].data = Object.values(counts);
    
    chart.data.datasets[0].backgroundColor = [ '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6EE7B7' ];
    chart.data.datasets[0].borderColor = '#1F2937';
    chart.update();
}

// --- INICIA O PROCESSO ---
fetchData();
