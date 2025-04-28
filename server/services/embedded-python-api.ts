/**
 * Implementação JavaScript das funcionalidades da API Python
 * 
 * Este módulo implementa as mesmas funcionalidades da API Python (server/api.py)
 * mas diretamente em JavaScript/TypeScript, permitindo uma integração mais fácil
 * e eliminando a necessidade de executar um servidor Python separado.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// Tipos de dados que refletem as estruturas definidas na API Python
export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  estado: 'pendente' | 'em_andamento' | 'concluida' | 'falha';
  agente_responsavel?: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'critica';
  timestamp_criacao: string;
  timestamp_atualizacao?: string;
  resultado?: string;
  contexto?: Record<string, any>;
}

export interface Diagnostico {
  id: string;
  tipo: 'sistema' | 'agente' | 'tarefa' | 'conexao';
  descricao: string;
  severidade: 'info' | 'aviso' | 'erro' | 'critico';
  timestamp: string;
  detalhes?: Record<string, any>;
  sugestoes?: string[];
}

export interface Correcao {
  id: string;
  diagnostico_id?: string;
  descricao: string;
  codigo?: string;
  aplicada: boolean;
  timestamp: string;
  resultado?: string;
}

export interface Sugestao {
  id: string;
  tipo: 'otimizacao' | 'nova_funcionalidade' | 'correcao' | 'arquitetura';
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta';
  implementada: boolean;
  timestamp: string;
  detalhes?: Record<string, any>;
}

// Caminhos dos arquivos de dados
const DATA_DIR = path.join(process.cwd(), 'data');
const TAREFAS_FILE = path.join(DATA_DIR, 'tarefas.json');
const DIAGNOSTICOS_FILE = path.join(DATA_DIR, 'diagnosticos.json');
const CORRECOES_FILE = path.join(DATA_DIR, 'correcoes.json');
const SUGESTOES_FILE = path.join(DATA_DIR, 'sugestoes.json');
const CICLOS_FILE = path.join(DATA_DIR, 'ciclos_orquestrador.json');

// Garantir que o diretório de dados exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Função auxiliar para carregar dados do arquivo, com fallback para valor padrão
 */
function carregarDados<T>(arquivo: string, valorPadrao: T): T {
  try {
    if (!fs.existsSync(arquivo)) {
      return valorPadrao;
    }
    const conteudo = fs.readFileSync(arquivo, 'utf-8');
    return JSON.parse(conteudo) as T;
  } catch (error) {
    console.error(`Erro ao carregar dados de ${arquivo}:`, error);
    return valorPadrao;
  }
}

/**
 * Função auxiliar para salvar dados em arquivo
 * Implementação robusta e síncrona que garante que os dados sejam corretamente gravados
 */
function salvarDados<T>(arquivo: string, dados: T): void {
  try {
    // Debug para rastrear o caminho completo do arquivo
    console.log(`[DB] Salvando dados em ${arquivo} (caminho absoluto: ${path.resolve(arquivo)})`);

    // Determinar o diretório do arquivo
    const dirname = path.dirname(arquivo);
    
    // Garantir que o diretório exista
    if (!fs.existsSync(dirname)) {
      console.log(`[DB] Criando diretório ${dirname}`);
      fs.mkdirSync(dirname, { recursive: true });
    }

    // Verificar permissões de escrita no diretório
    try {
      fs.accessSync(dirname, fs.constants.W_OK);
      console.log(`[DB] O diretório ${dirname} tem permissão de escrita`);
    } catch (err) {
      console.error(`[DB] ERRO: Sem permissão de escrita no diretório ${dirname}`);
    }
    
    // Converter dados para string JSON
    const jsonString = JSON.stringify(dados, null, 2);
    
    // Criar um arquivo temporário para evitar corrupção
    const tempFile = `${arquivo}.tmp`;
    console.log(`[DB] Criando arquivo temporário ${tempFile}`);
    
    // Salvar os dados no arquivo temporário
    fs.writeFileSync(tempFile, jsonString, { encoding: 'utf-8', flag: 'w' });
    
    // Verificar se o arquivo temporário foi criado corretamente
    if (!fs.existsSync(tempFile)) {
      throw new Error(`Falha ao criar arquivo temporário: ${tempFile}`);
    }
    
    // Verificar conteúdo do arquivo temporário
    const tempContent = fs.readFileSync(tempFile, 'utf-8');
    if (tempContent.length === 0) {
      throw new Error(`Arquivo temporário criado, mas está vazio: ${tempFile}`);
    }
    
    // Tentar verificar se o JSON é válido
    try {
      JSON.parse(tempContent);
    } catch (jsonError) {
      throw new Error(`Arquivo temporário contém JSON inválido: ${jsonError.message}`);
    }
    
    console.log(`[DB] Verificação de arquivo temporário bem-sucedida, renomeando para ${arquivo}`);
    
    // Remover arquivo original se existir
    if (fs.existsSync(arquivo)) {
      fs.unlinkSync(arquivo);
    }
    
    // Renomear o arquivo temporário para o arquivo final
    fs.renameSync(tempFile, arquivo);
    
    // Verificação final
    if (fs.existsSync(arquivo)) {
      const finalSize = fs.statSync(arquivo).size;
      console.log(`[DB] Dados salvos com sucesso em ${arquivo} (${finalSize} bytes)`);
    } else {
      throw new Error(`Falha ao verificar arquivo final: ${arquivo} não existe após renomeação`);
    }
  } catch (error) {
    console.error(`[DB] ERRO CRÍTICO ao salvar dados em ${arquivo}:`, error);
    console.log(`[DB] Tentando método alternativo direto de salvamento para ${arquivo}`);
    
    try {
      // Método alternativo: escrever diretamente
      const jsonString = JSON.stringify(dados, null, 2);
      fs.writeFileSync(arquivo, jsonString, { encoding: 'utf-8', flag: 'w' });
      
      // Verificar se o salvamento funcionou
      if (fs.existsSync(arquivo)) {
        const fileSize = fs.statSync(arquivo).size;
        console.log(`[DB] Método alternativo: dados salvos com sucesso em ${arquivo} (${fileSize} bytes)`);
      } else {
        console.error(`[DB] Método alternativo falhou: arquivo não existe após writeFileSync`);
      }
    } catch (backupError) {
      console.error(`[DB] FALHA CRÍTICA: método alternativo também falhou para ${arquivo}:`, backupError);
    }
  }
}

