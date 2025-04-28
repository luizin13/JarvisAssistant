import axios from 'axios';

const API_GOV_DADOS = process.env.API_GOV_DADOS;
const BASE_URL = 'https://api.portaldatransparencia.gov.br/api-de-dados';

/**
 * Serviço para consumir dados oficiais da API do Portal da Transparência
 * Utiliza autenticação via chave API para acessar os endpoints oficiais
 */
export async function fetchOfficialData(endpoint: string, params: Record<string, any> = {}) {
  if (!API_GOV_DADOS) {
    throw new Error('Chave API_GOV_DADOS não configurada no ambiente');
  }

  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'chave-api-dados': API_GOV_DADOS
      },
      params
    });

    return response.data;
  } catch (error: any) {
    console.error('Erro ao acessar a API do Portal da Transparência:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', error.response.data);
    }
    throw new Error(`Falha ao buscar dados oficiais: ${error.message || 'Erro desconhecido'}`);
  }
}

/**
 * Busca dados de servidores públicos e autoridades governamentais
 * @param nome Nome ou parte do nome para filtrar
 * @param orgao Código do órgão (opcional)
 * @param pagina Número da página de resultados
 */
export async function fetchGovernmentAuthorities(nome?: string, orgao?: string, pagina: number = 1) {
  const params: Record<string, any> = {
    pagina,
    tamanhoPagina: 15
  };

  if (nome) params.nome = nome;
  if (orgao) params.orgao = orgao;

  return fetchOfficialData('/servidores/v1/fichas-dados-servidores', params);
}

/**
 * Busca detalhes completos de um servidor/autoridade específica pelo ID
 * @param id ID do servidor no sistema do Portal da Transparência
 */
export async function fetchAuthorityDetails(id: string) {
  return fetchOfficialData(`/servidores/v1/ficha-servidor/${id}`);
}

/**
 * Busca dados de programas de crédito governamentais
 * @param ano Ano de referência
 * @param programa Código ou nome do programa
 */
export async function fetchCreditPrograms(ano?: number, programa?: string) {
  const params: Record<string, any> = {
    pagina: 1,
    tamanhoPagina: 20
  };

  if (ano) params.ano = ano;
  if (programa) params.programa = programa;

  return fetchOfficialData('/pep/v1/programas', params);
}

/**
 * Busca licitações e contratos governamentais
 * @param dataInicial Data inicial no formato YYYYMMDD
 * @param dataFinal Data final no formato YYYYMMDD
 * @param orgao Código do órgão (opcional)
 */
export async function fetchGovernmentContracts(dataInicial: string, dataFinal: string, orgao?: string) {
  const params: Record<string, any> = {
    dataInicial,
    dataFinal,
    pagina: 1,
    tamanhoPagina: 20
  };

  if (orgao) params.orgao = orgao;

  return fetchOfficialData('/contratos/v1/contratos', params);
}

/**
 * Função para mapear os dados da API oficial para o formato utilizado na aplicação
 * @param apiData Dados brutos da API
 */
export function mapOfficialDataToAppFormat(apiData: any[], type: 'authorities' | 'programs' | 'contracts') {
  try {
    switch (type) {
      case 'authorities':
        return apiData.map(item => ({
          id: item.id || 0,
          name: item.nome || '',
          position: item.cargo || '',
          department: item.unidade || '',
          institution: item.orgao || '',
          creditProgram: '', // Dados a serem complementados
          authority: 'média', // Valor padrão
          region: item.uf || 'Nacional',
          contactInfo: item.email || '',
          email: item.email || '',
          phone: item.telefone || '',
          officeAddress: item.endereco || '',
          appointmentDate: item.dataAdmissao || '',
          // Outros campos podem exigir enriquecimento adicional ou mapeamento específico
          biography: `${item.cargo} no ${item.orgao}.`,
          lastUpdated: new Date().toISOString().split('T')[0],
          dataSource: 'Portal da Transparência - API oficial'
        }));

      case 'programs':
        return apiData.map(item => ({
          id: item.id || 0,
          title: item.nome || '',
          description: item.descricao || '',
          institution: item.orgaoResponsavel || '',
          amount: item.valorTotal ? `R$ ${Number(item.valorTotal).toLocaleString('pt-BR')}` : undefined,
          category: mapCategoryFromProgram(item.nome || ''),
          icon: 'bank',
          color: 'green'
        }));

      case 'contracts':
        return apiData.map(item => ({
          id: item.id || 0,
          title: item.objeto || '',
          description: item.descricaoCompleta || item.objeto || '',
          bidNumber: item.numeroLicitacao || '',
          publishedAt: formatDateFromAPI(item.dataAssinatura),
          closingDate: formatDateFromAPI(item.dataFimVigencia),
          agency: item.orgao || '',
          value: item.valorTotal ? `R$ ${Number(item.valorTotal).toLocaleString('pt-BR')}` : '',
          category: mapCategoryFromContract(item.objeto || ''),
          url: `https://www.portaltransparencia.gov.br/contratos/${item.id}`,
          status: item.situacao === 'Ativo' ? 'open' : 'closed'
        }));

      default:
        throw new Error(`Tipo de mapeamento não suportado: ${type}`);
    }
  } catch (error: any) {
    console.error('Erro ao mapear dados oficiais:', error);
    return [];
  }
}

/**
 * Funções auxiliares de formatação
 */
function formatDateFromAPI(dateString?: string): string {
  if (!dateString) return '';
  
  try {
    // Assumindo formato ISO ou formatável para Date
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return dateString;
  }
}

function mapCategoryFromProgram(programName: string): string {
  const programName_lower = programName.toLowerCase();
  if (programName_lower.includes('rural') || 
      programName_lower.includes('agrícola') || 
      programName_lower.includes('agro') ||
      programName_lower.includes('safra')) {
    return 'farm';
  } else if (programName_lower.includes('transporte') || 
             programName_lower.includes('rodovi') || 
             programName_lower.includes('logística') ||
             programName_lower.includes('infraestrutura')) {
    return 'transport';
  } else {
    return 'general';
  }
}

function mapCategoryFromContract(contractDescription: string): string {
  const desc_lower = contractDescription.toLowerCase();
  if (desc_lower.includes('rural') || 
      desc_lower.includes('agrícola') || 
      desc_lower.includes('agro')) {
    return 'farm';
  } else if (desc_lower.includes('transporte') || 
             desc_lower.includes('rodovi') || 
             desc_lower.includes('veículo') ||
             desc_lower.includes('caminhão')) {
    return 'transport';
  } else {
    return 'general';
  }
}