/**
 * Sistema de Melhoria Intensiva do Luiz-JARVIS
 * 
 * Implementa um mecanismo contínuo de autoanálise, diagnóstico e melhoria
 * que opera autonomamente para evolução constante do sistema.
 */

import fs from 'fs';
import path from 'path';
import { getIntelligenceOrchestrator } from './intelligence-orchestrator';
import { systemOrchestrator } from './system-orchestrator';
import { getPythonApiConnector } from './python-api-connector';
import { Tarefa, Diagnostico, Correcao, Sugestao } from '../types/python-api';

// Enums para categorização
export enum MelhoriaFase {
  DIAGNOSTICO = 'diagnostico',
  CORRECAO = 'correcao',
  REFORCO_SEGURANCA = 'reforco_seguranca',
  EVOLUCAO_CONTINUA = 'evolucao_continua',
  MELHORIA_INTERFACE = 'melhoria_interface'
}

export enum TipoAnalise {
  PERFORMANCE = 'performance',
  INTEGRACAO = 'integracao',
  SEGURANCA = 'seguranca',
  USABILIDADE = 'usabilidade',
  RESILENCIA = 'resilencia',
  MEMORIA = 'memoria',
  API_EXTERNA = 'api_externa'
}

export enum TipoCorrecao {
  CODIGO = 'codigo',
  CONFIGURACAO = 'configuracao',
  INTEGRACAO = 'integracao',
  ARMAZENAMENTO = 'armazenamento',
  SEGURANCA = 'seguranca',
  INTERFACE = 'interface'
}

// Interfaces
interface ResultadoDiagnostico {
  tipo: TipoAnalise;
  severidade: 'info' | 'aviso' | 'erro' | 'critico';
  descricao: string;
  componenteAfetado?: string;
  detalhes?: any;
  sugestoesSolucao?: string[];
}

interface PlanoCorrecao {
  diagnosticoId: string;
  tipo: TipoCorrecao;
  descricao: string;
  arquivosAfetados?: string[];
  necessitaReinicio?: boolean;
  codigo?: string;
  configuracaoAlvo?: string;
}

interface ResultadoTesteComponente {
  componente: string;
  sucesso: boolean;
  tempoExecucao: number;
  memoriaNecessaria?: number;
  erros?: string[];
  alertas?: string[];
}

interface HistoricoMelhoria {
  id: string;
  timestamp: string;
  fase: MelhoriaFase;
  diagnosticos: string[];
  correcoes: string[];
  resultadosTeste: ResultadoTesteComponente[];
  tempoTotal: number;
  resumo: string;
}

// Classe principal do gerenciador de melhoria intensiva
export class IntensiveImprovementManager {
  private static instance: IntensiveImprovementManager;
  private emExecucao: boolean = false;
  private cicloAtual: number = 0;
  private ultimoCicloTimestamp: Date | null = null;
  private pythonApi = getPythonApiConnector();
  private historico: HistoricoMelhoria[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;
  private dataPath: string;
  
  private constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    this.carregarHistorico();
    console.log('[MelhoriaIntensiva] Sistema de Melhoria Intensiva inicializado');
  }
  
  public static getInstance(): IntensiveImprovementManager {
    if (!IntensiveImprovementManager.instance) {
      IntensiveImprovementManager.instance = new IntensiveImprovementManager();
    }
    return IntensiveImprovementManager.instance;
  }
  
