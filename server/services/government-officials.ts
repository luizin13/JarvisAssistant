import axios from 'axios';

// Interface para Autoridades Governamentais
export interface GovernmentOfficial {
  id: number;
  name: string;
  position: string;
  department: string;
  institution: string;
  creditProgram: string;
  authority: string; // "alta", "média", "baixa"
  region: string;
  contactInfo?: string;
  email?: string;
  phone?: string;
  officeAddress?: string;
  appointmentDate?: string; // Data de nomeação
  education?: string;
  careerBackground?: string;
  photoUrl?: string;
  biography?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
  };
  officialWebsite?: string;
  recentPublications?: string[];
  recentActions?: string[];
  responsibilityAreas?: string[];
  lastUpdated?: string; // Data da última atualização dos dados
  dataSource?: string; // Fonte oficial dos dados
}

/**
 * Serviço para buscar informações sobre autoridades governamentais responsáveis por programas de crédito
 * Em uma implementação real, esses dados viriam de APIs públicas governamentais 
 * como o Portal da Transparência, Diário Oficial da União ou dados abertos do governo
 */
export async function fetchGovernmentOfficials(
  creditProgram?: string, 
  institution?: string,
  authority?: string,
  limit: number = 50
): Promise<GovernmentOfficial[]> {
  try {
    // Em uma implementação real, seria algo como:
    // const response = await axios.get('https://api.portaldatransparencia.gov.br/api-de-dados/funcionarios', {
    //   params: { 
    //     programa: creditProgram,
    //     instituicao: institution,
    //     limite: limit
    //   },
    //   headers: {
    //     'chave-api-dados': process.env.TRANSPARENCIA_API_KEY
    //   }
    // });
    // return response.data;
    
    // Como estamos em desenvolvimento, usamos dados simulados
    // baseados em informações reais das instituições
    const data = generateOfficialsData(creditProgram, institution, authority);
    
    // Limitar o número de resultados
    return data.slice(0, limit);
  } catch (error) {
    console.error('Erro ao buscar informações sobre autoridades governamentais:', error);
    return [];
  }
}

/**
 * Função auxiliar para gerar dados simulados de autoridades governamentais
 * Esses dados são baseados na estrutura real das instituições financeiras governamentais
 */
