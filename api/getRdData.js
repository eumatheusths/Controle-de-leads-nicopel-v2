// api/getRdData.js

export default async function handler(request, response) {
  // 1. Pega o Token Secreto das Variáveis de Ambiente da Vercel
  const RD_TOKEN = process.env.RD_STATION_PRIVATE_TOKEN;

  if (!RD_TOKEN) {
    return response.status(500).json({ error: 'Token do RD Station não configurado no servidor.' });
  }

  // 2. MUDANÇA AQUI: Monta a URL da API do RD Station (versão 1.2) e passa o token como um parâmetro
  const apiUrl = `https://www.rdstation.com.br/api/1.2/analytics/funnel?token=${RD_TOKEN}`;

  try {
    // 3. MUDANÇA AQUI: A chamada agora é mais simples, sem o header de autorização
    const rdResponse = await fetch(apiUrl);

    if (!rdResponse.ok) {
      // Tenta ler a resposta de erro do RD Station para dar mais detalhes
      const errorBody = await rdResponse.text();
      throw new Error(`Erro ao buscar dados do RD Station: ${rdResponse.statusText}. Detalhes: ${errorBody}`);
    }

    const rdData = await rdResponse.json();

    // 4. Calcula os KPIs totais a partir dos dados recebidos
    // (O RD já manda uma linha de totais, vamos usá-la)
    const totals = rdData.find(item => item.channel === 'total');

    // 5. Envia os dados totais e o detalhamento por canal de volta para o frontend
    response.status(200).json({ 
        totals: totals || {}, 
        channels: rdData.filter(item => item.channel !== 'total') // Remove a linha de total do detalhamento
    });

  } catch (error) {
    console.error("Erro no backend do RD Station:", error);
    response.status(500).json({ error: 'Falha ao buscar dados do RD Station.', details: error.message });
  }
}
