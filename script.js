// --- VARIÁVEIS GLOBAIS ---
let fullData = [];
let charts = {};
let mesesOrdenados = [];
const ORDEM_DOS_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- FUNÇÃO PRINCIPAL ---
async function fetchData() {
    // ... (código igual, sem alterações)
}

function initializeDashboard() {
    const mesFilter = document.getElementById('mes-filter');
    const themeToggleButton = document.getElementById('theme-toggle');
    const printButton = document.getElementById('print-button'); // Botão de imprimir
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
        // ... (lógica do tema continua igual)
    });

    // MUDANÇA AQUI: Nova lógica para o botão de imprimir
    printButton.addEventListener('click', () => {
        const selectedMonth = mesFilter.value;
        const currentData = (selectedMonth === 'todos') ? fullData : fullData.filter(lead => lead.mes === selectedMonth);
        const selectedMonthText = mesFilter.options[mesFilter.selectedIndex].text;
        
        generateAndPrintReport(currentData, selectedMonthText);
    });
}

// O resto do seu código (updateDashboard, calculateKPIs, etc.) continua igual.
// Apenas a nova função generateAndPrintReport foi adicionada.
// Para evitar erros, cole o código completo abaixo.

// --- CÓDIGO COMPLETO ---

function updateDashboard() { /* ... igual ao anterior ... */ }
function calculateKPIs(data) { /* ... igual ao anterior ... */ }
function displayKPIs(current, previous) { /* ... igual ao anterior ... */ }
function updateDelta(elementId, current, previous, invertColors = false) { /* ... igual ao anterior ... */ }
function createCharts() { /* ... igual ao anterior ... */ }
function updateChartTheme() { /* ... igual ao anterior ... */ }
function createChart(canvasId, type) { /* ... igual ao anterior ... */ }
function updateChartData(chart, data, property) { /* ... igual ao anterior ... */ }
function renderTopMotivos(data) { /* ... igual ao anterior ... */ }

// NOVA FUNÇÃO para gerar o relatório em tabela
function generateAndPrintReport(data, period) {
    const printArea = document.getElementById('print-area');
    
    let tableHTML = `
        <h1>Relatório de Análise de Leads</h1>
        <p>Dados referentes ao período: ${period}</p>
        <table>
            <thead>
                <tr>
                    <th>Origem</th>
                    <th>Status</th>
                    <th>Segmento</th>
                    <th>Responsável</th>
                    <th>Valor do Pedido</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (data.length === 0) {
        tableHTML += `<tr><td colspan="5">Nenhum dado encontrado para este período.</td></tr>`;
    } else {
        data.forEach(lead => {
            tableHTML += `
                <tr>
                    <td>${lead.origem || ''}</td>
                    <td>${lead.status || ''}</td>
                    <td>${lead.segmento || ''}</td>
                    <td>${lead.delegado || ''}</td>
                    <td>${lead.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
            `;
        });
    }

    tableHTML += `</tbody></table>`;
    
    printArea.innerHTML = tableHTML;
    window.print();
}

fetchData();
