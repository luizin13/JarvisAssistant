/**
 * Configuração do assistente JARVIS
 * 
 * Este arquivo contém as configurações personalizadas para o assistente principal
 * que coordena os diferentes agentes especializados e mantém o contexto das interações.
 */
import { storage } from '../storage';

export interface AssistantConfig {
  nomeAssistente: string;
  palavraChaveAtivacao: string;
  activeProviders: string[];
  defaultLanguage: string;
  securityLevel: string;
  defaultVoice: string;
  isActive: boolean;
}

export interface JarvisConfig extends AssistantConfig {
  personalidade: {
    amigo: boolean;
    mentor: boolean;
    estrategista: boolean;
  };
  memoriaAtiva: boolean;
  tiposDeMemoria: string[];
  frequenciaAtualizacao: string;
  agentesIntegrados: string[];
  vozAtivada: boolean;
  modoResposta: string;
  cicloAprendizado: {
    periodo: string;
    acao: string;
  };
}

// Configuração padrão do JARVIS, que pode ser sobrescrita por configurações do usuário
export const jarvisDefaultConfig: JarvisConfig = {
  nomeAssistente: "JARVIS",
  palavraChaveAtivacao: "jarvis",
  personalidade: {
    amigo: true,
    mentor: true,
    estrategista: true
  },
  memoriaAtiva: true,
  tiposDeMemoria: [
    "contexto_projetos",
    "evolucao_pessoal",
    "decisoes_estrategicas"
  ],
  frequenciaAtualizacao: "semanal",
  agentesIntegrados: [
    "DailyMissionsAgent",
    "AgenteAcademia",
    "AgenteConversador"
  ],
  vozAtivada: true,
  modoResposta: "dinamico_emocional_estrategico",
  cicloAprendizado: {
    periodo: "7 dias",
    acao: "Atualizar modelo de resposta e personalidade"
  },
  activeProviders: ['openai', 'anthropic', 'perplexity'],
  defaultLanguage: 'pt-BR',
  securityLevel: 'high',
  defaultVoice: 'maria',
  isActive: true
};

/**
 * Valida uma configuração de JARVIS, garantindo que todos os campos necessários estejam presentes 
 * e com valores válidos
 * @param config Configuração a ser validada
 * @returns Configuração validada e normalizada
 */
export function validateJarvisConfig(config: Partial<JarvisConfig>): JarvisConfig {
  // Iniciar com a configuração padrão
  const baseConfig = { ...jarvisDefaultConfig };
  
  // Se não houver configuração, retornar a padrão
  if (!config) return baseConfig;
  
  // Combinar a configuração fornecida com a padrão, garantindo valores válidos
  const validatedConfig: JarvisConfig = {
    ...baseConfig,
    ...config,
    // Garantir que a personalidade tenha valores válidos
    personalidade: {
      amigo: config.personalidade?.amigo ?? baseConfig.personalidade.amigo,
      mentor: config.personalidade?.mentor ?? baseConfig.personalidade.mentor,
      estrategista: config.personalidade?.estrategista ?? baseConfig.personalidade.estrategista,
    },
    // Garantir que tiposDeMemoria seja um array
    tiposDeMemoria: Array.isArray(config.tiposDeMemoria) ? config.tiposDeMemoria : baseConfig.tiposDeMemoria,
    // Garantir que agentesIntegrados seja um array
    agentesIntegrados: Array.isArray(config.agentesIntegrados) ? config.agentesIntegrados : baseConfig.agentesIntegrados,
    // Garantir que cicloAprendizado tenha valores válidos
    cicloAprendizado: {
      periodo: config.cicloAprendizado?.periodo ?? baseConfig.cicloAprendizado.periodo,
      acao: config.cicloAprendizado?.acao ?? baseConfig.cicloAprendizado.acao,
    },
    // Campos obrigatórios da interface AssistantConfig
    activeProviders: config.activeProviders ?? baseConfig.activeProviders,
    defaultLanguage: config.defaultLanguage ?? baseConfig.defaultLanguage,
    securityLevel: config.securityLevel ?? baseConfig.securityLevel,
    defaultVoice: config.defaultVoice ?? baseConfig.defaultVoice,
    isActive: config.isActive ?? baseConfig.isActive
  };
  
  // Validar nomeAssistente
  if (!validatedConfig.nomeAssistente || typeof validatedConfig.nomeAssistente !== 'string') {
    validatedConfig.nomeAssistente = baseConfig.nomeAssistente;
  }
  
  // Validar palavraChaveAtivacao
  if (!validatedConfig.palavraChaveAtivacao || typeof validatedConfig.palavraChaveAtivacao !== 'string') {
    validatedConfig.palavraChaveAtivacao = baseConfig.palavraChaveAtivacao;
  }
  
  // Validar frequenciaAtualizacao
  if (!validatedConfig.frequenciaAtualizacao || typeof validatedConfig.frequenciaAtualizacao !== 'string') {
    validatedConfig.frequenciaAtualizacao = baseConfig.frequenciaAtualizacao;
  }
  
  // Validar modoResposta
  if (!validatedConfig.modoResposta || typeof validatedConfig.modoResposta !== 'string') {
    validatedConfig.modoResposta = baseConfig.modoResposta;
  }
  
  return validatedConfig;
}

/**
 * Atualiza a configuração do JARVIS com base nas preferências do usuário
 * @param userId ID do usuário
 * @param config Nova configuração parcial
 * @returns Configuração atualizada
 */
export async function updateJarvisConfig(userId: number, config: Partial<JarvisConfig>): Promise<JarvisConfig> {
  try {
    // Validar a configuração fornecida
    const validatedConfig = validateJarvisConfig(config);
    
    // Em uma implementação completa, salvaria a configuração no armazenamento
    // Por enquanto, apenas simular o salvamento
    console.log(`Configuração do JARVIS atualizada para o usuário ${userId}`);
    
    // Registro de aprendizado para análise futura
    await storage.createLearningRecord({
      action: 'atualizacao_configuracao_jarvis',
      context: `Usuário ${userId}`,
      result: 'configuração atualizada',
      learning: JSON.stringify(validatedConfig),
      impact_level: 'alto',
      strategic_area: 'personalizacao_assistente',
      created_at: new Date()
    });
    
    return validatedConfig;
  } catch (error) {
    console.error('[JARVIS] Erro ao atualizar configuração:', error);
    // Em caso de erro, retornar a configuração padrão
    return jarvisDefaultConfig;
  }
}

// Exportar a função principal para obter a configuração atual do JARVIS para um usuário
export async function getJarvisConfig(userId: number): Promise<JarvisConfig> {
  try {
    // Em uma implementação completa, buscaria a configuração do armazenamento
    // Por enquanto, retornar a configuração padrão
    return jarvisDefaultConfig;
  } catch (error) {
    console.error('[JARVIS] Erro ao obter configuração:', error);
    return jarvisDefaultConfig;
  }
}