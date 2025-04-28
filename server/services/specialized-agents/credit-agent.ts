import { BaseSpecializedAgent } from './base-agent';
import { AgentContext, AgentResponse, AgentCapability } from './agent-interface';

/**
 * Agente especializado em crédito empresarial, análise SCR, 
 * linhas do BNDES e estratégias não óbvias.
 */
export class CreditAgent extends BaseSpecializedAgent {
  // Base de conhecimento específica do agente de crédito
  private creditProducts: Map<string, any> = new Map();
  private bankPolicies: Map<string, any> = new Map();
  private bndesLines: Map<string, any> = new Map();
  private scoringModels: Map<string, any> = new Map();

  constructor() {
    // Define capabilities específicas do agente de crédito
    const capabilities: AgentCapability[] = [
      {
        name: 'analyze_credit_options',
        description: 'Analisa opções de crédito disponíveis para a empresa',
        parameters: [
          {
            name: 'company_size',
            type: 'string',
            required: true,
            description: 'Tamanho da empresa (micro, pequena, média, grande)'
          },
          {
            name: 'sector',
            type: 'string',
            required: true,
            description: 'Setor de atuação da empresa'
          },
          {
            name: 'annual_revenue',
            type: 'number',
            required: false,
            description: 'Faturamento anual em reais'
          },
          {
            name: 'credit_score',
            type: 'number',
            required: false,
            description: 'Score de crédito (0-1000)'
          }
        ],
        examples: [
          'Analisar opções de crédito para uma transportadora de médio porte',
          'Quais linhas do BNDES são adequadas para uma fazenda de café?'
        ]
      },
      {
        name: 'assess_scr_impact',
        description: 'Avalia o impacto do SCR (Sistema de Informações de Crédito) para a empresa',
        parameters: [
          {
            name: 'current_debt',
            type: 'number',
            required: false,
            description: 'Dívida atual em reais'
          },
          {
            name: 'payment_history',
            type: 'string',
            required: false,
            description: 'Histórico de pagamento (resumo)'
          }
        ],
        examples: [
          'Como minha situação no SCR afeta novos empréstimos?',
          'Estratégias para melhorar o perfil no SCR'
        ]
      },
      {
        name: 'bndes_strategy',
        description: 'Desenvolve estratégias para acessar financiamentos do BNDES',
        parameters: [
          {
            name: 'investment_purpose',
            type: 'string',
            required: true,
            description: 'Finalidade do investimento'
          },
          {
            name: 'investment_amount',
            type: 'number',
            required: false,
            description: 'Valor do investimento pretendido'
          }
        ],
        examples: [
          'Como acessar linhas do BNDES para renovar frota de caminhões',
          'Existe financiamento do BNDES para energia solar em fazendas?'
        ]
      },
      {
        name: 'hidden_credit_opportunities',
        description: 'Identifica oportunidades de crédito não óbvias e pouco conhecidas',
        parameters: [
          {
            name: 'company_profile',
            type: 'string',
            required: true,
            description: 'Perfil da empresa e necessidades de crédito'
          }
        ],
        examples: [
          'Existem linhas especiais para empresas de transporte em regiões rurais?',
          'Quais são os programas de incentivo fiscal que podem ser convertidos em crédito?'
        ]
      }
    ];

    // Chama o construtor da classe base
    super(
      'AgenteCredito',
      'Especialista em crédito empresarial, análise SCR, linhas do BNDES e estratégias não óbvias',
      'credito',
      capabilities
    );

    // Inicializa a base de conhecimento
    this.initializeKnowledgeBase();
  }