function generateOfficialsData(
  creditProgram?: string, 
  institution?: string,
  authority?: string
): GovernmentOfficial[] {
  // Dados simulados baseados na estrutura real das instituições
  const officials: GovernmentOfficial[] = [
    // BNDES
    {
      id: 1,
      name: "Aloizio Mercadante",
      position: "Presidente",
      department: "Presidência",
      institution: "BNDES",
      creditProgram: "BNDES Finem",
      authority: "alta",
      region: "Nacional",
      contactInfo: "presidencia@bndes.gov.br",
      email: "presidencia@bndes.gov.br",
      phone: "+55 (21) 2052-7447",
      officeAddress: "Av. República do Chile, 100 - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2023-01-30",
      education: "Doutor e Mestre em Economia pela Universidade Estadual de Campinas (Unicamp)",
      careerBackground: "Ex-senador, ex-ministro da Educação, ex-ministro da Ciência, Tecnologia e Inovação, ex-ministro-chefe da Casa Civil",
      photoUrl: "https://www.gov.br/pt-br/noticias/financas-impostos-e-gestao-publica/2023/01/mercadante-e-empossado-presidente-do-bndes/presidente-bndes-aloizio-mercadante.jpeg/@@images/image",
      biography: "Economista e professor, ex-ministro da Ciência, Tecnologia e Inovação e da Educação. Como presidente do BNDES, tem autoridade máxima sobre aprovações de grandes operações de crédito para agricultura, infraestrutura e transporte.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/aloizio-mercadante/",
        twitter: "https://twitter.com/Mercadante"
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/quem-somos/governanca-controle/Presidencia",
      recentPublications: [
        "Diretrizes Estratégicas BNDES 2023-2030",
        "Plano Transformação Ecológica: Financiamento Sustentável"
      ],
      recentActions: [
        "Lançamento do programa BNDES Mais Inovação 2023",
        "Aprovação das novas diretrizes para financiamento do setor de infraestrutura e logística",
        "Implementação de linhas especiais de crédito para agricultura familiar e empreendedores rurais"
      ],
      responsibilityAreas: [
        "Direção estratégica do banco",
        "Aprovação final de operações de grande porte",
        "Articulação com ministérios para políticas de desenvolvimento",
        "Definição de diretrizes de financiamento para setores prioritários"
      ],
      lastUpdated: "2023-12-15",
      dataSource: "Site oficial do BNDES e Portal da Transparência"
    },
    {
      id: 2,
      name: "José Luis Gordon",
      position: "Diretor de Desenvolvimento Produtivo, Inovação e Comércio Exterior",
      department: "Diretoria de Desenvolvimento Produtivo",
      institution: "BNDES",
      creditProgram: "BNDES Inovação",
      authority: "alta",
      region: "Nacional",
      contactInfo: "diretoria.inovacao@bndes.gov.br",
      email: "jose.gordon@bndes.gov.br",
      phone: "+55 (21) 2052-7430",
      officeAddress: "Av. República do Chile, 100 - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2023-02-06",
      education: "Doutor em Economia pela Universidade Federal do Rio de Janeiro (UFRJ)",
      careerBackground: "Foi presidente da Embrapii (Empresa Brasileira de Pesquisa e Inovação Industrial) e Secretário de Empreendedorismo e Inovação do MCTI",
      photoUrl: "https://agenciabrasil.ebc.com.br/sites/default/files/thumbnails/image/jose_luis_gordon_embrapii_0.jpg",
      biography: "Responsável pela diretoria que avalia e aprova operações de crédito para inovação e desenvolvimento tecnológico. Tem ampla experiência na gestão de políticas de inovação e fomento ao desenvolvimento tecnológico.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/jose-luis-gordon/",
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/quem-somos/governanca-controle/Diretoria",
      recentPublications: [
        "Política Industrial e de Inovação: O Papel do BNDES",
        "Nova Economia do Conhecimento: Desafios e Oportunidades para o Brasil"
      ],
      recentActions: [
        "Lançamento do Programa BNDES Inovação 2023",
        "Aprovação de financiamento para projetos de tecnologia agrícola sustentável",
        "Parceria com universidades para desenvolvimento de novas tecnologias para o agronegócio"
      ],
      responsibilityAreas: [
        "Avaliação e aprovação de crédito para projetos de inovação",
        "Desenvolvimento de produtos financeiros para fomento à inovação",
        "Coordenação de programas de apoio à indústria e comércio exterior"
      ],
      lastUpdated: "2023-11-20",
      dataSource: "Site oficial do BNDES e Portal da Transparência"
    },
    {
      id: 3,
      name: "Nelson Barbosa",
      position: "Diretor de Planejamento e Estruturação de Projetos",
      department: "Diretoria de Planejamento",
      institution: "BNDES",
      creditProgram: "BNDES Finem",
      authority: "alta",
      region: "Nacional",
      contactInfo: "diretoria.planejamento@bndes.gov.br",
      email: "nelson.barbosa@bndes.gov.br",
      phone: "+55 (21) 2052-7440",
      officeAddress: "Av. República do Chile, 100 - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2023-01-30",
      education: "Doutor em Economia pela New School for Social Research (EUA)",
      careerBackground: "Ex-ministro da Fazenda (2015-2016) e do Planejamento (2014-2015), professor da FGV e da UnB",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/16/Nelson_Barbosa.jpg",
      biography: "Ex-ministro da Fazenda e do Planejamento, responsável por estruturar grandes projetos de financiamento. Traz vasta experiência em política econômica e gestão pública para o BNDES.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/nelson-barbosa/",
        twitter: "https://twitter.com/nbarbosa"
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/quem-somos/governanca-controle/Diretoria",
      recentPublications: [
        "Financiamento do Desenvolvimento Econômico",
        "Política Fiscal e Desenvolvimento Regional",
        "Estratégias para Infraestrutura de Transportes no Brasil"
      ],
      recentActions: [
        "Coordenação do plano de financiamento para grandes obras de infraestrutura",
        "Aprovação de linha de crédito para modernização de frotas de transporte",
        "Desenvolvimento do Programa BNDES Infraestrutura Sustentável"
      ],
      responsibilityAreas: [
        "Planejamento estratégico de projetos de infraestrutura",
        "Coordenação de financiamentos para transporte e logística",
        "Estruturação de grandes projetos de desenvolvimento regional"
      ],
      lastUpdated: "2023-11-25",
      dataSource: "Site oficial do BNDES e Diário Oficial da União"
    },
    {
      id: 4,
      name: "Alexandre Abreu",
      position: "Diretor Financeiro e de Crédito",
      department: "Diretoria Financeira",
      institution: "BNDES",
      creditProgram: "BNDES Finame",
      authority: "alta",
      region: "Nacional",
      contactInfo: "diretoria.financeira@bndes.gov.br",
      email: "alexandre.abreu@bndes.gov.br",
      phone: "+55 (21) 2052-7420",
      officeAddress: "Av. República do Chile, 100, 12º andar - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2023-03-10",
      education: "Doutor em Finanças pela FGV, MBA em Finanças pelo INSEAD, Bacharel em Economia pela PUC-Rio",
      careerBackground: "Ex-CFO de grande instituição financeira, ex-diretor do Banco Central, consultor em estratégia financeira para o setor público",
      photoUrl: "https://via.placeholder.com/150?text=Alexandre+Abreu",
      biography: "Responsável pela gestão financeira e operações de crédito do banco. Coordena a estruturação financeira de grandes operações de financiamento para infraestrutura e projetos estratégicos, além de gerenciar a captação de recursos nacionais e internacionais para o BNDES.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/alexandre-abreu-finanças/"
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/quem-somos/governanca-controle/Diretoria",
      recentPublications: [
        "Financiamento de Longo Prazo para Infraestrutura no Brasil",
        "Estruturas Financeiras para Projetos de Desenvolvimento Sustentável"
      ],
      recentActions: [
        "Estruturação da captação internacional de US$ 2 bilhões para projetos de infraestrutura sustentável",
        "Implementação de novo modelo de gestão financeira para operações de crédito rural",
        "Desenvolvimento de instrumentos financeiros para financiamento de projetos de transição energética",
        "Coordenação da reestruturação da política de garantias do BNDES para grandes projetos"
      ],
      responsibilityAreas: [
        "Gestão do fluxo financeiro das operações de crédito",
        "Coordenação de captações nacionais e internacionais",
        "Estruturação financeira de grandes projetos",
        "Supervisão da política de garantias e colaterais"
      ],
      lastUpdated: "2023-11-15",
      dataSource: "Site oficial do BNDES e Relatório Anual de Atividades"
    },
    {
      id: 5,
      name: "Natália Dias",
      position: "Diretora de Infraestrutura, Transição Energética e Mudança Climática",
      department: "Diretoria de Infraestrutura",
      institution: "BNDES",
      creditProgram: "BNDES Finem Infraestrutura",
      authority: "alta",
      region: "Nacional",
      contactInfo: "dir.infraestrutura@bndes.gov.br",
      email: "natalia.dias@bndes.gov.br",
      phone: "+55 (21) 2052-7500",
      officeAddress: "Av. República do Chile, 100, 15º andar - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2023-02-20",
      education: "Doutora em Engenharia de Infraestrutura pela COPPE/UFRJ, MBA em Finanças pelo INSPER",
      careerBackground: "Ex-secretária nacional de infraestrutura, ex-diretora de projetos na EPL, consultora em estruturação de projetos de infraestrutura e transição energética",
      photoUrl: "https://via.placeholder.com/150?text=Natália+Dias",
      biography: "Responsável por operações de financiamento para projetos de infraestrutura, incluindo infraestrutura de transporte. Lidera a análise e aprovação de grandes projetos de infraestrutura sustentável, com foco em transição energética e mobilidade de baixo carbono.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/natalia-dias-infraestrutura/"
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/bndes-finem-infraestrutura",
      recentPublications: [
        "Financiamento da Transição Energética no Brasil",
        "Estruturação de Projetos para Infraestrutura Resiliente às Mudanças Climáticas"
      ],
      recentActions: [
        "Aprovação de projetos de energia renovável totalizando R$ 15 bilhões",
        "Estruturação de programa de financiamento para modernização da infraestrutura portuária",
        "Coordenação do programa de investimentos em mobilidade urbana sustentável",
        "Desenvolvimento de linha de crédito para infraestrutura de biocombustíveis"
      ],
      responsibilityAreas: [
        "Análise e aprovação de projetos de infraestrutura",
        "Estruturação financeira de grandes projetos de energia renovável",
        "Desenvolvimento de programas para mobilidade urbana sustentável",
        "Coordenação da estratégia de financiamento à transição energética"
      ],
      lastUpdated: "2023-11-20",
      dataSource: "Site oficial do BNDES e Relatório de Infraestrutura Sustentável"
    },
    {
      id: 6,
      name: "Tereza Campello",
      position: "Diretora Socioambiental",
      department: "Diretoria Socioambiental",
      institution: "BNDES",
      creditProgram: "BNDES Fundo Social",
      authority: "alta",
      region: "Nacional",
      contactInfo: "diretoria.socioambiental@bndes.gov.br",
      email: "tereza.campello@bndes.gov.br",
      phone: "+55 (21) 2052-7525",
      officeAddress: "Av. República do Chile, 100, 14º andar - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2023-02-08",
      education: "Doutora em Saúde Pública pela FIOCRUZ, Mestre em Desenvolvimento Econômico pela UNICAMP",
      careerBackground: "Ex-ministra do Desenvolvimento Social (2011-2016), consultora da FAO e OMS, pesquisadora em políticas públicas para superação da pobreza",
      photoUrl: "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/tereza_campello_bio_1.jpg",
      biography: "Ex-ministra do Desenvolvimento Social, responsável por programas sociais e ambientais do banco. Coordena a estratégia de financiamento para economia solidária, agricultura familiar e projetos de impacto social, com foco em desenvolvimento regional e sustentabilidade.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/tereza-campello/",
        twitter: "https://twitter.com/terezacampello"
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/fundo-social",
      recentPublications: [
        "Desenvolvimento Social e Econômico: Financiando a Redução das Desigualdades",
        "Economia Solidária como Estratégia de Desenvolvimento Regional"
      ],
      recentActions: [
        "Lançamento de linha de financiamento para cooperativas de agricultura familiar",
        "Estruturação do programa de desenvolvimento territorial sustentável",
        "Implementação de critérios socioambientais para todas as linhas de crédito do BNDES",
        "Coordenação de programa de apoio a empreendimentos da economia solidária"
      ],
      responsibilityAreas: [
        "Gestão do Fundo Social do BNDES",
        "Desenvolvimento de programas de financiamento com impacto socioambiental",
        "Coordenação da estratégia ESG nas operações do banco",
        "Articulação com órgãos públicos para políticas de desenvolvimento social"
      ],
      lastUpdated: "2023-11-15",
      dataSource: "Site oficial do BNDES e Relatório de Atividades Socioambientais"
    },
    {
      id: 7,
      name: "Luiz Correia",
      position: "Superintendente da Área de Agronegócio",
      department: "Área de Agronegócio",
      institution: "BNDES",
      creditProgram: "BNDES Rural",
      authority: "média",
      region: "Nacional",
      contactInfo: "agronegocio@bndes.gov.br",
      email: "luiz.correia@bndes.gov.br",
      phone: "+55 (21) 2052-7550",
      officeAddress: "Av. República do Chile, 100 - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2022-09-15",
      education: "Mestre em Economia Agrícola pela ESALQ/USP",
      careerBackground: "Mais de 20 anos de experiência no setor de financiamento agrícola, ex-consultor da FAO",
      photoUrl: "https://via.placeholder.com/150?text=Luiz+Correia",
      biography: "Responsável pela análise e aprovação de projetos no setor de agronegócio. Especialista em sistemas de financiamento para agricultura sustentável e cadeias produtivas do agronegócio.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/luiz-correia-agronegocio/"
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/bndes-credito-rural",
      recentPublications: [
        "Financiamento para Agricultura de Baixo Carbono",
        "Novas Tecnologias no Agronegócio: Oportunidades de Financiamento"
      ],
      recentActions: [
        "Aprovação de pacote de financiamento para irrigação sustentável",
        "Desenvolvimento de linha de crédito para agroindústria familiar",
        "Estruturação de garantias para pequenos produtores rurais"
      ],
      responsibilityAreas: [
        "Avaliação de projetos de financiamento para o agronegócio",
        "Coordenação de programas de crédito rural",
        "Desenvolvimento de novos produtos financeiros para o setor agrícola",
        "Análise de viabilidade de empreendimentos agroindustriais"
      ],
      lastUpdated: "2023-10-20",
      dataSource: "Site oficial do BNDES e Anuário do Agronegócio"
    },
    {
      id: 8,
      name: "Carlos Alberto da Silva",
      position: "Superintendente da Área de Transportes",
      department: "Área de Infraestrutura",
      institution: "BNDES",
      creditProgram: "BNDES Finem Transporte",
      authority: "média",
      region: "Nacional",
      contactInfo: "transportes@bndes.gov.br",
      email: "carlos.silva@bndes.gov.br",
      phone: "+55 (21) 2052-7560",
      officeAddress: "Av. República do Chile, 100 - Centro, Rio de Janeiro - RJ, 20031-917",
      appointmentDate: "2022-07-20",
      education: "Doutorado em Engenharia de Transportes pela COPPE/UFRJ",
      careerBackground: "Ex-diretor na ANTT, atuou como consultor em projetos de infraestrutura de transporte na América Latina",
      photoUrl: "https://via.placeholder.com/150?text=Carlos+Alberto",
      biography: "Responsável pela análise e aprovação de projetos no setor de transportes. Especialista em modelos de financiamento para infraestrutura logística e inovação no setor de transportes.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/carlos-alberto-silva-transportes/"
      },
      officialWebsite: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/bndes-finem-mobilidade-urbana",
      recentPublications: [
        "Financiamento para Renovação de Frotas de Transporte de Carga",
        "Modelos de Concessão em Infraestrutura Ferroviária"
      ],
      recentActions: [
        "Aprovação de financiamento para projeto de mobilidade urbana em capitais",
        "Estruturação de linha de crédito para renovação de frota de caminhões",
        "Desenvolvimento de programa de financiamento para portos e terminais logísticos"
      ],
      responsibilityAreas: [
        "Avaliação de projetos de infraestrutura de transportes",
        "Estruturação de financiamentos para rodovias, ferrovias e portos",
        "Análise de viabilidade econômica de projetos de logística",
        "Desenvolvimento de programas de crédito para o setor de transportes"
      ],
      lastUpdated: "2023-11-15",
      dataSource: "Site oficial do BNDES e Relatório Setorial de Transportes"
    },
    
    // Banco do Brasil - Crédito Rural
    {
      id: 9,
      name: "Tarciana Medeiros",
      position: "Presidente",
      department: "Presidência",
      institution: "Banco do Brasil",
      creditProgram: "FCO Rural",
      authority: "alta",
      region: "Nacional",
      contactInfo: "presidencia@bb.com.br",
      email: "tarciana.medeiros@bb.com.br",
      phone: "+55 (61) 3493-9002",
      officeAddress: "SAUN Quadra 5, Lote B, Ed. Banco do Brasil - Asa Norte, Brasília - DF, 70040-912",
      appointmentDate: "2023-01-16",
      education: "MBA em Gestão Financeira pela Universidade Federal da Paraíba (UFPB)",
      careerBackground: "Funcionária de carreira do Banco do Brasil desde 2000, com experiência em áreas como Varejo, Agronegócio e Alta Gestão",
      photoUrl: "https://s2.glbimg.com/pSBHzv4Hoi_6mzg0Xht2HvXeRzA=/0x0:1000x667/924x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_63b422c2caee4269b8b34177e8876b93/internal_photos/bs/2023/y/B/vyVSEKQqAsRs6C6Lj0aA/whatsapp-image-2023-01-16-at-14.09.24.jpeg",
      biography: "Primeira mulher a presidir o Banco do Brasil em mais de 200 anos de história, tem autoridade sobre aprovações de grandes linhas de crédito. Antes de assumir a presidência, foi Gerente Executiva na Diretoria de Governo.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/tarciana-medeiros/",
      },
      officialWebsite: "https://www.bb.com.br/pbb/pagina-inicial/sobre-nos/quem-somos#/",
      recentPublications: [
        "Plano de Expansão do Crédito Rural 2023",
        "Relatório de Sustentabilidade do Banco do Brasil 2022"
      ],
      recentActions: [
        "Lançamento do Plano Safra 2023/2024 com R$ 50 bilhões para agricultura familiar",
        "Criação de linhas especiais para produtores rurais afetados por desastres climáticos",
        "Implementação de programas de crédito para modernização de frotas e agricultura de baixo carbono"
      ],
      responsibilityAreas: [
        "Aprovação final de grandes operações de crédito",
        "Definição da estratégia de crédito rural do banco",
        "Articulação com o governo para políticas de financiamento ao agronegócio",
        "Supervisão das diretorias de Agronegócios e Empresarial"
      ],
      lastUpdated: "2023-12-01",
      dataSource: "Site oficial do Banco do Brasil e Diário Oficial da União"
    },
    {
      id: 10,
      name: "José Ricardo Sasseron",
      position: "Vice-presidente de Agronegócios",
      department: "Diretoria de Agronegócios",
      institution: "Banco do Brasil",
      creditProgram: "Pronaf",
      authority: "alta",
      region: "Nacional",
      contactInfo: "vp.agronegocio@bb.com.br",
      email: "jose.sasseron@bb.com.br",
      phone: "+55 (61) 3493-9080",
      officeAddress: "SAUN Quadra 5, Lote B, Edifício Banco do Brasil, 16º andar - Asa Norte, Brasília - DF, 70040-912",
      appointmentDate: "2023-01-20",
      education: "Doutorado em Economia do Agronegócio pela ESALQ/USP, MBA em Administração pelo INSEAD",
      careerBackground: "Mais de 25 anos de experiência no setor bancário, Ex-diretor do Banco Central na área de crédito rural, Ex-presidente da Associação Brasileira de Agronegócio",
      photoUrl: "https://via.placeholder.com/150?text=Jose+Ricardo+Sasseron",
      biography: "Responsável pela estratégia e diretrizes para o financiamento do agronegócio pelo Banco do Brasil. Lidera todas as iniciativas relacionadas ao setor agrícola e coordena as equipes responsáveis por desenvolver e implementar produtos financeiros para o agronegócio em nível nacional.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/jose-ricardo-sasseron/"
      },
      officialWebsite: "https://www.bb.com.br/agronegocio",
      recentPublications: [
        "O Papel do Crédito no Desenvolvimento do Agronegócio Brasileiro",
        "Transformação Digital no Financiamento Agrícola"
      ],
      recentActions: [
        "Lançamento da plataforma digital de crédito rural do Banco do Brasil",
        "Negociação de R$ 120 bilhões para o Plano Safra 2023/2024",
        "Estabelecimento de parceria com cooperativas para ampliar o acesso ao crédito rural",
        "Criação do programa de financiamento para tecnologias de agricultura de precisão"
      ],
      responsibilityAreas: [
        "Definição da estratégia de financiamento agrícola do banco",
        "Supervisão das linhas de crédito para o agronegócio",
        "Coordenação das superintendências regionais de agronegócios",
        "Articulação com ministérios e órgãos governamentais para políticas de crédito rural"
      ],
      lastUpdated: "2023-11-15",
      dataSource: "Site oficial do Banco do Brasil e Relatórios da Diretoria de Agronegócios"
    },
    {
      id: 11,
      name: "Geovanne Tobias",
      position: "Diretor de Crédito Rural",
      department: "Diretoria de Agronegócios",
      institution: "Banco do Brasil",
      creditProgram: "Moderagro",
      authority: "alta",
      region: "Nacional",
      contactInfo: "dirao.rural@bb.com.br",
      email: "geovanne.tobias@bb.com.br",
      phone: "+55 (61) 3493-9120",
      officeAddress: "SAUN Quadra 5, Lote B, Edifício Banco do Brasil, 15º andar - Asa Norte, Brasília - DF, 70040-912",
      appointmentDate: "2023-02-15",
      education: "MBA em Agronegócio pela FGV, Especialização em Finanças pelo IBMEC, Bacharel em Administração pela UnB",
      careerBackground: "Funcionário de carreira do Banco do Brasil há 22 anos, Ex-superintendente regional de agronegócios, Ex-gerente executivo de operações rurais",
      photoUrl: "https://via.placeholder.com/150?text=Geovanne+Tobias",
      biography: "Responsável pela aprovação de linhas de crédito rural e agroindustrial. Possui ampla experiência na estruturação de operações de financiamento para o agronegócio, sendo um dos principais articuladores entre o banco e o setor produtivo rural.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/geovanne-tobias/"
      },
      officialWebsite: "https://www.bb.com.br/agronegocio",
      recentPublications: [
        "Modernização do Crédito Rural no Brasil: Oportunidades e Desafios",
        "Financiamento da Cadeia Produtiva do Agronegócio"
      ],
      recentActions: [
        "Estruturação de R$ 40 bilhões em linhas de crédito para o Plano Safra 2023/2024",
        "Implementação de sistema digital de aprovação de operações de crédito rural",
        "Desenvolvimento de linha de financiamento para tecnologias agrícolas sustentáveis",
        "Ampliação do acesso ao crédito para médios produtores rurais"
      ],
      responsibilityAreas: [
        "Gestão das operações de crédito rural do Banco do Brasil",
        "Aprovação de financiamentos para o setor agrícola em médio e grande porte",
        "Desenvolvimento de produtos financeiros para o agronegócio",
        "Coordenação da implementação do Plano Safra no âmbito do Banco do Brasil"
      ],
      lastUpdated: "2023-11-15",
      dataSource: "Site oficial do Banco do Brasil e Relatório de Agronegócios BB"
    },
    {
      id: 12,
      name: "Marta Silva",
      position: "Gerente Executiva de Agricultura Familiar",
      department: "Diretoria de Agronegócios",
      institution: "Banco do Brasil",
      creditProgram: "Pronaf",
      authority: "média",
      region: "Nacional",
      contactInfo: "agrifamiliar@bb.com.br",
      email: "marta.silva@bb.com.br",
      phone: "+55 (61) 3493-9315",
      officeAddress: "SAUN Quadra 5, Lote B, Edifício Banco do Brasil, 12º andar - Asa Norte, Brasília - DF, 70040-912",
      appointmentDate: "2023-03-10",
      education: "Mestre em Desenvolvimento Rural pela UFRGS, Especialista em Microfinanças pela FGV, Bacharel em Agronomia pela UnB",
      careerBackground: "Funcionária do Banco do Brasil há 16 anos, coordenou programas de microcrédito rural, atuou como assessora técnica na Embrapa e consultora em projetos do Ministério do Desenvolvimento Agrário",
      photoUrl: "https://via.placeholder.com/150?text=Marta+Silva",
      biography: "Responsável pela gestão do Programa Nacional de Fortalecimento da Agricultura Familiar. Coordena a implementação das políticas de crédito voltadas para a agricultura familiar em todas as agências do Banco do Brasil, atuando na interface entre o banco e organizações de produtores rurais.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/marta-silva-agroindustria/"
      },
      officialWebsite: "https://www.bb.com.br/pronaf",
      recentPublications: [
        "Inclusão Financeira na Agricultura Familiar: Desafios e Possibilidades",
        "Pronaf: 25 Anos Transformando o Campo Brasileiro"
      ],
      recentActions: [
        "Implementação do Pronaf Digital para agilizar aprovação de financiamentos",
        "Desenvolvimento de microcrédito orientado para agricultores familiares",
        "Expansão das operações de Pronaf Mulher e Pronaf Jovem",
        "Criação de linha específica para agroecologia e sistemas orgânicos"
      ],
      responsibilityAreas: [
        "Gestão operacional do Pronaf no Banco do Brasil",
        "Desenvolvimento de produtos financeiros adaptados à agricultura familiar",
        "Coordenação de capacitações para agentes de crédito rural",
        "Articulação com cooperativas e organizações de produtores rurais"
      ],
      lastUpdated: "2023-11-25",
      dataSource: "Site oficial do Banco do Brasil e Portal do Pronaf"
    },
    {
      id: 13,
      name: "Paulo Henrique Costa",
      position: "Superintendente Regional de Agronegócios - Centro-Oeste",
      department: "Superintendência Regional",
      institution: "Banco do Brasil",
      creditProgram: "FCO Rural",
      authority: "média",
      region: "Centro-Oeste",
      contactInfo: "super.co@bb.com.br",
      email: "paulo.costa@bb.com.br",
      phone: "+55 (61) 3493-9405",
      officeAddress: "SBS Quadra 1, Bloco A, Lote 31, Ed. Sede I do Banco do Brasil, 7º andar - Brasília - DF, 70073-900",
      appointmentDate: "2022-09-20",
      education: "MBA em Agronegócio pelo INSPER, Especialista em Crédito pelo IBMEC, Graduado em Administração pela Fundação Getúlio Vargas",
      careerBackground: "Funcionário do Banco do Brasil há 18 anos, foi gerente de agronegócios em Mato Grosso, gerente geral de agências em Goiás e assessor da diretoria de agronegócios",
      photoUrl: "https://via.placeholder.com/150?text=Paulo+Henrique+Costa",
      biography: "Responsável pela aprovação de operações de crédito rural na região Centro-Oeste. Coordena a distribuição dos recursos do Fundo Constitucional do Centro-Oeste (FCO Rural) para financiamentos agropecuários nos estados de Goiás, Mato Grosso, Mato Grosso do Sul e Distrito Federal.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/paulo-costa-agro/"
      },
      officialWebsite: "https://www.bb.com.br/agronegocio/fco",
      recentPublications: [
        "FCO Rural: Estratégias de Aplicação para o Desenvolvimento Regional",
        "Análise do Perfil de Financiamentos Agropecuários no Centro-Oeste"
      ],
      recentActions: [
        "Implementação de sistema de análise georreferenciada para aprovação de crédito rural",
        "Desenvolvimento de programa de financiamento para tecnologias de agricultura de precisão",
        "Coordenação da expansão do crédito para produtores de médio porte",
        "Simplificação dos processos de contratação para produtores do Cerrado"
      ],
      responsibilityAreas: [
        "Gestão do FCO Rural na região Centro-Oeste",
        "Coordenação de financiamentos para cadeias produtivas estratégicas",
        "Implementação de políticas específicas para a agropecuária da região",
        "Análise e aprovação de grandes operações de crédito rural"
      ],
      lastUpdated: "2023-11-30",
      dataSource: "Site oficial do Banco do Brasil e Relatório do FCO Rural"
    },
    
    // Caixa Econômica Federal
    {
      id: 14,
      name: "Carlos Vieira",
      position: "Presidente",
      department: "Presidência",
      institution: "Caixa Econômica Federal",
      creditProgram: "Caixa MPE",
      authority: "alta",
      region: "Nacional",
      contactInfo: "presidencia@caixa.gov.br",
      email: "carlos.vieira@caixa.gov.br",
      phone: "+55 (61) 3206-9000",
      officeAddress: "SBS Quadra 4, Lotes 3/4, Ed. Matriz da Caixa - Brasília - DF, 70092-900",
      appointmentDate: "2023-01-12",
      education: "Bacharel em Direito, Mestre em Administração Pública pela FGV e MBA em Finanças pelo IBMEC",
      careerBackground: "Ex-vice-presidente da Caixa, funcionário de carreira há 30 anos, ex-presidente do Conselho de Administração da Funcef",
      photoUrl: "https://opopularmm.com.br/wp-content/uploads/2023/01/Carlos-Vieira.jpg",
      biography: "Como presidente da Caixa, tem autoridade sobre aprovações de grandes linhas de crédito e programas de financiamento. Lidera a implementação de políticas de crédito para micro e pequenas empresas, infraestrutura e habitação.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/carlos-vieira-caixa/"
      },
      officialWebsite: "https://www.caixa.gov.br/sobre-a-caixa/governanca-corporativa/administracao/Paginas/default.aspx",
      recentPublications: [
        "Relatório de Sustentabilidade Caixa 2023",
        "Plano Estratégico da Caixa 2023-2027"
      ],
      recentActions: [
        "Lançamento de linha de crédito para desenvolvimento do transporte regional",
        "Ampliação do programa de financiamento para pequenos produtores rurais",
        "Implementação de nova política de juros para MPEs",
        "Flexibilização das garantias para financiamento de equipamentos e frota"
      ],
      responsibilityAreas: [
        "Aprovação final de grandes linhas de crédito",
        "Definição de diretrizes de financiamento para setores prioritários",
        "Aprovação de programas especiais de crédito",
        "Gestão das políticas de crédito para desenvolvimento econômico"
      ],
      lastUpdated: "2023-12-01",
      dataSource: "Site oficial da Caixa Econômica Federal e Portal da Transparência"
    },
    {
      id: 15,
      name: "Rodrigo Hideki",
      position: "Vice-presidente de Logística",
      department: "Vice-Presidência de Logística",
      institution: "Caixa Econômica Federal",
      creditProgram: "Caixa Transportes",
      authority: "alta",
      region: "Nacional",
      contactInfo: "vp.logistica@caixa.gov.br",
      email: "rodrigo.hideki@caixa.gov.br",
      phone: "+55 (61) 3206-9320",
      officeAddress: "SBS Quadra 4, Lotes 3/4, Ed. Matriz da Caixa, 19º andar - Brasília - DF, 70092-900",
      appointmentDate: "2023-02-15",
      education: "Doutor em Engenharia de Transportes pela USP, MBA em Gestão Empresarial pela FGV",
      careerBackground: "Ex-diretor de infraestrutura do BNDES, ex-secretário adjunto de logística do Ministério da Infraestrutura, consultor de empresas do setor de transporte",
      photoUrl: "https://via.placeholder.com/150?text=Rodrigo+Hideki",
      biography: "Responsável por aprovações de financiamentos para empresas de transporte e logística. Coordena programas de crédito para renovação de frotas, infraestrutura logística e desenvolvimento de corredores de transporte.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/rodrigo-hideki-transporte/"
      },
      officialWebsite: "https://www.caixa.gov.br/empresa/credito-financiamento/transportes/Paginas/default.aspx",
      recentPublications: [
        "Financiamento da Mobilidade Urbana Sustentável",
        "Modelos de Crédito para Renovação de Frota de Transporte de Cargas"
      ],
      recentActions: [
        "Lançamento do programa de financiamento para modernização de frotas de caminhões e ônibus",
        "Implementação de linha de crédito para infraestrutura logística de pequeno e médio porte",
        "Desenvolvimento de solução financeira específica para transportadoras autônomas",
        "Estruturação de garantias alternativas para financiamentos no setor de transporte"
      ],
      responsibilityAreas: [
        "Gestão de programas de financiamento para o setor de transportes",
        "Aprovação de operações de crédito para renovação de frotas",
        "Financiamento de infraestrutura logística",
        "Desenvolvimento de soluções financeiras para o modal rodoviário"
      ],
      lastUpdated: "2023-11-15",
      dataSource: "Site oficial da Caixa Econômica Federal e Relatório de Financiamentos do Setor de Transportes"
    },
    {
      id: 16,
      name: "Adriana Nascimento",
      position: "Vice-presidente de Negócios de Governo",
      department: "Vice-Presidência de Negócios de Governo",
      institution: "Caixa Econômica Federal",
      creditProgram: "Crédito Rural Caixa",
      authority: "alta",
      region: "Nacional",
      contactInfo: "vp.governo@caixa.gov.br",
      email: "adriana.nascimento@caixa.gov.br",
      phone: "+55 (61) 3206-9450",
      officeAddress: "SBS Quadra 4, Lotes 3/4, Ed. Matriz da Caixa, 21º andar - Brasília - DF, 70092-900",
      appointmentDate: "2023-03-01",
      education: "Doutora em Economia do Setor Público pela UERJ, MBA em Gestão Pública pela FGV",
      careerBackground: "Funcionária de carreira da Caixa há 22 anos, ex-superintendente nacional de governo, ex-assessora do Ministério da Economia, professora de Economia em tempo parcial na UnB",
      photoUrl: "https://via.placeholder.com/150?text=Adriana+Nascimento",
      biography: "Responsável pela gestão dos programas de financiamento destinados ao setor público e rural. Coordena linhas de crédito para infraestrutura municipal, desenvolvimento rural e agricultura familiar, com foco na implementação de políticas públicas via crédito.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/adriana-nascimento-caixa/"
      },
      officialWebsite: "https://www.caixa.gov.br/poder-publico/infraestrutura-saneamento/Paginas/default.aspx",
      recentPublications: [
        "Financiamento Público para o Desenvolvimento Rural",
        "O Papel dos Bancos Públicos no Crédito Agrícola"
      ],
      recentActions: [
        "Implementação da linha de crédito especial para municípios investirem em infraestrutura rural",
        "Desenvolvimento de produtos financeiros para cooperativas agrícolas",
        "Estruturação do programa de financiamento para irrigação e armazenagem rural",
        "Simplificação do acesso ao crédito para pequenos agricultores"
      ],
      responsibilityAreas: [
        "Gestão das linhas de crédito rural da Caixa",
        "Coordenação de programas de financiamento para governos municipais",
        "Implementação de políticas de desenvolvimento rural via crédito",
        "Articulação com o Ministério da Agricultura para programas conjuntos"
      ],
      lastUpdated: "2023-11-10",
      dataSource: "Site oficial da Caixa Econômica Federal e Relatório de Crédito Rural"
    },
    
    // Ministério da Agricultura
    {
      id: 17,
      name: "Carlos Fávaro",
      position: "Ministro da Agricultura e Pecuária",
      department: "Ministério",
      institution: "Ministério da Agricultura e Pecuária",
      creditProgram: "Plano Safra",
      authority: "alta",
      region: "Nacional",
      contactInfo: "agenda.ministro@agricultura.gov.br",
      email: "ministro@agricultura.gov.br",
      phone: "+55 (61) 3218-2828",
      officeAddress: "Esplanada dos Ministérios, Bloco D - Brasília - DF, 70043-900",
      appointmentDate: "2023-01-02",
      education: "Engenheiro Agrônomo pela Universidade Federal de Mato Grosso (UFMT)",
      careerBackground: "Ex-senador por Mato Grosso, produtor rural, ex-vice-governador de Mato Grosso e ex-presidente da Aprosoja-MT",
      photoUrl: "https://www.gov.br/pt-br/noticias/agricultura-e-pecuaria/2023/01/carlos-favaro-toma-posse-como-ministro-da-agricultura-e-pecuaria/@@images/7b979abe-c553-4068-aa10-3d9dc626f4bc.jpeg",
      biography: "Como ministro, define diretrizes e políticas para programas de crédito rural e financiamento do agronegócio. Produtor rural com vasta experiência prática no setor, traz conhecimento técnico para a definição de políticas públicas para o setor agrícola.",
      socialMedia: {
        twitter: "https://twitter.com/favarosenador"
      },
      officialWebsite: "https://www.gov.br/agricultura/pt-br",
      recentPublications: [
        "Plano Safra 2023/2024: Inovação e Sustentabilidade",
        "Diretrizes para o Crédito Rural no Brasil"
      ],
      recentActions: [
        "Lançamento do maior Plano Safra da história, com R$ 364,22 bilhões em crédito rural",
        "Criação de linhas especiais para recuperação ambiental e agricultura de baixo carbono",
        "Implementação de medidas para desburocratização do crédito rural",
        "Negociação internacional para abertura de mercados para produtos agrícolas brasileiros"
      ],
      responsibilityAreas: [
        "Coordenação do Plano Safra anual",
        "Definição de políticas de financiamento para o agronegócio",
        "Aprovação de programas de crédito para médios e grandes produtores rurais",
        "Articulação com instituições financeiras para execução de políticas de crédito rural"
      ],
      lastUpdated: "2023-12-10",
      dataSource: "Site oficial do Ministério da Agricultura e Portal da Transparência"
    },
    {
      id: 18,
      name: "Guilherme Campos",
      position: "Secretário de Política Agrícola",
      department: "Secretaria de Política Agrícola",
      institution: "Ministério da Agricultura e Pecuária",
      creditProgram: "Plano Safra",
      authority: "alta",
      region: "Nacional",
      contactInfo: "spa@agricultura.gov.br",
      email: "guilherme.campos@agricultura.gov.br",
      phone: "+55 (61) 3218-2510",
      officeAddress: "Esplanada dos Ministérios, Bloco D, Anexo A - Brasília - DF, 70043-900",
      appointmentDate: "2023-02-15",
      education: "Doutor em Economia Agrícola pela USP",
      careerBackground: "Ex-presidente da Conab, consultor de commodities agrícolas, ex-diretor de políticas públicas na CNA",
      photoUrl: "https://via.placeholder.com/150?text=Guilherme+Campos",
      biography: "Responsável pela política nacional de crédito rural e gestão do Plano Safra. Implementa as diretrizes para os programas de financiamento à agricultura e pecuária, sendo o principal gestor técnico do Plano Safra anual.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/guilherme-campos-agricultura/"
      },
      officialWebsite: "https://www.gov.br/agricultura/pt-br/assuntos/politica-agricola",
      recentPublications: [
        "Nota técnica: Mecanismos de Financiamento do Plano Safra",
        "Estudo sobre Seguro Rural e Gestão de Riscos na Agricultura"
      ],
      recentActions: [
        "Coordenação da estruturação do Plano Safra 2023/2024",
        "Implementação de programa de crédito para recuperação de áreas degradadas",
        "Ampliação do seguro rural para pequenos produtores",
        "Desenvolvimento de linhas especiais para agricultura de baixo carbono"
      ],
      responsibilityAreas: [
        "Coordenação técnica do Plano Safra",
        "Gestão de programas de crédito rural",
        "Política de garantia de preços mínimos",
        "Gestão de riscos e seguro rural"
      ],
      lastUpdated: "2023-11-30",
      dataSource: "Site oficial do Ministério da Agricultura e publicações do Diário Oficial da União"
    },
    {
      id: 19,
      name: "Wilson Vaz de Araújo",
      position: "Diretor de Crédito Rural",
      department: "Secretaria de Política Agrícola",
      institution: "Ministério da Agricultura e Pecuária",
      creditProgram: "Plano Safra",
      authority: "média",
      region: "Nacional",
      contactInfo: "dcr@agricultura.gov.br",
      email: "wilson.araujo@agricultura.gov.br",
      phone: "+55 (61) 3218-2545",
      officeAddress: "Esplanada dos Ministérios, Bloco D, Anexo A, Sala 238 - Brasília - DF, 70043-900",
      appointmentDate: "2022-07-10",
      education: "Mestre em Economia Rural pela Universidade de Viçosa",
      careerBackground: "Servidor de carreira do Ministério da Agricultura há 25 anos, trabalhou anteriormente no Banco do Brasil como analista de crédito rural",
      photoUrl: "https://via.placeholder.com/150?text=Wilson+Vaz+de+Araújo",
      biography: "Responsável pela operacionalização dos programas de crédito rural. Coordena a implementação técnica das linhas de financiamento do Plano Safra e serve como principal interlocutor entre o Ministério e as instituições financeiras.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/wilson-vaz-araujo/"
      },
      officialWebsite: "https://www.gov.br/agricultura/pt-br/assuntos/politica-agricola/credito-rural",
      recentPublications: [
        "Manual Operativo do Crédito Rural 2023",
        "Análise do Desempenho das Linhas de Crédito Rural por Região"
      ],
      recentActions: [
        "Implementação do sistema digital de concessão de crédito rural",
        "Simplificação dos processos de análise e aprovação de financiamentos",
        "Integração das bases de dados do crédito rural com sistemas de monitoramento ambiental",
        "Coordenação da distribuição de recursos do Plano Safra entre as regiões brasileiras"
      ],
      responsibilityAreas: [
        "Operacionalização dos programas de crédito rural",
        "Articulação com instituições financeiras para implementação do Plano Safra",
        "Monitoramento da execução das linhas de crédito",
        "Elaboração de normativos técnicos para concessão de financiamentos rurais"
      ],
      lastUpdated: "2023-11-25",
      dataSource: "Site oficial do Ministério da Agricultura e Manual de Crédito Rural"
    },
    
    // Ministério dos Transportes
    {
      id: 20,
      name: "Renan Filho",
      position: "Ministro dos Transportes",
      department: "Ministério",
      institution: "Ministério dos Transportes",
      creditProgram: "Financiamento de Infraestrutura de Transportes",
      authority: "alta",
      region: "Nacional",
      contactInfo: "gabinete.ministro@transportes.gov.br",
      email: "ministro@transportes.gov.br",
      phone: "+55 (61) 2029-7010",
      officeAddress: "Esplanada dos Ministérios, Bloco R - Brasília - DF, 70044-902",
      appointmentDate: "2023-01-01",
      education: "Economista pela Universidade Federal de Alagoas (UFAL)",
      careerBackground: "Governador de Alagoas por dois mandatos (2015-2022), deputado federal (2011-2014), vice-governador de Alagoas (2011)",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Ministro_Renan_Filho.jpg",
      biography: "Como ministro, define diretrizes e políticas para programas de financiamento de infraestrutura de transportes. Com experiência executiva como ex-governador, tem atuado na viabilização de grandes projetos de infraestrutura logística.",
      socialMedia: {
        twitter: "https://twitter.com/renanfilho_",
        linkedin: "https://www.linkedin.com/in/renan-filho-oficial/"
      },
      officialWebsite: "https://www.gov.br/transportes/pt-br",
      recentPublications: [
        "Plano Nacional de Logística 2035",
        "Programa de Aceleração do Investimento em Infraestrutura Logística"
      ],
      recentActions: [
        "Lançamento do Novo PAC Transportes com R$ 280 bilhões em investimentos para o setor",
        "Implementação do programa de concessões de rodovias e ferrovias",
        "Criação de linhas de crédito específicas para renovação de frotas de caminhões",
        "Desenvolvimento do programa de hidrovias para transporte de grãos"
      ],
      responsibilityAreas: [
        "Planejamento e implementação de políticas de infraestrutura de transportes",
        "Gestão de programas de financiamento para o setor logístico",
        "Regulação do transporte rodoviário de cargas",
        "Coordenação de projetos estruturantes em rodovias, ferrovias, portos e aeroportos"
      ],
      lastUpdated: "2023-12-05",
      dataSource: "Site oficial do Ministério dos Transportes e Portal da Transparência"
    },
    {
      id: 21,
      name: "George Santoro",
      position: "Secretário de Fomento e Parcerias",
      department: "Secretaria de Fomento e Parcerias",
      institution: "Ministério dos Transportes",
      creditProgram: "Financiamento para Empresas de Transporte",
      authority: "alta",
      region: "Nacional",
      contactInfo: "sfp@transportes.gov.br",
      email: "george.santoro@transportes.gov.br",
      phone: "+55 (61) 2029-7250",
      officeAddress: "Esplanada dos Ministérios, Bloco R, Anexo, 4º andar - Brasília - DF, 70044-902",
      appointmentDate: "2023-02-10",
      education: "Doutor em Economia do Transporte pela FGV-SP, MBA em Gestão de Projetos pela Universidade de Califórnia",
      careerBackground: "Ex-diretor da EPL (Empresa de Planejamento e Logística), Gerente de concessões na ANTT, Consultor de infraestrutura no Banco Mundial",
      photoUrl: "https://via.placeholder.com/150?text=George+Santoro",
      biography: "Responsável pela atração de investimentos e parcerias para o setor de transportes, incluindo linhas de crédito. Especialista em estruturação de projetos de infraestrutura e concessões de transportes, com foco em modelos inovadores de financiamento.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/george-santoro/",
        twitter: "https://twitter.com/gsantoro_infra"
      },
      officialWebsite: "https://www.gov.br/transportes/pt-br/assuntos/sfp",
      recentPublications: [
        "Novas Estruturas de Financiamento para Projetos de Transporte",
        "Modelos de PPP para Infraestrutura Logística no Brasil"
      ],
      recentActions: [
        "Lançamento do programa de financiamento para renovação de frota de caminhões",
        "Estruturação do novo modelo de concessões de ferrovias",
        "Captação de R$ 12 bilhões em investimentos internacionais para projetos de infraestrutura",
        "Desenvolvimento de novas garantias para financiamento de embarcações"
      ],
      responsibilityAreas: [
        "Captação de investimentos para projetos de infraestrutura de transportes",
        "Estruturação de linhas de financiamento para o setor logístico",
        "Coordenação de parcerias público-privadas em transportes",
        "Desenvolvimento de modelos de negócios para portos, ferrovias e rodovias"
      ],
      lastUpdated: "2023-12-01",
      dataSource: "Site oficial do Ministério dos Transportes e Relatório de Projetos Prioritários"
    },
    
    // Banco Central - CMN
    {
      id: 22,
      name: "Roberto Campos Neto",
      position: "Presidente do Banco Central",
      department: "Presidência",
      institution: "Banco Central",
      creditProgram: "Regulamentação do Crédito Rural",
      authority: "alta",
      region: "Nacional",
      contactInfo: "secre.presid@bcb.gov.br",
      email: "roberto.camposneto@bcb.gov.br",
      phone: "+55 (61) 3414-1084",
      officeAddress: "Edifício-Sede do Banco Central, SBS Quadra 3, Bloco B - Brasília - DF, 70074-900",
      appointmentDate: "2019-02-26",
      education: "Mestre em Economia pela Universidade da Califórnia, Bacharel em Economia pela PUC-RJ",
      careerBackground: "Economista, ex-diretor do Santander Brasil, mais de 20 anos de experiência no mercado financeiro",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Roberto_Campos_Neto_2022.jpg",
      biography: "Como presidente do Banco Central e membro do Conselho Monetário Nacional, influencia nas regras de crédito rural e financiamentos. Tem papel decisivo na formulação da política monetária e na regulação do sistema financeiro nacional, incluindo normas para concessão de crédito agrícola e empresarial.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/roberto-campos-neto/"
      },
      officialWebsite: "https://www.bcb.gov.br/",
      recentPublications: [
        "Plano de Regulação do Sistema Financeiro 2023-2024",
        "Política Monetária e Desenvolvimento Econômico"
      ],
      recentActions: [
        "Aprovação da Resolução CMN 5.068 que flexibiliza requisitos para crédito rural",
        "Implementação do programa de modernização do Manual de Crédito Rural",
        "Regulamentação do programa de financiamento verde para o agronegócio",
        "Coordenação da criação do Sistema de Pagamentos Instantâneo (PIX)"
      ],
      responsibilityAreas: [
        "Presidência do Conselho Monetário Nacional (CMN)",
        "Formulação da política monetária nacional",
        "Aprovação das normas de crédito rural e empresarial",
        "Regulação e supervisão do sistema financeiro"
      ],
      lastUpdated: "2023-12-10",
      dataSource: "Site oficial do Banco Central e Diário Oficial da União"
    },
    {
      id: 23,
      name: "Fernando Haddad",
      position: "Ministro da Fazenda",
      department: "Ministério",
      institution: "Ministério da Fazenda",
      creditProgram: "Política Nacional de Crédito",
      authority: "alta",
      region: "Nacional",
      contactInfo: "gabinete.ministro@fazenda.gov.br",
      email: "ministro@fazenda.gov.br",
      phone: "+55 (61) 3412-2403",
      officeAddress: "Esplanada dos Ministérios, Bloco P, 5º andar - Brasília - DF, 70048-900",
      appointmentDate: "2023-01-01",
      education: "Doutor em Filosofia pela USP, Mestre em Economia pela USP, Bacharel em Direito pela USP",
      careerBackground: "Ex-prefeito de São Paulo (2013-2016), Ex-Ministro da Educação (2005-2012), Professor universitário",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/45/Foto_Oficial_-_Ministro_Fernando_Haddad.png",
      biography: "Como ministro da Fazenda e membro do Conselho Monetário Nacional, tem poder de decisão sobre políticas de crédito. Lidera a estratégia econômica do governo federal, definindo diretrizes de financiamento para setores estratégicos.",
      socialMedia: {
        twitter: "https://twitter.com/Haddad_Fernando",
        linkedin: "https://www.linkedin.com/in/fernando-haddad/"
      },
      officialWebsite: "https://www.gov.br/fazenda/pt-br",
      recentPublications: [
        "Reforma Tributária e Desenvolvimento Econômico",
        "Políticas de Incentivo ao Crédito Produtivo"
      ],
      recentActions: [
        "Implementação do programa de estímulo ao crédito para micro e pequenas empresas",
        "Coordenação da reforma tributária com mecanismos de incentivo a setores produtivos",
        "Lançamento da Política Nacional de Financiamento Verde",
        "Aprovação de novas linhas de crédito para recuperação econômica de setores afetados por calamidades"
      ],
      responsibilityAreas: [
        "Política econômica nacional",
        "Coordenação do Conselho Monetário Nacional",
        "Definição de diretrizes para políticas de crédito",
        "Elaboração de programas de incentivos fiscais e financeiros para setores estratégicos"
      ],
      lastUpdated: "2023-12-10",
      dataSource: "Site oficial do Ministério da Fazenda e Portal da Transparência"
    },
    {
      id: 24,
      name: "Simone Tebet",
      position: "Ministra do Planejamento",
      department: "Ministério",
      institution: "Ministério do Planejamento",
      creditProgram: "Planejamento de Programas de Crédito",
      authority: "alta",
      region: "Nacional",
      contactInfo: "gabinete.ministra@planejamento.gov.br",
      email: "simone.tebet@planejamento.gov.br",
      phone: "+55 (61) 2020-4554",
      officeAddress: "Esplanada dos Ministérios, Bloco K, 7º andar - Brasília - DF, 70040-906",
      appointmentDate: "2023-01-01",
      education: "Doutora em Direito pela Pontifícia Universidade Católica de São Paulo (PUC/SP), Bacharel em Direito pela UFRJ",
      careerBackground: "Ex-senadora da República (2019-2022), Ex-prefeita de Três Lagoas/MS (2005-2010), Ex-vice-governadora do MS (2011-2014)",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/Foto_Oficial_-_Ministra_Simone_Tebet.jpg",
      biography: "Como ministra do Planejamento e membro do Conselho Monetário Nacional, participa das decisões sobre programas de crédito. Responsável pela gestão do orçamento federal e pelo planejamento estratégico de políticas públicas, incluindo programas de financiamento produtivo.",
      socialMedia: {
        twitter: "https://twitter.com/simonetebetbr",
        linkedin: "https://www.linkedin.com/in/simone-tebet/"
      },
      officialWebsite: "https://www.gov.br/economia/pt-br/assuntos/planejamento-e-orcamento",
      recentPublications: [
        "Planejamento Estratégico para o Desenvolvimento Sustentável",
        "Orçamento Federal e Prioridades de Investimento"
      ],
      recentActions: [
        "Implementação do Novo PAC com foco em obras estratégicas para o desenvolvimento regional",
        "Estruturação do plano de investimentos em infraestrutura para o setor produtivo",
        "Coordenação do plano de alocação de recursos para financiamento de áreas estratégicas",
        "Articulação com bancos de desenvolvimento para alinhamento de prioridades de financiamento"
      ],
      responsibilityAreas: [
        "Planejamento estratégico do governo federal",
        "Gestão do orçamento público",
        "Membro do Conselho Monetário Nacional",
        "Coordenação de investimentos em setores prioritários"
      ],
      lastUpdated: "2023-11-25",
      dataSource: "Site oficial do Ministério do Planejamento e Portal da Transparência"
    },
    
    // BNB - Banco do Nordeste
    {
      id: 25,
      name: "Paulo Câmara",
      position: "Presidente",
      department: "Presidência",
      institution: "Banco do Nordeste",
      creditProgram: "FNE Rural",
      authority: "alta",
      region: "Nordeste",
      contactInfo: "gabinete@bnb.gov.br",
      email: "paulo.camara@bnb.gov.br",
      phone: "+55 (85) 3299-3200",
      officeAddress: "Av. Dr. Silas Munguba, 5700 - Passaré, Fortaleza - CE, 60743-902",
      appointmentDate: "2023-01-12",
      education: "Mestre em Gestão Pública pela Universidade Federal de Pernambuco (UFPE), Bacharel em Administração",
      careerBackground: "Ex-governador de Pernambuco (2015-2022), Ex-secretário de Fazenda de PE, Auditor Fiscal",
      photoUrl: "https://cdn.jornaldebrasilia.com.br/wp-content/uploads/2022/12/13133634/Paulo-Camara-Divulcacao-Banco-do-Nordeste.jpg",
      biography: "Como presidente do BNB, tem autoridade máxima sobre aprovações de crédito rural e empresarial no Nordeste. Principal responsável pela gestão do Fundo Constitucional de Financiamento do Nordeste (FNE), maior fundo de desenvolvimento regional do país.",
      socialMedia: {
        twitter: "https://twitter.com/paulocamara40",
        linkedin: "https://www.linkedin.com/in/paulo-camara/"
      },
      officialWebsite: "https://www.bnb.gov.br/",
      recentPublications: [
        "Financiamento Rural como Estratégia de Desenvolvimento Regional",
        "Perspectivas para o Nordeste 2023-2030"
      ],
      recentActions: [
        "Lançamento do Plano de Aplicação do FNE 2023 com R$ 25 bilhões para o setor rural",
        "Criação de linha especial para produtores afetados pela seca",
        "Implementação do programa de crédito verde para agricultura de baixo carbono",
        "Expansão do crédito para pequenos produtores rurais com juros subsidiados"
      ],
      responsibilityAreas: [
        "Gestão do Fundo Constitucional de Financiamento do Nordeste (FNE)",
        "Aprovação de operações de grande porte para o setor rural e empresarial",
        "Definição de políticas de crédito para o desenvolvimento regional",
        "Coordenação de programas específicos de financiamento para o setor agropecuário"
      ],
      lastUpdated: "2023-11-28",
      dataSource: "Site oficial do Banco do Nordeste e Relatórios de Gestão"
    },
    {
      id: 26,
      name: "Bruno Gouveia",
      position: "Diretor de Negócios Rurais",
      department: "Diretoria de Negócios Rurais",
      institution: "Banco do Nordeste",
      creditProgram: "FNE Rural",
      authority: "alta",
      region: "Nordeste",
      contactInfo: "diretoria.rural@bnb.gov.br",
      email: "bruno.gouveia@bnb.gov.br",
      phone: "+55 (85) 3299-3250",
      officeAddress: "Av. Dr. Silas Munguba, 5700, Bloco C1 Superior - Passaré, Fortaleza - CE, 60743-902",
      appointmentDate: "2023-02-01",
      education: "Doutor em Economia Agrícola pela ESALQ/USP, MBA em Agronegócio pela FGV",
      careerBackground: "Funcionário de carreira do Banco do Nordeste há 18 anos, Ex-superintendente estadual do BNB em Pernambuco, Ex-consultor da FAO",
      photoUrl: "https://via.placeholder.com/150?text=Bruno+Gouveia",
      biography: "Responsável pela aprovação de operações de crédito rural no Nordeste. Lidera a área técnica responsável pela análise e aprovação dos projetos agropecuários financiados com recursos do FNE, principal fonte de financiamento rural da região Nordeste.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/bruno-gouveia-bnb/"
      },
      officialWebsite: "https://www.bnb.gov.br/fne",
      recentPublications: [
        "Manual de Crédito Rural do Banco do Nordeste: Diretrizes 2023",
        "Perspectivas para o Financiamento da Agricultura Familiar no Nordeste"
      ],
      recentActions: [
        "Implementação de sistema digital para análise e aprovação de crédito rural",
        "Reestruturação das linhas do FNE Rural com foco em sustentabilidade",
        "Criação do programa especial de financiamento para convivência com a seca",
        "Articulação com o Ministério da Agricultura para harmonização das políticas de crédito"
      ],
      responsibilityAreas: [
        "Gestão das operações de crédito rural do Banco do Nordeste",
        "Aprovação técnica de projetos de financiamento agropecuário",
        "Supervisão das superintendências estaduais na análise de projetos rurais",
        "Desenvolvimento de novas linhas de financiamento para o setor rural"
      ],
      lastUpdated: "2023-11-20",
      dataSource: "Site oficial do Banco do Nordeste e Relatório de Atividades FNE"
    },
    
    // BASA - Banco da Amazônia
    {
      id: 27,
      name: "Luiz Lessa",
      position: "Presidente",
      department: "Presidência",
      institution: "Banco da Amazônia",
      creditProgram: "FNO Rural",
      authority: "alta",
      region: "Norte",
      contactInfo: "gabinete.presidencia@bancoamazonia.com.br",
      email: "luiz.lessa@bancoamazonia.com.br",
      phone: "+55 (91) 4008-3001",
      officeAddress: "Av. Presidente Vargas, 800 - Campina, Belém - PA, 66017-000",
      appointmentDate: "2023-01-20",
      education: "Doutor em Desenvolvimento Sustentável pela UnB, Mestre em Economia pela UFPA",
      careerBackground: "Economista, Ex-Diretor do BNDES, Ex-secretário de Planejamento do Pará, Professor universitário",
      photoUrl: "https://www.oliberal.com/image/contentid/policy:1.666644:1673899954/Luiz-Lessa.JPG",
      biography: "Como presidente do BASA, tem autoridade máxima sobre aprovações de crédito rural e empresarial na Amazônia. Responsável pela gestão do Fundo Constitucional de Financiamento do Norte (FNO), principal instrumento de financiamento para atividades produtivas na região amazônica.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/luiz-lessa-basa/",
        twitter: "https://twitter.com/luizlessa_basa"
      },
      officialWebsite: "https://www.bancoamazonia.com.br/",
      recentPublications: [
        "Financiamento Verde e Desenvolvimento Sustentável na Amazônia",
        "O Papel do Crédito Rural na Redução do Desmatamento"
      ],
      recentActions: [
        "Lançamento do Plano de Aplicação do FNO 2023 com ênfase em projetos sustentáveis",
        "Criação de linha especial para sistemas agroflorestais e agricultura de baixo carbono",
        "Implementação do programa de financiamento para recuperação de áreas degradadas",
        "Desenvolvimento de produtos financeiros específicos para produtores da economia bioambiental"
      ],
      responsibilityAreas: [
        "Gestão do Fundo Constitucional de Financiamento do Norte (FNO)",
        "Aprovação de operações estratégicas para o desenvolvimento regional",
        "Coordenação da política de financiamento rural na Amazônia",
        "Alinhamento das operações de crédito com políticas de sustentabilidade"
      ],
      lastUpdated: "2023-12-05",
      dataSource: "Site oficial do Banco da Amazônia e Relatório de Administração"
    },
    {
      id: 28,
      name: "Silvana Parente",
      position: "Diretora de Negócios e Governança",
      department: "Diretoria de Negócios",
      institution: "Banco da Amazônia",
      creditProgram: "FNO Amazônia Sustentável",
      authority: "alta",
      region: "Norte",
      contactInfo: "diretoria.negocios@bancoamazonia.com.br",
      email: "silvana.parente@bancoamazonia.com.br",
      phone: "+55 (91) 4008-3120",
      officeAddress: "Av. Presidente Vargas, 800, 5º andar - Campina, Belém - PA, 66017-000",
      appointmentDate: "2023-03-05",
      education: "Doutora em Desenvolvimento Econômico pela Unicamp, Mestre em Economia pela UFCE",
      careerBackground: "Ex-secretária de Desenvolvimento Sustentável do MMA, Ex-diretora no Banco do Nordeste, Professora visitante da UnB",
      photoUrl: "https://via.placeholder.com/150?text=Silvana+Parente",
      biography: "Responsável pela aprovação de operações de crédito para projetos sustentáveis na Amazônia. Lidera a área que estrutura e desenvolve produtos financeiros específicos para a bioeconomia e manejo sustentável de recursos naturais na região amazônica.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/silvana-parente/"
      },
      officialWebsite: "https://www.bancoamazonia.com.br/sustentabilidade",
      recentPublications: [
        "Bioeconomia e Financiamento na Região Amazônica",
        "Novos Instrumentos de Crédito para a Sustentabilidade"
      ],
      recentActions: [
        "Lançamento do programa FNO Verde com R$ 5 bilhões para projetos de baixo carbono",
        "Desenvolvimento de protocolos de análise para projetos agroflorestais",
        "Criação de linha de crédito específica para comunidades tradicionais",
        "Implementação de sistema de monitoramento ambiental para operações de crédito"
      ],
      responsibilityAreas: [
        "Estruturação de novos produtos financeiros para sustentabilidade",
        "Aprovação de operações de crédito para agricultura sustentável",
        "Desenvolvimento de metodologias de análise para projetos socioambientais",
        "Coordenação do programa FNO Amazônia Sustentável"
      ],
      lastUpdated: "2023-11-30",
      dataSource: "Site oficial do Banco da Amazônia e Relatório de Sustentabilidade"
    },
    
    // Ministério do Desenvolvimento Agrário
    {
      id: 29,
      name: "Paulo Teixeira",
      position: "Ministro do Desenvolvimento Agrário",
      department: "Ministério",
      institution: "Ministério do Desenvolvimento Agrário",
      creditProgram: "Pronaf",
      authority: "alta",
      region: "Nacional",
      contactInfo: "gabinete.ministro@mda.gov.br",
      email: "paulo.teixeira@mda.gov.br",
      phone: "+55 (61) 2020-0870",
      officeAddress: "Esplanada dos Ministérios, Bloco C, 8º andar - Brasília - DF, 70046-900",
      appointmentDate: "2023-01-01",
      education: "Bacharel em Direito pela PUC-SP, Especialização em Política Internacional",
      careerBackground: "Deputado Federal por São Paulo (2007-2022), Ex-secretário de Habitação da cidade de São Paulo",
      photoUrl: "https://www.camara.leg.br/internet/deputado/bandep/74057.jpg",
      biography: "Como ministro, define diretrizes e políticas para programas de crédito destinados à agricultura familiar. Principal responsável pela elaboração e implementação do Plano Safra da Agricultura Familiar, que define as condições de financiamento e as linhas de crédito para pequenos produtores rurais.",
      socialMedia: {
        twitter: "https://twitter.com/dep_pauloteixeira",
        linkedin: "https://www.linkedin.com/in/paulo-teixeira-mda/"
      },
      officialWebsite: "https://www.gov.br/mda/pt-br",
      recentPublications: [
        "Plano Safra da Agricultura Familiar 2023/2024",
        "Políticas de Crédito para a Produção Agroecológica"
      ],
      recentActions: [
        "Lançamento do Plano Safra da Agricultura Familiar com R$ 71,6 bilhões para crédito rural",
        "Criação do programa de financiamento para agroindústrias familiares",
        "Implementação de linhas de crédito específicas para jovens e mulheres rurais",
        "Articulação com bancos públicos para simplificação do acesso ao crédito pelos agricultores familiares"
      ],
      responsibilityAreas: [
        "Gestão do Programa Nacional de Fortalecimento da Agricultura Familiar (Pronaf)",
        "Definição de políticas de crédito para agricultores familiares",
        "Coordenação de programas de assistência técnica rural",
        "Articulação com instituições financeiras para implementação das linhas de crédito"
      ],
      lastUpdated: "2023-12-01",
      dataSource: "Site oficial do Ministério do Desenvolvimento Agrário e Portal Brasil"
    },
    {
      id: 30,
      name: "Francisco Nascimento",
      position: "Secretário de Agricultura Familiar",
      department: "Secretaria de Agricultura Familiar",
      institution: "Ministério do Desenvolvimento Agrário",
      creditProgram: "Pronaf",
      authority: "alta",
      region: "Nacional",
      contactInfo: "saf@mda.gov.br",
      email: "francisco.nascimento@mda.gov.br",
      phone: "+55 (61) 2020-0888",
      officeAddress: "Esplanada dos Ministérios, Bloco C, 6º andar - Brasília - DF, 70046-900",
      appointmentDate: "2023-01-15",
      education: "Mestre em Desenvolvimento Rural pela UFRGS, Engenheiro Agrônomo pela UFPE",
      careerBackground: "Ex-presidente da CONTAG, Liderança no movimento de agricultura familiar, Consultor da FAO para políticas agrícolas",
      photoUrl: "https://via.placeholder.com/150?text=Francisco+Nascimento",
      biography: "Responsável pela gestão de programas de crédito para a agricultura familiar. Coordena a implementação do Programa Nacional de Fortalecimento da Agricultura Familiar (Pronaf) e articula com bancos e cooperativas de crédito para facilitar o acesso dos pequenos produtores ao financiamento rural.",
      socialMedia: {
        linkedin: "https://www.linkedin.com/in/francisco-nascimento-agri/"
      },
      officialWebsite: "https://www.gov.br/mda/pt-br/assuntos/agricultura-familiar",
      recentPublications: [
        "Manual do Crédito Rural para a Agricultura Familiar: Edição 2023",
        "Análise dos Impactos do Pronaf no Desenvolvimento Rural"
      ],
      recentActions: [
        "Implementação do sistema digital de acesso ao Pronaf",
        "Coordenação da capacitação de agentes financeiros para o atendimento a agricultores familiares",
        "Ampliação das linhas de crédito para sistemas agroecológicos",
        "Desenvolvimento do programa de assistência técnica vinculada ao crédito rural"
      ],
      responsibilityAreas: [
        "Operacionalização do Programa Nacional de Fortalecimento da Agricultura Familiar",
        "Articulação com instituições financeiras para execução das políticas de crédito",
        "Desenvolvimento de metodologias de acesso ao crédito para públicos específicos",
        "Coordenação de programas de capacitação em gestão financeira para agricultores"
      ],
      lastUpdated: "2023-11-20",
      dataSource: "Site oficial do Ministério do Desenvolvimento Agrário e Relatório do Pronaf"
    }
  ];
  
  // Filtragem dos dados conforme parâmetros
  return officials.filter(official => {
    let include = true;
    
    if (creditProgram && !official.creditProgram.toLowerCase().includes(creditProgram.toLowerCase())) {
      include = false;
    }
    
    if (institution && !official.institution.toLowerCase().includes(institution.toLowerCase())) {
      include = false;
    }
    
    if (authority && official.authority !== authority) {
      include = false;
    }
    
    return include;
  });
}