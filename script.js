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
    const mesFilter = document.getElementById('mes-filter');
    const themeToggleButton = document.getElementById('theme-toggle');
    const printButton = document.getElementById('print-button');
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
    themeToggleButton.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark-mode');
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeIcon.classList.toggle('bi-moon-stars-fill', !isDarkMode);
        themeIcon.classList.toggle('bi-sun-fill', isDarkMode);
        updateChartTheme();
    });
    printButton.addEventListener('click', () => {
        const selectedMonth = mesFilter.value;
        const currentData = (selectedMonth === 'todos') ? fullData : fullData.filter(lead => lead.mes === selectedMonth);
        const selectedMonthText = mesFilter.options[mesFilter.selectedIndex].text;
        generateAndPrintReport(currentData, selectedMonthText);
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
    document.getElementById('crm-title').innerText = `Análise de Origem (CRM) - ${monthTitle}`;
    document.getElementById('delegados-title').innerText = `Vendedor Delegado - ${monthTitle}`;
    document.getElementById('motivos-title').innerText = `Top 5 Motivos de Perda - ${monthTitle}`;
    updateChartData(charts.origem, currentData, 'origem_geral');
    updateChartData(charts.segmento, currentData, 'segmento');
    updateChartData(charts.crm, currentData, 'origem_crm');
    updateChartData(charts.delegados, currentData, 'delegado');
    renderTopMotivos(currentData);
}

function calculateKPIs(data) {
    if (!data) return { total: 0, organicos: 0, qualificados: 0, vendas: 0, desqualificados: 0, faturamento: 0 };
    const normalizeText = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : '';
    const vendasFechadas = data.filter(l => l.status === 'Venda Fechada');
    return {
        total: data.length,
        organicos: data.filter(l => normalizeText(l.origem_crm) === 'ORGANICO').length,
        qualificados: data.filter(l => l.status === 'Qualificado').length,
        vendas: vendasFechadas.length,
        desqualificados: data.filter(l => l.status === 'Desqualificado').length,
        faturamento: vendasFechadas.reduce((sum, l) => sum + l.valor, 0)
    };
}

function displayKPIs(current, previous) {
    document.getElementById('kpi-total-leads').innerText = current.total;
    document.getElementById('kpi-leads-organicos').innerText = current.organicos;
    document.getElementById('kpi-leads-qualificados').innerText = current.qualificados;
    document.getElementById('kpi-vendas-fechadas').innerText = current.vendas;
    document.getElementById('kpi-leads-desqualificados').innerText = current.desqualificados;
    document.getElementById('kpi-faturamento').innerText = current.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    updateDelta('delta-total-leads', current.total, previous.total);
    updateDelta('delta-leads-organicos', current.organicos, previous.organicos);
    updateDelta('delta-leads-qualificados', current.qualificados, previous.qualificados);
    updateDelta('delta-vendas-fechadas', current.vendas, previous.vendas);
    updateDelta('delta-leads-desqualificados', current.desqualificados, previous.desqualificados, true);
    updateDelta('delta-faturamento', current.faturamento, previous.faturamento);
}

function updateDelta(elementId, current, previous, invertColors = false) {
    const element = document.getElementById(elementId);
    if (!previous || previous === 0 || current === previous) { element.innerHTML = '<span>--%</span>'; element.className = 'kpi-card-delta'; return; }
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
            if(chart.options.plugins && chart.options.plugins.legend) { chart.options.plugins.legend.labels.color = textColor; }
            if(chart.options.scales && chart.options.scales.y) { chart.options.scales.y.ticks.color = textColor; chart.options.scales.y.grid.color = gridColor; }
            if(chart.options.scales && chart.options.scales.x) { chart.options.scales.x.ticks.color = textColor; }
            if(chart.data && chart.data.datasets) { chart.data.datasets.forEach(dataset => { dataset.borderColor = borderColor; }); }
            chart.update();
        }
    }
}