  /**
   * Inicia o ciclo de melhoria intensiva contínua
   * @param intervaloSegundos Intervalo entre ciclos de diagnóstico em segundos
   */
  public iniciar(intervaloSegundos: number = 30): void {
    if (this.emExecucao) {
      console.log('[MelhoriaIntensiva] Sistema já está em execução');
      return;
    }
    
    this.emExecucao = true;
    this.isPaused = false;
    console.log(`[MelhoriaIntensiva] Iniciando modo de melhoria intensiva (intervalo: ${intervaloSegundos}s)`);
    
    // Executa imediatamente o primeiro ciclo
    this.executarCicloDiagnostico();
    
    // Configura o intervalo para execuções subsequentes
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        this.executarCicloDiagnostico();
      }
    }, intervaloSegundos * 1000);
  }
  
  /**
   * Pausa temporariamente o sistema de melhoria intensiva
   */
  public pausar(): void {
    if (!this.emExecucao) {
      console.log('[MelhoriaIntensiva] Sistema não está em execução');
      return;
    }
    
    this.isPaused = true;
    console.log('[MelhoriaIntensiva] Sistema pausado temporariamente');
  }
  
  /**
   * Retoma o sistema de melhoria intensiva após pausa
   */
  public retomar(): void {
    if (!this.emExecucao || !this.isPaused) {
      console.log('[MelhoriaIntensiva] Sistema não está pausado');
      return;
    }
    
    this.isPaused = false;
    console.log('[MelhoriaIntensiva] Sistema retomado');
  }
  
  /**
   * Para completamente o sistema de melhoria intensiva
   */
  public parar(): void {
    if (!this.emExecucao) {
      console.log('[MelhoriaIntensiva] Sistema não está em execução');
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.emExecucao = false;
    this.isPaused = false;
    console.log('[MelhoriaIntensiva] Sistema de melhoria intensiva parado');
  }
  
  /**
   * Executa um ciclo completo de diagnóstico e melhoria
   */
  public async executarCicloDiagnostico(): Promise<void> {
    const inicioTimestamp = new Date();
    this.cicloAtual++;
    
    console.log(`[MelhoriaIntensiva] Iniciando ciclo #${this.cicloAtual} de diagnóstico e melhoria`);
    
    // Fase 1: Diagnóstico ativo
    console.log('[MelhoriaIntensiva] FASE 1: Diagnóstico ativo iniciado');
    const diagnosticos = await this.executarDiagnosticoAtivo();
    
    // Fase 2: Correções automáticas
    console.log('[MelhoriaIntensiva] FASE 2: Correções automáticas iniciadas');
    const correcoes = await this.aplicarCorrecoesAutomaticas(diagnosticos);
    
    // Fase 3: Reforço de segurança
    console.log('[MelhoriaIntensiva] FASE 3: Reforço de segurança iniciado');
    await this.executarReforcoSeguranca();
    
    // Fase 4: Evolução contínua
    console.log('[MelhoriaIntensiva] FASE 4: Evolução contínua iniciada');
    await this.executarEvolucaoContinua();
    
    // Fase 5: Melhorias de interface
    console.log('[MelhoriaIntensiva] FASE 5: Melhorias de interface iniciadas');
    await this.executarMelhoriasInterface();
    
    // Registrar resultados do ciclo
    const fimTimestamp = new Date();
    const duracao = (fimTimestamp.getTime() - inicioTimestamp.getTime()) / 1000;
    
    const historicoCiclo: HistoricoMelhoria = {
      id: `melhoria-${Date.now()}`,
      timestamp: inicioTimestamp.toISOString(),
      fase: MelhoriaFase.DIAGNOSTICO,
      diagnosticos: diagnosticos.map(d => d.id || ''),
      correcoes: correcoes.map(c => c.id || ''),
      resultadosTeste: [],
      tempoTotal: duracao,
      resumo: `Ciclo #${this.cicloAtual} completado em ${duracao.toFixed(2)}s com ${diagnosticos.length} diagnósticos e ${correcoes.length} correções`
    };
    
    this.historico.push(historicoCiclo);
    this.salvarHistorico();
    
    this.ultimoCicloTimestamp = fimTimestamp;
    console.log(`[MelhoriaIntensiva] Ciclo #${this.cicloAtual} completado em ${duracao.toFixed(2)}s`);
  }
  
  /**
   * Executa diagnóstico ativo do sistema analisando todos os componentes
   */
  private async executarDiagnosticoAtivo(): Promise<Diagnostico[]> {
    const resultados: Diagnostico[] = [];
    
    try {
      // 1. Verificar integridade geral do sistema
      const diagnosticosSistema = await this.diagnosticarSistema();
      resultados.push(...diagnosticosSistema);
      
      // 2. Verificar desempenho do orquestrador de inteligência
      const diagnosticosOrquestrador = await this.diagnosticarOrquestrador();
      resultados.push(...diagnosticosOrquestrador);
      
      // 3. Verificar armazenamento
      const diagnosticosArmazenamento = await this.diagnosticarArmazenamento();
      resultados.push(...diagnosticosArmazenamento);
      
      // 4. Verificar APIs externas
      const diagnosticosApis = await this.diagnosticarApisExternas();
      resultados.push(...diagnosticosApis);
      
      // 5. Verificar integração com Python API
      const diagnosticosPython = await this.diagnosticarIntegracaoPython();
      resultados.push(...diagnosticosPython);
      
      // Registrar diagnósticos na API Python para centralização
      for (const diagnostico of resultados) {
        try {
          await this.pythonApi.criarDiagnostico({
            tipo: diagnostico.tipo,
            descricao: diagnostico.descricao,
            severidade: diagnostico.severidade,
            detalhes: diagnostico.detalhes
          });
        } catch (error) {
          console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico:', error);
        }
      }
      
      return resultados;
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro durante diagnóstico ativo:', error);
      
      // Registrar o próprio erro como um diagnóstico
      const erroDiagnostico: Diagnostico = {
        id: `diag-erro-${Date.now()}`,
        tipo: 'sistema',
        descricao: 'Erro durante execução do diagnóstico ativo',
        severidade: 'erro',
        timestamp: new Date().toISOString(),
        detalhes: { erro: String(error) }
      };
      
      try {
        await this.pythonApi.criarDiagnostico({
          tipo: erroDiagnostico.tipo,
          descricao: erroDiagnostico.descricao,
          severidade: erroDiagnostico.severidade,
          detalhes: erroDiagnostico.detalhes
        });
      } catch (e) {
        console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico de erro:', e);
      }
      
      return [erroDiagnostico];
    }
  }
  
  /**
   * Diagnóstico do sistema principal
   */
  private async diagnosticarSistema(): Promise<Diagnostico[]> {
    const resultados: Diagnostico[] = [];
    
    // Verificar uso de memória
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      if (heapUsedPercent > 85) {
        resultados.push({
          id: `diag-memoria-${Date.now()}`,
          tipo: 'sistema',
          descricao: 'Uso elevado de memória heap',
          severidade: 'aviso',
          timestamp: new Date().toISOString(),
          detalhes: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            percentual: heapUsedPercent.toFixed(2) + '%'
          },
          sugestoes: [
            'Verificar memory leaks',
            'Otimizar caching de objetos grandes',
            'Implementar liberação de recursos não utilizados'
          ]
        });
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao verificar memória:', error);
    }
    
    // Verificar arquivos de log
    try {
      const logPath = path.join(process.cwd(), 'python_api.log');
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        if (fileSizeInMB > 50) {
          resultados.push({
            id: `diag-logs-${Date.now()}`,
            tipo: 'sistema',
            descricao: 'Arquivo de log com tamanho excessivo',
            severidade: 'aviso',
            timestamp: new Date().toISOString(),
            detalhes: {
              arquivo: logPath,
              tamanhoMB: fileSizeInMB.toFixed(2)
            },
            sugestoes: [
              'Implementar rotação de logs',
              'Arquivar logs antigos',
              'Reduzir verbosidade'
            ]
          });
        }
        
        // Verificar padrões de erro nos logs
        const recentLogs = await this.lerUltimasLinhasLog(logPath, 100);
        const errorCount = (recentLogs.match(/ERROR/g) || []).length;
        
        if (errorCount > 10) {
          resultados.push({
            id: `diag-erros-log-${Date.now()}`,
            tipo: 'sistema',
            descricao: 'Alta frequência de erros nos logs recentes',
            severidade: 'erro',
            timestamp: new Date().toISOString(),
            detalhes: {
              arquivo: logPath,
              quantidadeErros: errorCount,
              amostra: recentLogs.substring(0, 500) + '...'
            }
          });
        }
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao verificar logs:', error);
    }
    
    // Verificar tempo de resposta do sistema
    try {
      const startTime = process.hrtime();
      const orchestrator = systemOrchestrator;
      // Executa uma operação simples para medir desempenho
      await new Promise(resolve => setTimeout(resolve, 1));
      const endTime = process.hrtime(startTime);
      const responseTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000);
      
      if (responseTimeMs > 500) {
        resultados.push({
          id: `diag-perf-${Date.now()}`,
          tipo: 'sistema',
          descricao: 'Tempo de resposta do sistema acima do esperado',
          severidade: 'aviso',
          timestamp: new Date().toISOString(),
          detalhes: {
            tempoRespostaMs: responseTimeMs.toFixed(2)
          }
        });
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao verificar tempo de resposta:', error);
    }
    
    return resultados;
  }
  
  /**
   * Diagnóstico do orquestrador de inteligência
   */
  private async diagnosticarOrquestrador(): Promise<Diagnostico[]> {
    const resultados: Diagnostico[] = [];
    
    try {
      const orchestrator = getIntelligenceOrchestrator();
      const state = orchestrator.getState();
      
      // Verificar disponibilidade de provedores
      const availableProviders = orchestrator.getAvailableProviders();
      const mappings = orchestrator.getProviderMappings();
      
      // Verificar se há mapeamentos para provedores não disponíveis
      for (const [commandType, provider] of Object.entries(mappings)) {
        if (!availableProviders.includes(provider)) {
          resultados.push({
            id: `diag-orq-mapeamento-${Date.now()}`,
            tipo: 'conexao',
            descricao: `Mapeamento para provedor indisponível: ${commandType} -> ${provider}`,
            severidade: 'aviso',
            timestamp: new Date().toISOString(),
            detalhes: {
              tipoComando: commandType,
              provedor: provider,
              provedoresDisponiveis: availableProviders
            },
            sugestoes: [
              'Ajustar mapeamento para um provedor disponível',
              'Verificar configuração do provedor indisponível'
            ]
          });
        }
      }
      
      // Verificar se há tipos de comando sem mapeamento
      const commandTypes = ['creative', 'strategic', 'informational', 'emotional', 'technical', 'voice'];
      for (const type of commandTypes) {
        if (!mappings[type]) {
          resultados.push({
            id: `diag-orq-sem-mapeamento-${Date.now()}`,
            tipo: 'sistema',
            descricao: `Tipo de comando sem mapeamento: ${type}`,
            severidade: 'aviso',
            timestamp: new Date().toISOString(),
            detalhes: {
              tipoComando: type,
              mapeamentosAtuais: mappings
            }
          });
        }
      }
      
      // Verificar métricas de desempenho
      const metrics = orchestrator.getPerformanceMetrics();
      for (const [commandType, providers] of Object.entries(metrics)) {
        for (const [provider, providerMetrics] of Object.entries(providers)) {
          if (providerMetrics.successRate < 0.7) {
            resultados.push({
              id: `diag-orq-baixo-sucesso-${Date.now()}-${commandType}-${provider}`,
              tipo: 'sistema',
              descricao: `Taxa de sucesso baixa para ${provider} em ${commandType}`,
              severidade: 'aviso',
              timestamp: new Date().toISOString(),
              detalhes: {
                tipoComando: commandType,
                provedor: provider,
                taxaSucesso: providerMetrics.successRate,
                usos: providerMetrics.usageCount
              }
            });
          }
          
          if (providerMetrics.averageResponseTime > 5000) {
            resultados.push({
              id: `diag-orq-tempo-resposta-${Date.now()}-${commandType}-${provider}`,
              tipo: 'sistema',
              descricao: `Tempo de resposta elevado para ${provider} em ${commandType}`,
              severidade: 'info',
              timestamp: new Date().toISOString(),
              detalhes: {
                tipoComando: commandType,
                provedor: provider,
                tempoMedio: providerMetrics.averageResponseTime
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao diagnosticar orquestrador:', error);
      resultados.push({
        id: `diag-orq-erro-${Date.now()}`,
        tipo: 'sistema',
        descricao: 'Erro ao diagnosticar orquestrador de inteligência',
        severidade: 'erro',
        timestamp: new Date().toISOString(),
        detalhes: { erro: String(error) }
      });
    }
    
    return resultados;
  }
  
  /**
   * Diagnóstico do sistema de armazenamento
   */
  private async diagnosticarArmazenamento(): Promise<Diagnostico[]> {
    const resultados: Diagnostico[] = [];
    
    try {
      // Verificar permissões e existência do diretório de dados
      if (!fs.existsSync(this.dataPath)) {
        resultados.push({
          id: `diag-armazenamento-dir-${Date.now()}`,
          tipo: 'sistema',
          descricao: 'Diretório de dados não encontrado',
          severidade: 'critico',
          timestamp: new Date().toISOString(),
          detalhes: { diretorio: this.dataPath }
        });
      } else {
        // Verificar permissões
        try {
          fs.accessSync(this.dataPath, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
          resultados.push({
            id: `diag-armazenamento-perm-${Date.now()}`,
            tipo: 'sistema',
            descricao: 'Permissões insuficientes no diretório de dados',
            severidade: 'critico',
            timestamp: new Date().toISOString(),
            detalhes: { 
              diretorio: this.dataPath,
              erro: String(error)
            }
          });
        }
        
        // Verificar integridade dos arquivos de dados
        const arquivosDados = [
          'tarefas.json',
          'diagnosticos.json',
          'correcoes.json',
          'sugestoes.json',
          'ciclos_orquestrador.json',
          'intelligence_state.json'
        ];
        
        for (const arquivo of arquivosDados) {
          const caminhoArquivo = path.join(this.dataPath, arquivo);
          
          if (fs.existsSync(caminhoArquivo)) {
            try {
              const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
              // Verificar se é JSON válido
              JSON.parse(conteudo);
              
              // Verificar tamanho do arquivo
              const stats = fs.statSync(caminhoArquivo);
              if (stats.size > 10 * 1024 * 1024) { // 10MB
                resultados.push({
                  id: `diag-armazenamento-tamanho-${Date.now()}-${arquivo}`,
                  tipo: 'sistema',
                  descricao: `Arquivo de dados com tamanho excessivo: ${arquivo}`,
                  severidade: 'aviso',
                  timestamp: new Date().toISOString(),
                  detalhes: { 
                    arquivo: caminhoArquivo,
                    tamanhoMB: (stats.size / (1024 * 1024)).toFixed(2)
                  }
                });
              }
            } catch (error) {
              resultados.push({
                id: `diag-armazenamento-corrupcao-${Date.now()}-${arquivo}`,
                tipo: 'sistema',
                descricao: `Arquivo de dados corrompido: ${arquivo}`,
                severidade: 'erro',
                timestamp: new Date().toISOString(),
                detalhes: { 
                  arquivo: caminhoArquivo,
                  erro: String(error)
                }
              });
            }
          }
        }
        
        // Verificar espaço em disco
        // Este método é simplificado e pode não funcionar em todos os ambientes
        try {
          const df = require('child_process').execSync('df -k .');
          const lines = df.toString().trim().split('\n');
          if (lines.length >= 2) {
            const stats = lines[1].split(/\s+/);
            const usedPercent = parseInt(stats[4]);
            if (usedPercent > 90) {
              resultados.push({
                id: `diag-armazenamento-espaco-${Date.now()}`,
                tipo: 'sistema',
                descricao: 'Espaço em disco próximo do limite',
                severidade: 'aviso',
                timestamp: new Date().toISOString(),
                detalhes: { percentualUsado: usedPercent + '%' }
              });
            }
          }
        } catch (error) {
          console.warn('[MelhoriaIntensiva] Erro ao verificar espaço em disco:', error);
        }
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao diagnosticar armazenamento:', error);
      resultados.push({
        id: `diag-armazenamento-erro-${Date.now()}`,
        tipo: 'sistema',
        descricao: 'Erro ao diagnosticar sistema de armazenamento',
        severidade: 'erro',
        timestamp: new Date().toISOString(),
        detalhes: { erro: String(error) }
      });
    }
    
    return resultados;
  }
  
  /**
   * Diagnóstico das APIs externas
   */
  private async diagnosticarApisExternas(): Promise<Diagnostico[]> {
    const resultados: Diagnostico[] = [];
    
    try {
      // Verificar a presença das chaves de API necessárias
      const apisNecessarias = [
        { nome: 'OPENAI_API_KEY', descricao: 'OpenAI API' },
        { nome: 'ANTHROPIC_API_KEY', descricao: 'Anthropic API' },
        { nome: 'PERPLEXITY_API_KEY', descricao: 'Perplexity API' },
        { nome: 'ELEVENLABS_API_KEY', descricao: 'ElevenLabs API' },
        { nome: 'SLACK_BOT_TOKEN', descricao: 'Slack Bot API' },
        { nome: 'API_GOV_DADOS', descricao: 'API Gov Dados' }
      ];
      
      for (const api of apisNecessarias) {
        if (!process.env[api.nome]) {
          resultados.push({
            id: `diag-api-key-${Date.now()}-${api.nome}`,
            tipo: 'conexao',
            descricao: `Chave de API não configurada: ${api.descricao}`,
            severidade: 'aviso',
            timestamp: new Date().toISOString(),
            detalhes: { 
              apiNome: api.nome,
              apiDescricao: api.descricao
            }
          });
        }
      }
      
      // Verificar logs para erros de API recentes
      try {
        const logPath = path.join(process.cwd(), 'python_api.log');
        if (fs.existsSync(logPath)) {
          const recentLogs = await this.lerUltimasLinhasLog(logPath, 200);
          
          // Procurar por padrões específicos de erro de API
          const padroes = [
            { padrao: /quota_exceeded/i, api: 'ElevenLabs', tipo: 'quota' },
            { padrao: /rate limit/i, api: 'OpenAI', tipo: 'rate_limit' },
            { padrao: /token_expired/i, api: 'OpenAI', tipo: 'autenticacao' },
            { padrao: /authentication failed/i, api: 'Genérica', tipo: 'autenticacao' },
            { padrao: /cannot connect/i, api: 'Genérica', tipo: 'conexao' },
            { padrao: /timeout/i, api: 'Genérica', tipo: 'timeout' }
          ];
          
          for (const { padrao, api, tipo } of padroes) {
            if (padrao.test(recentLogs)) {
              resultados.push({
                id: `diag-api-erro-${Date.now()}-${api}-${tipo}`,
                tipo: 'conexao',
                descricao: `Erro recente de API detectado: ${api} (${tipo})`,
                severidade: 'erro',
                timestamp: new Date().toISOString(),
                detalhes: { 
                  api,
                  tipoErro: tipo,
                  ocorrenciasRecentes: (recentLogs.match(padrao) || []).length
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('[MelhoriaIntensiva] Erro ao verificar logs para erros de API:', error);
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao diagnosticar APIs externas:', error);
      resultados.push({
        id: `diag-apis-erro-${Date.now()}`,
        tipo: 'conexao',
        descricao: 'Erro ao diagnosticar APIs externas',
        severidade: 'erro',
        timestamp: new Date().toISOString(),
        detalhes: { erro: String(error) }
      });
    }
    
    return resultados;
  }
  
  /**
   * Diagnóstico da integração com a API Python
   */
  private async diagnosticarIntegracaoPython(): Promise<Diagnostico[]> {
    const resultados: Diagnostico[] = [];
    
    try {
      // Verificar conectividade com a API Python
      try {
        const status = await this.pythonApi.obterStatus();
        if (!status || !status.healthy) {
          resultados.push({
            id: `diag-python-saude-${Date.now()}`,
            tipo: 'conexao',
            descricao: 'API Python não saudável',
            severidade: 'erro',
            timestamp: new Date().toISOString(),
            detalhes: status || { erro: 'Status desconhecido' }
          });
        }
      } catch (error) {
        resultados.push({
          id: `diag-python-conexao-${Date.now()}`,
          tipo: 'conexao',
          descricao: 'Falha na conexão com a API Python',
          severidade: 'critico',
          timestamp: new Date().toISOString(),
          detalhes: { erro: String(error) }
        });
        return resultados; // Retorna imediatamente se não conseguir conectar
      }
      
      // Verificar tempo de resposta
      const startTime = process.hrtime();
      await this.pythonApi.listarTarefas({ limite: 1 });
      const endTime = process.hrtime(startTime);
      const responseTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000);
      
      if (responseTimeMs > 1000) {
        resultados.push({
          id: `diag-python-tempo-${Date.now()}`,
          tipo: 'conexao',
          descricao: 'Tempo de resposta elevado da API Python',
          severidade: 'aviso',
          timestamp: new Date().toISOString(),
          detalhes: { 
            tempoRespostaMs: responseTimeMs.toFixed(2)
          }
        });
      }
      
      // Verificar volume de dados
      try {
        const tarefas = await this.pythonApi.listarTarefas({});
        if (tarefas && tarefas.length > 1000) {
          resultados.push({
            id: `diag-python-volume-${Date.now()}`,
            tipo: 'sistema',
            descricao: 'Volume elevado de tarefas na API Python',
            severidade: 'info',
            timestamp: new Date().toISOString(),
            detalhes: { 
              quantidadeTarefas: tarefas.length
            }
          });
        }
      } catch (error) {
        console.error('[MelhoriaIntensiva] Erro ao verificar volume de tarefas:', error);
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao diagnosticar integração Python:', error);
      resultados.push({
        id: `diag-python-erro-${Date.now()}`,
        tipo: 'conexao',
        descricao: 'Erro ao diagnosticar integração com API Python',
        severidade: 'erro',
        timestamp: new Date().toISOString(),
        detalhes: { erro: String(error) }
      });
    }
    
    return resultados;
  }
  
  /**
   * Aplicar correções automáticas com base nos diagnósticos
   */
  private async aplicarCorrecoesAutomaticas(diagnosticos: Diagnostico[]): Promise<Correcao[]> {
    const correcoesAplicadas: Correcao[] = [];
    
    console.log(`[MelhoriaIntensiva] Aplicando correções automáticas para ${diagnosticos.length} diagnósticos`);
    
    for (const diagnostico of diagnosticos) {
      try {
        let correcao: Correcao | null = null;
        
        // Selecionar estratégia de correção com base no tipo e descrição do diagnóstico
        if (diagnostico.tipo === 'conexao' && diagnostico.descricao.includes('API')) {
          correcao = await this.corrigirProblemaApi(diagnostico);
        } else if (diagnostico.tipo === 'sistema' && diagnostico.descricao.includes('Arquivo de dados corrompido')) {
          correcao = await this.corrigirArquivoDadosCorrompido(diagnostico);
        } else if (diagnostico.tipo === 'sistema' && diagnostico.descricao.includes('Mapeamento para provedor indisponível')) {
          correcao = await this.corrigirMapeamentoProvedor(diagnostico);
        } else if (diagnostico.tipo === 'sistema' && diagnostico.descricao.includes('log')) {
          correcao = await this.otimizarLogs(diagnostico);
        } else if (diagnostico.tipo === 'sistema' && diagnostico.descricao.includes('Tempo de resposta')) {
          correcao = await this.otimizarDesempenho(diagnostico);
        } else {
          // Correção genérica para outros tipos de diagnósticos
          correcao = {
            id: `correcao-${Date.now()}-${diagnostico.id}`,
            diagnostico_id: diagnostico.id,
            descricao: `Diagnóstico registrado: ${diagnostico.descricao}`,
            aplicada: false,
            timestamp: new Date().toISOString()
          };
        }
        
        if (correcao) {
          correcoesAplicadas.push(correcao);
          
          // Registrar correção na API Python
          try {
            await this.pythonApi.criarCorrecao({
              diagnostico_id: correcao.diagnostico_id,
              descricao: correcao.descricao,
              codigo: correcao.codigo,
              aplicada: correcao.aplicada
            });
          } catch (error) {
            console.error('[MelhoriaIntensiva] Erro ao registrar correção:', error);
          }
        }
      } catch (error) {
        console.error(`[MelhoriaIntensiva] Erro ao aplicar correção para diagnóstico ${diagnostico.id}:`, error);
      }
    }
    
    return correcoesAplicadas;
  }
  
  /**
   * Corrigir problemas com APIs
   */
  private async corrigirProblemaApi(diagnostico: Diagnostico): Promise<Correcao> {
    console.log(`[MelhoriaIntensiva] Tentando corrigir problema de API: ${diagnostico.descricao}`);
    
    if (diagnostico.detalhes?.tipoErro === 'quota' || 
        (diagnostico.descricao.includes('quota') && diagnostico.descricao.includes('ElevenLabs'))) {
      // Correção para problema de quota no ElevenLabs - configurar fallback automático
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      
      try {
        let config = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        
        config.useVoiceFallback = true;
        config.voiceFallbackProvider = 'openai';
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        return {
          id: `correcao-api-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: 'Configurado fallback automático para síntese de voz devido a problemas de quota no ElevenLabs',
          aplicada: true,
          timestamp: new Date().toISOString(),
          resultado: 'Fallback para OpenAI TTS configurado com sucesso'
        };
      } catch (error) {
        console.error('[MelhoriaIntensiva] Erro ao configurar fallback de voz:', error);
        return {
          id: `correcao-api-erro-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: 'Tentativa de configurar fallback de voz falhou',
          aplicada: false,
          timestamp: new Date().toISOString(),
          resultado: `Erro: ${String(error)}`
        };
      }
    } else if (diagnostico.detalhes?.tipoErro === 'rate_limit' || diagnostico.descricao.includes('rate limit')) {
      // Correção para rate limit - configurar throttling
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      
      try {
        let config = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        
        if (!config.apiThrottling) {
          config.apiThrottling = {};
        }
        
        const apiName = diagnostico.detalhes?.api || 'default';
        config.apiThrottling[apiName] = {
          enabled: true,
          requestsPerMinute: 5,
          maxRetries: 3,
          retryDelay: 2000
        };
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        return {
          id: `correcao-rate-limit-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: `Configurado throttling automático para API ${apiName} devido a problemas de rate limit`,
          aplicada: true,
          timestamp: new Date().toISOString(),
          resultado: 'Throttling configurado com sucesso'
        };
      } catch (error) {
        console.error('[MelhoriaIntensiva] Erro ao configurar throttling de API:', error);
        return {
          id: `correcao-rate-limit-erro-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: 'Tentativa de configurar throttling de API falhou',
          aplicada: false,
          timestamp: new Date().toISOString(),
          resultado: `Erro: ${String(error)}`
        };
      }
    } else if (diagnostico.descricao.includes('Chave de API não configurada')) {
      // Registra a necessidade de uma chave de API, mas não pode inserir automaticamente
      return {
        id: `correcao-api-key-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: `Detectada ausência de chave de API: ${diagnostico.detalhes?.apiNome}`,
        aplicada: false,
        timestamp: new Date().toISOString(),
        resultado: 'Necessário configurar manualmente. Sugestão registrada para o administrador.'
      };
    }
    
    // Correção genérica
    return {
      id: `correcao-api-generica-${Date.now()}`,
      diagnostico_id: diagnostico.id || '',
      descricao: `Problema de API detectado: ${diagnostico.descricao}`,
      aplicada: false,
      timestamp: new Date().toISOString(),
      resultado: 'Problema registrado para análise manual'
    };
  }
  
  /**
   * Corrigir arquivo de dados corrompido
   */
  private async corrigirArquivoDadosCorrompido(diagnostico: Diagnostico): Promise<Correcao> {
    console.log(`[MelhoriaIntensiva] Tentando corrigir arquivo corrompido: ${diagnostico.detalhes?.arquivo}`);
    
    const arquivoPath = diagnostico.detalhes?.arquivo;
    if (!arquivoPath || !fs.existsSync(arquivoPath)) {
      return {
        id: `correcao-arquivo-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: 'Arquivo não encontrado para correção',
        aplicada: false,
        timestamp: new Date().toISOString()
      };
    }
    
    try {
      // Verificar se há backup recente
      const diretorio = path.dirname(arquivoPath);
      const nomeArquivo = path.basename(arquivoPath);
      const backupPath = path.join(diretorio, `${nomeArquivo}.backup`);
      
      if (fs.existsSync(backupPath)) {
        // Restaurar do backup
        fs.copyFileSync(backupPath, arquivoPath);
        
        return {
          id: `correcao-arquivo-backup-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: `Arquivo corrompido restaurado do backup: ${nomeArquivo}`,
          aplicada: true,
          timestamp: new Date().toISOString(),
          resultado: 'Backup restaurado com sucesso'
        };
      } else {
        // Tentar reparar o arquivo JSON
        const conteudoCorrompido = fs.readFileSync(arquivoPath, 'utf8');
        
        // Abordagem 1: Tentar pegar parte válida no início do arquivo
        let dadosReparados = '[]';
        if (conteudoCorrompido.trim().startsWith('[')) {
          // Tenta extrair o conteúdo JSON entre os colchetes
          const match = conteudoCorrompido.match(/\[(.*)\]/s);
          if (match) {
            try {
              const conteudoParcial = `[${match[1]}]`;
              JSON.parse(conteudoParcial); // Testa se é válido
              dadosReparados = conteudoParcial;
            } catch (e) {
              // Se falhar, continua com a abordagem 2
            }
          }
        }
        
        // Abordagem 2: Resetar para um array vazio se reparação falhou
        fs.writeFileSync(arquivoPath, dadosReparados);
        
        return {
          id: `correcao-arquivo-reset-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: `Arquivo corrompido reparado ou resetado: ${nomeArquivo}`,
          aplicada: true,
          timestamp: new Date().toISOString(),
          resultado: 'Arquivo reparado e salvo'
        };
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao reparar arquivo corrompido:', error);
      return {
        id: `correcao-arquivo-erro-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: 'Tentativa de reparar arquivo corrompido falhou',
        aplicada: false,
        timestamp: new Date().toISOString(),
        resultado: `Erro: ${String(error)}`
      };
    }
  }
  
  /**
   * Corrigir mapeamento de provedor no orquestrador
   */
  private async corrigirMapeamentoProvedor(diagnostico: Diagnostico): Promise<Correcao> {
    console.log(`[MelhoriaIntensiva] Tentando corrigir mapeamento de provedor: ${diagnostico.descricao}`);
    
    try {
      const tipoComando = diagnostico.detalhes?.tipoComando;
      const provedor = diagnostico.detalhes?.provedor;
      const provedoresDisponiveis = diagnostico.detalhes?.provedoresDisponiveis || [];
      
      if (!tipoComando || !provedor || !provedoresDisponiveis.length) {
        return {
          id: `correcao-mapeamento-info-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: 'Informações insuficientes para corrigir mapeamento',
          aplicada: false,
          timestamp: new Date().toISOString()
        };
      }
      
      // Selecionar um provedor alternativo disponível
      // Preferência: openai > anthropic > perplexity
      const alternativas = ['openai', 'anthropic', 'perplexity'];
      let provedorAlternativo = null;
      
      for (const alt of alternativas) {
        if (provedoresDisponiveis.includes(alt) && alt !== provedor) {
          provedorAlternativo = alt;
          break;
        }
      }
      
      if (!provedorAlternativo) {
        // Se nenhuma das alternativas preferidas estiver disponível, use a primeira disponível
        provedorAlternativo = provedoresDisponiveis[0];
      }
      
      // Atualizar o mapeamento
      const orchestrator = getIntelligenceOrchestrator();
      const mappings = orchestrator.getProviderMappings();
      
      // Criar novo mapeamento
      const novoMapeamento = {
        ...mappings,
        [tipoComando]: provedorAlternativo
      };
      
      // Aplicar novo mapeamento
      orchestrator.setProviderMappings(novoMapeamento);
      
      return {
        id: `correcao-mapeamento-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: `Mapeamento corrigido: ${tipoComando} -> ${provedorAlternativo} (anterior: ${provedor})`,
        aplicada: true,
        timestamp: new Date().toISOString(),
        resultado: 'Mapeamento atualizado com sucesso'
      };
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao corrigir mapeamento de provedor:', error);
      return {
        id: `correcao-mapeamento-erro-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: 'Tentativa de corrigir mapeamento de provedor falhou',
        aplicada: false,
        timestamp: new Date().toISOString(),
        resultado: `Erro: ${String(error)}`
      };
    }
  }
  
  /**
   * Otimizar logs do sistema
   */
  private async otimizarLogs(diagnostico: Diagnostico): Promise<Correcao> {
    console.log(`[MelhoriaIntensiva] Tentando otimizar logs: ${diagnostico.descricao}`);
    
    try {
      const logPath = diagnostico.detalhes?.arquivo;
      
      if (!logPath || !fs.existsSync(logPath)) {
        return {
          id: `correcao-logs-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: 'Arquivo de log não encontrado para otimização',
          aplicada: false,
          timestamp: new Date().toISOString()
        };
      }
      
      // Criar backup do log atual
      const backupPath = `${logPath}.${Date.now()}.backup`;
      fs.copyFileSync(logPath, backupPath);
      
      // Limitar tamanho do arquivo de log
      if (diagnostico.descricao.includes('tamanho excessivo')) {
        // Manter apenas as últimas 1000 linhas
        const ultimas1000Linhas = await this.lerUltimasLinhasLog(logPath, 1000);
        fs.writeFileSync(logPath, ultimas1000Linhas);
        
        return {
          id: `correcao-logs-tamanho-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: 'Arquivo de log truncado para reduzir tamanho',
          aplicada: true,
          timestamp: new Date().toISOString(),
          resultado: `Log reduzido e backup criado em ${backupPath}`
        };
      }
      
      // Alta frequência de erros - apenas registrar, não há correção automática
      if (diagnostico.descricao.includes('Alta frequência de erros')) {
        return {
          id: `correcao-logs-erros-${Date.now()}`,
          diagnostico_id: diagnostico.id || '',
          descricao: 'Alta frequência de erros detectada nos logs',
          aplicada: false,
          timestamp: new Date().toISOString(),
          resultado: 'Diagnóstico registrado para análise manual das causas dos erros'
        };
      }
      
      return {
        id: `correcao-logs-generica-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: 'Otimização genérica de logs',
        aplicada: false,
        timestamp: new Date().toISOString(),
        resultado: 'Backup do log criado, mas nenhuma ação específica tomada'
      };
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao otimizar logs:', error);
      return {
        id: `correcao-logs-erro-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: 'Tentativa de otimizar logs falhou',
        aplicada: false,
        timestamp: new Date().toISOString(),
        resultado: `Erro: ${String(error)}`
      };
    }
  }
  
  /**
   * Otimizar desempenho do sistema
   */
  private async otimizarDesempenho(diagnostico: Diagnostico): Promise<Correcao> {
    console.log(`[MelhoriaIntensiva] Tentando otimizar desempenho: ${diagnostico.descricao}`);
    
    try {
      // Configurar lazy loading e otimizações de performance no config
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Aplicar otimizações de performance
      config.performance = {
        ...config.performance,
        enableLazyLoading: true,
        cacheDuration: 300, // 5 minutos
        batchWrites: true,
        maxBatchSize: 50,
        optimizeMemory: true,
        enableCompressionForLargeData: true
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      return {
        id: `correcao-perf-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: 'Configurações de performance otimizadas',
        aplicada: true,
        timestamp: new Date().toISOString(),
        resultado: 'Lazy loading e otimizações de I/O configuradas'
      };
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao otimizar desempenho:', error);
      return {
        id: `correcao-perf-erro-${Date.now()}`,
        diagnostico_id: diagnostico.id || '',
        descricao: 'Tentativa de otimizar desempenho falhou',
        aplicada: false,
        timestamp: new Date().toISOString(),
        resultado: `Erro: ${String(error)}`
      };
    }
  }
  
  /**
   * Executa melhorias de segurança
   */
  private async executarReforcoSeguranca(): Promise<void> {
    console.log('[MelhoriaIntensiva] Executando reforço de segurança');
    
    try {
      // 1. Implementar ocultação segura de tokens de API nos logs
      this.implementarOcultacaoTokens();
      
      // 2. Criar criptografia básica para dados sensíveis
      this.implementarCriptografiaDados();
      
      // 3. Implementar validação de inputs
      this.implementarValidacaoInputs();
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro durante reforço de segurança:', error);
      
      // Registrar o problema na API Python
      try {
        await this.pythonApi.criarDiagnostico({
          tipo: 'sistema',
          descricao: 'Falha durante reforço de segurança',
          severidade: 'erro',
          detalhes: { erro: String(error) }
        });
      } catch (e) {
        console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico de falha de segurança:', e);
      }
    }
  }
  
  /**
   * Implementa ocultação de tokens sensíveis nos logs
   */
  private implementarOcultacaoTokens(): void {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    
    try {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Configurar ocultação de tokens
      config.security = {
        ...config.security,
        maskSensitiveData: true,
        sensitivePrefixes: [
          'sk-', // OpenAI
          'elevenlabs_', // ElevenLabs
          'xoxb-', // Slack
          'pplx-', // Perplexity
          'anthro_' // Anthropic
        ],
        logSanitization: true
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('[MelhoriaIntensiva] Ocultação de tokens configurada');
      
      // Registrar ação
      this.pythonApi.criarDiagnostico({
        tipo: 'sistema',
        descricao: 'Reforço de segurança: Ocultação de tokens implementada',
        severidade: 'info',
        detalhes: { acao: 'ocultacao_tokens' }
      }).catch(e => console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico:', e));
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao configurar ocultação de tokens:', error);
    }
  }
  
  /**
   * Implementa criptografia básica para dados sensíveis
   */
  private implementarCriptografiaDados(): void {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    
    try {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Gerar chave de criptografia se não existir
      if (!config.security?.encryptionKey) {
        const crypto = require('crypto');
        const encryptionKey = crypto.randomBytes(32).toString('hex');
        
        config.security = {
          ...config.security,
          enableEncryption: true,
          encryptionKey,
          encryptedFields: [
            'password',
            'token',
            'apiKey',
            'credentials',
            'secretKey'
          ]
        };
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('[MelhoriaIntensiva] Criptografia de dados configurada');
        
        // Registrar ação
        this.pythonApi.criarDiagnostico({
          tipo: 'sistema',
          descricao: 'Reforço de segurança: Criptografia de dados implementada',
          severidade: 'info',
          detalhes: { acao: 'criptografia_dados' }
        }).catch(e => console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico:', e));
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao configurar criptografia:', error);
    }
  }
  
  /**
   * Implementa validação básica de inputs
   */
  private implementarValidacaoInputs(): void {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    
    try {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Configurar validação de inputs
      config.security = {
        ...config.security,
        validateInputs: true,
        sanitizeUserData: true,
        preventPathTraversal: true,
        maxInputLength: 10000 // Limitar tamanho de inputs
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('[MelhoriaIntensiva] Validação de inputs configurada');
      
      // Registrar ação
      this.pythonApi.criarDiagnostico({
        tipo: 'sistema',
        descricao: 'Reforço de segurança: Validação de inputs implementada',
        severidade: 'info',
        detalhes: { acao: 'validacao_inputs' }
      }).catch(e => console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico:', e));
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao configurar validação de inputs:', error);
    }
  }
  
  /**
   * Executar evolução contínua do sistema
   */
  private async executarEvolucaoContinua(): Promise<void> {
    console.log('[MelhoriaIntensiva] Executando evolução contínua');
    
    try {
      // 1. Registrar sugestão de melhoria para aprendizado contínuo
      const sugestao: Sugestao = {
        id: `sugestao-aprendizado-${Date.now()}`,
        tipo: 'otimizacao',
        titulo: 'Implementar aprendizado contínuo do orquestrador',
        descricao: 'O orquestrador deve aprender continuamente com base nas interações passadas e adaptar seus mapeamentos de forma dinâmica',
        prioridade: 'alta',
        implementada: false,
        timestamp: new Date().toISOString(),
        detalhes: {
          area: 'orquestrador',
          beneficio: 'Melhoria adaptativa automática'
        }
      };
      
      try {
        await this.pythonApi.criarSugestao({
          tipo: sugestao.tipo,
          titulo: sugestao.titulo,
          descricao: sugestao.descricao,
          prioridade: sugestao.prioridade,
          implementada: sugestao.implementada
        });
      } catch (error) {
        console.error('[MelhoriaIntensiva] Erro ao registrar sugestão:', error);
      }
      
      // 2. Configurar análise contínua
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Configurar análise contínua
      config.continuousAnalysis = {
        enabled: true,
        intervalMinutes: 10,
        historySize: 1000,
        adaptiveLearning: true,
        storeLearningData: true,
        improvementThreshold: 0.05 // 5% de melhoria mínima para aplicar mudanças
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('[MelhoriaIntensiva] Análise contínua configurada');
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro durante evolução contínua:', error);
      
      // Registrar o problema na API Python
      try {
        await this.pythonApi.criarDiagnostico({
          tipo: 'sistema',
          descricao: 'Falha durante configuração de evolução contínua',
          severidade: 'erro',
          detalhes: { erro: String(error) }
        });
      } catch (e) {
        console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico de falha de evolução:', e);
      }
    }
  }
  
  /**
   * Executar melhorias na interface
   */
  private async executarMelhoriasInterface(): Promise<void> {
    console.log('[MelhoriaIntensiva] Executando melhorias de interface');
    
    try {
      // Registrar sugestões de melhoria para a interface
      const sugestoes: Sugestao[] = [
        {
          id: `sugestao-chat-texto-${Date.now()}`,
          tipo: 'nova_funcionalidade',
          titulo: 'Adicionar aba de Chat Texto além do assistente de voz',
          descricao: 'Implementar interface de chat textual paralela ao sistema de voz para oferecer flexibilidade de uso',
          prioridade: 'alta',
          implementada: false,
          timestamp: new Date().toISOString()
        },
        {
          id: `sugestao-painel-inteligencia-${Date.now()}`,
          tipo: 'otimizacao',
          titulo: 'Aprimorar Painel de Inteligência',
          descricao: 'Refinar o Painel de Inteligência para exibir dados de execução real, processos ativos e status dos agentes',
          prioridade: 'media',
          implementada: false,
          timestamp: new Date().toISOString()
        },
        {
          id: `sugestao-feedback-visual-${Date.now()}`,
          tipo: 'otimizacao',
          titulo: 'Adicionar feedback visual em tempo real',
          descricao: 'Implementar indicadores visuais que mostrem o fluxo de processamento em tempo real entre agentes e provedores de IA',
          prioridade: 'media',
          implementada: false,
          timestamp: new Date().toISOString()
        }
      ];
      
      // Registrar sugestões na API Python
      for (const sugestao of sugestoes) {
        try {
          await this.pythonApi.criarSugestao({
            tipo: sugestao.tipo,
            titulo: sugestao.titulo,
            descricao: sugestao.descricao,
            prioridade: sugestao.prioridade,
            implementada: sugestao.implementada
          });
        } catch (error) {
          console.error('[MelhoriaIntensiva] Erro ao registrar sugestão de interface:', error);
        }
      }
      
      console.log('[MelhoriaIntensiva] Sugestões de melhoria de interface registradas');
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro durante melhorias de interface:', error);
      
      // Registrar o problema na API Python
      try {
        await this.pythonApi.criarDiagnostico({
          tipo: 'sistema',
          descricao: 'Falha durante registro de melhorias de interface',
          severidade: 'erro',
          detalhes: { erro: String(error) }
        });
      } catch (e) {
        console.error('[MelhoriaIntensiva] Erro ao registrar diagnóstico de falha de interface:', e);
      }
    }
  }
  
  /**
   * Utilitário para ler as últimas linhas de um arquivo de log
   */
  private async lerUltimasLinhasLog(filePath: string, numLines: number): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const { exec } = require('child_process');
        exec(`tail -n ${numLines} ${filePath}`, (error: any, stdout: string) => {
          if (error) {
            // Fallback para leitura completa se tail falhar
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              const lines = content.split('\n');
              const lastLines = lines.slice(-numLines).join('\n');
              resolve(lastLines);
            } catch (readError) {
              reject(readError);
            }
          } else {
            resolve(stdout);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Carregar histórico de melhorias
   */
  private carregarHistorico(): void {
    const historicoPath = path.join(this.dataPath, 'historico_melhorias.json');
    
    try {
      if (fs.existsSync(historicoPath)) {
        const conteudo = fs.readFileSync(historicoPath, 'utf8');
        this.historico = JSON.parse(conteudo);
      }
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao carregar histórico:', error);
      this.historico = [];
    }
  }
  
  /**
   * Salvar histórico de melhorias
   */
  private salvarHistorico(): void {
    const historicoPath = path.join(this.dataPath, 'historico_melhorias.json');
    
    try {
      fs.writeFileSync(historicoPath, JSON.stringify(this.historico, null, 2));
    } catch (error) {
      console.error('[MelhoriaIntensiva] Erro ao salvar histórico:', error);
    }
  }
  
  /**
   * Retorna o estado atual do sistema de melhoria intensiva
   */
  public getEstado(): any {
    return {
      emExecucao: this.emExecucao,
      cicloAtual: this.cicloAtual,
      ultimoCicloTimestamp: this.ultimoCicloTimestamp,
      isPaused: this.isPaused,
      historicoSize: this.historico.length,
      ultimoHistorico: this.historico[this.historico.length - 1] || null
    };
  }
  
  /**
   * Retorna o histórico de melhorias
   */
  public getHistorico(limit: number = 10): HistoricoMelhoria[] {
    return this.historico.slice(-limit);
  }
}

// Exporta a instância singleton
export const intensiveImprovementManager = IntensiveImprovementManager.getInstance();