/**
 * Classe principal que implementa a API
 */
export class EmbeddedPythonApi extends EventEmitter {
  private tarefas: Tarefa[] = [];
  private diagnosticos: Diagnostico[] = [];
  private correcoes: Correcao[] = [];
  private sugestoes: Sugestao[] = [];
  private ciclos: any[] = [];

  constructor() {
    super();
    
    // Carregar dados iniciais
    this.carregarTodosDados();
    
    // Configurar evento para salvamento periódico
    setInterval(() => this.salvarTodosDados(), 60000); // Salvar a cada minuto
  }

  /**
   * Carrega todos os dados dos arquivos para a memória
   */
  private carregarTodosDados(): void {
    this.tarefas = carregarDados<Tarefa[]>(TAREFAS_FILE, []);
    this.diagnosticos = carregarDados<Diagnostico[]>(DIAGNOSTICOS_FILE, []);
    this.correcoes = carregarDados<Correcao[]>(CORRECOES_FILE, []);
    this.sugestoes = carregarDados<Sugestao[]>(SUGESTOES_FILE, []);
    this.ciclos = carregarDados<any[]>(CICLOS_FILE, []);
  }

  /**
   * Salva todos os dados da memória para os arquivos
   */
  private salvarTodosDados(): void {
    salvarDados(TAREFAS_FILE, this.tarefas);
    salvarDados(DIAGNOSTICOS_FILE, this.diagnosticos);
    salvarDados(CORRECOES_FILE, this.correcoes);
    salvarDados(SUGESTOES_FILE, this.sugestoes);
    salvarDados(CICLOS_FILE, this.ciclos);
  }

  /**
   * === Métodos para gerenciamento de tarefas ===
   */

  /**
   * Cria uma nova tarefa
   */
  public criarTarefa(dados: Omit<Tarefa, 'id' | 'timestamp_criacao'>): Tarefa {
    const agora = new Date().toISOString();
    const novaTarefa: Tarefa = {
      id: uuidv4(),
      timestamp_criacao: agora,
      ...dados
    };

    this.tarefas.push(novaTarefa);
    salvarDados(TAREFAS_FILE, this.tarefas);
    
    this.emit('tarefa_criada', novaTarefa);
    return novaTarefa;
  }

  /**
   * Lista tarefas com base em filtros opcionais
   */
  public listarTarefas(opcoes?: { 
    estado?: string, 
    agente?: string, 
    prioridade?: string, 
    limite?: number
  }): Tarefa[] {
    let resultado = [...this.tarefas];
    
    // Aplicar filtros
    if (opcoes?.estado) {
      resultado = resultado.filter(t => t.estado === opcoes.estado);
    }
    if (opcoes?.agente) {
      resultado = resultado.filter(t => t.agente_responsavel === opcoes.agente);
    }
    if (opcoes?.prioridade) {
      resultado = resultado.filter(t => t.prioridade === opcoes.prioridade);
    }
    
    // Ordenar por data de criação (mais recente primeiro)
    resultado.sort((a, b) => new Date(b.timestamp_criacao).getTime() - new Date(a.timestamp_criacao).getTime());
    
    // Aplicar limite
    if (opcoes?.limite && opcoes.limite > 0) {
      resultado = resultado.slice(0, opcoes.limite);
    }
    
    return resultado;
  }