function createChart(canvasId, type) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) { console.error(`Canvas not found: ${canvasId}`); return null; }
    return new Chart(ctx.getContext('2d'), {
        type: type,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: type.includes('pie') || type.includes('doughnut') ? 'right' : 'none' } },
            scales: type === 'bar' ? { y: { grid: {} }, x: { grid: { color: 'transparent' } } } : {}
        }
    });
}

function updateChartData(chart, data, property) {
    if (!chart) return;
    const counts = data.reduce((acc, item) => {
        const key = item[property] || 'Não preenchido';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    chart.data.labels = Object.keys(counts);
    chart.data.datasets = [{ data: Object.values(counts), backgroundColor: ['#4F46E5','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#6EE7B7'] }];
    chart.update();
}

function renderTopMotivos(data) {
    const container = document.getElementById('top-motivos-container');
    container.innerHTML = ''; 
    const motivos = data.filter(lead => lead.status === 'Desqualificado' && lead.motivo_nao).reduce((acc, lead) => {
        const motivo = lead.motivo_nao.trim();
        acc[motivo] = (acc[motivo] || 0) + 1;
        return acc;
    }, {});
    const topMotivos = Object.entries(motivos).sort(([,a],[,b]) => b - a).slice(0, 5);
    if (topMotivos.length === 0) { container.innerHTML = '<p style="color: var(--cor-texto-secundario); padding-top: 20px; text-align: center;">Nenhum motivo de perda registrado.</p>'; return; }
    const list = document.createElement('ol');
    topMotivos.forEach(([motivo, count]) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${motivo} <span style="float: right; font-weight: bold;">${count}</span>`;
        list.appendChild(listItem);
    });
    container.appendChild(list);
}

function generateAndPrintReport(data, period) {
    const printArea = document.getElementById('print-area');
    const kpis = calculateKPIs(data);
    const createCardGrid = (title, items) => {
        if (Object.keys(items).length === 0) return '';
        let gridHTML = `<h2>${title}</h2><div class="print-grid">`;
        for (const [key, value] of Object.entries(items)) {
            gridHTML += `<div class="print-card"><div class="print-card-title">${key}</div><div class="print-card-value">${value}</div></div>`;
        }
        gridHTML += `</div>`;
        return gridHTML;
    };
    const kpiItems = { 'Total de Leads': kpis.total, 'Leads Orgânicos': kpis.organicos, 'Leads Qualificados': kpis.qualificados, 'Vendas Fechadas': kpis.vendas, 'Leads Desqualificados': kpis.desqualificados, 'Faturamento Total': kpis.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) };
    const origemCounts = data.reduce((acc, item) => { acc[item.origem_geral || 'N/A'] = (acc[item.origem_geral || 'N/A'] || 0) + 1; return acc; }, {});
    const segmentoCounts = data.reduce((acc, item) => { acc[item.segmento || 'N/A'] = (acc[item.segmento || 'N/A'] || 0) + 1; return acc; }, {});
    const delegadoCounts = data.reduce((acc, item) => { acc[item.delegado || 'N/A'] = (acc[item.delegado || 'N/A'] || 0) + 1; return acc; }, {});
    const topMotivos = data.filter(lead => lead.status === 'Desqualificado' && lead.motivo_nao).reduce((acc, lead) => {
        const motivo = lead.motivo_nao.trim();
        acc[motivo] = (acc[motivo] || 0) + 1;
        return acc;
    }, {});
    
    let reportHTML = `<h1>Relatório de Análise de Leads</h1><p>Dados referentes ao período: ${period}</p>
        ${createCardGrid('Resumo Geral (KPIs)', kpiItems)}
        ${createCardGrid('Origem dos Leads', origemCounts)}
        ${createCardGrid('Análise por Segmento', segmentoCounts)}
        ${createCardGrid('Distribuição por Responsável', delegadoCounts)}
        ${createCardGrid('Top 5 Motivos de Perda', topMotivos)}`;
    printArea.innerHTML = reportHTML;
    window.print();
}

fetchData();
