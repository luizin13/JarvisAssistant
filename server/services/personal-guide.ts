/**
 * Serviço de Guia Pessoal
 * 
 * Este serviço transforma o assistente em um guia pessoal completo,
 * fornecendo orientação, sugestões, lembretes e apoio para desenvolvimento
 * pessoal e profissional ao longo do dia.
 */

import { storage } from '../storage';
import { generateChatResponse } from '../openai';
import { generateSpeechWithElevenLabs } from '../elevenlabs';
import { InsertChatMessage } from '@shared/schema';

// Categorias de orientação que o assistente pode fornecer
export enum GuidanceCategory {
  DAILY_PLANNING = 'daily_planning',     // Planejamento diário
  PRODUCTIVITY = 'productivity',         // Dicas de produtividade
  PERSONAL_GROWTH = 'personal_growth',   // Crescimento pessoal
  HEALTH = 'health',                     // Saúde e bem-estar
  LEARNING = 'learning',                 // Aprendizado contínuo
  MINDFULNESS = 'mindfulness',           // Foco e atenção plena
  BUSINESS = 'business',                 // Orientação para negócios
  MOTIVATION = 'motivation',             // Motivação e inspiração
  REFLECTION = 'reflection'              // Reflexão sobre o dia/semana
}

// Interface para configurações do guia pessoal
interface PersonalGuideSettings {
  activeHours: {
    start: number;  // Hora de início (0-23)
    end: number;    // Hora de término (0-23)
  };
  interactionFrequency: number;  // Minutos entre interações proativas
  focusCategories: GuidanceCategory[];  // Categorias de foco prioritárias
  userName: string;  // Nome do usuário
  businessTypes: string[];  // Tipos de negócio (ex: 'transport', 'farm')
  learningGoals: string[];  // Objetivos de aprendizado
  wellnessGoals: string[];  // Objetivos de bem-estar
}

// Estado da sessão do guia pessoal
let guideSettings: PersonalGuideSettings = {
  activeHours: { start: 8, end: 22 },  // 8h às 22h por padrão
  interactionFrequency: 120,  // A cada 2 horas por padrão
  focusCategories: [
    GuidanceCategory.DAILY_PLANNING,
    GuidanceCategory.PRODUCTIVITY,
    GuidanceCategory.BUSINESS
  ],
  userName: 'João',
  businessTypes: ['transport', 'farm'],
  learningGoals: ['novas tecnologias agrícolas', 'gestão de logística'],
  wellnessGoals: ['melhorar concentração', 'reduzir estresse']
};

// Timer para controlar interações proativas
let proactiveInteractionTimer: NodeJS.Timeout | null = null;

/**
 * Inicializa o serviço de guia pessoal
 * @param settings Configurações personalizadas (opcional)
 */
export function initializePersonalGuide(settings?: Partial<PersonalGuideSettings>) {
  // Atualiza configurações se fornecidas
  if (settings) {
    guideSettings = { ...guideSettings, ...settings };
  }

  // Inicia o timer para interações proativas
  scheduleProactiveInteractions();
  
  console.log(`Guia pessoal inicializado para ${guideSettings.userName}`);
  console.log(`Foco principal em: ${guideSettings.focusCategories.join(', ')}`);
  
  // Envia mensagem inicial (quando o usuário inicia o sistema)
  return generateWelcomeMessage();
}

/**
 * Agenda interações proativas baseadas na configuração de frequência
 */
function scheduleProactiveInteractions() {
  // Limpa timer existente se houver
  if (proactiveInteractionTimer) {
    clearInterval(proactiveInteractionTimer);
  }
  
  // Converte minutos para milissegundos
  const intervalMs = guideSettings.interactionFrequency * 60 * 1000;
  
  // Agenda novas interações periódicas
  proactiveInteractionTimer = setInterval(async () => {
    // Verifica se estamos dentro do horário ativo
    const currentHour = new Date().getHours();
    if (currentHour >= guideSettings.activeHours.start && 
        currentHour < guideSettings.activeHours.end) {
      await generateProactiveGuidance();
    }
  }, intervalMs);
  
  console.log(`Interações proativas agendadas a cada ${guideSettings.interactionFrequency} minutos`);
}

/**
 * Gera uma mensagem de boas-vindas quando o usuário inicia o sistema
 */
