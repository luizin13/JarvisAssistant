import { BaseSpecializedAgent } from './base-agent';
import { AgentResponse, AgentCapability, AgentContext } from './agent-interface';
import { storage } from '../../storage';
import { openaiClient, generateChatResponse } from '../../openai';
import { anthropicClient, isAnthropicAvailable, generateAnthropicResponse } from '../../anthropic';

// Define a interface ProcessingResult aqui já que não está disponível no agent-interface.ts
interface ProcessingResult {
  patterns: any;
  entities: any;
  confidence: number;
}

/**
 * AgenteConversador - Especialista em conversas estratégicas, reflexivas e de crescimento pessoal
 * 
 * Baseado nas práticas de mentores como Napoleon Hill, Ray Dalio, Dale Carnegie e Viktor Frankl,
 * este agente conduz conversas transformadoras com Luiz em tempo real.
 */
export class ConversationAgent extends BaseSpecializedAgent {
  private mentores: {[key: string]: string} = {
    'napoleon_hill': 'Mentalidade de abundância, crescimento pessoal, autodisciplina, propósito definido',
    'ray_dalio': 'Princípios claros, meritocracia radical, transparência, aprendizado com erros',
    'dale_carnegie': 'Relacionamentos eficazes, influência positiva, comunicação interpessoal',
    'viktor_frankl': 'Significado nas ações, resiliência, autodeterminação, propósito maior'
  };

  private estilosConversacionais: {[key: string]: string} = {
    'estratégico': 'Foco em análise sistemática, planejamento de longo prazo e decisões baseadas em princípios',
    'reflexivo': 'Estímulo à introspecção, busca de significado e crescimento a partir de experiências',
    'desafiador': 'Questionamento construtivo de pressupostos, identificação de pontos cegos e oportunidades de melhoria',
    'inspirador': 'Ênfase em possibilidades, histórias de superação e construção de visão de futuro',
    'prático': 'Foco em ações concretas, aplicação imediata de conceitos e resultados tangíveis'
  };

  constructor() {
    super();
    this.name = 'AgenteConversador';
    this.id = 'conversador-' + new Date().getTime().toString();
    this.description = 'Especialista em conversas estratégicas, reflexivas e de crescimento pessoal com Luiz em tempo real';
    this.domain = 'conversacao-estrategica';
    this.version = '1.0.0';
    
    // Registro da inicialização no log
    console.log(`[ConversationAgent] Inicializado com sucesso. ID: ${this.id}`);

    // Capacidade: Conversa estratégica
    this.registerCapability({
      name: 'conversa_estrategica',
      description: 'Conduz conversas estratégicas focadas em crescimento e tomada de decisão',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        const tema = context.parameters?.tema || 'crescimento-pessoal';
        const estilo = context.parameters?.estilo || 'estratégico';
        const historico = context.parameters?.historico || [];
        
        console.log(`[AgenteConversador] Iniciando conversa estratégica. Tema: ${tema}, Estilo: ${estilo}`);
        
        // Selecionar mentor que melhor se alinha ao tema
        const mentorSelecionado = this.selecionarMentorParaTema(tema);
        
        let resposta: string;
        
        try {
          // Usar OpenAI por padrão, com fallback para Anthropic
          const prompt = this.construirPromptConversa(tema, estilo, mentorSelecionado, historico);
          
          const modelResponse = await openaiClient.generateChatResponse(prompt, {
            userId: 1,
            systemPrompt: `Você é um mentor especialista em conversas estratégicas, reflexivas e de crescimento pessoal, inspirado por ${mentorSelecionado}. Mantenha o tom conversacional, natural e inspirador. Use exemplos práticos, faça perguntas poderosas e estabeleça uma conexão autêntica.`
          });
          
          resposta = modelResponse.message || "Não foi possível gerar uma resposta neste momento.";
          
          // Registrar conversa para aprendizado futuro
          await storage.createLearningRecord({
            action: 'conversa_estrategica',
            context: `Tema: ${tema}, Estilo: ${estilo}, Mentor: ${mentorSelecionado}`,
            result: resposta,
            learning: null,
            impact_level: 'alto',
            strategic_area: 'desenvolvimento_pessoal',
            created_at: new Date()
          });
        } catch (error) {
          console.error('[AgenteConversador] Erro ao gerar resposta:', error);
          resposta = "Estou com dificuldades para processar isso agora. Podemos tentar outra abordagem?";
        }
        
        return {
          type: 'conversa_estrategica',
          description: `Conversa sobre ${tema} no estilo ${estilo}`,
          confidence: 0.92,
          sources: [mentorSelecionado, 'base de conhecimento interna'],
          details: {
            tema,
            estilo,
            mentorSelecionado,
            timestamp: new Date().toISOString()
          },
          output: resposta
        };
      }
    });

