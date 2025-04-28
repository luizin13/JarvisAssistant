/**
 * Agente de Comunicação
 * 
 * Especialista em otimização de comunicação, tratamento e priorização de mensagens
 * entre agentes do sistema.
 */

import { BaseSpecializedAgent } from './base-agent';
import { 
  AgentResponse, 
  AgentContext, 
  AgentCapability
} from './agent-interface';

export class CommunicationAgent extends BaseSpecializedAgent {
  constructor() {
    // Define capabilities específicas do agente de comunicação
    const capabilities: AgentCapability[] = [
      {
        name: 'optimize_message_routing',
        description: 'Otimiza o roteamento de mensagens entre agentes com base em prioridade',
        parameters: [
          {
            name: 'message_volume',
            type: 'number',
            required: true,
            description: 'Volume de mensagens a serem processadas'
          },
          {
            name: 'priority_level',
            type: 'string',
            required: true,
            description: 'Nível de prioridade (baixa, normal, alta, critica)'
          }
        ]
      },
      {
        name: 'analyze_communication_patterns',
        description: 'Analisa padrões de comunicação para identificar gargalos',
        parameters: [
          {
            name: 'timeframe',
            type: 'string',
            required: true,
            description: 'Período de análise (hora, dia, semana)'
          }
        ]
      },
      {
        name: 'implement_message_buffering',
        description: 'Implementa sistema de buffer para otimizar tráfego de mensagens',
        parameters: [
          {
            name: 'buffer_size',
            type: 'number',
            required: true,
            description: 'Tamanho do buffer a ser implementado'
          },
          {
            name: 'processing_strategy',
            type: 'string',
            required: true,
            description: 'Estratégia de processamento (FIFO, LIFO, prioridade)'
          }
        ]
      },
      {
        name: 'craft_persuasive_message',
        description: 'Cria mensagens persuasivas para diferentes contextos',
        parameters: [
          {
            name: 'context',
            type: 'string',
            required: true,
            description: 'Contexto da comunicação'
          },
          {
            name: 'target_audience',
            type: 'string',
            required: true,
            description: 'Público-alvo da mensagem'
          }
        ]
      }
    ];

    super('Agente de Comunicação', 'Especialista em otimização de comunicação entre agentes do sistema', 'comunicacao', capabilities);
  }

  /**
   * Processa uma requisição e retorna uma resposta
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Analisar o tipo de requisição
      let message = '';
      let insightContent = '';
      let insightType = 'communication_analysis';
      let confidence = 0.8;
      let requestType = this.determineRequestType(context);
      
      switch (requestType) {
        case 'optimize_message_routing':
          message = await this.optimizeMessageRouting(context);
          insightContent = 'Otimização de rotas de mensagens com base em prioridade';
          confidence = 0.92;
          break;
          
        case 'analyze_communication_patterns':
          message = await this.analyzeCommunicationPatterns(context);
          insightContent = 'Análise detalhada de padrões de comunicação entre agentes';
          confidence = 0.89;
          break;
          
        case 'implement_message_buffering':
          message = await this.implementMessageBuffering(context);
          insightContent = 'Sistema de buffer implementado para otimizar tráfego de mensagens';
          confidence = 0.94;
          break;
          
        case 'craft_persuasive_message':
          message = await this.craftPersuasiveMessage(context);
          insightContent = 'Mensagem persuasiva customizada para o contexto específico';
          insightType = 'persuasive_communication';
          confidence = 0.91;
          break;
          
        default:
          message = `Como especialista em comunicação, posso ajudar com:
- Otimização do roteamento de mensagens entre agentes
- Análise de padrões de comunicação para identificar gargalos
- Implementação de buffers para gerenciar tráfego de mensagens
- Criação de mensagens persuasivas para diferentes contextos

Para utilizar estas capacidades, por favor especifique uma em sua solicitação com os parâmetros adequados.`;
          insightContent = 'Esclarecimento sobre as capacidades do agente de comunicação';
          insightType = 'capability_description';
          confidence = 0.85;
      }
      
      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);
      
      return {
        success: true,
        message,
        metadata: {
          processingTime,
          confidenceLevel: confidence,
          agentId: this.id,
          agentName: this.name,
          domain: this.domain
        },
        insights: [
          {
            type: insightType,
            content: insightContent,
            confidence
          }
        ]
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[${this.name}] Erro ao processar requisição:`, errorMessage);
      
      return {
        success: false,
        message: `Ocorreu um erro ao processar sua requisição. Por favor, verifique os parâmetros e tente novamente.`,
        metadata: {
          processingTime,
          error: errorMessage,
          agentId: this.id,
          agentName: this.name
        }
      };
    }
  }

  /**
   * Determina o tipo de requisição com base no contexto
   */
  private determineRequestType(context: AgentContext): string {
    // Simplificado para exemplo, em produção fazer análise mais robusta
    const request = context.request?.toString().toLowerCase() || '';
    
    if (request.includes('otimiz') && request.includes('rot')) return 'optimize_message_routing';
    if (request.includes('analis') && request.includes('padr')) return 'analyze_communication_patterns';
    if (request.includes('buffer') || request.includes('fila')) return 'implement_message_buffering';
    if (request.includes('persuasiv') || request.includes('mensag')) return 'craft_persuasive_message';
    
    // Buscar por parâmetros relacionados às capacidades
    if (context.request?.message_volume || context.request?.priority_level) return 'optimize_message_routing';
    if (context.request?.timeframe) return 'analyze_communication_patterns';
    if (context.request?.buffer_size || context.request?.processing_strategy) return 'implement_message_buffering';
    if (context.request?.context && context.request?.target_audience) return 'craft_persuasive_message';
    
    return 'unknown';
  }