export async function generateWelcomeMessage() {
  const currentHour = new Date().getHours();
  let greeting = 'Bom dia';
  
  if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Boa tarde';
  } else if (currentHour >= 18) {
    greeting = 'Boa noite';
  }
  
  // Mensagem de boas-vindas personalizada
  const welcomeMessage = 
    `${greeting}, ${guideSettings.userName}! Estou aqui para te ajudar ao longo do dia. ` +
    `Vou focar em te auxiliar com seus negócios de ${guideSettings.businessTypes.join(' e ')}, ` +
    `além de te apoiar com ${guideSettings.wellnessGoals.join(' e ')}. ` +
    `Como posso ajudar você agora?`;
  
  // Salva no histórico
  saveChatMessage(welcomeMessage, 'assistant');
  
  // Gera áudio se necessário
  const audioUrl = await generateSpeechWithElevenLabs(welcomeMessage, {
    voiceType: 'nicole',  // Voz mais natural
    stability: 0.7,
    similarity: 0.7
  }).catch(err => {
    console.error('Erro ao gerar áudio de boas-vindas:', err);
    return { audioUrl: '' };
  });
  
  return {
    message: welcomeMessage,
    audioUrl: audioUrl.audioUrl
  };
}

/**
 * Gera orientação proativa baseada no contexto e configurações
 */
async function generateProactiveGuidance() {
  try {
    // Determina a categoria de orientação com base no horário e contexto
    const category = selectGuidanceCategory();
    
    // Cria um contexto específico para essa categoria
    const context = buildGuidanceContext(category);
    
    // Gera a mensagem de orientação usando a API de chat
    const response = await generateChatResponse(context, {
      userId: 1,  // ID fixo para o usuário principal
      systemPrompt: 
        `Você é um assistente pessoal especializado em ${category}. ` +
        `Forneça orientação proativa, concisa e motivadora para ${guideSettings.userName}. ` +
        `Foque em insights práticos e acionáveis. Mantenha o tom conversacional e amigável. ` +
        `Limite sua resposta a no máximo 3 parágrafos. Seja específico e personalizado.`,
      messageContext: JSON.stringify({
        userBusinesses: guideSettings.businessTypes,
        learningGoals: guideSettings.learningGoals,
        wellnessGoals: guideSettings.wellnessGoals,
        previousInteractions: await getRecentMessages(3)
      })
    });
    
    if (response && response.message) {
      // Salva a mensagem proativa no histórico
      saveChatMessage(response.message, 'assistant');
      
      // Gera áudio para a mensagem
      const audioUrl = await generateSpeechWithElevenLabs(response.message, {
        voiceType: 'nicole',
        stability: 0.7,
        similarity: 0.7
      }).catch(err => {
        console.error('Erro ao gerar áudio para orientação proativa:', err);
        return { audioUrl: '' };
      });
      
      // Emite notificação (em uma implementação futura, isso poderia ser um evento WebSocket)
      console.log(`Nova orientação proativa gerada: ${category}`);
      
      return {
        category,
        message: response.message,
        audioUrl: audioUrl.audioUrl
      };
    }
  } catch (error) {
    console.error('Erro ao gerar orientação proativa:', error);
  }
  
  return null;
}

/**
 * Seleciona uma categoria de orientação baseada no contexto atual
 */
function selectGuidanceCategory(): GuidanceCategory {
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay(); // 0 = Domingo, 6 = Sábado
  const isWeekend = currentDay === 0 || currentDay === 6;
  
  // Lógica para selecionar categoria contextual
  if (currentHour < 10) {
    // Manhã: planejamento ou motivação
    return Math.random() > 0.5 
      ? GuidanceCategory.DAILY_PLANNING 
      : GuidanceCategory.MOTIVATION;
  } else if (currentHour >= 10 && currentHour < 13) {
    // Fim da manhã: produtividade ou negócios
    return Math.random() > 0.5 
      ? GuidanceCategory.PRODUCTIVITY 
      : GuidanceCategory.BUSINESS;
  } else if (currentHour >= 13 && currentHour < 16) {
    // Início da tarde: aprendizado ou crescimento pessoal
    return Math.random() > 0.5 
      ? GuidanceCategory.LEARNING 
      : GuidanceCategory.PERSONAL_GROWTH;
  } else if (currentHour >= 16 && currentHour < 19) {
    // Fim da tarde: saúde ou mindfulness
    return Math.random() > 0.5 
      ? GuidanceCategory.HEALTH 
      : GuidanceCategory.MINDFULNESS;
  } else {
    // Noite: reflexão ou negócios
    return isWeekend
      ? GuidanceCategory.PERSONAL_GROWTH
      : GuidanceCategory.REFLECTION;
  }
}

/**
 * Constrói um contexto específico para a categoria de orientação
 */
