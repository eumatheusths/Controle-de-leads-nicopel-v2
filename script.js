// Constantes e configurações
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

const ORDEM_DOS_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CORES_GRAFICOS = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
    '#8B5CF6', '#EC4899', '#6EE7B7'
];

// Variáveis globais
let fullData = [];
let charts = {};
let mesesOrdenados = [];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

// Função principal para buscar dados
async function fetchData() {
    try {
        const response = await fetch('/api/getData');
        
        if (!response.ok) {
            throw new Error(`Erro do servidor: ${response.statusText}`);
        }
        
        const result = await response.json();
        fullData = processData(result.data);
        
        document.getElementById('loading-message').style.display = 'none';
        document.getElementById('dashboard-body').style.display = 'block';
        
        initializeDashboard();
    } catch (error) {
        console.error("FALHA NA CONEXÃO:", error);
        document.getElementById('loading-message').innerText = `Falha na conexão: ${error.message}`;
    }
}

// Processamento dos dados brutos
function processData(rawData) {
    const processedData = [];
    
    rawData.forEach(sheet => {
        if (!sheet.values || sheet.values.length <= 1) return;
        
        const sheetName = sheet.range.split('!')[0].replace(/'/g, '');
        const headers = sheet.values[0];
        const sheetRows = sheet.values.slice(1);
        
        // Cria índice das colunas
        const colIndex = {};
        for (const key in MAPEAMENTO_DE_COLUNAS) {
            colIndex[key] = headers.indexOf(MAPEAMENTO_DE_COLUNAS[key]);
        }
        
        // Processa cada linha
        const rows = sheetRows.map(row => {
            const status = determinarStatus(
                row[colIndex.status_venda],
                row[colIndex.status_qualificado]
            );
            
            const valorNum = parseValorMonetario(row[colIndex.valor]);
            
            // Determina a categoria do lead (baseado apenas na coluna C - origem_crm)
            const categoria = determinarCategoriaOrigemCRM(row[colIndex.origem_crm]);
            
            return {
                mes: sheetName,
                origem_geral: row[colIndex.origem_geral],
                origem_crm: row[colIndex.origem_crm],
                status: status,
                valor: valorNum,
                segmento: row[colIndex.segmento],
                delegado: row[colIndex.delegado],
                motivo_nao: row[colIndex.motivo_nao],
                categoria: categoria
            };
        }).filter(r => r.origem_geral || r.segmento || r.origem_crm);
        
        processedData.push(...rows);
    });
    
    return processedData;
}

// Determina o status do lead
function determinarStatus(statusVenda, statusQualificado) {
    const venda = String(statusVenda || '').toUpperCase().trim();
    const qualificado = String(statusQualificado || '').toUpperCase().trim();
    
    if (venda === 'SIM') return 'Venda Fechada';
    if (qualificado === 'SIM') return 'Qualificado';
    if (qualificado === 'NÃO' || qualificado === 'NAO') return 'Desqualificado';
    
    return 'Em Negociação';
}

// Determina a categoria do lead baseado APENAS na coluna C (origem_crm)
function determinarCategoriaOrigemCRM(origemCRM) {
    const normalize = (str) => str 
        ? str.toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase()
        : '';
    
    const origemCRMNormalized = normalize(origemCRM);
    const termosOrganicos = ['ORGANICO', 'ORGÂNICO', 'ORGANICOS', 'ORGÂNICOS'];
    
    if (termosOrganicos.some(termo => origemCRMNormalized === termo)) {
        return 'Orgânico';
    }
    
    return 'Anúncio';
}

// Parse de valores monetários
function parseValorMonetario(valorStr) {
    if (!valorStr) return 0;
    
    const valorLimpo = valorStr
        .toString()
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    
    const valorNum = parseFloat(valorLimpo);
    return isNaN(valorNum) ? 0 : valorNum;
}

// Inicialização do dashboard
function initializeDashboard() {
    setupEventListeners();
    populateMonthFilter();
    createCharts();
    updateDashboard();
}

// Configuração dos event listeners
function setupEventListeners() {
    const mesFilter = document.getElementById('mes-filter');
    const themeToggleButton = document.getElementById('theme-toggle');
    const printButton = document.getElementById('print-button');
    
    mesFilter.addEventListener('change', updateDashboard);
    
    themeToggleButton.addEventListener('click', toggleTheme);
    
    printButton.addEventListener('click', () => {
        const selectedMonth = mesFilter.value;
        const currentData = (selectedMonth === 'todos') 
            ? fullData 
            : fullData.filter(lead => lead.mes === selectedMonth);
        const selectedMonthText = mesFilter.options[mesFilter.selectedIndex].text;
        
        generateAndPrintReport(currentData, selectedMonthText);
    });
}

// Preenchimento do filtro de meses
function populateMonthFilter() {
    const mesFilter = document.getElementById('mes-filter');
    
    mesesOrdenados = [...new Set(fullData.map(lead => lead.mes))]
        .sort((a, b) => ORDEM_DOS_MESES.indexOf(a) - ORDEM_DOS_MESES.indexOf(b));
    
    mesesOrdenados.forEach(mes => {
        mesFilter.innerHTML += `<option value="${mes}">${mes}</option>`;
    });
}

// Alternância de tema
function toggleTheme() {
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeIcon = themeToggleButton.querySelector('i');
    
    document.documentElement.classList.toggle('dark-mode');
    
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    themeIcon.classList.toggle('bi-moon-stars-fill', !isDarkMode);
    themeIcon.classList.toggle('bi-sun-fill', isDarkMode);
    
    updateChartTheme();
}

// Atualização do dashboard
function updateDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const selectedMonth = mesFilter.value;
    
    const currentData = (selectedMonth === 'todos') 
        ? fullData 
        : fullData.filter(lead => lead.mes === selectedMonth);
    
    const previousMonthData = getPreviousMonthData(selectedMonth);
    
    updateKPIs(currentData, previousMonthData);
    updateChartTitles(selectedMonth);
    updateChartData(currentData);
    renderTopMotivos(currentData);
    renderVendasDetalhadas(currentData);
}