  /**
   * Atualiza estatísticas do agente
   */
  private updateStats(success: boolean, processingTime: number): void {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // Atualizar tempo médio de processamento
    const oldTotal = this.stats.averageProcessingTime * (this.stats.totalRequests - 1);
    this.stats.averageProcessingTime = (oldTotal + processingTime) / this.stats.totalRequests;
    
    this.stats.lastUpdated = new Date().toISOString();
    
    // Adicionar ao histórico de desempenho
    if (this.stats.performanceHistory.length >= 100) {
      this.stats.performanceHistory.shift(); // Manter apenas os últimos 100 registros
    }
    
    this.stats.performanceHistory.push({
      date: new Date().toISOString(),
      successRate: this.stats.successfulRequests / this.stats.totalRequests,
      averageProcessingTime: this.stats.averageProcessingTime,
      confidenceScore: this.stats.confidenceScore
    });
  }

  /**
   * Implementação específica para evolução do agente
   */
  async evolve(): Promise<boolean> {
    // Analisar padrões de comunicação e adaptar algoritmos
    this.stats.confidenceScore += 0.01;
    if (this.stats.confidenceScore > 0.99) this.stats.confidenceScore = 0.99;
    
    this.stats.learningProgress += 0.02;
    if (this.stats.learningProgress > 1) this.stats.learningProgress = 1;
    
    return true;
  }

  /**
   * Métodos específicos de capacidades do agente
   */
  
  /**
   * Otimiza o roteamento de mensagens entre agentes
   */
  private async optimizeMessageRouting(context: AgentContext): Promise<string> {
    // Extrai parâmetros da requisição
    const messageVolume = this.extractNumberParam(context, 'message_volume', 100);
    const priorityLevel = this.extractStringParam(context, 'priority_level', 'normal');
    
    // Lógica de otimização de roteamento
    let throughput = 0;
    let bufferSize = 0;
    let latency = 0;
    
    switch (priorityLevel) {
      case 'critica':
        throughput = messageVolume * 2;
        bufferSize = Math.ceil(messageVolume * 0.3);
        latency = 5;
        break;
      case 'alta':
        throughput = messageVolume * 1.5;
        bufferSize = Math.ceil(messageVolume * 0.5);
        latency = 15;
        break;
      case 'normal':
        throughput = messageVolume;
        bufferSize = Math.ceil(messageVolume * 0.8);
        latency = 30;
        break;
      case 'baixa':
        throughput = messageVolume * 0.8;
        bufferSize = messageVolume;
        latency = 60;
        break;
      default:
        throughput = messageVolume;
        bufferSize = Math.ceil(messageVolume * 0.8);
        latency = 30;
    }
    
    return `## Otimização de Roteamento de Mensagens

**Volume de Mensagens:** ${messageVolume} mensagens
**Nível de Prioridade:** ${priorityLevel}

### Configurações Recomendadas
- **Throughput:** ${throughput} mensagens/segundo
- **Tamanho do Buffer:** ${bufferSize} mensagens
- **Latência Esperada:** ${latency}ms

### Estratégia de Implementação
1. Implementar fila de prioridade com ${bufferSize} slots
2. Configurar timeout de ${latency*2}ms para mensagens não processadas
3. Estabelecer fluxo máximo de ${throughput} mensagens/segundo
4. Implementar política de descarte adaptativo para mensagens de baixa prioridade em caso de sobrecarga

Esta configuração otimizará o fluxo de comunicação entre agentes, priorizando mensagens ${priorityLevel}s enquanto mantém a responsividade do sistema mesmo sob alta carga.`;
  }
  
