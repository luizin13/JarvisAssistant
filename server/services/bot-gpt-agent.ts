/**
 * Bot GPT-Agent
 * 
 * Módulo que recebe comandos formatados diretamente do usuário,
 * interpreta, valida e executa automaticamente dentro da lógica do sistema.
 * 
 * Possui uma estrutura de feedback e aprendizado para alimentar a evolução do sistema.
 */

import agentSystem from './specialized-agents/agent-system';
import { getJsPythonConnector } from './js-python-connector';
import { storage } from '../storage';

export interface ComandoGPT {
  tipo: 'tarefa' | 'diagnostico' | 'sugestao' | 'criar-agente' | 'ajuste-sistema' | 'relatorio';
  conteudo: string;
  contexto?: string;
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
  origem?: string;
  agente_alvo?: string;
  parametros_adicionais?: Record<string, any>;
}

export interface ResultadoComando {
  status: 'executado' | 'erro';
  log: any;
  mensagem?: string;
  dados?: any;
}

/**
 * Converte a prioridade do formato do bot para o formato da API Python
 */
function converterPrioridade(prioridade?: string): string {
  switch (prioridade) {
    case 'baixa': return 'baixa';
    case 'alta': return 'alta';
    case 'urgente': return 'alta'; // A API Python não tem 'urgente', mapeamos para 'alta'
    case 'normal': 
    default: return 'normal';
  }
}

/**
 * Executa um comando recebido do bot GPT-Agent
 */
