/**
 * Tipos para a API Python
 * Define as interfaces para comunicação com o servidor Python interno
 */

export interface Tarefa {
  id?: string;
  titulo: string;
  descricao: string;
  estado: 'pendente' | 'em_andamento' | 'concluida' | 'falha';
  agente_responsavel?: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'critica';
  timestamp_criacao?: string;
  timestamp_atualizacao?: string;
  resultado?: string;
  contexto?: Record<string, any>;
}

export interface Diagnostico {
  id?: string;
  tipo: 'sistema' | 'agente' | 'tarefa' | 'conexao';
  descricao: string;
  severidade: 'info' | 'aviso' | 'erro' | 'critico';
  timestamp?: string;
  detalhes?: Record<string, any>;
  sugestoes?: string[];
}

export interface Correcao {
  id?: string;
  diagnostico_id: string;
  descricao: string;
  codigo?: string;
  aplicada: boolean;
  timestamp?: string;
  resultado?: string;
}

export interface Sugestao {
  id?: string;
  tipo: 'otimizacao' | 'nova_funcionalidade' | 'correcao' | 'arquitetura';
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta';
  implementada: boolean;
  timestamp?: string;
  detalhes?: Record<string, any>;
}

export interface StatusApi {
  healthy: boolean;
  version: string;
  uptime: number;
  memory_usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  components: {
    database: boolean;
    cache: boolean;
    scheduler: boolean;
  };
}

export interface ListarTarefasParams {
  estado?: 'pendente' | 'em_andamento' | 'concluida' | 'falha';
  agente?: string;
  prioridade?: 'baixa' | 'normal' | 'alta' | 'critica';
  limite?: number;
}

export interface ListarDiagnosticosParams {
  tipo?: 'sistema' | 'agente' | 'tarefa' | 'conexao';
  severidade?: 'info' | 'aviso' | 'erro' | 'critico';
  limite?: number;
}

export interface ListarCorrecoesParams {
  aplicada?: boolean;
  diagnostico_id?: string;
  limite?: number;
}

export interface ListarSugestoesParams {
  tipo?: 'otimizacao' | 'nova_funcionalidade' | 'correcao' | 'arquitetura';
  prioridade?: 'baixa' | 'media' | 'alta';
  implementada?: boolean;
  limite?: number;
}

export interface AtualizarTarefaParams {
  estado?: 'pendente' | 'em_andamento' | 'concluida' | 'falha';
  agente_responsavel?: string;
  prioridade?: 'baixa' | 'normal' | 'alta' | 'critica';
  resultado?: string;
  contexto?: Record<string, any>;
}

export interface ExecutarCicloOrquestradorParams {
  forcar?: boolean;
  modo?: 'completo' | 'diagnostico' | 'acao';
}

export interface StatusResponse {
  success: boolean;
  message: string;
  data?: any;
}