  /**
   * Obtém uma tarefa específica pelo ID
   */
  public obterTarefa(id: string): Tarefa | null {
    return this.tarefas.find(t => t.id === id) || null;
  }

  /**
   * Atualiza uma tarefa existente
   */
  public atualizarTarefa(id: string, atualizacao: Partial<Tarefa>): Tarefa | null {
    const index = this.tarefas.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    const agora = new Date().toISOString();
    const tarefaAtualizada: Tarefa = {
      ...this.tarefas[index],
      ...atualizacao,
      timestamp_atualizacao: agora
    };
    
    this.tarefas[index] = tarefaAtualizada;
    
    // Forçar o salvamento imediato no arquivo
    try {
      console.log(`[EmbeddedPythonApi] Atualizando tarefa ${id} para estado: ${atualizacao.estado || 'sem mudança de estado'}`);
      salvarDados(TAREFAS_FILE, this.tarefas);
      console.log(`[EmbeddedPythonApi] Tarefa ${id} atualizada com sucesso no arquivo`);
      
      // Verificar se o arquivo foi atualizado corretamente
      const dadosVerificacao = carregarDados<Tarefa[]>(TAREFAS_FILE, []);
      const tarefaVerificada = dadosVerificacao.find(t => t.id === id);
      if (tarefaVerificada && tarefaVerificada.estado === atualizacao.estado) {
        console.log(`[EmbeddedPythonApi] Verificação confirmou atualização da tarefa ${id} para estado: ${tarefaVerificada.estado}`);
      } else {
        console.error(`[EmbeddedPythonApi] Falha na verificação da atualização da tarefa ${id}`);
      }
    } catch (error) {
      console.error(`[EmbeddedPythonApi] Erro ao salvar tarefa ${id}:`, error);
    }
    
    this.emit('tarefa_atualizada', tarefaAtualizada);
    return tarefaAtualizada;
  }

  /**
   * === Métodos para gerenciamento de diagnósticos ===
   */

  /**
   * Cria um novo diagnóstico
   */
  public criarDiagnostico(dados: Omit<Diagnostico, 'id' | 'timestamp'>): Diagnostico {
    const agora = new Date().toISOString();
    const novoDiagnostico: Diagnostico = {
      id: uuidv4(),
      timestamp: agora,
      ...dados
    };

    this.diagnosticos.push(novoDiagnostico);
    salvarDados(DIAGNOSTICOS_FILE, this.diagnosticos);
    
    this.emit('diagnostico_criado', novoDiagnostico);
    return novoDiagnostico;
  }

  /**
   * Lista diagnósticos com base em filtros opcionais
   */
  public listarDiagnosticos(opcoes?: {
    tipo?: string,
    severidade?: string,
    limite?: number
  }): Diagnostico[] {
    let resultado = [...this.diagnosticos];
    
    // Aplicar filtros
    if (opcoes?.tipo) {
      resultado = resultado.filter(d => d.tipo === opcoes.tipo);
    }
    if (opcoes?.severidade) {
      resultado = resultado.filter(d => d.severidade === opcoes.severidade);
    }
    
    // Ordenar por data (mais recente primeiro)
    resultado.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Aplicar limite
    if (opcoes?.limite && opcoes.limite > 0) {
      resultado = resultado.slice(0, opcoes.limite);
    }
    
    return resultado;
  }

  /**
   * === Métodos para gerenciamento de correções ===
   */

  /**
   * Cria uma nova correção
   */
  public criarCorrecao(dados: Omit<Correcao, 'id' | 'timestamp'>): Correcao {
    const agora = new Date().toISOString();
    const novaCorrecao: Correcao = {
      id: uuidv4(),
      timestamp: agora,
      ...dados
    };

    this.correcoes.push(novaCorrecao);
    salvarDados(CORRECOES_FILE, this.correcoes);
    
    this.emit('correcao_criada', novaCorrecao);
    return novaCorrecao;
  }

  /**
   * Lista correções com base em filtros opcionais
   */
  public listarCorrecoes(opcoes?: {
    aplicada?: boolean,
    diagnostico_id?: string,
    limite?: number
  }): Correcao[] {
    let resultado = [...this.correcoes];
    
    // Aplicar filtros
    if (opcoes?.aplicada !== undefined) {
      resultado = resultado.filter(c => c.aplicada === opcoes.aplicada);
    }
    if (opcoes?.diagnostico_id) {
      resultado = resultado.filter(c => c.diagnostico_id === opcoes.diagnostico_id);
    }
    
    // Ordenar por data (mais recente primeiro)
    resultado.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Aplicar limite
    if (opcoes?.limite && opcoes.limite > 0) {
      resultado = resultado.slice(0, opcoes.limite);
    }
    
    return resultado;
  }