// Obtém dados do mês anterior para comparação
function getPreviousMonthData(selectedMonth) {
    if (selectedMonth === 'todos') return [];
    
    const previousMonthIndex = mesesOrdenados.indexOf(selectedMonth) - 1;
    
    if (previousMonthIndex < 0) return [];
    
    const previousMonth = mesesOrdenados[previousMonthIndex];
    return fullData.filter(lead => lead.mes === previousMonth);
}

// Atualização dos KPIs
function updateKPIs(currentData, previousData) {
    const currentKPIs = calculateKPIs(currentData);
    const previousKPIs = calculateKPIs(previousData);
    
    displayKPIs(currentKPIs, previousKPIs);
}

// Cálculo dos KPIs
function calculateKPIs(data) {
    if (!data || data.length === 0) {
        return { total: 0, organicos: 0, qualificados: 0, vendas: 0, desqualificados: 0, faturamento: 0 };
    }

    const vendasFechadas = data.filter(l => l.status === 'Venda Fechada');
    const organicos = data.filter(l => l.categoria === 'Orgânico').length;

    return {
        total: data.length,
        organicos,
        qualificados: data.filter(l => l.status === 'Qualificado').length,
        vendas: vendasFechadas.length,
        desqualificados: data.filter(l => l.status === 'Desqualificado').length,
        faturamento: vendasFechadas.reduce((sum, l) => sum + l.valor, 0)
    };
}

// Exibição dos KPIs
function displayKPIs(current, previous) {
    document.getElementById('kpi-total-leads').innerText = current.total;
    document.getElementById('kpi-leads-organicos').innerText = current.organicos;
    document.getElementById('kpi-leads-qualificados').innerText = current.qualificados;
    document.getElementById('kpi-vendas-fechadas').innerText = current.vendas;
    document.getElementById('kpi-leads-desqualificados').innerText = current.desqualificados;
    document.getElementById('kpi-faturamento').innerText = 
        current.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    updateDelta('delta-total-leads', current.total, previous.total);
    updateDelta('delta-leads-organicos', current.organicos, previous.organicos);
    updateDelta('delta-leads-qualificados', current.qualificados, previous.qualificados);
    updateDelta('delta-vendas-fechadas', current.vendas, previous.vendas);
    updateDelta('delta-leads-desqualificados', current.desqualificados, previous.desqualificados, true);
    updateDelta('delta-faturamento', current.faturamento, previous.faturamento);
}

