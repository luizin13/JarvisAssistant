/**
 * Serviço para integração com Slack
 * 
 * Este módulo fornece funções para enviar notificações para o Slack,
 * consultar mensagens e gerenciar canais.
 */

import { WebClient, type ChatPostMessageArguments } from "@slack/web-api";

/**
 * Verifica se a integração com Slack está configurada
 * @returns {boolean} Verdadeiro se as credenciais do Slack estiverem disponíveis
 */
export function isSlackConfigured(): boolean {
  return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID);
}

/**
 * Obtém o cliente do Slack ou lança erro se não estiver configurado
 * @returns Cliente do Slack configurado
 */
export function getSlackClient(): WebClient {
  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error("SLACK_BOT_TOKEN environment variable must be set");
  }

  return new WebClient(process.env.SLACK_BOT_TOKEN);
}

/**
 * Obtém o ID do canal padrão do Slack ou lança erro se não estiver configurado
 * @returns ID do canal padrão do Slack
 */
export function getDefaultChannelId(): string {
  if (!process.env.SLACK_CHANNEL_ID) {
    throw new Error("SLACK_CHANNEL_ID environment variable must be set");
  }

  return process.env.SLACK_CHANNEL_ID;
}

/**
 * Envia uma mensagem para o Slack
 * @param message Mensagem estruturada a ser enviada
 * @returns Timestamp da mensagem enviada
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  try {
    if (!isSlackConfigured()) {
      console.warn("Slack não configurado. A mensagem não foi enviada.");
      return undefined;
    }

    const slack = getSlackClient();
    
    // Garante que sempre temos um text value para evitar warnings do Slack
    // O Slack recomenda sempre fornecer um text value para acessibilidade
    const enhancedMessage: ChatPostMessageArguments = {
      ...message,
      text: message.text || "Notificação do Multi-Agent System" // Texto fallback se não fornecido
    };
    
    // Implementa retry com backoff exponencial para lidar com rate limiting
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 segundo
    
    let retries = 0;
    let response;
    
    while (retries <= MAX_RETRIES) {
      try {
        // Envia a mensagem
        response = await slack.chat.postMessage(enhancedMessage);
        break; // Se sucesso, sai do loop
      } catch (error: any) {
        // Verifica se é erro de rate limiting
        if (error.code === 'slack_webapi_platform_error' && error.data?.retry_after) {
          retries++;
          
          if (retries > MAX_RETRIES) {
            throw error; // Lança o erro se excedeu o número máximo de tentativas
          }
          
          // Calcula o tempo de espera com backoff exponencial
          const delay = BASE_DELAY * Math.pow(2, retries - 1) + Math.random() * 1000;
          console.log(`Slack API rate limit atingido. Tentativa ${retries}/${MAX_RETRIES} - Aguardando ${delay}ms`);
          
          // Espera antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Se não for erro de rate limiting, propaga o erro
          throw error;
        }
      }
    }
    
    // Retorna o timestamp da mensagem enviada
    return response?.ts;
  } catch (error) {
    console.error('Erro ao enviar mensagem para o Slack:', error);
    return undefined; // Retornar undefined em vez de propagar o erro para evitar falhas em cascata
  }
}

/**
 * Envia uma notificação simples para o canal do Slack
 * @param text Texto da mensagem
 * @param channelId ID do canal (opcional, usa o padrão se não fornecido)
 * @returns Timestamp da mensagem enviada
 */
export async function sendNotification(
  text: string,
  channelId?: string
): Promise<string | undefined> {
  try {
    const channel = channelId || getDefaultChannelId();
    
    return await sendSlackMessage({
      channel,
      text,
      unfurl_links: false,
      unfurl_media: false
    });
  } catch (error) {
    console.error('Erro ao enviar notificação para o Slack:', error);
    return undefined;
  }
}

/**
 * Envia um alerta ao canal do Slack
 * @param title Título do alerta
 * @param message Mensagem detalhada
 * @param severity Severidade do alerta ('info', 'warning', 'error')
 * @param channelId ID do canal (opcional, usa o padrão se não fornecido)
 * @returns Timestamp da mensagem enviada
 */
