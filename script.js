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
    const mesFilter = document.getElementById('mes-filter');
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeIcon = themeToggleButton.querySelector('i');
    
    if (document.documentElement.classList.contains('dark-mode')) {
        themeIcon.classList.replace('bi-moon-stars-fill', 'bi-sun-fill');
    }

    mesesOrdenados = [...new Set(fullData.map(lead => lead.mes))].sort((a, b) => ORDEM_DOS_MESES.indexOf(a) - ORDEM_DOS_MESES.indexOf(b));
    mesesOrdenados.forEach(mes => {
        mesFilter.innerHTML += `<option value="${mes}">${mes}</option>`;
    });
    
    createCharts();
    updateDashboard();
    
    mesFilter.addEventListener('change', updateDashboard);
    document.getElementById('print-button').addEventListener('click', () => {
        const mesSelecionado = mesFilter.options[mesFilter.selectedIndex].text;
        document.getElementById('print-title').innerText = 'Relatório de Análise de Leads';
        document.getElementById('print-subtitle').innerText = `Dados referentes ao período: ${mesSelecionado}`;
        window.print();
    });
    
    themeToggleButton.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark-mode');
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeIcon.classList.toggle('bi-moon-stars-fill', !isDarkMode);
        themeIcon.classList.toggle('bi-sun-fill', isDarkMode);
        updateChartTheme();
    });
}

function updateDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const selectedMonth = mesFilter.value;
    const currentData = (selectedMonth === 'todos') ? fullData : fullData.filter(lead => lead.mes === selectedMonth);
    const previousMonthIndex = mesesOrdenados.indexOf(selectedMonth) - 1;
    const previousMonth = (previousMonthIndex >= 0) ? mesesOrdenados[previousMonthIndex] : null;
    const previousData = previousMonth ? fullData.filter(lead => lead.mes === previousMonth) : [];
    const currentKPIs = calculateKPIs(currentData);
    const previousKPIs = calculateKPIs(previousData);
    displayKPIs(currentKPIs, previousKPIs);
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

function calculateKPIs(data) {
    if (!data || data.length === 0) return { total: 0, qualificados: 0, vendas: 0, desqualificados: 0, faturamento: 0 };
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
    updateDelta('delta-total-leads', current.total, previous.total);
    updateDelta('delta-leads-qualificados', current.qualificados, previous.qualificados);
    updateDelta('delta-vendas-fechadas', current.vendas, previous.vendas);
    updateDelta('delta-leads-desqualificados', current.desqualificados, previous.desqualificados, true);
    updateDelta('delta-faturamento', current.faturamento, previous.faturamento);
}

function updateDelta(elementId, current, previous, invertColors = false) {
    const element = document.getElementById(elementId);
    if (previous === 0 || current === previous) {
        element.innerHTML = '<span>--%</span>';
        element.className = 'kpi-card-delta';
        return;
    }
    const delta = ((current - previous) / previous) * 100;
    const isPositive = delta >= 0;
    element.innerHTML = `<span>${isPositive ? '▲' : '▼'}</span> ${Math.abs(delta).toFixed(1)}%`;
    let isGood = isPositive;
    if (invertColors) isGood = !isPositive;
    element.className = 'kpi-card-delta';
    element.classList.add(isGood ? 'positive' : 'negative');
}

function createCharts() {
    charts.origem = createChart('grafico-origem', 'doughnut');
    charts.segmento = createChart('grafico-segmento', 'bar');
    charts.crm = createChart('grafico-crm', 'pie');
    charts.delegados = createChart('grafico-delegados', 'bar');
    updateChartTheme();
}

function updateChartTheme() {
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#9CA3AF' : '#64748B';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const borderColor = isDarkMode ? '#1F2937' : '#FFFFFF';
    Chart.defaults.color = textColor;
    for (const chartName in charts) {
        const chart = charts[chartName];
        if (chart && chart.options) {
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            if (chart.options.scales && chart.options.scales.y) {
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
            }
            if (chart.options.scales && chart.options.scales.x) {
                chart.options.scales.x.ticks.color = textColor;
            }
            if (chart.data && chart.data.datasets) {
                chart.data.datasets.forEach(dataset => { dataset.borderColor = borderColor; });
            }
            chart.update();
        }
    }
}

function createChart(canvasId, type) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: type,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: type.includes('pie') || type.includes('doughnut') ? 'right' : 'none' } },
            scales: type === 'bar' ? { y: { grid: {} }, x: { grid: { color: 'transparent' } } } : {}
        }
    });
}

function updateChartData(chart, data, property) {
    let counts;
    if (chart.canvas.id === 'grafico-crm') {
        counts = { 'RD': 0, 'Outros': 0 };
        data.forEach(item => {
            if (item[property] === 'RD') counts['RD']++;
            else counts['Outros']++;
        });
    } else {
        counts = data.reduce((acc, item) => {
            const key = item[property] || 'Não preenchido';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
    chart.data.labels = Object.keys(counts);
    chart.data.datasets = [{
        data: Object.values(counts),
        backgroundColor: [ '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6EE7B7' ],
    }];
    chart.update();
}

fetchData();