// Atualização das variações percentuais
function updateDelta(elementId, current, previous, invertColors = false) {
    const element = document.getElementById(elementId);
    
    if (!previous || previous === 0 || current === previous) {
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

// Atualização dos títulos dos gráficos
function updateChartTitles(selectedMonth) {
    const monthTitle = selectedMonth === 'todos' ? 'Geral' : selectedMonth;
    
    document.getElementById('origem-title').innerText = `Origem dos Leads - ${monthTitle}`;
    document.getElementById('segmento-title').innerText = `Análise por Segmento - ${monthTitle}`;
    document.getElementById('crm-title').innerText = `Análise de Origem (CRM) - ${monthTitle}`;
    document.getElementById('delegados-title').innerText = `Vendedor Delegado - ${monthTitle}`;
    document.getElementById('categorias-title').innerText = `Orgânicos vs Anúncios - ${monthTitle}`;
    document.getElementById('motivos-title').innerText = `Top 5 Motivos de Perda - ${monthTitle}`;
    document.getElementById('vendas-detalhadas-title').innerText = `Vendas Fechadas - Detalhes - ${monthTitle}`;
}

// Criação dos gráficos
function createCharts() {
    charts.origem = createChart('grafico-origem', 'doughnut');
    charts.segmento = createChart('grafico-segmento', 'bar');
    charts.crm = createChart('grafico-crm', 'pie');
    charts.delegados = createChart('grafico-delegados', 'bar');
    charts.categorias = createChart('grafico-categorias', 'doughnut');
    
    updateChartTheme();
}

// Função auxiliar para criar gráficos
function createChart(canvasId, type) {
    const ctx = document.getElementById(canvasId);
    
    if (!ctx) {
        console.error(`Canvas não encontrado: ${canvasId}`);
        return null;
    }
    
    return new Chart(ctx.getContext('2d'), {
        type: type,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: type.includes('pie') || type.includes('doughnut') 
                        ? 'right' 
                        : 'none'
                }
            },
            scales: type === 'bar' 
                ? { 
                    y: { 
                        grid: {},
                        beginAtZero: true
                    }, 
                    x: { 
                        grid: { color: 'transparent' }
                    } 
                } 
                : {}
        }
    });
}

// Atualização do tema dos gráficos
function updateChartTheme() {
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#9CA3AF' : '#64748B';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const borderColor = isDarkMode ? '#1F2937' : '#FFFFFF';
    
    Chart.defaults.color = textColor;
    
    for (const chartName in charts) {
        const chart = charts[chartName];
        
        if (!chart || !chart.options) continue;
        
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        
        if (chart.options.scales) {
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
            }
            
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks.color = textColor;
            }
        }
        
        if (chart.data && chart.data.datasets) {
            chart.data.datasets.forEach(dataset => {
                dataset.borderColor = borderColor;
            });
        }
        
        chart.update();
    }
}

// Atualização dos dados dos gráficos
function updateChartData(data) {
    updateChartDataForProperty(charts.origem, data, 'origem_geral');
    updateChartDataForProperty(charts.segmento, data, 'segmento');
    updateChartDataForProperty(charts.crm, data, 'origem_crm');
    updateChartDataForProperty(charts.delegados, data, 'delegado');
    updateCategoriasChart(data);
}

