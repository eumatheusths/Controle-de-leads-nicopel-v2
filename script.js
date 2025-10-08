// --- CONFIGURAÇÕES E MAPEAMENTO DE COLUNAS ---
// Se suas colunas estiverem em posições diferentes, ajuste os números aqui.
// A=0, B=1, C=2, etc.
const COLUMNS = {
    ORIGEM: 1,      // Coluna B
    STATUS: 4,      // Coluna E
    VALOR: 5,       // Coluna F
    SEGMENTO: 6,    // Coluna G
    DELEGADO: 7     // Coluna H
};

// --- VARIÁVEIS GLOBAIS ---
let fullData = [];
let charts = {}; // Objeto para armazenar as instâncias dos gráficos

// --- FUNÇÃO PRINCIPAL PARA BUSCAR DADOS ---
async function fetchData() {
    try {
        const response = await fetch('/api/getData');
        if (!response.ok) throw new Error(`Erro do servidor: ${response.statusText}`);
        const result = await response.json();
        
        // Processa os dados brutos para um formato mais fácil de usar
        let processedData = [];
        result.data.forEach((sheet, index) => {
            const sheetName = sheet.range.split('!')[0].replace(/'/g, ''); // Pega o nome da aba
            if (sheet.values && sheet.values.length > 1) {
                const headers = sheet.values[0]; // Pega a primeira linha como cabeçalho
                const sheetRows = sheet.values.slice(1).map(row => {
                    let lead = { mes: sheetName };
                    headers.forEach((header, i) => {
                        lead[header.toLowerCase().replace(/ /g, '_')] = row[i];
                    });
                    return lead;
                });
                processedData.push(...sheetRows);
            }
        });
        
        fullData = processedData;
        
        // Esconde a mensagem de loading e mostra o dashboard
        document.getElementById('loading-message').style.display = 'none';
        document.getElementById('dashboard-body').style.display = 'block';

        // Inicia a renderização
        initializeDashboard();

    } catch (error) {
        console.error("FALHA NA CONEXÃO:", error);
        document.getElementById('loading-message').innerText = `Falha na conexão: ${error.message}`;
    }
}

// --- FUNÇÃO PARA INICIAR E ATUALIZAR O DASHBOARD ---
function initializeDashboard() {
    // Popula o filtro de mês
    const mesFilter = document.getElementById('mes-filter');
    const meses = [...new Set(fullData.map(lead => lead.mes))];
    meses.forEach(mes => {
        mesFilter.innerHTML += `<option value="${mes}">${mes}</option>`;
    });
    
    // Cria os gráficos
    createCharts();

    // Renderiza o dashboard com "Todos" os meses selecionados
    updateDashboard();

    // Adiciona o event listener para o filtro de mês
    mesFilter.addEventListener('change', updateDashboard);
}

function updateDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const selectedMonth = mesFilter.value;
    const filteredData = (selectedMonth === 'todos') 
        ? fullData 
        : fullData.filter(lead => lead.mes === selectedMonth);

    // Atualiza os Títulos
    const monthTitle = selectedMonth === 'todos' ? '' : ` - ${selectedMonth}`;
    document.getElementById('origem-title').innerText = `Origem dos Leads${monthTitle}`;
    document.getElementById('segmento-title').innerText = `Análise por Segmento${monthTitle}`;
    document.getElementById('crm-title').innerText = `CRM vs. Outros${monthTitle}`;
    document.getElementById('delegados-title').innerText = `Distribuição de Leads Delegados${monthTitle}`;

    // Calcula e exibe os KPIs
    const totalLeads = filteredData.length;
    const leadsQualificados = filteredData.filter(l => l.status === 'Qualificado').length;
    const vendasFechadas = filteredData.filter(l => l.status === 'Venda Fechada').length;
    const leadsDesqualificados = filteredData.filter(l => l.status === 'Desqualificado').length;
    const faturamento = filteredData
        .filter(l => l.status === 'Venda Fechada' && l.valor)
        .reduce((sum, l) => sum + parseFloat(String(l.valor).replace('R$', '').replace('.', '').replace(',', '.').trim()), 0);

    document.getElementById('kpi-total-leads').innerText = totalLeads;
    document.getElementById('kpi-leads-qualificados').innerText = leadsQualificados;
    document.getElementById('kpi-vendas-fechadas').innerText = vendasFechadas;
    document.getElementById('kpi-leads-desqualificados').innerText = leadsDesqualificados;
    document.getElementById('kpi-faturamento').innerText = faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Atualiza os dados dos gráficos
    updateChartData(charts.origem, filteredData, 'onde_encontrou', 'doughnut');
    updateChartData(charts.segmento, filteredData, 'segmento', 'bar');
    updateChartData(charts.crm, filteredData, 'origem', 'pie');
    updateChartData(charts.delegados, filteredData, 'delegado_para', 'bar');
}

// --- FUNÇÕES DOS GRÁFICOS (CHART.JS) ---
function createCharts() {
    charts.origem = createChart('grafico-origem', 'doughnut');
    charts.segmento = createChart('grafico-segmento', 'bar');
    charts.crm = createChart('grafico-crm', 'pie');
    charts.delegados = createChart('grafico-delegados', 'bar');
}

function createChart(canvasId, type) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: type,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: type === 'bar' ? 'none' : 'right',
                    labels: { color: 'white' }
                }
            },
            scales: type === 'bar' ? {
                y: { ticks: { color: 'white' } },
                x: { ticks: { color: 'white' } }
            } : {}
        }
    });
}

function updateChartData(chart, data, property, type) {
    const counts = data.reduce((acc, item) => {
        const key = item[property] || 'Não preenchido';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    // Para o gráfico de CRM, agrupa tudo que não é 'RD' em 'Outros'
    if (chart.canvas.id === 'grafico-crm') {
        const crmCounts = { 'RD': 0, 'Outros': 0 };
        for (const key in counts) {
            if (key === 'RD') {
                crmCounts['RD'] += counts[key];
            } else {
                crmCounts['Outros'] += counts[key];
            }
        }
        chart.data.labels = Object.keys(crmCounts);
        chart.data.datasets[0].data = Object.values(crmCounts);
    } else {
        chart.data.labels = Object.keys(counts);
        chart.data.datasets[0].data = Object.values(counts);
    }
    
    chart.data.datasets[0].backgroundColor = [
        '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
        '#3B82F6', '#8B5CF6', '#EC4899', '#6EE7B7'
    ];
    chart.update();
}

// --- INICIA O PROCESSO ---
fetchData();