  /**
   * Analisa padrões de comunicação para identificar gargalos
   */
  private async analyzeCommunicationPatterns(context: AgentContext): Promise<string> {
    // Extrai parâmetros da requisição
    const timeframe = this.extractStringParam(context, 'timeframe', 'hora');
    
    // Dados de análise de padrões
    const patterns: { [key: string]: any } = {
      hora: {
        picos: '10:00, 14:00, 16:30',
        gargalos: 'Orquestrador → AgenteTécnico, AgenteFinanceiro → AgenteCrédito',
        tempoMedioResposta: '230ms',
        taxaErros: '2.3%',
        recomendacoes: [
          'Aumentar buffer do AgenteTécnico em horários de pico',
          'Implementar cache de respostas para perguntas frequentes',
          'Adicionar mecanismo de retry com exponential backoff'
        ]
      },
      dia: {
        picos: 'Segunda 9:00-11:00, Quarta 14:00-16:00, Sexta 15:00-17:00',
        gargalos: 'Orquestrador → Todos os agentes (Segunda), AgenteAprendiz → AgenteTécnico (Quarta)',
        tempoMedioResposta: '450ms',
        taxaErros: '3.7%',
        recomendacoes: [
          'Reorganizar processamento de dados pesados para horários de baixa demanda',
          'Implementar balanceamento de carga entre agentes do mesmo tipo',
          'Criar canal de comunicação prioritário para mensagens críticas'
        ]
      },
      semana: {
        picos: 'Segunda (manhã), Quarta (tarde), Última sexta do mês',
        gargalos: 'Sistema → APIs externas, Orquestrador → Agentes de domínio especializado',
        tempoMedioResposta: '680ms',
        taxaErros: '5.2%',
        recomendacoes: [
          'Implementar sistema de cache de dois níveis para dados frequentemente acessados',
          'Desenvolver mecanismo de agregação de mensagens similares',
          'Criar pipeline de processamento assíncrono para tarefas não-críticas',
          'Otimizar serialização/deserialização de mensagens entre agentes'
        ]
      }
    };
    
    // Seleciona os dados para o timeframe solicitado
    const result = patterns[timeframe] || patterns.hora;
    
    return `## Análise de Padrões de Comunicação (${timeframe})

### Métricas Gerais
- **Períodos de Pico:** ${result.picos}
- **Gargalos Identificados:** ${result.gargalos}
- **Tempo Médio de Resposta:** ${result.tempoMedioResposta}
- **Taxa de Erros:** ${result.taxaErros}

### Gráfico de Fluxo de Mensagens
\`\`\`
     ┌──────────┐      ┌─────────────┐
     │          │ 25ms │             │
     │   API    ├──────► Orquestrador│
     │  Gateway │      │             │
     └──────────┘      └──────┬──────┘
                              │
           ┌─────────────────┴─────────────────┐
           │                 │                 │
     ┌─────▼─────┐    ┌──────▼─────┐    ┌─────▼──────┐
     │           │    │            │    │            │
120ms│  Agente   │85ms│   Agente   │65ms│   Agente   │
     │ Técnico   ├────► Aprendizado├────►  Crédito   │
     │           │    │            │    │            │
     └───────────┘    └────────────┘    └────────────┘
\`\`\`

### Recomendações para Otimização
${result.recomendacoes.map((r: string) => `- ${r}`).join('\n')}

### Ações Imediatas Sugeridas
1. Aumentar o buffer para canais com maior congestionamento
2. Implementar mecanismo de priorização baseado no tipo de mensagem
3. Otimizar serialização de mensagens para reduzir overhead`;
  }
  
