/**
 * Registro de Agentes Especializados
 * 
 * Este arquivo registra os agentes no sistema, complementando os templates
 * existentes para permitir acesso e referência por diferentes nomes
 */
import agentFactory from './agent-factory';

/**
 * Registra todos os templates adicionais de agentes
 * para garantir que possam ser referenciados por diferentes nomes
 */
export function registerAdditionalAgentTemplates() {
  console.log('Registrando templates adicionais de agentes...');
  
  // Registrando variações de nomes para agentes existentes
  
  // TechnicalAgent - variações de nome
  agentFactory.registerAgentTemplate('technicalagent', 'TechnicalAgent');
  
  // Agente de Análise de Sistema - variações de nome
  agentFactory.registerAgentTemplate('agenteanalisesistema', 'TechnicalAgent');
  agentFactory.registerAgentTemplate('AgenteAnaliseSistema', 'TechnicalAgent');
  
  // Agente de Correção Automática - variações de nome
  agentFactory.registerAgentTemplate('agentecorrecaoautomatica', 'TechnicalAgent');
  agentFactory.registerAgentTemplate('AgenteCorrecaoAutomatica', 'TechnicalAgent');
  
  // Agente de Melhoria Contínua - variações de nome
  agentFactory.registerAgentTemplate('agentemelhoriacontinua', 'TechnicalAgent');
  agentFactory.registerAgentTemplate('AgenteMelhoriaContinua', 'TechnicalAgent');
  
  // Agente da Academia Interna - variações de nome
  agentFactory.registerAgentTemplate('agenteacademia', 'TechnicalAgent');
  agentFactory.registerAgentTemplate('AgenteAcademia', 'TechnicalAgent');
  
  // Agente de Missões Diárias - variações de nome
  agentFactory.registerAgentTemplate('agentemissoesdiarias', 'missoes-diarias');
  agentFactory.registerAgentTemplate('AgenteMissoesDiarias', 'missoes-diarias');
  
  // Agente Conversador - variações de nome
  agentFactory.registerAgentTemplate('agenteconversador', 'TechnicalAgent');
  agentFactory.registerAgentTemplate('AgenteConversador', 'TechnicalAgent');

  console.log('Templates adicionais de agentes registrados com sucesso!');
}