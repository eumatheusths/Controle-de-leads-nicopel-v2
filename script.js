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
        
        // ... (processamento de dados continua igual)
        
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
    
    // Define o ícone inicial com base no tema atual
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
    
    // Lógica para o botão de tema
    themeToggleButton.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark-mode');
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        // Salva a preferência no localStorage
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        // Troca o ícone
        themeIcon.classList.toggle('bi-moon-stars-fill', !isDarkMode);
        themeIcon.classList.toggle('bi-sun-fill', isDarkMode);
        // Atualiza as cores dos gráficos
        updateChartTheme();
    });
}

// --- LÓGICA DE ATUALIZAÇÃO ---
function updateDashboard() {
    // ... (função igual à anterior)
}
function calculateKPIs(data) {
    // ... (função igual à anterior)
}
function displayKPIs(current, previous) {
    // ... (função igual à anterior)
}
function updateDelta(elementId, current, previous, invertColors = false) {
    // ... (função igual à anterior)
}

// --- FUNÇÕES DOS GRÁFICOS ---
function createCharts() {
    charts.origem = createChart('grafico-origem', 'doughnut');
    charts.segmento = createChart('grafico-segmento', 'bar');
    charts.crm = createChart('grafico-crm', 'pie');
    charts.delegados = createChart('grafico-delegados', 'bar');
    updateChartTheme(); // Aplica o tema correto na criação
}

// NOVO: Função para atualizar as cores dos gráficos com base no tema
function updateChartTheme() {
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#9CA3AF' : '#64748B';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const borderColor = isDarkMode ? '#1F2937' : '#FFFFFF';

    Chart.defaults.color = textColor;
    
    for (const chartName in charts) {
        const chart = charts[chartName];
        chart.options.plugins.legend.labels.color = textColor;
        if (chart.options.scales) {
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.x.ticks.color = textColor;
        }
        chart.data.datasets.forEach(dataset => {
            dataset.borderColor = borderColor;
        });
        chart.update();
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
            scales: type === 'bar' ? {
                y: { grid: {} },
                x: { grid: { color: 'transparent' } }
            } : {}
        }
    });
}

function updateChartData(chart, data, property) {
    // ... (função igual à anterior)
}

// --- INICIA O PROCESSO ---
fetchData();
