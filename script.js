async function testConnection() {
  console.log("Iniciando teste de conexão...");
  try {
    const response = await fetch('/api/getData');
    if (!response.ok) {
      throw new Error(`Erro do servidor: ${response.statusText}`);
    }
    const result = await response.json();

    console.log("CONEXÃO BEM-SUCEDIDA! Dados recebidos:");
    console.log(result.data);
    document.body.innerHTML += "<h2 style='color: green;'>Conexão bem-sucedida! Verifique o console.</h2>";

  } catch (error) {
    console.error("FALHA NA CONEXÃO:", error);
    document.body.innerHTML += `<h2 style='color: red;'>Falha na conexão. Verifique o console.</h2><p>${error.message}</p>`;
  }
}

testConnection();
