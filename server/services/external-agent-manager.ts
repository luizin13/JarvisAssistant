/**
 * Gerenciador de Agentes Externos
 * 
 * Este serviço gerencia agentes externos que podem interagir com o sistema
 * através de APIs autorizadas. Cada agente externo recebe um registro
 * formal no sistema e suas ações são registradas.
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

// Interface para agentes externos registrados
export interface WebhookConfig {
  url: string;
  secret?: string;
  events: string[]; // Lista de eventos para notificar: ["task_created", "decision_registered", etc]
  enabled: boolean;
  lastDelivery?: {
    timestamp: string;
    success: boolean;
    statusCode?: number;
    message?: string;
  };
  retryCount: number;
}

export interface ExternalAgent {
  id: string;
  name: string;
  description: string;
  authToken: string;
  permissions: {
    createTasks: boolean;
    createDiagnostics: boolean;
    createSuggestions: boolean;
    querySystem: boolean;
    generateReports: boolean;
    canRegisterDecisions: boolean;
    updateTasks: boolean;
  };
  metadata: {
    registeredAt: string;
    lastActivity?: string;
    activityCount: number;
    type: string;
    tokenExpiresAt?: string; // Data de expiração do token
  };
  webhook?: WebhookConfig;
}

// Interface para tokens de segurança
interface SecurityToken {
  token: string;
  agentId: string;
  issuedAt: string;
  expiresAt: string;
}

// Singleton para gerenciar agentes externos
class ExternalAgentManager {
  private agents: Map<string, ExternalAgent> = new Map();
  private agentsById: Map<string, ExternalAgent> = new Map();
  private tokens: Map<string, SecurityToken> = new Map();
  private masterToken: string = 'luiz2024legadoimparavel'; // Token mestre para compatibilidade
  private activityLog: Array<{
    agentId: string;
    action: string;
    timestamp: string;
    details: any;
  }> = [];
  
  constructor() {
    // Inicializa com o GPT-Agent-Alpha já pré-registrado
    this.registerAgent({
      name: 'GPT-Agent-Alpha',
      description: 'Agente externo principal baseado no GPT para comunicação, análise e estratégia.',
      authToken: this.masterToken,
      permissions: {
        createTasks: true,
        createDiagnostics: true,
        createSuggestions: true,
        querySystem: true,
        generateReports: true,
        canRegisterDecisions: true,
        updateTasks: true
      },
      type: 'openai'
    });
  }

  /**
   * Gera um novo token de autenticação seguro
   * @param agentId ID do agente
   * @param expirationDays Dias para expiração do token (padrão: 30 dias)
   * @returns Token gerado
   */
  generateSecureToken(agentId: string, expirationDays: number = 30): string {
    const salt = randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const tokenBase = `${agentId}:${salt}:${timestamp}`;
    const hash = createHash('sha256').update(tokenBase).digest('hex');
    const token = `lz_${hash.substring(0, 32)}`;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);
    
    // Armazenar o token na tabela de tokens
    this.tokens.set(token, {
      token,
      agentId,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    
    // Atualizar o agente com a nova data de expiração
    const agent = this.agentsById.get(agentId);
    if (agent) {
      agent.metadata.tokenExpiresAt = expiresAt.toISOString();
    }
    
    return token;
  }

  /**
   * Registra um novo agente externo no sistema
   */
  registerAgent({
    name,
    description,
    authToken,
    permissions,
    type
  }: {
    name: string;
    description: string;
    authToken: string;
    permissions: {
      createTasks: boolean;
      createDiagnostics: boolean;
      createSuggestions: boolean;
      querySystem: boolean;
      generateReports: boolean;
      canRegisterDecisions?: boolean;
      updateTasks?: boolean;
    };
    type: string;
  }): ExternalAgent {
    const id = uuidv4();
    
    // Criar uma data de expiração para 30 dias a partir de agora
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const agent: ExternalAgent = {
      id,
      name,
      description,
      authToken,
      permissions: {
        createTasks: permissions.createTasks,
        createDiagnostics: permissions.createDiagnostics,
        createSuggestions: permissions.createSuggestions,
        querySystem: permissions.querySystem,
        generateReports: permissions.generateReports,
        canRegisterDecisions: permissions.canRegisterDecisions || false,
        updateTasks: permissions.updateTasks || false
      },
      metadata: {
        registeredAt: new Date().toISOString(),
        activityCount: 0,
        type,
        tokenExpiresAt: expiresAt.toISOString()
      }
    };
    
    this.agents.set(authToken, agent);
    this.agentsById.set(id, agent);
    
    console.log(`[ExternalAgentManager] Novo agente registrado: ${name} (${id})`);
    
    return agent;
  }

  /**
   * Verifica se um token de autenticação é válido e retorna o agente associado
   */
  validateToken(token: string): ExternalAgent | null {
    // Verificar se é o token mestre (para compatibilidade)
    if (token === this.masterToken) {
      return this.agents.get(token) || null;
    }
    
    // Verificar tokens gerados dinamicamente
    if (this.tokens.has(token)) {
      const tokenInfo = this.tokens.get(token);
      if (!tokenInfo) return null;
      
      // Verificar se o token não está expirado
      if (new Date(tokenInfo.expiresAt) < new Date()) {
        console.warn(`[ExternalAgentManager] Token expirado: ${token.substring(0, 8)}...`);
        return null;
      }
      
      return this.agentsById.get(tokenInfo.agentId) || null;
    }
    
    // Verificação legada (apenas para compatibilidade com tokens antigos)
    if (this.agents.has(token)) {
      return this.agents.get(token) || null;
    }
    
    return null;
  }
  
  /**
   * Revoga um token específico
   * @param token Token a ser revogado
   * @returns true se o token foi revogado, false se não existia
   */
  revokeToken(token: string): boolean {
    if (this.tokens.has(token)) {
      this.tokens.delete(token);
      return true;
    }
    return false;
  }
  
  /**
   * Revoga todos os tokens de um agente específico
   * @param agentId ID do agente
   * @returns Número de tokens revogados
   */
  revokeAllTokensForAgent(agentId: string): number {
    let count = 0;
    // Encontrar e remover todos os tokens do agente
    for (const [token, info] of this.tokens.entries()) {
      if (info.agentId === agentId) {
        this.tokens.delete(token);
        count++;
      }
    }
    return count;
  }

  /**
   * Registra uma atividade de um agente externo
   */
  logActivity(agentId: string, action: string, details: any): void {
    const agent = Array.from(this.agents.values()).find(a => a.id === agentId);
    
    if (!agent) {
      console.warn(`[ExternalAgentManager] Tentativa de registrar atividade para agente desconhecido: ${agentId}`);
      return;
    }
    
    // Atualiza as estatísticas do agente
    agent.metadata.lastActivity = new Date().toISOString();
    agent.metadata.activityCount++;
    
    // Registra a atividade
    this.activityLog.push({
      agentId,
      action,
      timestamp: new Date().toISOString(),
      details
    });
    
    console.log(`[ExternalAgentManager] Atividade registrada: ${agent.name} - ${action}`);
  }

  /**
   * Obtém todos os agentes registrados
   */
  getAgents(): ExternalAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Obtém o histórico de atividades de um agente específico
   */
  getAgentActivity(agentId: string): any[] {
    return this.activityLog.filter(entry => entry.agentId === agentId);
  }

  /**
   * Obtém todas as atividades registradas no sistema
   */
  getAllActivity(): any[] {
    return this.activityLog;
  }
  
  /**
   * Configura um webhook para um agente externo
   * @param agentId ID do agente
   * @param config Configuração do webhook
   * @returns Agente atualizado ou null se não encontrado
   */
  configureWebhook(agentId: string, config: WebhookConfig): ExternalAgent | null {
    const agent = this.agentsById.get(agentId);
    if (!agent) return null;
    
    // Adiciona campos padrão se não estiverem presentes
    const webhookConfig: WebhookConfig = {
      ...config,
      retryCount: config.retryCount || 0,
      enabled: config.enabled !== undefined ? config.enabled : true
    };
    
    // Atualiza a configuração do webhook
    agent.webhook = webhookConfig;
    
    // Registra a atividade
    this.logActivity(
      agentId,
      "configurar_webhook",
      {
        url: webhookConfig.url,
        events: webhookConfig.events,
        enabled: webhookConfig.enabled
      }
    );
    
    return agent;
  }
  
  /**
   * Remove a configuração de webhook de um agente
   * @param agentId ID do agente
   * @returns Verdadeiro se sucesso, falso se falhar
   */
  removeWebhook(agentId: string): boolean {
    const agent = this.agentsById.get(agentId);
    if (!agent) return false;
    
    if (agent.webhook) {
      delete agent.webhook;
      
      // Registra a atividade
      this.logActivity(
        agentId,
        "remover_webhook",
        { timestamp: new Date().toISOString() }
      );
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Dispara um evento para o webhook de um agente
   * @param agentId ID do agente
   * @param eventType Tipo de evento
   * @param payload Dados do evento
   */
  async triggerWebhook(agentId: string, eventType: string, payload: any): Promise<boolean> {
    const agent = this.agentsById.get(agentId);
    if (!agent || !agent.webhook || !agent.webhook.enabled) return false;
    
    // Verificar se o agente está interessado neste tipo de evento
    if (!agent.webhook.events.includes(eventType) && 
        !agent.webhook.events.includes('*')) {
      return false;
    }
    
    try {
      // Preparar dados para envio
      const webhookData = {
        event: eventType,
        timestamp: new Date().toISOString(),
        agent: {
          id: agent.id,
          name: agent.name
        },
        data: payload
      };
      
      // Adicionar assinatura se tiver segredo
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (agent.webhook.secret) {
        const signature = createHash('sha256')
          .update(JSON.stringify(webhookData) + agent.webhook.secret)
          .digest('hex');
        
        headers['X-Webhook-Signature'] = signature;
      }
      
      // Enviar requisição para o webhook
      const response = await fetch(agent.webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookData)
      });
      
      // Atualizar resultado da entrega
      agent.webhook.lastDelivery = {
        timestamp: new Date().toISOString(),
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Entregue com sucesso' : `Erro: ${response.status} ${response.statusText}`
      };
      
      // Se falhou, incrementar contador de tentativas
      if (!response.ok) {
        agent.webhook.retryCount++;
      } else {
        agent.webhook.retryCount = 0;
      }
      
      // Registrar a atividade
      this.logActivity(
        agentId,
        "webhook_triggered",
        {
          event: eventType,
          success: response.ok,
          status: response.status,
          url: agent.webhook.url
        }
      );
      
      return response.ok;
      
    } catch (error) {
      console.error(`[ExternalAgentManager] Erro ao enviar webhook para ${agent.name}:`, error);
      
      // Atualizar status da entrega
      if (agent.webhook) {
        agent.webhook.lastDelivery = {
          timestamp: new Date().toISOString(),
          success: false,
          message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
        agent.webhook.retryCount++;
      }
      
      // Registrar a atividade
      this.logActivity(
        agentId,
        "webhook_error",
        {
          event: eventType,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      );
      
      return false;
    }
  }
  
  /**
   * Notifica todos os agentes interessados sobre um evento
   * @param eventType Tipo de evento
   * @param payload Dados do evento
   */
  async broadcastEvent(eventType: string, payload: any): Promise<{
    total: number;
    success: number;
    failed: number;
  }> {
    const agents = Array.from(this.agentsById.values());
    const eligibleAgents = agents.filter(
      agent => agent.webhook && 
              agent.webhook.enabled && 
              (agent.webhook.events.includes(eventType) || agent.webhook.events.includes('*'))
    );
    
    let success = 0;
    let failed = 0;
    
    const promises = eligibleAgents.map(async (agent) => {
      const result = await this.triggerWebhook(agent.id, eventType, payload);
      if (result) {
        success++;
      } else {
        failed++;
      }
    });
    
    await Promise.all(promises);
    
    return {
      total: eligibleAgents.length,
      success,
      failed
    };
  }
  
  /**
   * Gera estatísticas sobre os agentes e suas atividades
   */
  getSystemStats(): {
    agents: {
      total: number;
      byType: Record<string, number>;
      active: number;
    };
    tokens: {
      total: number;
      active: number;
      expired: number;
    };
    activities: {
      total: number;
      byType: Record<string, number>;
      byAgent: Record<string, number>;
      recentCount: number;
    };
    webhooks?: {
      total: number;
      enabled: number;
      byEventType: Record<string, number>;
    }
  } {
    const now = new Date();
    const agents = Array.from(this.agents.values());
    const tokens = Array.from(this.tokens.values());
    
    // Contagem de tipos de agentes
    const agentTypeCount: Record<string, number> = {};
    agents.forEach(agent => {
      const type = agent.metadata.type || 'unknown';
      agentTypeCount[type] = (agentTypeCount[type] || 0) + 1;
    });
    
    // Contagem de agentes ativos (com atividade nos últimos 7 dias)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeAgents = agents.filter(agent => 
      agent.metadata.lastActivity && new Date(agent.metadata.lastActivity) > sevenDaysAgo
    );
    
    // Contagem de tipos de atividades
    const activityTypeCount: Record<string, number> = {};
    const activityByAgent: Record<string, number> = {};
    this.activityLog.forEach(activity => {
      activityTypeCount[activity.action] = (activityTypeCount[activity.action] || 0) + 1;
      activityByAgent[activity.agentId] = (activityByAgent[activity.agentId] || 0) + 1;
    });
    
    // Contagem de atividades recentes (últimas 24h)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentActivities = this.activityLog.filter(
      activity => new Date(activity.timestamp) > oneDayAgo
    );
    
    // Analisar tokens
    const activeTokens = tokens.filter(token => new Date(token.expiresAt) > now);
    const expiredTokens = tokens.filter(token => new Date(token.expiresAt) <= now);
    
    // Analisar webhooks
    const webhooksData = agents.filter(agent => agent.webhook);
    const enabledWebhooks = webhooksData.filter(agent => agent.webhook?.enabled);
    
    // Contagem de eventos de webhook
    const webhookEventCount: Record<string, number> = {};
    webhooksData.forEach(agent => {
      if (agent.webhook) {
        agent.webhook.events.forEach(event => {
          webhookEventCount[event] = (webhookEventCount[event] || 0) + 1;
        });
      }
    });
    
    return {
      agents: {
        total: agents.length,
        byType: agentTypeCount,
        active: activeAgents.length
      },
      tokens: {
        total: tokens.length,
        active: activeTokens.length,
        expired: expiredTokens.length
      },
      activities: {
        total: this.activityLog.length,
        byType: activityTypeCount,
        byAgent: activityByAgent,
        recentCount: recentActivities.length
      },
      webhooks: {
        total: webhooksData.length,
        enabled: enabledWebhooks.length,
        byEventType: webhookEventCount
      }
    };
  }
}

// Singleton
const externalAgentManager = new ExternalAgentManager();

export default externalAgentManager;