function buildGuidanceContext(category: GuidanceCategory): string {
  switch (category) {
    case GuidanceCategory.DAILY_PLANNING:
      return `Ajude ${guideSettings.userName} a planejar seu dia de forma eficiente, considerando suas responsabilidades de gerenciamento de negócios de ${guideSettings.businessTypes.join(' e ')}.`;
    
    case GuidanceCategory.PRODUCTIVITY:
      return `Ofereça uma dica prática de produtividade para ${guideSettings.userName} aplicar hoje em seus negócios de ${guideSettings.businessTypes.join(' e ')}.`;
    
    case GuidanceCategory.PERSONAL_GROWTH:
      return `Sugira uma atividade de desenvolvimento pessoal que ${guideSettings.userName} pode realizar hoje para expandir suas habilidades como gestor e empreendedor.`;
    
    case GuidanceCategory.HEALTH:
      return `Lembre ${guideSettings.userName} sobre a importância do bem-estar físico e mental para o sucesso nos negócios. Dê uma dica prática relacionada a ${guideSettings.wellnessGoals.join(' ou ')}.`;
    
    case GuidanceCategory.LEARNING:
      return `Sugira um tópico específico sobre ${guideSettings.learningGoals.join(' ou ')} que ${guideSettings.userName} poderia explorar hoje para expandir seu conhecimento e aplicar em seus negócios.`;
    
    case GuidanceCategory.MINDFULNESS:
      return `Ofereça uma prática rápida de mindfulness que ${guideSettings.userName} pode realizar para melhorar seu foco e clareza mental no ambiente de trabalho.`;
    
    case GuidanceCategory.BUSINESS:
      return `Compartilhe uma reflexão estratégica sobre os negócios de ${guideSettings.businessTypes.join(' e ')} que ${guideSettings.userName} gerencia, focando em oportunidades de crescimento ou otimização.`;
    
    case GuidanceCategory.MOTIVATION:
      return `Ofereça uma perspectiva motivadora sobre os desafios de empreender nos setores de ${guideSettings.businessTypes.join(' e ')}, inspirando ${guideSettings.userName} a persistir e inovar.`;
    
    case GuidanceCategory.REFLECTION:
      return `Conduza ${guideSettings.userName} em uma breve reflexão sobre o progresso em suas metas de negócios e pessoais, incentivando-o a reconhecer conquistas e identificar oportunidades de crescimento.`;
    
    default:
      return `Ofereça orientação personalizada para ${guideSettings.userName} considerando seus interesses em ${guideSettings.businessTypes.join(' e ')} e objetivos de desenvolvimento.`;
  }
}

/**
 * Busca mensagens recentes do histórico
 */
async function getRecentMessages(limit: number = 5) {
  return storage.getChatMessages(1, limit);
}

/**
 * Salva uma mensagem no histórico de chat
 */
async function saveChatMessage(content: string, role: 'user' | 'assistant') {
  const message: InsertChatMessage = {
    userId: 1,
    content,
    isBot: role === 'assistant',
  };
  
  try {
    await storage.createChatMessage(message);
  } catch (error) {
    console.error('Erro ao salvar mensagem no histórico:', error);
  }
}

/**
 * Atualiza as configurações do guia pessoal
 * @param newSettings Novas configurações
 */
export function updateGuideSettings(newSettings: Partial<PersonalGuideSettings>) {
  // Atualiza apenas as configurações fornecidas
  guideSettings = { ...guideSettings, ...newSettings };
  
  // Reagenda interações se a frequência mudou
  if (newSettings.interactionFrequency) {
    scheduleProactiveInteractions();
  }
  
  console.log('Configurações do guia pessoal atualizadas:', newSettings);
  return guideSettings;
}

/**
 * Processa uma consulta do usuário relacionada ao desenvolvimento pessoal
 * @param query Pergunta ou solicitação do usuário
 */
export async function processPersonalQuery(query: string) {
  try {
    // Salva a consulta no histórico
    saveChatMessage(query, 'user');
    
    // Determina a categoria da consulta
    const category = determineQueryCategory(query);
    
    // Constrói o contexto para a resposta
    const context = buildGuidanceContext(category);
    
    // Gera a resposta
    const response = await generateChatResponse(query, {
      userId: 1,
      systemPrompt: 
        `Você é um guia pessoal especializado em desenvolvimento humano. ` +
        `Responda a esta consulta de ${guideSettings.userName} de forma útil, prática e encorajadora. ` +
        `Considere o contexto de seus negócios em ${guideSettings.businessTypes.join(' e ')} ` +
        `e seus objetivos de crescimento pessoal e profissional.`,
      messageContext: context
    });
    
    if (response && response.message) {
      // Salva a resposta no histórico
      saveChatMessage(response.message, 'assistant');
      
      // Gera áudio para a resposta
      const audioUrl = await generateSpeechWithElevenLabs(response.message, {
        voiceType: 'nicole',
        stability: 0.7,
        similarity: 0.7
      }).catch(err => {
        console.error('Erro ao gerar áudio para resposta pessoal:', err);
        return { audioUrl: '' };
      });
      
      return {
        message: response.message,
        audioUrl: audioUrl.audioUrl,
        category
      };
    }
  } catch (error) {
    console.error('Erro ao processar consulta pessoal:', error);
  }
  
  return {
    message: 'Desculpe, não consegui processar sua solicitação no momento. Por favor, tente novamente.',
    audioUrl: '',
    category: GuidanceCategory.PERSONAL_GROWTH
  };
}