  /**
   * Inicializa a base de conhecimento do agente com informações sobre
   * produtos de crédito, políticas bancárias, linhas BNDES e modelos de scoring
   */
  private initializeKnowledgeBase(): void {
    // Exemplos de produtos de crédito
    this.creditProducts.set('capital_de_giro', {
      name: 'Capital de Giro',
      description: 'Financiamento para necessidades operacionais',
      typical_rates: '0.99% a.m. a 1.89% a.m.',
      terms: '3 a 60 meses',
      guarantees: ['aval', 'recebíveis', 'imóveis'],
      suitable_for: ['todas as empresas', 'necessidades de curto prazo']
    });

    this.creditProducts.set('finame', {
      name: 'FINAME',
      description: 'Financiamento de máquinas e equipamentos via BNDES',
      typical_rates: 'TLP + 1.5% a.a. a 5% a.a.',
      terms: '12 a 120 meses',
      guarantees: ['próprio bem', 'aval', 'garantias adicionais'],
      suitable_for: ['aquisição de máquinas', 'modernização de frota', 'equipamentos agrícolas']
    });

    // Exemplos de linhas BNDES
    this.bndesLines.set('bndes_automatico', {
      name: 'BNDES Automático',
      description: 'Financiamento para projetos de investimento de até R$ 150 milhões',
      interest: 'TLP + taxa do BNDES + spread do agente financeiro',
      term: 'Até 20 anos, incluindo carência',
      eligible_items: [
        'Obras civis e instalações',
        'Máquinas e equipamentos nacionais',
        'Software nacional',
        'Capacitação técnica'
      ]
    });

    this.bndesLines.set('bndes_finame', {
      name: 'BNDES Finame',
      description: 'Financiamento para aquisição de máquinas e equipamentos',
      interest: 'TLP + taxa do BNDES + spread do agente financeiro',
      term: 'Até 10 anos, incluindo carência',
      eligible_items: [
        'Ônibus e caminhões',
        'Tratores e implementos agrícolas',
        'Máquinas e equipamentos industriais'
      ]
    });

    // Exemplos de políticas bancárias
    this.bankPolicies.set('bb_politica_pj', {
      bank: 'Banco do Brasil',
      target_segments: ['micro', 'pequena', 'média', 'grande'],
      min_operating_time: '12 meses',
      required_documents: [
        'Contrato social',
        'Balanço dos últimos 2 anos',
        'Faturamento dos últimos 12 meses',
        'Relação de faturamento',
        'Documentos dos sócios'
      ],
      credit_analysis_timeframe: '15 a 30 dias'
    });

    // Exemplos de modelos de scoring
    this.scoringModels.set('model_small_business', {
      target_segment: 'pequena empresa',
      key_factors: [
        'Tempo de operação',
        'Histórico de crédito dos sócios',
        'Fluxo de caixa médio',
        'Setor de atuação',
        'Garantias oferecidas'
      ],
      improvement_strategies: [
        'Regularizar pendências fiscais',
        'Aumentar capital social',
        'Melhorar fluxo de caixa',
        'Oferecer garantias reais'
      ]
    });
  }