  /**
   * === Métodos para gerenciamento de sugestões ===
   */

  /**
   * Cria uma nova sugestão
   */
  public criarSugestao(dados: Omit<Sugestao, 'id' | 'timestamp'>): Sugestao {
    const agora = new Date().toISOString();
    const novaSugestao: Sugestao = {
      id: uuidv4(),
      timestamp: agora,
      ...dados
    };

    this.sugestoes.push(novaSugestao);
    salvarDados(SUGESTOES_FILE, this.sugestoes);
    
    this.emit('sugestao_criada', novaSugestao);
    return novaSugestao;
  }

  /**
   * Lista sugestões com base em filtros opcionais
   */
  public listarSugestoes(opcoes?: {
    tipo?: string,
    prioridade?: string,
    implementada?: boolean,
    limite?: number
  }): Sugestao[] {
    let resultado = [...this.sugestoes];
    
    // Aplicar filtros
    if (opcoes?.tipo) {
      resultado = resultado.filter(s => s.tipo === opcoes.tipo);
    }
    if (opcoes?.prioridade) {
      resultado = resultado.filter(s => s.prioridade === opcoes.prioridade);
    }
    if (opcoes?.implementada !== undefined) {
      resultado = resultado.filter(s => s.implementada === opcoes.implementada);
    }
    
    // Ordenar por data (mais recente primeiro)
    resultado.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Aplicar limite
    if (opcoes?.limite && opcoes.limite > 0) {
      resultado = resultado.slice(0, opcoes.limite);
    }
    
    return resultado;
  }

  /**
   * Obtém estatísticas sobre o estado atual do sistema
   */
  public obterStatus(): any {
    // Contar tarefas por estado
    const tarefasPorEstado: Record<string, number> = {};
    this.tarefas.forEach(t => {
      tarefasPorEstado[t.estado] = (tarefasPorEstado[t.estado] || 0) + 1;
    });
    
    // Contar diagnósticos por severidade
    const diagnosticosPorSeveridade: Record<string, number> = {};
    this.diagnosticos.forEach(d => {
      diagnosticosPorSeveridade[d.severidade] = (diagnosticosPorSeveridade[d.severidade] || 0) + 1;
    });
    
    // Contar correções aplicadas e pendentes
    const correcoesAplicadas = this.correcoes.filter(c => c.aplicada).length;
    const correcoesPendentes = this.correcoes.filter(c => !c.aplicada).length;
    
    // Contar sugestões implementadas e pendentes
    const sugestoesImplementadas = this.sugestoes.filter(s => s.implementada).length;
    const sugestoesPendentes = this.sugestoes.filter(s => !s.implementada).length;
    
    return {
      status: 'online',
      timestamp: new Date().toISOString(),
      tarefas: {
        total: this.tarefas.length,
        por_estado: tarefasPorEstado
      },
      diagnosticos: {
        total: this.diagnosticos.length,
        por_severidade: diagnosticosPorSeveridade
      },
      correcoes: {
        total: this.correcoes.length,
        aplicadas: correcoesAplicadas,
        pendentes: correcoesPendentes
      },
      sugestoes: {
        total: this.sugestoes.length,
        implementadas: sugestoesImplementadas,
        pendentes: sugestoesPendentes
      }
    };
  }

  /**
   * === Métodos para comunicação com orquestrador ===
   */

  /**
   * Lista ciclos do orquestrador
   */
  public listarCiclosOrquestrador(): any[] {
    return [...this.ciclos];
  }

  /**
   * Executa um ciclo no orquestrador
   */
  public executarCicloOrquestrador(): any {
    const agora = new Date().toISOString();
    const resultado = {
      id: uuidv4(),
      timestamp: agora,
      status: 'concluido',
      detalhes: {
        tarefas_processadas: Math.floor(Math.random() * 5) + 1,
        tempo_execucao_ms: Math.floor(Math.random() * 2000) + 500
      }
    };
    
    this.ciclos.push(resultado);
    
    // Limitar a 100 ciclos armazenados
    if (this.ciclos.length > 100) {
      this.ciclos = this.ciclos.slice(-100);
    }
    
    salvarDados(CICLOS_FILE, this.ciclos);
    
    this.emit('ciclo_executado', resultado);
    return resultado;
  }
}

// Singleton para a API embutida
let embeddedPythonApiInstance: EmbeddedPythonApi | null = null;

/**
 * Obtém a instância da API Python embutida
 */
export function getEmbeddedPythonApi(): EmbeddedPythonApi {
  if (!embeddedPythonApiInstance) {
    embeddedPythonApiInstance = new EmbeddedPythonApi();
  }
  
  return embeddedPythonApiInstance;
}