// Função auxiliar para atualizar dados de gráfico por propriedade
function updateChartDataForProperty(chart, data, property) {
    if (!chart) return;
    
    const counts = data.reduce((acc, item) => {
        let key = item[property];
        
        if (!key || key.toString().trim() === '') {
            key = 'Não informado';
        } else {
            key = key.toString().trim();
        }
        
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    
    const sortedEntries = Object.entries(counts)
        .sort(([,a], [,b]) => b - a);
    
    chart.data.labels = sortedEntries.map(([key]) => key);
    chart.data.datasets = [{
        data: sortedEntries.map(([,value]) => value),
        backgroundColor: CORES_GRAFICOS
    }];
    
    chart.update();
}

// Atualiza o gráfico de Orgânicos vs Anúncios
function updateCategoriasChart(data) {
    if (!charts.categorias) return;
    
    let organicos = 0;
    let anuncios = 0;
    
    data.forEach(lead => {
        if (lead.categoria === 'Orgânico') {
            organicos++;
        } else {
            anuncios++;
        }
    });
    
    charts.categorias.data.labels = ['Orgânicos', 'Anúncios'];
    charts.categorias.data.datasets = [{
        data: [organicos, anuncios],
        backgroundColor: ['#10B981', '#3B82F6']
    }];
    
    charts.categorias.update();
}

// Renderização dos motivos de perda
function renderTopMotivos(data) {
    const container = document.getElementById('top-motivos-container');
    container.innerHTML = '';
    
    const motivos = data
        .filter(lead => lead.status === 'Desqualificado' && lead.motivo_nao)
        .reduce((acc, lead) => {
            let motivo = lead.motivo_nao;
            
            if (!motivo || motivo.toString().trim() === '') {
                motivo = 'Motivo não informado';
            } else {
                motivo = motivo.toString().trim();
            }
            
            acc[motivo] = (acc[motivo] || 0) + 1;
            return acc;
        }, {});
    
    const topMotivos = Object.entries(motivos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    if (topMotivos.length === 0) {
        container.innerHTML = `
            <p style="color: var(--cor-texto-secundario); padding-top: 20px; text-align: center;">
                Nenhum motivo de perda registrado.
            </p>
        `;
        return;
    }
    
    const list = document.createElement('ol');
    
    topMotivos.forEach(([motivo, count]) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                <span style="flex: 1;">${motivo}</span>
                <span style="font-weight: bold; color: var(--cor-texto-principal); margin-left: 16px;">${count}</span>
            </div>
        `;
        list.appendChild(listItem);
    });
    
    container.appendChild(list);
}

// Renderiza a tabela de vendas detalhadas
function renderVendasDetalhadas(data) {
    const container = document.getElementById('vendas-detalhadas-container');
    const vendasFechadas = data.filter(lead => lead.status === 'Venda Fechada');
    
    if (vendasFechadas.length === 0) {
        container.innerHTML = `
            <p style="color: var(--cor-texto-secundario); text-align: center; padding: 2rem;">
                Nenhuma venda fechada no período selecionado.
            </p>
        `;
        return;
    }
    
    vendasFechadas.sort((a, b) => b.valor - a.valor);
    
    let tableHTML = `
        <div class="vendas-container">
            <table class="vendas-table">
                <thead>
                    <tr>
                        <th>Valor do Pedido</th>
                        <th>Segmento</th>
                        <th>Origem</th>
                        <th>Categoria</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    vendasFechadas.forEach(venda => {
        const origemCorreta = venda.origem_crm || venda.origem_geral || 'Não informado';
        const segmento = venda.segmento || 'Não informado';
        
        tableHTML += `
            <tr>
                <td class="valor-cell">${venda.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${segmento}</td>
                <td>${origemCorreta}</td>
                <td>${venda.categoria || 'Anúncio'}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--cor-texto-secundario);">
            Total de ${vendasFechadas.length} venda(s) fechada(s)
        </p>
    `;
    
    container.innerHTML = tableHTML;
}

// Geração de relatório para impressão
function generateAndPrintReport(data, period) {
    const printArea = document.getElementById('print-area');
    const kpis = calculateKPIs(data);
    
    const createCardGrid = (title, items) => {
        if (Object.keys(items).length === 0) return '';
        
        let gridHTML = `<h2>${title}</h2><div class="print-grid">`;
        
        for (const [key, value] of Object.entries(items)) {
            gridHTML += `
                <div class="print-card">
                    <div class="print-card-title">${key}</div>
                    <div class="print-card-value">${value}</div>
                </div>
            `;
        }
        
        gridHTML += `</div>`;
        return gridHTML;
    };
    
    const kpiItems = {
        'Total de Leads': kpis.total,
        'Leads Orgânicos': kpis.organicos,
        'Leads Qualificados': kpis.qualificados,
        'Vendas Fechadas': kpis.vendas,
        'Leads Desqualificados': kpis.desqualificados,
        'Faturamento Total': kpis.faturamento.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        })
    };
    
    const origemCounts = countByProperty(data, 'origem_geral');
    const segmentoCounts = countByProperty(data, 'segmento');
    const delegadoCounts = countByProperty(data, 'delegado');
    
    const categoriasCounts = {
        'Orgânicos': data.filter(lead => lead.categoria === 'Orgânico').length,
        'Anúncios': data.filter(lead => lead.categoria === 'Anúncio').length
    };
    
    const topMotivos = data
        .filter(lead => lead.status === 'Desqualificado' && lead.motivo_nao)
        .reduce((acc, lead) => {
            let motivo = lead.motivo_nao;
            if (!motivo || motivo.toString().trim() === '') {
                motivo = 'Motivo não informado';
            } else {
                motivo = motivo.toString().trim();
            }
            acc[motivo] = (acc[motivo] || 0) + 1;
            return acc;
        }, {});
    
    const vendasFechadas = data.filter(lead => lead.status === 'Venda Fechada');
    const vendasItems = {};
    vendasFechadas.forEach((venda, index) => {
        const origemCorreta = venda.origem_crm || venda.origem_geral || 'N/I';
        const segmento = venda.segmento || 'N/I';
        vendasItems[`Venda ${index + 1}`] = 
            `${venda.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | ${segmento} | ${origemCorreta} | ${venda.categoria || 'Anúncio'}`;
    });
    
    let reportHTML = `
        <h1>Relatório de Análise de Leads</h1>
        <p>Dados referentes ao período: ${period}</p>
        ${createCardGrid('Resumo Geral (KPIs)', kpiItems)}
        ${createCardGrid('Origem dos Leads', origemCounts)}
        ${createCardGrid('Análise por Segmento', segmentoCounts)}
        ${createCardGrid('Distribuição por Responsável', delegadoCounts)}
        ${createCardGrid('Orgânicos vs Anúncios', categoriasCounts)}
        ${createCardGrid('Top 5 Motivos de Perda', topMotivos)}
        ${createCardGrid('Vendas Fechadas Detalhadas', vendasItems)}
    `;
    
    printArea.innerHTML = reportHTML;
    window.print();
}

// Função auxiliar para contar por propriedade
function countByProperty(data, property) {
    return data.reduce((acc, item) => {
        let key = item[property];
        
        if (!key || key.toString().trim() === '') {
            key = 'Não informado';
        } else {
            key = key.toString().trim();
        }
        
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}