  /**
   * Processa uma solicitação recebida pelo agente
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    let success = false;
    
    try {
      // Extrai a consulta da solicitação
      const request = context.request;
      let query = '';
      
      if (typeof request === 'string') {
        query = request;
      } else if (request.query) {
        query = request.query;
      } else if (request.comando) {
        query = request.comando;
      } else {
        query = JSON.stringify(request);
      }
      
      // Identifica o tipo de solicitação
      let responseData: any = null;
      let actionItems: any[] = [];
      let insights: any[] = [];
      
      // Verifica o tipo de consulta
      if (query.includes('analisar') && (query.includes('crédito') || query.includes('credito'))) {
        responseData = await this.analyzeCreditOptions(request);
        
        // Adiciona itens de ação baseados na análise
        if (responseData.recommendations) {
          responseData.recommendations.forEach((rec: any) => {
            actionItems.push({
              type: 'credit_recommendation',
              description: rec.description,
              priority: rec.priority || 'média'
            });
          });
        }
      } 
      else if (query.includes('bndes') || query.includes('BNDES')) {
        responseData = await this.provideBndesInformation(request);
        
        // Adiciona insights sobre as linhas BNDES
        if (responseData.suitable_lines) {
          responseData.suitable_lines.forEach((line: any) => {
            insights.push({
              type: 'bndes_opportunity',
              content: `Linha ${line.name}: ${line.suitability_reason}`,
              confidence: line.suitability_score
            });
          });
        }
      }
      else if (query.includes('scr') || query.includes('SCR')) {
        responseData = await this.assessSCRImpact(request);
        
        // Adiciona insights sobre o SCR
        if (responseData.assessment) {
          insights.push({
            type: 'scr_insight',
            content: responseData.assessment.summary,
            confidence: 0.85
          });
        }
      }
      else if (query.includes('estratégia') || query.includes('estrategia')) {
        responseData = await this.provideCreditStrategy(request);
        
        // Adiciona itens de ação baseados na estratégia
        if (responseData.steps) {
          responseData.steps.forEach((step: any, index: number) => {
            actionItems.push({
              type: 'strategy_step',
              description: step.description,
              priority: index < 3 ? 'alta' : 'média',
              dueDate: step.timeframe
            });
          });
        }
      }
      else {
        // Consulta genérica sobre crédito
        responseData = {
          message: "Posso ajudar com análise de crédito, linhas do BNDES, avaliação de SCR e estratégias de financiamento. Por favor, especifique sua necessidade.",
          capabilities: this.capabilities.map(cap => cap.name)
        };
      }
      
      // Gera aprendizados com base na interação atual
      const learnings = this.generateLearnings(query, responseData);
      
      // Registra a interação para aprendizado futuro
      await this.learn({
        query,
        response: responseData,
        insights,
        actionItems,
        context: context.systemContext
      });
      
      // Constrói a resposta final
      const response: AgentResponse = {
        success: true,
        message: "Análise de crédito concluída com sucesso",
        data: responseData,
        actionItems,
        insights,
        learnings,
        metadata: {
          processingTime: Date.now() - startTime,
          confidenceLevel: 0.85,
          modelUsed: "CreditExpertSystem",
          version: this.version
        }
      };
      
      success = true;
      return response;
    } catch (error) {
      console.error(`Erro no processamento do ${this.name}:`, error);
      
      // Constrói resposta de erro
      const errorResponse: AgentResponse = {
        success: false,
        message: `Erro ao processar solicitação de crédito: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: {
          processingTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          modelUsed: "CreditExpertSystem",
          version: this.version
        }
      };
      
      return errorResponse;
    } finally {
      // Atualiza estatísticas
      this.updateStats(startTime, success);
    }
  }

  /**
   * Analisa opções de crédito disponíveis para o contexto da empresa
   */
  private async analyzeCreditOptions(request: any): Promise<any> {
    // Aqui teria a lógica completa de análise de crédito
    // Para o propósito deste exemplo, retornamos dados simulados
    
    // Extrair e validar parâmetros da solicitação
    const companySize = this.extractParameter(request, 'company_size', 'média');
    const sector = this.extractParameter(request, 'sector', 'transporte');
    const annualRevenue = this.extractParameter(request, 'annual_revenue', 1000000);
    const creditScore = this.extractParameter(request, 'credit_score', 750);
    
    // Analisar opções de crédito adequadas
    const creditOptions = [];
    
    // Verificar opções de capital de giro
    if (creditScore >= 600) {
      const capitalDeGiro = this.creditProducts.get('capital_de_giro');
      creditOptions.push({
        type: 'capital_de_giro',
        name: capitalDeGiro.name,
        description: capitalDeGiro.description,
        estimated_rate: creditScore > 750 ? '0.99% a.m.' : '1.45% a.m.',
        suitable_terms: '12 a 36 meses',
        required_guarantees: ['aval', 'recebíveis'],
        suitability_score: 0.85,
        pros: ['Rápida aprovação', 'Flexibilidade no uso dos recursos'],
        cons: ['Taxa de juros mais elevada', 'Prazo mais curto']
      });
    }
    
    // Verificar opções FINAME para transportadoras
    if (sector === 'transporte' && annualRevenue >= 500000) {
      const finame = this.creditProducts.get('finame');
      creditOptions.push({
        type: 'finame',
        name: finame.name,
        description: finame.description,
        estimated_rate: 'TLP + 3.5% a.a.',
        suitable_terms: '36 a 60 meses',
        required_guarantees: ['próprio bem', 'aval'],
        suitability_score: 0.95,
        pros: ['Taxa reduzida', 'Prazo estendido', 'Carência possível'],
        cons: ['Processo de aprovação mais longo', 'Documentação extensa']
      });
    }
    
    // Gerar recomendações com base na análise
    const recommendations = creditOptions.map(option => ({
      option_type: option.type,
      description: `Recomendamos ${option.name} por ${option.pros[0].toLowerCase()}`,
      priority: option.suitability_score > 0.9 ? 'alta' : 'média',
      next_steps: [
        'Preparar documentação necessária',
        'Consultar instituições parceiras',
        'Simular operação com diferentes prazos'
      ]
    }));
    
    return {
      company_profile: {
        size: companySize,
        sector,
        annual_revenue: annualRevenue,
        credit_score: creditScore
      },
      credit_options: creditOptions,
      recommendations,
      market_insights: [
        'Taxas de juros com tendência de queda nos próximos meses',
        'Bancos digitais oferecem condições mais competitivas para capital de giro',
        'Linhas BNDES têm processo simplificado para empresas de menor porte'
      ]
    };
  }