export async function executarComando(comando: ComandoGPT): Promise<ResultadoComando> {
  const log = {
    recebido: new Date().toISOString(),
    tipo: comando.tipo,
    conteudo: comando.conteudo,
    contexto: comando.contexto,
    prioridade: comando.prioridade || 'normal',
    origem: comando.origem || 'GPT-Agent-Alpha'
  };

  console.log('[GPT-Agent] Executando comando:', log);

  try {
    // Executa a ação com base no tipo de comando
    switch (comando.tipo) {
      case 'tarefa': {
        const pythonApi = getJsPythonConnector();
        const novaTarefa = await pythonApi.createTask({
          titulo: comando.conteudo,
          descricao: comando.contexto || 'Tarefa criada via GPT-Agent',
          estado: 'pendente',
          prioridade: converterPrioridade(comando.prioridade),
          agente_responsavel: comando.agente_alvo,
          contexto: comando.parametros_adicionais
        });
        
        return {
          status: 'executado',
          log,
          mensagem: `Tarefa "${comando.conteudo}" criada com sucesso`,
          dados: novaTarefa
        };
      }
      
      case 'diagnostico': {
        const pythonApi = getJsPythonConnector();
        const novoDiagnostico = await pythonApi.createDiagnostic({
          tipo: comando.parametros_adicionais?.tipo_diagnostico || 'sistema',
          descricao: comando.conteudo,
          severidade: comando.prioridade === 'urgente' ? 'critico' : 
                     comando.prioridade === 'alta' ? 'erro' :
                     comando.prioridade === 'normal' ? 'aviso' : 'info',
          detalhes: {
            origem: comando.origem || 'GPT-Agent-Alpha',
            agente_id: comando.agente_alvo || null,
            contexto: comando.contexto || null,
            ...comando.parametros_adicionais
          }
        });
        
        return {
          status: 'executado',
          log,
          mensagem: `Diagnóstico registrado com sucesso`,
          dados: novoDiagnostico
        };
      }
      
      case 'sugestao': {
        const pythonApi = getJsPythonConnector();
        const novaSugestao = await pythonApi.createSuggestion({
          tipo: comando.parametros_adicionais?.tipo_sugestao || 'otimizacao',
          titulo: comando.conteudo,
          descricao: comando.contexto || 'Sugestão criada via GPT-Agent',
          prioridade: comando.prioridade === 'urgente' || comando.prioridade === 'alta' ? 'alta' :
                     comando.prioridade === 'baixa' ? 'baixa' : 'media',
          implementada: false,
          detalhes: comando.parametros_adicionais
        });
        
        return {
          status: 'executado',
          log,
          mensagem: `Sugestão "${comando.conteudo}" registrada com sucesso`,
          dados: novaSugestao
        };
      }
      
      case 'criar-agente': {
        // Verificar se já existe agente inicializado
        if (!agentSystem.getActiveAgents().length) {
          await agentSystem.initialize();
        }
        
        // Usamos o nome do agente como domínio também para agentes com nome completo
        // como "AgenteAnaliseSistema", "AgenteCorrecaoAutomatica", etc.
        const nome = comando.conteudo;
        const dominio = comando.parametros_adicionais?.dominio || nome;
        
        console.log(`[GPT-Agent] Tentando criar agente com nome: ${nome}, domínio: ${dominio}`);
        
        // Primeira tentativa com o nome como domínio
        let novoAgente = await agentSystem.createAndRegisterAgent(dominio, nome);
        
        // Segunda tentativa com o domínio padrão se a primeira falhar
        if (!novoAgente && dominio !== 'geral') {
          console.log(`[GPT-Agent] Tentativa de fallback para domínio 'geral'`);
          novoAgente = await agentSystem.createAndRegisterAgent('geral', nome);
        }
        
        // Terceira tentativa com domínios específicos conhecidos
        if (!novoAgente) {
          // Mapeamento de nomes especiais para domínios conhecidos
          const mapaDominios: Record<string, string> = {
            'AgenteAnaliseSistema': 'analise-sistema',
            'AgenteCorrecaoAutomatica': 'correcao-automatica',
            'AgenteMelhoriaContinua': 'melhoria-continua',
            // Novos agentes de desenvolvimento pessoal e profissional
            'GPT-Amigo': 'desenvolvimento-pessoal',
            'AgenteEstratégico': 'estrategia',
            'AgenteInfluência': 'comunicacao',
            'AgenteResiliência': 'desenvolvimento-pessoal',
            'AgenteInovação': 'tecnico',
            'AgenteFinanceiroVisionário': 'financeiro',
            'AgenteGestãoPessoal': 'desenvolvimento-pessoal',
            'AgenteNetworking': 'comunicacao',
            'AgenteLeituraAtiva': 'aprendizado',
            'AgenteOportunidades': 'hack',
            'AgenteSaudePerformance': 'desenvolvimento-pessoal',
            'AgenteMarketingEstratégico': 'comunicacao',
            'AgentePrevisãoFuturo': 'estrategia',
            'AgenteAcademia': 'academia'
          };
          
          if (mapaDominios[nome]) {
            console.log(`[GPT-Agent] Tentativa com domínio mapeado: ${mapaDominios[nome]}`);
            novoAgente = await agentSystem.createAndRegisterAgent(mapaDominios[nome], nome);
          }
        }
        
        if (!novoAgente) {
          return {
            status: 'erro',
            log,
            mensagem: `Não foi possível criar agente de nome '${nome}' com domínio '${dominio}'`
          };
        }
        
        return {
          status: 'executado',
          log,
          mensagem: `Agente "${nome}" criado com sucesso`,
          dados: {
            id: novoAgente.id,
            nome: novoAgente.name,
            dominio: novoAgente.domain,
            versao: novoAgente.version,
            descricao: novoAgente.description
          }
        };
      }
      
      case 'ajuste-sistema': {
        // Implementar ajustes no sistema com base no conteúdo e parâmetros
        // Por exemplo, ajustar configurações, parâmetros, etc.
        const resultado = {
          timestamp: new Date().toISOString(),
          ajuste: comando.conteudo,
          aplicado: true,
          detalhes: comando.parametros_adicionais
        };
        
        // Registrar o ajuste no histórico de aprendizado
        await storage.createLearningRecord({
          action: 'ajuste-sistema',
          context: comando.contexto || comando.conteudo,
          result: JSON.stringify(resultado),
          learning: 'Ajuste no sistema via GPT-Agent',
          impact_level: comando.prioridade === 'urgente' ? 'alto' : 
                         comando.prioridade === 'alta' ? 'médio' : 'baixo',
          strategic_area: 'sistema',
          created_at: new Date(),
          agent_id: comando.origem || 'GPT-Agent-Alpha'
        });
        
        return {
          status: 'executado',
          log,
          mensagem: `Ajuste "${comando.conteudo}" aplicado com sucesso`,
          dados: resultado
        };
      }
      
      case 'relatorio': {
        // Gerar um relatório com base no tipo especificado
        const tipoRelatorio = comando.parametros_adicionais?.tipo_relatorio || 'geral';
        let dados = {};
        
        switch (tipoRelatorio) {
          case 'agentes':
            dados = {
              agentes: agentSystem.getActiveAgents().map(agent => ({
                id: agent.id,
                nome: agent.name,
                dominio: agent.domain,
                versao: agent.version,
                estatisticas: agent.stats
              })),
              totalAgentes: agentSystem.getActiveAgents().length,
              timestamp: new Date().toISOString()
            };
            break;
            
          case 'sistema':
            dados = agentSystem.getSystemStats();
            break;
            
          case 'aprendizado':
            // Obter últimos registros de aprendizado
            const ultimasLicoes = await storage.getLearningRecords(10);
            dados = {
              licoes: ultimasLicoes,
              padroes: ultimasLicoes.reduce((acc: Record<string, number>, item: any) => {
                const area = item.strategic_area || 'outros';
                acc[area] = (acc[area] || 0) + 1;
                return acc;
              }, {}),
              timestamp: new Date().toISOString()
            };
            break;
            
          default:
            // Relatório geral
            dados = {
              sistema: agentSystem.getSystemStats(),
              agentes: agentSystem.getActiveAgents().length,
              ultimasLicoes: await storage.getLearningRecords(5),
              timestamp: new Date().toISOString()
            };
        }
        
        return {
          status: 'executado', 
          log,
          mensagem: `Relatório de ${tipoRelatorio} gerado com sucesso`,
          dados
        };
      }
      
      default:
        return {
          status: 'erro',
          log,
          mensagem: `Tipo de comando não reconhecido: ${comando.tipo}`
        };
    }
    
  } catch (error) {
    console.error('[GPT-Agent] Erro ao executar comando:', error);
    return {
      status: 'erro',
      log,
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao executar comando'
    };
  }
}

// Registra o histórico de comandos executados
const historicoComandos: Array<{comando: ComandoGPT, resultado: ResultadoComando, timestamp: string}> = [];

/**
 * Executa um comando e registra no histórico
 */
export async function processarComando(comando: ComandoGPT): Promise<ResultadoComando> {
  const resultado = await executarComando(comando);
  
  // Registra no histórico
  historicoComandos.push({
    comando,
    resultado,
    timestamp: new Date().toISOString()
  });
  
  // Limita o histórico para não consumir muita memória
  if (historicoComandos.length > 1000) {
    historicoComandos.splice(0, historicoComandos.length - 1000);
  }
  
  return resultado;
}

/**
 * Obtém o histórico de comandos executados
 */
export function obterHistoricoComandos(limite: number = 100): Array<{comando: ComandoGPT, resultado: ResultadoComando, timestamp: string}> {
  return historicoComandos.slice(-limite);
}