  /**
   * Implementa sistema de buffer para otimizar tráfego de mensagens
   */
  private async implementMessageBuffering(context: AgentContext): Promise<string> {
    // Extrai parâmetros da requisição
    const bufferSize = this.extractNumberParam(context, 'buffer_size', 100);
    const processingStrategy = this.extractStringParam(context, 'processing_strategy', 'prioridade');
    
    // Configurações de buffer por estratégia
    const configDetails: { [key: string]: any } = {
      prioridade: {
        mecanismo: 'Fila de prioridade com heap binário',
        complexidade: 'O(log n) para inserção e remoção',
        beneficios: 'Garante que mensagens críticas sejam processadas primeiro',
        codigo: `
class PriorityMessageQueue {
  constructor(maxSize = ${bufferSize}) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(message, priority) {
    if (this.isFull()) {
      // Descarta mensagem de menor prioridade se necessário
      if (this.lowestPriority() < priority) {
        this.dequeueLowest();
      } else {
        return false; // Não foi possível enfileirar
      }
    }
    
    // Inserir mantendo ordem de prioridade
    this.queue.push({ message, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
    return true;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    return this.queue.shift().message;
  }
  
  // Outros métodos auxiliares...
}`
      },
      FIFO: {
        mecanismo: 'Fila circular com array',
        complexidade: 'O(1) para inserção e remoção',
        beneficios: 'Performance consistente e preservação da ordem de chegada',
        codigo: `
class CircularBuffer {
  constructor(capacity = ${bufferSize}) {
    this.buffer = new Array(capacity);
    this.capacity = capacity;
    this.size = 0;
    this.head = 0;
    this.tail = 0;
  }

  enqueue(item) {
    if (this.isFull()) {
      return false;
    }
    
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.size++;
    return true;
  }

  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    
    const item = this.buffer[this.head];
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }
  
  // Outros métodos auxiliares...
}`
      },
      LIFO: {
        mecanismo: 'Pilha com redimensionamento dinâmico',
        complexidade: 'O(1) amortizado para operações push/pop',
        beneficios: 'Ideal para processar eventos mais recentes primeiro',
        codigo: `
class MessageStack {
  constructor(initialCapacity = ${bufferSize}) {
    this.stack = [];
    this.maxSize = initialCapacity;
  }

  push(message) {
    if (this.isFull()) {
      return false;
    }
    
    this.stack.push(message);
    return true;
  }

  pop() {
    if (this.isEmpty()) {
      return null;
    }
    
    return this.stack.pop();
  }
  
  // Outros métodos auxiliares...
}`
      }
    };
    
    // Seleciona a configuração para a estratégia solicitada
    const config = configDetails[processingStrategy] || configDetails.prioridade;
    
    return `## Sistema de Buffering de Mensagens

**Tamanho do Buffer:** ${bufferSize} mensagens
**Estratégia de Processamento:** ${processingStrategy}

### Detalhes da Implementação
- **Mecanismo:** ${config.mecanismo}
- **Complexidade de Tempo:** ${config.complexidade}
- **Principais Benefícios:** ${config.beneficios}

### Pseudocódigo de Implementação
\`\`\`javascript
${config.codigo}
\`\`\`

### Métricas de Performance Esperadas
- **Throughput Máximo:** ~${Math.floor(bufferSize * 0.8)} mensagens/segundo
- **Taxa de Perda (sob carga máxima):** < ${processingStrategy === 'prioridade' ? '2' : '5'}%
- **Latência Média:** ${processingStrategy === 'prioridade' ? '25-40' : '15-30'}ms

### Integração com o Sistema
1. Instalar o buffer entre o Orquestrador e os Agentes Especializados
2. Configurar monitoramento de taxa de utilização do buffer
3. Implementar política de alerta quando ocupação ultrapassar 80%
4. Revisar dimensionamento após 1 semana de uso`;
  }
  