  /**
   * Fornece informações específicas sobre linhas do BNDES
   */
  private async provideBndesInformation(request: any): Promise<any> {
    // Extrair e validar parâmetros
    const investmentPurpose = this.extractParameter(request, 'investment_purpose', '');
    const investmentAmount = this.extractParameter(request, 'investment_amount', 0);
    
    // Verificar linhas BNDES adequadas
    const suitableLines = [];
    
    if (investmentPurpose.includes('caminhão') || 
        investmentPurpose.includes('caminhoes') || 
        investmentPurpose.includes('frota') ||
        investmentPurpose.includes('veículo') ||
        investmentPurpose.includes('veiculos')) {
      
      const finame = this.bndesLines.get('bndes_finame');
      suitableLines.push({
        name: finame.name,
        description: finame.description,
        interest: finame.interest,
        term: finame.term,
        eligible_items: finame.eligible_items,
        requirements: [
          'Empresa regularmente constituída no Brasil',
          'Estar em dia com obrigações fiscais e tributárias',
          'Capacidade de pagamento comprovada',
          'Não ter restrições no CADIN'
        ],
        application_process: [
          'Consultar banco credenciado',
          'Apresentar projeto e orçamentos',
          'Passar por análise de crédito',
          'Aprovação e liberação dos recursos'
        ],
        suitability_score: 0.95,
        suitability_reason: 'Ideal para aquisição de veículos de transporte'
      });
    }
    
    if (investmentPurpose.includes('expansão') || 
        investmentPurpose.includes('expansao') || 
        investmentPurpose.includes('instalação') ||
        investmentPurpose.includes('instalacao') ||
        investmentAmount > 1000000) {
      
      const bndesAutomatico = this.bndesLines.get('bndes_automatico');
      suitableLines.push({
        name: bndesAutomatico.name,
        description: bndesAutomatico.description,
        interest: bndesAutomatico.interest,
        term: bndesAutomatico.term,
        eligible_items: bndesAutomatico.eligible_items,
        requirements: [
          'Empresa regularmente constituída no Brasil',
          'Estar em dia com obrigações fiscais e tributárias',
          'Capacidade de pagamento comprovada',
          'Apresentar projeto de investimento viável'
        ],
        application_process: [
          'Elaborar projeto de investimento',
          'Consultar banco credenciado',
          'Passar por análise de crédito',
          'Aprovação e liberação dos recursos'
        ],
        suitability_score: 0.85,
        suitability_reason: 'Adequado para projetos de expansão e modernização'
      });
    }
    
    return {
      investment_profile: {
        purpose: investmentPurpose,
        amount: investmentAmount
      },
      suitable_lines: suitableLines,
      general_guidelines: [
        'O financiamento pelo BNDES é realizado indiretamente, através de instituições financeiras credenciadas',
        'Taxas finais dependem do spread do agente financeiro',
        'A aprovação final depende da análise de crédito da instituição financeira'
      ],
      tips_for_approval: [
        'Prepare um projeto bem estruturado demonstrando viabilidade',
        'Mantenha a regularidade fiscal da empresa',
        'Compare condições entre diferentes agentes financeiros',
        'Considere oferecer garantias adicionais para melhorar condições'
      ]
    };
  }

  /**
   * Avalia o impacto do SCR (Sistema de Informações de Crédito) para a empresa
   */
  private async assessSCRImpact(request: any): Promise<any> {
    // Extrair e validar parâmetros
    const currentDebt = this.extractParameter(request, 'current_debt', 0);
    const paymentHistory = this.extractParameter(request, 'payment_history', '');
    
    // Avaliar impacto do SCR
    let riskLevel = 'médio';
    let impactScore = 0.5;
    
    if (currentDebt === 0 && paymentHistory.includes('bom')) {
      riskLevel = 'baixo';
      impactScore = 0.2;
    } else if (currentDebt > 500000 || paymentHistory.includes('atraso')) {
      riskLevel = 'alto';
      impactScore = 0.8;
    }
    
    // Preparar recomendações
    const recommendations = [];
    
    if (impactScore > 0.6) {
      recommendations.push(
        'Regularize eventuais pendências financeiras',
        'Reduza o endividamento atual antes de novas solicitações',
        'Busque renegociar dívidas para melhorar perfil'
      );
    } else {
      recommendations.push(
        'Mantenha a pontualidade nos pagamentos',
        'Considere ampliar relacionamento com diferentes instituições'
      );
    }
    
    return {
      scr_profile: {
        current_debt: currentDebt,
        payment_history: paymentHistory
      },
      assessment: {
        risk_level: riskLevel,
        impact_score: impactScore,
        summary: `Seu perfil no SCR apresenta risco ${riskLevel}, o que ${impactScore > 0.6 ? 'dificulta' : 'facilita'} a obtenção de novos créditos.`
      },
      recommendations,
      expected_impact: {
        on_approval_chances: impactScore > 0.6 ? 'Redução significativa' : 'Impacto positivo',
        on_interest_rates: impactScore > 0.6 ? 'Aumento potencial' : 'Possibilidade de redução',
        on_credit_limits: impactScore > 0.6 ? 'Limites reduzidos' : 'Potencial para ampliação'
      }
    };
  }

