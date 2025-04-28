import { BaseSpecializedAgent } from './base-agent';
import { AgentResponse, AgentCapability, AgentContext, ProcessingResult } from './agent-interface';
import { storage } from '../../storage';

/**
 * AgenteAcademia - Responsável por gerenciar o aprendizado contínuo dos agentes
 * 
 * Implementa a Academia Interna do sistema que alimenta os agentes com livros,
 * resumos, ideias de grandes líderes e avalia sua evolução estratégica.
 */
export class AcademyAgent extends BaseSpecializedAgent {
  constructor() {
    super();
    this.name = 'AgenteAcademia';
    this.id = 'academia-' + new Date().getTime().toString();
    this.description = 'Academia Interna - Responsável por gerenciar o aprendizado contínuo dos agentes';
    this.domain = 'academia';
    this.version = '1.0.0';
    
    // Registro da inicialização no log
    console.log(`[AcademyAgent] Inicializado com sucesso. ID: ${this.id}`);

    // Capacidade: Gerenciar ciclos de aprendizado
    this.registerCapability({
      name: 'manage_learning_cycles',
      description: 'Gerencia ciclos de aprendizado para agentes específicos',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        const agentName = context.parameters?.agent_name;
        const knowledgeSource = context.parameters?.knowledge_source;
        
        console.log(`[AgenteAcademia] Iniciando ciclo de aprendizado para ${agentName} com fonte: ${knowledgeSource}`);
        
        // Registrar no sistema de aprendizado
        await storage.createLearningRecord({
          action: 'ciclo_aprendizado',
          context: `Fonte: ${knowledgeSource}`,
          result: `Ciclo iniciado para ${agentName}`,
          learning: `Novo conhecimento adquirido de ${knowledgeSource}`,
          impact_level: 'médio',
          strategic_area: 'aprendizado',
          created_at: new Date(),
          agent_id: agentName
        });
        
        return {
          type: 'learning_cycle_started',
          description: `Ciclo de aprendizado iniciado para ${agentName}`,
          confidence: 0.95,
          sources: [knowledgeSource],
          details: {
            agentName,
            knowledgeSource,
            startDate: new Date().toISOString()
          }
        };
      }
    });

