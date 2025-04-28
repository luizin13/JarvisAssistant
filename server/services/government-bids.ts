import axios from 'axios';

// Interface para Licitações Governamentais
export interface GovernmentBid {
  id: number;
  title: string;
  description: string;
  bidNumber: string;
  publishedAt: string; // ISO date string
  closingDate: string; // ISO date string
  agency: string;
  value: string;
  category: string; // "transport", "farm", "general"
  url: string;
  status: string; // "open", "closed", "draft"
}

/**
 * Serviço para buscar licitações governamentais do Portal de Compras Governamentais
 * Utiliza a API pública do Portal Nacional de Contratações Públicas (PNCP)
 */
export async function fetchGovernmentBids(category?: string, limit: number = 10): Promise<GovernmentBid[]> {
  try {
    // A URL da API real seria como abaixo, mas estamos usando um modelo simulado para demonstração:
    // const response = await axios.get('https://pncp.gov.br/api/v1/licitacoes', {
    //   params: { categoria: mapCategory(category), limite: limit }
    // });
    
    // Simulação da resposta da API com dados fictícios baseados em licitações reais
    // Em produção, substituir por chamada real à API
    return generateBidsMock(category, limit);
  } catch (error) {
    console.error('Erro ao buscar licitações governamentais:', error);
    return [];
  }
}

// Função auxiliar para mapear categorias internas para categorias da API
function mapCategory(category?: string): string {
  switch (category) {
    case 'transport':
      return 'transporte';
    case 'farm':
      return 'agricultura';
    default:
      return '';
  }
}

// Função para gerar dados fictícios para demonstração
// Em produção, esta função seria removida e substituída por chamadas reais à API
function generateBidsMock(category?: string, limit: number = 10): GovernmentBid[] {
  const currentDate = new Date();
  const futureDate = new Date();
  futureDate.setDate(currentDate.getDate() + 15);
  
  const allBids: GovernmentBid[] = [
    {
      id: 1001,
      title: "Contratação de serviços de transporte de insumos agrícolas",
      description: "Contratação de empresa especializada para realizar o transporte de insumos agrícolas entre os centros de distribuição do Ministério da Agricultura para as unidades rurais registradas no programa de apoio ao pequeno produtor.",
      bidNumber: "PE-12345/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "Ministério da Agricultura, Pecuária e Abastecimento",
      value: "R$ 2.500.000,00",
      category: "transport",
      url: "https://www.gov.br/compras/pt-br/licitacao/12345-2025",
      status: "open"
    },
    {
      id: 1002,
      title: "Aquisição de caminhões para transporte de grãos",
      description: "Aquisição de caminhões com capacidade mínima de 30 toneladas para transporte de grãos entre cooperativas agrícolas e portos de exportação.",
      bidNumber: "PE-23456/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "CONAB - Companhia Nacional de Abastecimento",
      value: "R$ 5.750.000,00",
      category: "transport",
      url: "https://www.gov.br/compras/pt-br/licitacao/23456-2025",
      status: "open"
    },
    {
      id: 1003,
      title: "Fornecimento de maquinário agrícola para assentamentos rurais",
      description: "Aquisição de tratores e implementos agrícolas para atender aos programas de fortalecimento da agricultura familiar em assentamentos da reforma agrária.",
      bidNumber: "PE-34567/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "INCRA - Instituto Nacional de Colonização e Reforma Agrária",
      value: "R$ 8.200.000,00",
      category: "farm",
      url: "https://www.gov.br/compras/pt-br/licitacao/34567-2025",
      status: "open"
    },
    {
      id: 1004,
      title: "Serviços de transporte escolar em zonas rurais",
      description: "Contratação de serviços de transporte escolar para atendimento às comunidades rurais em municípios participantes do programa de educação no campo.",
      bidNumber: "PE-45678/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "Ministério da Educação",
      value: "R$ 3.800.000,00",
      category: "transport",
      url: "https://www.gov.br/compras/pt-br/licitacao/45678-2025",
      status: "open"
    },
    {
      id: 1005,
      title: "Aquisição de sementes certificadas para programa de incentivo agrícola",
      description: "Fornecimento de sementes certificadas de milho, soja e feijão para o programa nacional de incentivo à produção agrícola familiar.",
      bidNumber: "PE-56789/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "MAPA - Ministério da Agricultura, Pecuária e Abastecimento",
      value: "R$ 1.950.000,00",
      category: "farm",
      url: "https://www.gov.br/compras/pt-br/licitacao/56789-2025",
      status: "open"
    },
    {
      id: 1006,
      title: "Contratação de serviços de frete para exportação",
      description: "Contratação de empresa especializada em serviços de frete internacional para exportação de produtos agrícolas através dos principais portos do país.",
      bidNumber: "PE-67890/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "Ministério da Economia",
      value: "R$ 12.500.000,00",
      category: "transport",
      url: "https://www.gov.br/compras/pt-br/licitacao/67890-2025",
      status: "open"
    },
    {
      id: 1007,
      title: "Aquisição de fertilizantes para programa de produtividade rural",
      description: "Aquisição de fertilizantes e insumos agrícolas para implementação do programa nacional de aumento de produtividade em pequenas e médias propriedades rurais.",
      bidNumber: "PE-78901/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "Secretaria de Agricultura Familiar e Cooperativismo",
      value: "R$ 4.300.000,00",
      category: "farm",
      url: "https://www.gov.br/compras/pt-br/licitacao/78901-2025",
      status: "open"
    },
    {
      id: 1008,
      title: "Transporte de produtos da merenda escolar",
      description: "Contratação de serviços logísticos para transporte e distribuição de produtos da agricultura familiar destinados à merenda escolar em escolas públicas.",
      bidNumber: "PE-89012/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "FNDE - Fundo Nacional de Desenvolvimento da Educação",
      value: "R$ 6.750.000,00",
      category: "transport",
      url: "https://www.gov.br/compras/pt-br/licitacao/89012-2025",
      status: "open"
    },
    {
      id: 1009,
      title: "Fornecimento de sistemas de irrigação para projetos rurais",
      description: "Aquisição e instalação de sistemas de irrigação modernos para implementação em projetos de desenvolvimento rural sustentável em regiões do semiárido brasileiro.",
      bidNumber: "PE-90123/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "Ministério do Desenvolvimento Regional",
      value: "R$ 9.800.000,00",
      category: "farm",
      url: "https://www.gov.br/compras/pt-br/licitacao/90123-2025",
      status: "open"
    },
    {
      id: 1010,
      title: "Contratação de frota para transporte de equipamentos agrícolas",
      description: "Contratação de serviços especializados em transporte de maquinário agrícola pesado entre diferentes regiões do país para atender ao programa de modernização da agricultura.",
      bidNumber: "PE-01234/2025",
      publishedAt: new Date().toISOString(),
      closingDate: futureDate.toISOString(),
      agency: "MAPA - Ministério da Agricultura, Pecuária e Abastecimento",
      value: "R$ 7.200.000,00",
      category: "transport",
      url: "https://www.gov.br/compras/pt-br/licitacao/01234-2025",
      status: "open"
    }
  ];
  
  // Filtrar por categoria se especificada
  const filteredBids = category 
    ? allBids.filter(bid => bid.category === category)
    : allBids;
  
  // Retornar o número de licitações solicitado
  return filteredBids.slice(0, limit);
}