  /**
   * Fornece estratégia personalizada de crédito
   */
  private async provideCreditStrategy(request: any): Promise<any> {
    // Extrair informações do contexto
    const companySize = this.extractParameter(request, 'company_size', 'média');
    const sector = this.extractParameter(request, 'sector', 'transporte');
    const goal = this.extractParameter(request, 'goal', 'expansão');
    
    // Definir etapas estratégicas
    const strategySteps = [];
    
    // Etapa 1: Diagnóstico financeiro
    strategySteps.push({
      step: 1,
      name: 'Diagnóstico financeiro',
      description: 'Realizar análise detalhada da saúde financeira da empresa',
      actions: [
        'Levantar demonstrativos financeiros dos últimos 3 anos',
        'Calcular indicadores-chave: liquidez, endividamento, rentabilidade',
        'Identificar padrões sazonais e tendências',
        'Comparar com benchmarks do setor'
      ],
      timeframe: '15 dias',
      required_resources: ['Demonstrativos financeiros', 'Indicadores setoriais']
    });
    
    // Etapa 2: Estruturação do projeto
    strategySteps.push({
      step: 2,
      name: 'Estruturação do projeto',
      description: 'Desenvolver projeto claro demonstrando viabilidade e retorno',
      actions: [
        'Definir objetivos claros e mensuráveis',
        'Elaborar projeções financeiras realistas',
        'Calcular indicadores de viabilidade (TIR, VPL, payback)',
        'Estruturar documentação completa'
      ],
      timeframe: '30 dias',
      required_resources: ['Software de projeções financeiras', 'Orçamentos']
    });
    
    // Etapa 3: Preparação documental
    strategySteps.push({
      step: 3,
      name: 'Preparação documental',
      description: 'Organizar e atualizar toda documentação necessária',
      actions: [
        'Regularizar eventuais pendências fiscais e tributárias',
        'Atualizar certidões negativas de débito',
        'Preparar documentação societária',
        'Confirmar registros em órgãos reguladores'
      ],
      timeframe: '15 dias',
      required_resources: ['Assessoria contábil', 'Assessoria jurídica']
    });
    
    // Etapa 4: Abordagem estratégica às instituições
    strategySteps.push({
      step: 4,
      name: 'Abordagem estratégica às instituições',
      description: 'Abordar múltiplas instituições de forma estruturada',
      actions: [
        'Identificar instituições com melhor fit para o projeto',
        'Preparar apresentação executiva',
        'Estabelecer relacionamento com gerentes de relacionamento',
        'Negociar condições comparando propostas'
      ],
      timeframe: '30 dias',
      required_resources: ['Networking bancário', 'Material de apresentação']
    });
    
    // Gerar cronograma baseado nas etapas
    const today = new Date();
    let currentDate = new Date(today);
    
    const timeline = strategySteps.map(step => {
      const days = parseInt(step.timeframe.split(' ')[0]);
      const startDate = new Date(currentDate);
      
      currentDate.setDate(currentDate.getDate() + days);
      const endDate = new Date(currentDate);
      
      return {
        step: step.step,
        name: step.name,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        duration_days: days
      };
    });
    
    // Definir estratégias não óbvias aplicáveis
    const hiddenStrategies = [];
    
    if (sector === 'transporte') {
      hiddenStrategies.push({
        name: 'Consórcio empresarial para aquisição de frota',
        description: 'Formação de consórcio entre empresas do mesmo setor para aquisição conjunta de veículos, obtendo economia de escala e melhores condições',
        potential_benefit: 'Redução de 15-25% no custo total de aquisição',
        complexity: 'Média',
        partners_needed: 'Outras empresas do setor, escritório jurídico especializado'
      });
    }
    
    hiddenStrategies.push({
      name: 'Garantia via recebíveis futuros de contratos',
      description: 'Utilização de contratos de longo prazo como garantia complementar, reduzindo necessidade de garantias reais',
      potential_benefit: 'Acesso a linhas com menor exigência de garantias e taxas até 0.3 p.p. menores',
      complexity: 'Baixa',
      partners_needed: 'Contador, clientes com contratos de longo prazo'
    });
    
    return {
      company_context: {
        size: companySize,
        sector,
        goal
      },
      strategy_summary: `Estratégia de captação de recursos para ${goal} com foco em ${sector}`,
      steps: strategySteps,
      timeline,
      hidden_strategies: hiddenStrategies,
      expected_results: {
        timeframe: '90 dias para conclusão do processo',
        success_probability: '75%',
        key_success_factors: [
          'Documentação completa e organizada',
          'Projeto bem estruturado com demonstração clara de viabilidade',
          'Abordagem a múltiplas instituições simultaneamente'
        ]
      }
    };
  }