  /**
   * Cria mensagens persuasivas para diferentes contextos
   */
  private async craftPersuasiveMessage(context: AgentContext): Promise<string> {
    // Extrai parâmetros da requisição
    const messageContext = this.extractStringParam(context, 'context', 'geral');
    const targetAudience = this.extractStringParam(context, 'target_audience', 'usuários');
    
    // Mensagem personalizada com base no contexto
    let persuasiveMessage = '';
    
    // Personaliza com base no contexto
    if (messageContext.includes('negócios') || messageContext.includes('business')) {
      persuasiveMessage = `
## Comunicação Estratégica para Decisores de Negócios

### Mensagem Principal:
"Nossa solução de inteligência artificial multiagente reduz em até 35% o tempo de tomada de decisão em operações complexas de logística e farming, permitindo que você foque no crescimento estratégico do negócio."

### Pontos-chave:
- Enfatize redução de custos operacionais e aumento de eficiência
- Destaque casos de sucesso específicos do setor (com números)
- Utilize linguagem que remeta a visão estratégica e liderança
- Conecte a solução diretamente ao impacto no resultado financeiro

### Tom e linguagem:
- Direto, focado em resultados e orientado a dados
- Evite jargões técnicos excessivos
- Use comparativos concretos com concorrentes
- Inclua chamadas para ação claras`;
    }
    else if (messageContext.includes('técnico') || messageContext.includes('technical')) {
      persuasiveMessage = `
## Comunicação Técnica para Especialistas

### Mensagem Principal:
"Nossa arquitetura multiagente com otimização de comunicação gerencia automaticamente o balanceamento de carga entre módulos, alcançando 98.7% de uptime e latência média de 45ms mesmo em períodos de pico."

### Pontos-chave:
- Detalhe aspectos técnicos da arquitetura e algoritmos utilizados
- Forneça dados de performance e benchmarks comparativos
- Discuta escalabilidade, segurança e estratégias de cache
- Explique as vantagens técnicas sobre sistemas monolíticos

### Tom e linguagem:
- Preciso e baseado em evidências
- Rico em detalhes técnicos relevantes
- Use termos específicos da área (autoscaling, load-balancing, etc.)
- Inclua referências a padrões de arquitetura reconhecidos`;
    }
    else if (messageContext.includes('governo') || messageContext.includes('government')) {
      persuasiveMessage = `
## Comunicação Institucional para Órgãos Governamentais

### Mensagem Principal:
"Nossa plataforma de inteligência de negócios proporciona transparência e eficiência operacional, atendendo às diretrizes da Lei Geral de Proteção de Dados e aos requisitos de conformidade do setor público."

### Pontos-chave:
- Enfatize conformidade com regulamentações específicas
- Destaque casos de uso em outras instituições governamentais
- Foque em benefícios como transparência, accountability e racionalização de recursos
- Mencione integrações com sistemas governamentais existentes

### Tom e linguagem:
- Formal e institucional
- Evite hipérboles ou linguagem comercial agressiva
- Use terminologia familiar ao setor público
- Inclua referências a políticas públicas relevantes`;
    }
    else {
      persuasiveMessage = `
## Comunicação Geral Adaptável

### Mensagem Principal:
"Nossa plataforma de assistência inteligente combina múltiplos agentes especializados que trabalham em conjunto para oferecer insights personalizados, aumentando sua produtividade e simplificando decisões complexas."

### Pontos-chave:
- Destaque a facilidade de uso e adaptabilidade da solução
- Enfatize benefícios imediatos e de longo prazo
- Utilize linguagem inclusiva e acessível
- Apresente o valor único da proposta de forma concisa

### Tom e linguagem:
- Claro e acessível para diferentes perfis
- Balanceie elementos técnicos e práticos
- Use exemplos concretos e relatable
- Mantenha mensagens curtas e impactantes`;
    }
    
    // Personalização para público-alvo específico
    let audienceCustomization = '';
    
    if (targetAudience.includes('executivo') || targetAudience.includes('executive')) {
      audienceCustomization = `
### Personalização para Executivos e Decisores:
- Foque nos resultados de negócios e ROI
- Apresente dados comparativos de mercado
- Inclua estimativas de impacto financeiro
- Destaque vantagem competitiva proporcionada
- Use cases relevantes para o setor do público`;
    }
    else if (targetAudience.includes('técnico') || targetAudience.includes('technical')) {
      audienceCustomization = `
### Personalização para Equipe Técnica:
- Aprofunde nos detalhes de implementação e arquitetura
- Inclua diagramas técnicos e fluxos de processamento
- Discuta integrações, APIs e extensibilidade
- Aborde questões de escala, segurança e performance
- Forneça informações sobre o stack tecnológico`;
    }
    else if (targetAudience.includes('governo') || targetAudience.includes('government')) {
      audienceCustomization = `
### Personalização para Gestores Públicos:
- Enfatize o alinhamento com políticas públicas
- Destaque conformidade com legislação específica
- Foque na otimização de recursos públicos
- Aborde transparência e prestação de contas
- Inclua exemplos de implementações em outros órgãos`;
    }
    else if (targetAudience.includes('agricultor') || targetAudience.includes('farmer')) {
      audienceCustomization = `
### Personalização para Produtores Rurais:
- Use linguagem clara e objetiva, evitando termos técnicos complexos
- Foque em benefícios práticos para a operação rural
- Destaque economia de tempo e recursos no campo
- Apresente exemplos concretos de uso no dia a dia
- Inclua depoimentos de outros produtores rurais`;
    }
    else if (targetAudience.includes('transportador') || targetAudience.includes('logistics')) {
      audienceCustomization = `
### Personalização para Profissionais de Logística:
- Enfatize otimização de rotas e redução de custos operacionais
- Destaque integração com sistemas de gestão de frota
- Aborde compliance com regulamentações do setor
- Foque na melhoria de prazos de entrega e satisfação do cliente
- Inclua métricas específicas do setor de transportes`;
    }
    else {
      audienceCustomization = `
### Personalização para Público Geral:
- Use linguagem acessível e evite jargões técnicos
- Foque nos benefícios práticos e cotidianos
- Inclua analogias e metáforas para explicar conceitos complexos
- Destaque a interface intuitiva e facilidade de uso
- Apresente depoimentos e casos de uso relatable`;
    }
    
    return `# Estratégia de Comunicação Persuasiva

**Contexto:** ${messageContext}
**Público-alvo:** ${targetAudience}

${persuasiveMessage}

${audienceCustomization}

## Estrutura Recomendada
1. **Abertura impactante** - Capture atenção com um dado surpreendente ou pergunta instigante
2. **Apresentação do problema** - Descreva o desafio atual de forma que ressoe com o público
3. **Solução proposta** - Introduza sua solução como resposta ideal ao problema
4. **Benefícios específicos** - Detalhe vantagens alinhadas às necessidades do público
5. **Evidências e validação** - Apresente dados, casos e testemunhos que comprovem eficácia
6. **Chamada para ação** - Indique próximos passos claros e alcançáveis

## Dicas para Comunicação Efetiva
- Utilize histórias para criar conexão emocional
- Antecipe e responda objeções potenciais
- Mantenha mensagens concisas e focadas
- Adapte o tom e complexidade ao contexto e público
- Teste diferentes abordagens e refine com base em feedback`;
  }
  
