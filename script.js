let fullData = [];

async function fetchData() {
    try {
        const response = await fetch('/api/getData');
        if (!response.ok) throw new Error(`Erro do servidor: ${response.statusText}`);
        const result = await response.json();
        
        if (!result.data.values) throw new Error("Nenhum dado encontrado na planilha.");

        const headers = result.data.values[0];
        const rows = result.data.values.slice(1);
        const colIndex = {
            produto: headers.indexOf('PRODUTO'),
            quantidade: headers.indexOf('QUANTIDADE'),
            precoCusto: headers.indexOf('PREÇO UND.'),
            precoVenda: headers.indexOf('PREÇO DE VENDA'),
            dataCompra: headers.indexOf('DATA DA COMPRA'),
            dataVencimento: headers.indexOf('DATA DO VENCIMENTO'),
            lote: headers.indexOf('LOTE')
        };
        
        const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const parts = dateStr.split('/');
            if (parts.length !== 3) return null;
            const [day, month, year] = parts.map(Number);
            return new Date(year, month - 1, day);
        };

        fullData = rows.map(row => {
            const getPrice = (index) => {
                if (index === -1) return 0;
                const priceStr = row[index] || '0';
                return parseFloat(priceStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
            };
            return {
                produto: row[colIndex.produto],
                quantidade: parseInt(row[colIndex.quantidade] || 0),
                precoCusto: getPrice(colIndex.precoCusto),
                precoVenda: getPrice(colIndex.precoVenda),
                dataCompra: row[colIndex.dataCompra],
                dataVencimento: parseDate(row[colIndex.dataVencimento]),
                lote: row[colIndex.lote]
            };
        }).filter(item => item.produto);

        document.getElementById('loading-message').style.display = 'none';
        document.getElementById('dashboard-body').style.display = 'block';
        
        initializeDashboard();
        
    } catch (error) {
        console.error("FALHA NA CONEXÃO:", error);
        document.getElementById('loading-message').innerText = `Falha na conexão: ${error.message}`;
    }
}

function initializeDashboard() {
    const themeToggleButton = document.getElementById('theme-toggle');
    const printTableButton = document.getElementById('print-table-button');
    
    themeToggleButton.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark-mode');
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        const themeIcon = themeToggleButton.querySelector('i');
        themeIcon.classList.toggle('bi-moon-stars-fill', !isDarkMode);
        themeIcon.classList.toggle('bi-sun-fill', isDarkMode);
    });

    printTableButton.addEventListener('click', () => {
        document.body.classList.add('printing-table');
        window.print();
    });

    window.addEventListener('afterprint', () => {
        document.body.classList.remove('printing-table');
    });

    updateDashboard(fullData);

    document.getElementById('search-input').addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = fullData.filter(item => item.produto.toLowerCase().includes(searchTerm));
        updateDashboard(filteredData);
    });
    
    // Seta o ícone do tema correto no carregamento inicial
    const themeIcon = themeToggleButton.querySelector('i');
    if (document.documentElement.classList.contains('dark-mode')) {
        themeIcon.classList.replace('bi-moon-stars-fill', 'bi-sun-fill');
    }
}

function updateDashboard(data) {
    const valorCustoTotal = data.reduce((sum, item) => sum + (item.quantidade * item.precoCusto), 0);
    const valorVendaTotal = data.reduce((sum, item) => sum + (item.quantidade * item.precoVenda), 0);
    const totalItens = data.reduce((sum, item) => sum + item.quantidade, 0);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + 30);
    
    const itensPertoVencimento = data.filter(item => 
        item.dataVencimento && item.dataVencimento > hoje && item.dataVencimento <= dataLimite
    ).length;

    document.getElementById('kpi-valor-custo').innerText = valorCustoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('kpi-valor-venda').innerText = valorVendaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('kpi-total-itens').innerText = totalItens;
    document.getElementById('kpi-vencimento').innerText = itensPertoVencimento;

    const kpiCardVencimento = document.getElementById('kpi-card-vencimento');
    kpiCardVencimento.classList.toggle('alert', itensPertoVencimento > 0);
    
    const sortedData = [...data].sort((a, b) => {
        const aIsExpiring = a.dataVencimento && a.dataVencimento > hoje && a.dataVencimento <= dataLimite;
        const bIsExpiring = b.dataVencimento && b.dataVencimento > hoje && b.dataVencimento <= dataLimite;
        if (aIsExpiring && !bIsExpiring) return -1;
        if (!aIsExpiring && bIsExpiring) return 1;
        if (a.dataVencimento && b.dataVencimento) return a.dataVencimento - b.dataVencimento;
        return a.produto.localeCompare(b.produto);
    });

    renderTable(sortedData);
    renderProductList(data);
}

function renderTable(data) {
    const tableBody = document.getElementById('inventory-table-body');
    tableBody.innerHTML = '';
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">Nenhum produto encontrado.</td></tr>';
        return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + 30);

    data.forEach(item => {
        const row = document.createElement('tr');
        const vencimentoStr = item.dataVencimento ? item.dataVencimento.toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';
        row.innerHTML = `
            <td>${item.produto}</td>
            <td>${item.quantidade}</td>
            <td>${item.precoCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${item.precoVenda > 0 ? item.precoVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}</td>
            <td>${vencimentoStr}</td>
            <td>${item.lote || 'N/A'}</td>
        `;
        const isExpiring = item.dataVencimento && item.dataVencimento > hoje && item.dataVencimento <= dataLimite;
        if (isExpiring) row.classList.add('vencimento-proximo');
        tableBody.appendChild(row);
    });
}

function renderProductList(data) {
    const listElement = document.getElementById('lista-produtos');
    listElement.innerHTML = '';
    const productQuantities = data.reduce((acc, item) => {
        acc[item.produto] = (acc[item.produto] || 0) + item.quantidade;
        return acc;
    }, {});
    const sortedProducts = Object.entries(productQuantities).sort(([,a],[,b]) => b - a);
    if (sortedProducts.length === 0) {
        listElement.innerHTML = '<li>Nenhum produto a ser exibido.</li>';
        return;
    }
    sortedProducts.forEach(([produto, quantidade]) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span>${produto}</span><strong>${quantidade}</strong>`;
        listElement.appendChild(listItem);
    });
}

fetchData();
