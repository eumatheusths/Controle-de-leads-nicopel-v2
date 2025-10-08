// --- VARIÁVEIS GLOBAIS ---
let fullData = [];
let charts = {};
let mesesOrdenados = [];

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
                    rd_crm: headers.indexOf('RD CRM')
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
                        rd_crm: row[colIndex.rd_crm]
                    };
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

function initializeDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    mesesOrdenados = [...new Set(fullData.map(lead => lead.mes))].sort(); // Guarda os meses em ordem
    mesesOrdenados.forEach(mes => {
        mesFilter.innerHTML += `<option value="${mes}">${mes}</option>`;
    });
    
    createCharts();
    updateDashboard();
    
    mesFilter.addEventListener('change', updateDashboard);
    document.getElementById('print-button').addEventListener('click', () => window.print());
}

// --- LÓGICA DE ATUALIZAÇÃO ---
function updateDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const selectedMonth = mesFilter.value;
    
    // Filtra dados para o mês atual
    const currentData = (selectedMonth === 'todos') ? fullData : fullData.filter(lead => lead.mes === selectedMonth);

    // Encontra o mês anterior para comparação
    const previousMonthIndex = mesesOrdenados.indexOf(selectedMonth) - 1;
    const previousMonth = (previousMonthIndex >= 0) ? mesesOrdenados[previousMonthIndex] : null;
    const previousData = previousMonth ? fullData.filter(lead => lead.mes === previousMonth) : [];

    // Calcula KPIs para o período atual e anterior
    const currentKPIs = calculateKPIs(currentData);
    const previousKPIs = calculateKPIs(previousData);

    // Exibe os KPIs e os deltas
    displayKPIs(currentKPIs, previousKPIs);

    // Atualiza os títulos e gráficos
    const monthTitle = selectedMonth === 'todos' ? 'Geral' : selectedMonth;
    document.getElementById('origem-title').innerText = `Origem dos Leads - ${monthTitle}`;
    document.getElementById('segmento-title').innerText = `Análise por Segmento - ${monthTitle}`;
    document.getElementById('crm-title').innerText = `CRM vs. Outros - ${monthTitle}`;
    document.getElementById('delegados-title').innerText = `Distribuição por Responsável - ${monthTitle}`;
    
    updateChartData(charts.origem, currentData, 'origem');
    updateChartData(charts.segmento, currentData, 'segmento');
    updateChartData(charts.crm, currentData, 'rd_crm');
    updateChartData(charts.delegados, currentData, 'delegado');
}

// --- FUNÇÕES DE CÁLCULO E EXIBIÇÃO ---
function calculateKPIs(data) {
    if (!data || data.length === 0) {
        return { total: 0, qualificados: 0, vendas: 0, desqualificados: 0, faturamento: 0 };
    }
    const vendasFechadas = data.filter(l => l.status === 'Venda Fechada');
    return {
        total: data.length,
        qualificados: data.filter(l => l.status === 'Qualificado').length,
        vendas: vendasFechadas.length,
        desqualificados: data.filter(l => l.status === 'Desqualificado').length,
        faturamento: vendasFechadas.reduce((sum, l) => sum + l.valor, 0)
    };
}

function displayKPIs(current, previous) {
    document.getElementById('kpi-total-leads').innerText = current.total;
    document.getElementById('kpi-leads-qualificados').innerText = current.qualificados;
    document.getElementById('kpi-vendas-fechadas').innerText = current.vendas;
    document.getElementById('kpi-leads-desqualificados').innerText = current.desqualificados;
    document.getElementById('kpi-faturamento').innerText = current.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Calcula e exibe os deltas
    updateDelta('delta-total-leads', current.total, previous.total);
    updateDelta('delta-leads-qualificados', current.qualificados, previous.qualificados);
    updateDelta('delta-vendas-fechadas', current.vendas, previous.vendas);
    updateDelta('delta-leads-desqualificados', current.desqualificados, previous.desqualificados, true); // Inverte a lógica para desqualificados
    updateDelta('delta-faturamento', current.faturamento, previous.faturamento);
}

function updateDelta(elementId, current, previous, invertColors = false) {
    const element = document.getElementById(elementId);
    if (previous === 0) {
        element.innerHTML = '<span>--%</span>';
        element.className = 'kpi-card-delta';
        return;
    }
    
    const delta = ((current - previous) / previous) * 100;
    const isPositive = delta >= 0;
    
    element.innerHTML = `<span>${isPositive ? '▲' : '▼'}</span> ${Math.abs(delta).toFixed(1)}%`;
    
    // Lógica de cores: verde se for bom, vermelho se for ruim
    let isGood = isPositive;
    if (invertColors) isGood = !isPositive; // Para "desqualificados", menos é melhor

    element.className = 'kpi-card-delta'; // Limpa classes antigas
    element.classList.add(isGood ? 'positive' : 'negative');
}

// --- FUNÇÕES DOS GRÁFICOS ---
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
                legend: { position: type.includes('pie') || type.includes('doughnut') ? 'right' : 'none', labels: { color: textColor } }
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

    chart.data.labels = Object.keys(counts);
    chart.data.datasets = [{
        data: Object.values(counts),
        backgroundColor: [ '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6EE7B7' ],
        borderColor: '#1F2937',
    }];
    chart.update();
}

// --- INICIA O PROCESSO ---
fetchData();