  /**
   * Utilitários para extração de parâmetros do contexto
   */
  private extractStringParam(context: AgentContext, paramName: string, defaultValue: string): string {
    if (!context.request) return defaultValue;
    
    // Tenta extrair do objeto request
    if (typeof context.request === 'object' && context.request !== null) {
      return (context.request as any)[paramName]?.toString() || defaultValue;
    }
    
    // Se não encontrar, retorna o valor padrão
    return defaultValue;
  }
  
  private extractNumberParam(context: AgentContext, paramName: string, defaultValue: number): number {
    if (!context.request) return defaultValue;
    
    // Tenta extrair do objeto request
    if (typeof context.request === 'object' && context.request !== null) {
      const value = (context.request as any)[paramName];
      if (value !== undefined) {
        const parsed = parseInt(value.toString());
        return isNaN(parsed) ? defaultValue : parsed;
      }
    }
    
    // Se não encontrar, retorna o valor padrão
    return defaultValue;
  }

  /**
   * Implementação dos métodos da interface ISpecializedAgent
   */
  async initialize(): Promise<boolean> {
    // Já inicializado no construtor
    return true;
  }
  
  async learn(feedback: any): Promise<boolean> {
    // Implementação básica de aprendizado
    if (feedback && typeof feedback === 'object') {
      this.learningData.push({
        timestamp: new Date().toISOString(),
        data: feedback
      });
      
      // Atualizar confiança com base no feedback
      if (feedback.success === true) {
        this.stats.confidenceScore = Math.min(0.99, this.stats.confidenceScore + 0.01);
      } else if (feedback.success === false) {
        this.stats.confidenceScore = Math.max(0.5, this.stats.confidenceScore - 0.02);
      }
    }
    
    return true;
  }
  
  async resetLearning(): Promise<boolean> {
    this.learningData = [];
    this.stats.confidenceScore = 0.7;
    this.stats.learningProgress = 0;
    return true;
  }
  
  async requestCollaboration(agentId: string, query: any): Promise<any> {
    // Implementação básica
    return {
      success: true,
      message: `Colaboração solicitada com agente ${agentId}`,
      data: null
    };
  }
  
  async provideAssistance(requestingAgentId: string, query: any): Promise<any> {
    // Implementação básica
    return {
      success: true,
      message: `Assistência fornecida para agente ${requestingAgentId}`,
      data: null
    };
  }
}