    // Capacidade: Avaliar evolução do agente
    this.registerCapability({
      name: 'evaluate_agent_evolution',
      description: 'Avalia a evolução do agente após ciclos de aprendizado',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        const agentName = context.parameters?.agent_name;
        
        console.log(`[AgenteAcademia] Avaliando evolução do agente ${agentName}`);
        
        // Buscar registros de aprendizado do agente
        const learningRecords = await storage.getLearningRecordsByAgent(agentName);
        
        // Análise simples da evolução baseada na quantidade de registros
        const evolutionLevel = learningRecords.length > 10 ? 'avançado' : 
                             learningRecords.length > 5 ? 'intermediário' : 'iniciante';
        
        return {
          type: 'agent_evolution_assessment',
          description: `Avaliação da evolução do agente ${agentName}`,
          confidence: 0.9,
          sources: ['registros_internos'],
          details: {
            agentName,
            evolutionLevel,
            recordCount: learningRecords.length,
            latestRecords: learningRecords.slice(0, 3).map(r => ({
              action: r.action,
              date: r.created_at
            }))
          }
        };
      }
    });

    // Capacidade: Sugerir próximos passos de aprendizado
    this.registerCapability({
      name: 'suggest_learning_path',
      description: 'Sugere próximos passos de aprendizado para agentes baseado em suas necessidades',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        const agentName = context.parameters?.agent_name;
        
        console.log(`[AgenteAcademia] Sugerindo próximos passos para ${agentName}`);
        
        // Aqui seria ideal integrar com uma base de conhecimento
        // Por enquanto, sugestões estáticas baseadas no nome do agente
        
        let suggestedSources = [];
        
        if (agentName.toLowerCase().includes('amigo')) {
          suggestedSources = [
            'Como Fazer Amigos e Influenciar Pessoas - Dale Carnegie',
            'Inteligência Emocional - Daniel Goleman',
            'Comunicação Não-Violenta - Marshall Rosenberg'
          ];
        } else if (agentName.toLowerCase().includes('financeiro')) {
          suggestedSources = [
            'Pai Rico, Pai Pobre - Robert Kiyosaki',
            'O Investidor Inteligente - Benjamin Graham',
            'A Psicologia Financeira - Morgan Housel'
          ];
        } else {
          suggestedSources = [
            'Quem Pensa Enriquece - Napoleon Hill',
            'Os 7 Hábitos das Pessoas Altamente Eficazes - Stephen Covey',
            'Mindset: A Nova Psicologia do Sucesso - Carol Dweck'
          ];
        }
        
        return {
          type: 'learning_path_suggestion',
          description: `Sugestão de caminho de aprendizado para ${agentName}`,
          confidence: 0.85,
          sources: ['base_academia_interna'],
          details: {
            agentName,
            suggestedSources,
            reasonForSuggestion: 'Baseado no perfil e histórico de aprendizado do agente'
          }
        };
      }
    });
  }

  /**
   * Implementação da função de análise e extração de padrões
   */
  extractPatterns(input: string): ProcessingResult {
    // Padrões relacionados à aprendizagem e conhecimento
    const learningPatterns = {
      bookReferences: (input.match(/livro[s]?:?\s+["']([^"']+)["']/gi) || []).map(m => m.replace(/livro[s]?:?\s+["']|["']/gi, '')),
      studyReferences: (input.match(/estud[oa][rs]?:?\s+([^,.]+)/gi) || []).map(m => m.replace(/estud[oa][rs]?:?\s+/gi, '')),
      knowledgeAreas: (input.match(/conhecimento[s]?:?\s+([^,.]+)/gi) || []).map(m => m.replace(/conhecimento[s]?:?\s+/gi, '')),
    };

    return {
      patterns: learningPatterns,
      entities: {
        books: learningPatterns.bookReferences,
        studyTopics: learningPatterns.studyReferences,
        domains: learningPatterns.knowledgeAreas
      },
      confidence: this.calculatePatternConfidence(learningPatterns)
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
   * Método para iniciar um ciclo de estudo para um agente
   */
  async iniciarCicloEstudo(agenteAlvo: string, fonte: string, contexto?: string): Promise<any> {
    console.log(`[AgenteAcademia] Iniciando ciclo de estudo para ${agenteAlvo} com fonte: ${fonte}`);
    
    // Criar o registro do ciclo de estudo no armazenamento
    const registro = await storage.createLearningRecord({
      action: 'inicio_ciclo_estudo',
      context: contexto || `Estudo baseado em: ${fonte}`,
      agent_id: agenteAlvo,
      result: null,
      learning: null,
      impact_level: 'alto',
      strategic_area: 'desenvolvimento_agente',
      created_at: new Date()
    });
    
    return {
      status: 'iniciado',
      cicloId: registro.id,
      agenteAlvo,
      fonte,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Método para registrar uma lição aprendida
   */
  async registrarLicaoAprendida(agenteAlvo: string, licao: string, fonte: string): Promise<any> {
    console.log(`[AgenteAcademia] Registrando lição aprendida por ${agenteAlvo}: ${licao.substring(0, 50)}...`);
    
    // Criar o registro da lição no armazenamento
    const registro = await storage.createLearningRecord({
      action: 'licao_aprendida',
      context: `Fonte: ${fonte}`,
      agent_id: agenteAlvo,
      result: null,
      learning: licao,
      impact_level: 'médio',
      strategic_area: 'conhecimento',
      created_at: new Date()
    });
    
    return {
      status: 'registrado',
      licaoId: registro.id,
      agenteAlvo,
      fonte,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Método para obter base de estudos disponível
   */
  async obterBaseDeEstudos(): Promise<any> {
    // Em uma implementação futura, isso buscaria de um banco de dados real
    const baseDeEstudos = [
      {
        tipo: 'livro',
        titulo: 'Quem Pensa Enriquece',
        autor: 'Napoleon Hill',
        categorias: ['desenvolvimento pessoal', 'finanças', 'mentalidade']
      },
      {
        tipo: 'livro',
        titulo: 'Os 7 Hábitos das Pessoas Altamente Eficazes',
        autor: 'Stephen Covey',
        categorias: ['produtividade', 'liderança', 'desenvolvimento pessoal']
      },
      {
        tipo: 'artigo',
        titulo: 'Princípios de Aprendizado de Máquina',
        autor: 'Andrew Ng',
        categorias: ['inteligência artificial', 'tecnologia', 'programação']
      }
    ];
    
    return {
      status: 'success',
      quantidadeRecursos: baseDeEstudos.length,
      recursos: baseDeEstudos
    };
  }
}