/**
 * Identifica a categoria mais relevante para a consulta do usuário
 */
function determineQueryCategory(query: string): GuidanceCategory {
  // Palavras-chave associadas a cada categoria
  const categoryKeywords: Record<GuidanceCategory, string[]> = {
    [GuidanceCategory.DAILY_PLANNING]: ['planejar', 'organizar', 'agenda', 'rotina', 'programação', 'compromissos'],
    [GuidanceCategory.PRODUCTIVITY]: ['produtividade', 'eficiência', 'foco', 'concentração', 'técnicas', 'metodologia'],
    [GuidanceCategory.PERSONAL_GROWTH]: ['crescimento', 'desenvolvimento', 'melhorar', 'evolução', 'potencial', 'habilidades'],
    [GuidanceCategory.HEALTH]: ['saúde', 'exercício', 'alimentação', 'descanso', 'dormir', 'estresse', 'ansiedade'],
    [GuidanceCategory.LEARNING]: ['aprender', 'estudar', 'conhecimento', 'cursos', 'livros', 'leitura', 'habilidade'],
    [GuidanceCategory.MINDFULNESS]: ['atenção plena', 'meditação', 'respiração', 'presente', 'calma', 'clareza', 'paz'],
    [GuidanceCategory.BUSINESS]: ['negócio', 'empresa', 'estratégia', 'mercado', 'cliente', 'lucro', 'vendas', 'gestão'],
    [GuidanceCategory.MOTIVATION]: ['motivação', 'inspiração', 'energia', 'ânimo', 'entusiasmo', 'determinação'],
    [GuidanceCategory.REFLECTION]: ['refletir', 'analisar', 'pensar', 'avaliar', 'rever', 'considerar', 'retrospectiva']
  };
  
  // Converte a consulta para minúsculas para comparação
  const lowercaseQuery = query.toLowerCase();
  
  // Pontua cada categoria com base em palavras-chave presentes
  const categoryScores = Object.entries(categoryKeywords).reduce((scores, [category, keywords]) => {
    scores[category as GuidanceCategory] = keywords.reduce((score, keyword) => {
      return lowercaseQuery.includes(keyword) ? score + 1 : score;
    }, 0);
    return scores;
  }, {} as Record<GuidanceCategory, number>);
  
  // Encontra a categoria com maior pontuação
  let highestScoreCategory = GuidanceCategory.PERSONAL_GROWTH; // Padrão
  let highestScore = 0;
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > highestScore) {
      highestScore = score;
      highestScoreCategory = category as GuidanceCategory;
    }
  }
  
  // Se nenhuma categoria teve pontuação, prioriza categorias de foco do usuário
  if (highestScore === 0 && guideSettings.focusCategories.length > 0) {
    const randomIndex = Math.floor(Math.random() * guideSettings.focusCategories.length);
    highestScoreCategory = guideSettings.focusCategories[randomIndex];
  }
  
  return highestScoreCategory;
}

/**
 * Função para incluir sugestões de conteúdo relevante
 * (notícias, tendências, etc) relacionadas ao desenvolvimento pessoal
 */
export async function suggestRelevantContent() {
  // Em uma implementação completa, esta função buscaria notícias, artigos,
  // tendências, e outros conteúdos relevantes para o usuário com base em
  // suas configurações e interesses.
  
  // Por enquanto, retorna um exemplo estático:
  return {
    suggestions: [
      {
        title: "Técnicas de gestão de tempo para empreendedores",
        type: "article",
        category: GuidanceCategory.PRODUCTIVITY,
        summary: "Aprenda como empreendedores de sucesso organizam seus dias para maximizar produtividade sem sacrificar bem-estar."
      },
      {
        title: "Mindfulness para decisões de negócios mais eficazes",
        type: "practice",
        category: GuidanceCategory.MINDFULNESS,
        summary: "Um exercício de 5 minutos para clarear a mente antes de tomar decisões importantes em seus negócios."
      },
      {
        title: "Tendências emergentes em logística sustentável",
        type: "trend",
        category: GuidanceCategory.BUSINESS,
        summary: "Como empresas de transporte estão implementando práticas sustentáveis para reduzir custos e melhorar a imagem da marca."
      }
    ]
  };
}