    // Capacidade: Reflexão profunda
    this.registerCapability({
      name: 'reflexao_profunda',
      description: 'Conduz reflexões profundas sobre temas essenciais para crescimento',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        const assunto = context.parameters?.assunto || 'propósito';
        const intensidade = context.parameters?.intensidade || 'moderada';
        
        console.log(`[AgenteConversador] Iniciando reflexão profunda. Assunto: ${assunto}, Intensidade: ${intensidade}`);
        
        // Selecionar mentor que melhor se alinha à reflexão
        const mentorSelecionado = assunto.includes('significado') || assunto.includes('propósito') 
          ? 'Viktor Frankl' 
          : assunto.includes('princíp') ? 'Ray Dalio' : 'Napoleon Hill';
        
        let resposta: string;
        
        try {
          // Construir prompt reflexivo
          const promptReflexivo = `
            Tema de reflexão: ${assunto}
            
            Por favor, faça uma reflexão profunda sobre este tema, considerando:
            1. Como este tema se relaciona com o crescimento pessoal e profissional
            2. Quais perguntas podem levar a insights transformadores
            3. Exemplos práticos de como aplicar estes insights no dia a dia
            4. Uma perspectiva inspirada pelos ensinamentos de ${mentorSelecionado}
            
            A reflexão deve ser ${intensidade === 'profunda' ? 'desafiadora e provocativa' : 'ponderada e equilibrada'}.
          `;
          
          // Tentar com Anthropic primeiro (melhor para conteúdo reflexivo)
          try {
            if (anthropicClient.isAnthropicAvailable()) {
              const anthropicResponse = await anthropicClient.generateAnthropicResponse(promptReflexivo, {
                temperature: 0.7,
                max_tokens: 1000
              });
              
              resposta = anthropicResponse.message || "";
            } else {
              throw new Error('Anthropic não disponível');
            }
          } catch (err) {
            // Fallback para OpenAI
            const openaiResponse = await openaiClient.generateChatResponse(promptReflexivo, {
              userId: 1,
              systemPrompt: `Você é um mentor reflexivo inspirado por ${mentorSelecionado}, especializado em provocar reflexões profundas que levam a insights transformadores.`
            });
            
            resposta = openaiResponse.message || "";
          }
          
          // Registrar reflexão para aprendizado futuro
          await storage.createLearningRecord({
            action: 'reflexao_profunda',
            context: `Assunto: ${assunto}, Intensidade: ${intensidade}`,
            result: resposta,
            learning: null,
            impact_level: 'alto',
            strategic_area: 'filosofia_vida',
            created_at: new Date()
          });
        } catch (error) {
          console.error('[AgenteConversador] Erro ao gerar reflexão:', error);
          resposta = "Não consegui elaborar esta reflexão no momento. Podemos tentar outra abordagem?";
        }
        
        return {
          type: 'reflexao_profunda',
          description: `Reflexão sobre ${assunto} (${intensidade})`,
          confidence: 0.88,
          sources: [mentorSelecionado, 'filosofia aplicada'],
          details: {
            assunto,
            intensidade,
            mentorSelecionado,
            timestamp: new Date().toISOString()
          },
          output: resposta
        };
      }
    });

    // Capacidade: Avaliação de progresso
    this.registerCapability({
      name: 'avaliar_progresso',
      description: 'Avalia progresso pessoal e profissional com base em marcos e objetivos',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        const area = context.parameters?.area || 'geral';
        const periodo = context.parameters?.periodo || '30 dias';
        const objetivos = context.parameters?.objetivos || [];
        
        console.log(`[AgenteConversador] Avaliando progresso. Área: ${area}, Período: ${periodo}`);
        
        // Buscar histórico de aprendizado para a área
        const registrosAprendizado = await storage.getLearningRecords(25);
        const registrosFiltrados = registrosAprendizado.filter(r => 
          r.strategic_area?.includes(area) || area === 'geral'
        );
        
        // Analisar progresso com base nos registros
        const registrosRecentes = registrosFiltrados.filter(r => {
          const dataRegistro = new Date(r.created_at);
          const dataAtual = new Date();
          const diasDiferenca = Math.floor((dataAtual.getTime() - dataRegistro.getTime()) / (1000 * 60 * 60 * 24));
          return diasDiferenca <= parseInt(periodo) || isNaN(parseInt(periodo));
        });
        
        // Formar análise baseada nos dados
        const progressoDetalhado = {
          registros_periodo: registrosRecentes.length,
          areas_atuacao: [...new Set(registrosRecentes.map(r => r.strategic_area))],
          acoes_completadas: registrosRecentes.filter(r => r.result !== null).length,
          aprendizados_registrados: registrosRecentes.filter(r => r.learning !== null).length,
          principal_area: this.encontrarAreaMaisFrequente(registrosRecentes),
          potencial_impacto: this.avaliarPotencialImpacto(registrosRecentes)
        };
        
        // Gerar mensagem de avaliação
        let mensagemAvaliacao;
        try {
          const promptAvaliacao = `
            Avalie o progresso com base nos seguintes dados:
            - Período analisado: ${periodo}
            - Área de foco: ${area}
            - Total de registros no período: ${progressoDetalhado.registros_periodo}
            - Áreas de atuação: ${progressoDetalhado.areas_atuacao.join(', ')}
            - Ações completadas: ${progressoDetalhado.acoes_completadas}
            - Aprendizados registrados: ${progressoDetalhado.aprendizados_registrados}
            - Área com maior foco: ${progressoDetalhado.principal_area}
            - Potencial impacto estimado: ${progressoDetalhado.potencial_impacto}
            
            Forneça uma avaliação honesta mas motivadora do progresso, destacando:
            1. Pontos positivos e conquistas
            2. Áreas para melhoria
            3. Sugestões específicas para acelerar o crescimento
            4. Uma reflexão inspiradora para manter a motivação
          `;
          
          const response = await openaiClient.generateChatResponse(promptAvaliacao, {
            userId: 1,
            systemPrompt: "Você é um coach especializado em avaliação de desempenho e crescimento pessoal, com foco em feedbacks construtivos e acionáveis."
          });
          
          mensagemAvaliacao = response.message || "Não foi possível gerar avaliação detalhada.";
        } catch (error) {
          console.error('[AgenteConversador] Erro ao gerar avaliação:', error);
          mensagemAvaliacao = "Não foi possível completar a avaliação detalhada neste momento.";
        }
        
        return {
          type: 'avaliacao_progresso',
          description: `Avaliação de progresso em ${area} nos últimos ${periodo}`,
          confidence: progressoDetalhado.registros_periodo > 10 ? 0.9 : 0.7,
          sources: ['registros de aprendizado', 'histórico de conversas'],
          details: progressoDetalhado,
          output: mensagemAvaliacao
        };
      }
    });
  }

  /**
   * Implementa o método process exigido pela interface BaseSpecializedAgent
   * Este método é chamado quando não se sabe qual capacidade específica utilizar
   */
  async process(input: string, context: AgentContext = {}): Promise<AgentResponse> {
    console.log(`[AgenteConversador] Processando entrada genérica: "${input.substring(0, 50)}..."`);
    
    // Analisar a entrada para determinar a melhor abordagem
    const patternResult = this.extractPatternsInternal(input);
    
    // Escolher a capacidade mais adequada com base nos padrões detectados
    if (patternResult.patterns.temasEstratégicos.length > 0 || input.toLowerCase().includes('conversa')) {
      console.log('[AgenteConversador] Detectado padrão de conversa estratégica');
      const capability = this.getCapability('conversa_estrategica');
      
      if (capability) {
        // Criar contexto melhorado para a capacidade
        const enhancedContext: AgentContext = {
          ...context,
          parameters: {
            ...context.parameters,
            tema: patternResult.patterns.temasEstratégicos[0] || 'crescimento-pessoal',
            estilo: input.toLowerCase().includes('desafia') ? 'desafiador' :
                   input.toLowerCase().includes('inspira') ? 'inspirador' : 'estratégico'
          }
        };
        
        return await capability.execute(enhancedContext);
      }
    }
    
    if (input.toLowerCase().includes('reflexão') || input.toLowerCase().includes('refletir')) {
      console.log('[AgenteConversador] Detectado padrão de reflexão profunda');
      const capability = this.getCapability('reflexao_profunda');
      
      if (capability) {
        // Extrair possível assunto para reflexão
        const possiveisAssuntos = patternResult.patterns.temasEstratégicos;
        const assunto = possiveisAssuntos.length > 0 ? possiveisAssuntos[0] : 'propósito';
        
        const enhancedContext: AgentContext = {
          ...context,
          parameters: {
            ...context.parameters,
            assunto,
            intensidade: input.toLowerCase().includes('profund') ? 'profunda' : 'moderada'
          }
        };
        
        return await capability.execute(enhancedContext);
      }
    }
    
    if (input.toLowerCase().includes('progresso') || input.toLowerCase().includes('avaliar') || input.toLowerCase().includes('evolução')) {
      console.log('[AgenteConversador] Detectado padrão de avaliação de progresso');
      const capability = this.getCapability('avaliar_progresso');
      
      if (capability) {
        // Buscar possível área de interesse
        const possiveisAreas = patternResult.patterns.areasDeInteresse;
        const area = possiveisAreas.length > 0 ? possiveisAreas[0] : 'geral';
        
        // Buscar possível período
        const periodoMatch = input.match(/(\d+)\s*(dias|semanas|meses|anos)/i);
        const periodo = periodoMatch ? periodoMatch[0] : '30 dias';
        
        const enhancedContext: AgentContext = {
          ...context,
          parameters: {
            ...context.parameters,
            area,
            periodo
          }
        };
        
        return await capability.execute(enhancedContext);
      }
    }
    
    // Default: usar a conversa estratégica como fallback
    console.log('[AgenteConversador] Usando capacidade padrão');
    const defaultCapability = this.getCapability('conversa_estrategica');
    
    if (defaultCapability) {
      return await defaultCapability.execute({
        ...context,
        parameters: {
          ...context.parameters,
          tema: 'crescimento-pessoal',
          estilo: 'reflexivo'
        }
      });
    }
    
    // Se nenhuma capacidade estiver disponível, retornar resposta genérica
    return {
      description: "Resposta genérica do AgenteConversador",
      confidence: 0.5,
      sources: ['análise interna'],
      details: {
        input_analisado: input.substring(0, 100)
      },
      output: "Estou aqui para ajudar com conversas estratégicas, reflexões ou avaliação de progresso. Poderia elaborar melhor o que você gostaria de discutir?"
    };
  }
  
  /**
   * Método auxiliar para extrair padrões do texto (uso interno)
   */
  private extractPatternsInternal(input: string): ProcessingResult {
    // Padrões relacionados a conversas estratégicas
    const conversationPatterns = {
      mentoresReferenciados: (input.match(/\b(napoleon hill|ray dalio|dale carnegie|viktor frankl)\b/gi) || []),
      temasEstratégicos: (input.match(/\b(crescimento|estratégia|decisão|reflexão|propósito|significado)\b/gi) || []),
      areasDeInteresse: (input.match(/\b(negócios|pessoal|carreira|relacionamentos|finanças)\b/gi) || []),
    };

    return {
      patterns: conversationPatterns,
      entities: {
        mentores: conversationPatterns.mentoresReferenciados.map(m => m.toLowerCase()),
        temas: conversationPatterns.temasEstratégicos.map(t => t.toLowerCase()),
        areas: conversationPatterns.areasDeInteresse.map(a => a.toLowerCase())
      },
      confidence: this.calculatePatternConfidence(conversationPatterns)
    };
  }

  /**
   * Calcula a confiança nos padrões extraídos
   */
  private calculatePatternConfidence(patterns: any): number {
    // Lógica simples: quanto mais padrões encontrados, maior a confiança
    let patternCount = 0;
    Object.values(patterns).forEach(arr => {
      if (Array.isArray(arr)) {
        patternCount += arr.length;
      }
    });
    
    return Math.min(0.5 + (patternCount * 0.1), 0.95);
  }

  /**
   * Seleciona o mentor mais adequado para um tema específico
   */
  private selecionarMentorParaTema(tema: string): string {
    if (tema.includes('abundância') || tema.includes('mentalidade') || tema.includes('riqueza')) {
      return 'Napoleon Hill';
    } else if (tema.includes('princíp') || tema.includes('decision') || tema.includes('transparência')) {
      return 'Ray Dalio';
    } else if (tema.includes('relaciona') || tema.includes('comunica') || tema.includes('influência')) {
      return 'Dale Carnegie';
    } else if (tema.includes('propósito') || tema.includes('significado') || tema.includes('resiliência')) {
      return 'Viktor Frankl';
    } else {
      // Seleção aleatória para temas não mapeados
      const mentores = ['Napoleon Hill', 'Ray Dalio', 'Dale Carnegie', 'Viktor Frankl'];
      return mentores[Math.floor(Math.random() * mentores.length)];
    }
  }

  /**
   * Constrói prompt para conversa estratégica
   */
  private construirPromptConversa(tema: string, estilo: string, mentor: string, historico: string[]): string {
    const historicoFormatado = historico.length > 0 
      ? `\n\nHistórico da conversa:\n${historico.join('\n')}`
      : '';
    
    const estiloDescricao = this.estilosConversacionais[estilo] || 'Abordagem equilibrada entre análise e reflexão';
    
    return `
      Tema da conversa: ${tema}
      
      Estilo conversacional: ${estilo} (${estiloDescricao})
      
      Inspiração de mentor: ${mentor}
      
      Por favor, elabore uma resposta:
      1. Que demonstre compreensão profunda sobre o tema
      2. Que incorpore o estilo de pensamento e linguagem do mentor inspirador
      3. Que faça perguntas poderosas para estimular reflexão adicional
      4. Que ofereça insights práticos e acionáveis
      5. Que mantenha um tom conversacional, empático e autêntico${historicoFormatado}
    `;
  }

  /**
   * Encontra a área mais frequente nos registros de aprendizado
   */
  private encontrarAreaMaisFrequente(registros: any[]): string {
    const contagem: {[key: string]: number} = {};
    
    registros.forEach(registro => {
      if (registro.strategic_area) {
        contagem[registro.strategic_area] = (contagem[registro.strategic_area] || 0) + 1;
      }
    });
    
    let areaMaxima = '';
    let contagemMaxima = 0;
    
    Object.entries(contagem).forEach(([area, count]) => {
      if (count > contagemMaxima) {
        areaMaxima = area;
        contagemMaxima = count;
      }
    });
    
    return areaMaxima || 'não definida';
  }

  /**
   * Avalia o potencial impacto dos registros de aprendizado
   */
  private avaliarPotencialImpacto(registros: any[]): string {
    const totalRegistros = registros.length;
    
    if (totalRegistros === 0) return 'indeterminado';
    
    const registrosAltoImpacto = registros.filter(r => r.impact_level === 'alto').length;
    const percentualAltoImpacto = (registrosAltoImpacto / totalRegistros) * 100;
    
    if (percentualAltoImpacto >= 70) return 'muito alto';
    if (percentualAltoImpacto >= 50) return 'alto';
    if (percentualAltoImpacto >= 30) return 'moderado';
    if (percentualAltoImpacto >= 10) return 'baixo';
    return 'muito baixo';
  }
}