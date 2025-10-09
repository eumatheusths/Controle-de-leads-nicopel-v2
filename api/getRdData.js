// api/getRdData.js

export default async function handler(request, response) {
  // 1. Pega o Token Secreto das Variáveis de Ambiente da Vercel
  const RD_TOKEN = process.env.RD_STATION_PRIVATE_TOKEN;

  if (!RD_TOKEN) {
    return response.status(500).json({ error: 'Token do RD Station não configurado no servidor.' });
  }

  // 2. Monta a URL da API do RD Station para análise de funil
  const apiUrl = `https://api.rd.services/platform/analytics/funnel`;

  try {
    // 3. Faz a chamada para a API do RD Station, enviando o token para autorização
    const rdResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${RD_TOKEN}`
      }
    });

    if (!rdResponse.ok) {
      throw new Error(`Erro ao buscar dados do RD Station: ${rdResponse.statusText}`);
    }

    const rdData = await rdResponse.json();

    // 4. Calcula os KPIs totais a partir dos dados recebidos
    const totals = {
      visits: rdData.reduce((sum, channel) => sum + channel.visits, 0),
      conversions: rdData.reduce((sum, channel) => sum + channel.conversions, 0),
      opportunities: rdData.reduce((sum, channel) => sum + channel.opportunities, 0),
      sales: rdData.reduce((sum, channel) => sum + channel.sales, 0),
    };

    // 5. Envia os dados totais e o detalhamento por canal de volta para o frontend
    response.status(200).json({ totals: totals, channels: rdData });

  } catch (error) {
    console.error("Erro no backend do RD Station:", error);
    response.status(500).json({ error: 'Falha ao buscar dados do RD Station.', details: error.message });
  }
}