export async function sendAlert(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'error' = 'info',
  channelId?: string
): Promise<string | undefined> {
  try {
    const channel = channelId || getDefaultChannelId();
    
    // Define cores de acordo com a severidade
    const colorMap = {
      info: '#2196F3',    // Azul
      warning: '#FF9800', // Laranja
      error: '#F44336'    // Vermelho
    };
    
    const color = colorMap[severity];
    
    // Formatação para data atual
    const timestamp = new Date().toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo' 
    });
    
    return await sendSlackMessage({
      channel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🔔 ${title}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Severidade:* ${severity} | *Data:* ${timestamp}`
            }
          ]
        }
      ],
      attachments: [
        {
          color
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao enviar alerta para o Slack:', error);
    return undefined;
  }
}

/**
 * Envia um relatório de negócios para o Slack
 * @param title Título do relatório
 * @param summary Resumo dos principais pontos
 * @param metrics Métricas em formato de objeto {nome: valor}
 * @param businessType Tipo de negócio ('transport', 'farm', 'both')
 * @param channelId ID do canal (opcional, usa o padrão se não fornecido)
 * @returns Timestamp da mensagem enviada
 */
export async function sendBusinessReport(
  title: string,
  summary: string,
  metrics: Record<string, string | number>,
  businessType: 'transport' | 'farm' | 'both' = 'both',
  channelId?: string
): Promise<string | undefined> {
  try {
    const channel = channelId || getDefaultChannelId();
    
    // Emoji e cor com base no tipo de negócio
    const typeConfig = {
      transport: { emoji: '🚚', color: '#1976D2' }, // Caminhão e azul
      farm: { emoji: '🌾', color: '#388E3C' },      // Planta e verde
      both: { emoji: '📊', color: '#7B1FA2' }       // Gráfico e roxo
    };
    
    const { emoji, color } = typeConfig[businessType];
    
    // Formata métricas para exibição
    const formattedMetrics = Object.entries(metrics)
      .map(([name, value]) => `*${name}:* ${value}`)
      .join(' | ');
    
    return await sendSlackMessage({
      channel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${title}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: summary
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: '*Métricas Principais:*'
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: formattedMetrics
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Relatório gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
            }
          ]
        }
      ],
      attachments: [
        {
          color
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao enviar relatório para o Slack:', error);
    return undefined;
  }
}

/**
 * Envia uma notificação sobre oportunidade de crédito para o Slack
 * @param opportunity Objeto com dados da oportunidade
 * @param channelId ID do canal (opcional, usa o padrão se não fornecido)
 * @returns Timestamp da mensagem enviada
 */
export async function sendCreditOpportunity(
  opportunity: {
    title: string;
    institution: string;
    description: string;
    amount?: string;
    interestRate?: string;
    term?: string;
    category: string;
  },
  channelId?: string
): Promise<string | undefined> {
  try {
    const channel = channelId || getDefaultChannelId();
    
    // Detalhes da oportunidade
    const details = [
      opportunity.amount ? `*Valor:* ${opportunity.amount}` : '',
      opportunity.interestRate ? `*Taxa de Juros:* ${opportunity.interestRate}` : '',
      opportunity.term ? `*Prazo:* ${opportunity.term}` : ''
    ].filter(Boolean).join(' | ');
    
    return await sendSlackMessage({
      channel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `💰 Nova Oportunidade de Crédito`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${opportunity.title}*\n${opportunity.description}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Instituição:* ${opportunity.institution}`
            },
            {
              type: 'mrkdwn',
              text: `*Categoria:* ${opportunity.category}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: details
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Oportunidade identificada em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
            }
          ]
        }
      ],
      attachments: [
        {
          color: '#2E7D32' // Verde escuro
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao enviar oportunidade de crédito para o Slack:', error);
    return undefined;
  }
}

/**
 * Envia uma notícia relevante para o Slack
 * @param news Objeto com dados da notícia
 * @param channelId ID do canal (opcional, usa o padrão se não fornecido)
 * @returns Timestamp da mensagem enviada
 */
export async function sendNewsUpdate(
  news: {
    title: string;
    summary: string;
    url: string;
    source: string;
    category: string;
    businessImpact?: string;
  },
  channelId?: string
): Promise<string | undefined> {
  try {
    const channel = channelId || getDefaultChannelId();
    
    // Determina emoji e cor com base na categoria
    const categoryConfig: Record<string, { emoji: string, color: string }> = {
      transport: { emoji: '🚚', color: '#1976D2' },
      farm: { emoji: '🌾', color: '#388E3C' },
      tech: { emoji: '💻', color: '#0288D1' },
      ai: { emoji: '🤖', color: '#7B1FA2' },
      economy: { emoji: '📈', color: '#FFA000' },
      policy: { emoji: '📜', color: '#795548' },
      default: { emoji: '📰', color: '#455A64' }
    };
    
    const { emoji, color } = categoryConfig[news.category] || categoryConfig.default;
    
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Notícia: ${news.title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: news.summary
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Fonte:* ${news.source}`
          },
          {
            type: 'mrkdwn',
            text: `*Categoria:* ${news.category}`
          }
        ]
      }
    ];
    
    // Adiciona impacto nos negócios se disponível
    if (news.businessImpact) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Impacto nos Negócios:*\n${news.businessImpact}`
        }
      });
    }
    
    // Adiciona link para a notícia
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Leia mais',
            emoji: true
          },
          url: news.url,
          action_id: 'read_more'
        }
      ]
    });
    
    // Adiciona contexto com timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Notícia compartilhada em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
        }
      ]
    });
    
    return await sendSlackMessage({
      channel,
      blocks,
      attachments: [
        {
          color
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao enviar notícia para o Slack:', error);
    return undefined;
  }
}

/**
 * Lê o histórico de mensagens de um canal
 * @param channelId ID do canal para ler histórico
 * @param limit Limite de mensagens para retornar
 * @returns Resposta com histórico de mensagens
 */
export async function readSlackHistory(
  channelId?: string,
  limit: number = 10
): Promise<any> {
  try {
    if (!isSlackConfigured()) {
      throw new Error("Slack não configurado. Impossível ler histórico.");
    }
    
    const slack = getSlackClient();
    const channel = channelId || getDefaultChannelId();
    
    // Obtém mensagens
    return await slack.conversations.history({
      channel,
      limit
    });
  } catch (error) {
    console.error('Erro ao ler histórico do Slack:', error);
    throw error;
  }
}

/**
 * Verifica se há respostas ou reações a uma mensagem específica
 * @param messageTs Timestamp da mensagem
 * @param channelId ID do canal
 * @returns Respostas e reações à mensagem
 */
export async function checkMessageResponses(
  messageTs: string,
  channelId?: string
): Promise<{ 
  replies: any[], 
  reactions: any[] 
}> {
  try {
    if (!isSlackConfigured()) {
      throw new Error("Slack não configurado. Impossível verificar respostas.");
    }
    
    const slack = getSlackClient();
    const channel = channelId || getDefaultChannelId();
    
    // Obtém respostas na thread
    const repliesResponse = await slack.conversations.replies({
      channel,
      ts: messageTs
    });
    
    // Obtém reações
    const reactionsResponse = await slack.reactions.get({
      channel,
      timestamp: messageTs
    });
    
    return {
      replies: repliesResponse.messages?.slice(1) || [], // Remove a mensagem original
      reactions: reactionsResponse.message?.reactions || []
    };
  } catch (error) {
    console.error('Erro ao verificar respostas de mensagem no Slack:', error);
    return { replies: [], reactions: [] };
  }
}

/**
 * Envia uma atualização de uma tarefa do sistema multi-agente para o Slack
 * @param task Objeto com dados da tarefa
 * @param status Status da atualização ('created', 'updated', 'completed')
 * @param channelId ID do canal (opcional, usa o padrão se não fornecido)
 * @returns Timestamp da mensagem enviada
 */
export async function sendTaskUpdate(
  task: {
    id: string;
    title: string;
    description: string;
    state: string;
    result?: string;
    steps?: any[];
  },
  status: 'created' | 'updated' | 'completed',
  channelId?: string
): Promise<string | undefined> {
  try {
    const channel = channelId || getDefaultChannelId();
    
    // Emoji e texto com base no status
    const statusConfig = {
      created: { emoji: '🆕', text: 'Nova Tarefa Criada' },
      updated: { emoji: '🔄', text: 'Atualização de Tarefa' },
      completed: { emoji: '✅', text: 'Tarefa Concluída' }
    };
    
    const { emoji, text } = statusConfig[status];
    
    // Cores com base no status
    const colorMap = {
      created: '#2196F3',  // Azul
      updated: '#FF9800',  // Laranja
      completed: '#4CAF50' // Verde
    };
    
    // Formatação para o estado da tarefa
    const stateFormatted = task.state.charAt(0).toUpperCase() + task.state.slice(1).replace(/_/g, ' ');
    
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${text}: ${task.title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: task.description
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*ID:* ${task.id}`
          },
          {
            type: 'mrkdwn',
            text: `*Estado:* ${stateFormatted}`
          }
        ]
      }
    ];
    
    // Adiciona resultado se a tarefa estiver concluída
    if (status === 'completed' && task.result) {
      // Limita o resultado a 1000 caracteres para o Slack
      const truncatedResult = task.result.length > 1000 
        ? task.result.substring(0, 997) + '...' 
        : task.result;
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resultado:*\n${truncatedResult}`
        }
      });
    }
    
    // Adiciona um resumo dos passos se disponível
    if (task.steps && task.steps.length > 0) {
      const stepsText = task.steps
        .map((step, index) => `${index + 1}. *${step.description}* - ${step.state}`)
        .join('\n');
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Etapas:*\n${stepsText}`
        }
      });
    }
    
    // Adiciona timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Atualização enviada em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
        }
      ]
    });
    
    return await sendSlackMessage({
      channel,
      blocks,
      attachments: [
        {
          color: colorMap[status]
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao enviar atualização de tarefa para o Slack:', error);
    return undefined;
  }
}