  /**
   * Extrai parâmetros de uma solicitação, com valor padrão
   */
  private extractParameter(request: any, paramName: string, defaultValue: any): any {
    if (!request) return defaultValue;
    
    if (typeof request === 'object') {
      // Tenta extrair diretamente
      if (request[paramName] !== undefined) {
        return request[paramName];
      }
      
      // Tenta extrair de um objeto params ou parameters
      if (request.params && request.params[paramName] !== undefined) {
        return request.params[paramName];
      }
      
      if (request.parameters && request.parameters[paramName] !== undefined) {
        return request.parameters[paramName];
      }
      
      // Tenta extrair de um objeto data
      if (request.data && request.data[paramName] !== undefined) {
        return request.data[paramName];
      }
    }
    
    // Se for string, tenta encontrar padrões como "parameter: value"
    if (typeof request === 'string') {
      const regex = new RegExp(`${paramName}[:\\s]\\s*([\\w\\d\\s]+)`, 'i');
      const match = request.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return defaultValue;
  }

  /**
   * Gera insights de aprendizado baseados na interação
   */
  private generateLearnings(query: string, responseData: any): any[] {
    const learnings = [];
    
    // Identifica padrões na consulta
    if (query.includes('bndes') && responseData.suitable_lines && responseData.suitable_lines.length > 0) {
      learnings.push({
        pattern: 'interest_in_bndes_financing',
        observation: 'Clientes do setor de transporte demonstram interesse recorrente em linhas BNDES para renovação de frota',
        applicability: 'Aprimorar material informativo sobre FINAME para o setor de transportes'
      });
    }
    
    if (query.toLowerCase().includes('estratégia') || query.toLowerCase().includes('estrategia')) {
      learnings.push({
        pattern: 'strategic_approach_needed',
        observation: 'Usuários buscam abordagem estruturada para acesso a crédito, não apenas informações sobre linhas disponíveis',
        applicability: 'Desenvolver modelos de planos estratégicos de captação por setor'
      });
    }
    
    return learnings;
  }
  
  /**
   * Extrai padrões dos dados de aprendizado para melhorar o agente
   */
  protected async extractPatterns(): Promise<void> {
    // Analisa os últimos aprendizados
    if (this.learningData.length < 5) return;
    
    const recentLearnings = this.learningData.slice(-10);
    
    // Identifica padrões recorrentes
    const queryTerms: Record<string, number> = {};
    
    for (const learning of recentLearnings) {
      const query = learning.query || '';
      const words = query.toLowerCase().split(/\s+/);
      
      for (const word of words) {
        if (word.length > 3) { // Ignora palavras muito curtas
          queryTerms[word] = (queryTerms[word] || 0) + 1;
        }
      }
    }
    
    // Identifica termos mais populares
    const popularTerms = Object.entries(queryTerms)
      .filter(([_, count]) => (count as number) > 1)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([term]) => term);
    
    if (popularTerms.length > 0) {
      console.log(`${this.name} identificou termos populares em consultas:`, popularTerms.slice(0, 5));
      
      // Melhora o agente com base nos padrões identificados
      // Aqui poderiam ser atualizadas as capacidades ou a base de conhecimento
    }
  }
}