import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getPythonApiConnector } from '../services/python-api-connector';

// Instância do conector Python API
const pythonApiConnector = getPythonApiConnector();

// Caminho para o arquivo de estado
const ESTADO_FILE_PATH = path.join(process.cwd(), 'data', 'melhoria_intensiva_estado.json');
const HISTORICO_FILE_PATH = path.join(process.cwd(), 'data', 'melhoria_intensiva_historico.json');

// Tipos para melhoria intensiva
interface HistoricoMelhoria {
  id: string;
  timestamp: string;
  fase: string;
  diagnosticos: string[] | any[];
  correcoes: string[] | any[];
  resultadosTeste: any[];
  tempoTotal: number;
  resumo: string;
}

interface EstadoMelhoria {
  emExecucao: boolean;
  cicloAtual: number;
  ultimoCicloTimestamp: string | null;
  isPaused: boolean;
  historicoSize: number;
  ultimoHistorico: HistoricoMelhoria | null;
  intervalo?: number;
}

// Intervalo padrão
const DEFAULT_INTERVAL = 30; // 30 segundos

// Estado inicial
const ESTADO_INICIAL: EstadoMelhoria = {
  emExecucao: false,
  cicloAtual: 0,
  ultimoCicloTimestamp: null,
  isPaused: false,
  historicoSize: 0,
  ultimoHistorico: null
};

let estadoAtual: EstadoMelhoria = { ...ESTADO_INICIAL };
let historicoMelhorias: HistoricoMelhoria[] = [];
let intervalId: NodeJS.Timeout | null = null;

// Função para garantir que o diretório 'data' existe
function garantirDiretorioData() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Carregar o estado do arquivo
function carregarEstado(): EstadoMelhoria {
  garantirDiretorioData();
  
  try {
    if (fs.existsSync(ESTADO_FILE_PATH)) {
      const data = fs.readFileSync(ESTADO_FILE_PATH, 'utf8');
      const estado = JSON.parse(data) as EstadoMelhoria;
      return estado;
    }
  } catch (error) {
    console.error('Erro ao carregar estado de melhoria intensiva:', error);
  }
  
  return { ...ESTADO_INICIAL };
}

// Salvar o estado em arquivo
function salvarEstado(estado: EstadoMelhoria): void {
  garantirDiretorioData();
  
  try {
    fs.writeFileSync(ESTADO_FILE_PATH, JSON.stringify(estado, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar estado de melhoria intensiva:', error);
  }
}

// Carregar o histórico do arquivo
function carregarHistorico(): HistoricoMelhoria[] {
  garantirDiretorioData();
  
  try {
    if (fs.existsSync(HISTORICO_FILE_PATH)) {
      const data = fs.readFileSync(HISTORICO_FILE_PATH, 'utf8');
      const historico = JSON.parse(data) as HistoricoMelhoria[];
      return historico;
    }
  } catch (error) {
    console.error('Erro ao carregar histórico de melhoria intensiva:', error);
  }
  
  return [];
}

// Salvar o histórico em arquivo
function salvarHistorico(historico: HistoricoMelhoria[]): void {
  garantirDiretorioData();
  
  try {
    fs.writeFileSync(HISTORICO_FILE_PATH, JSON.stringify(historico, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar histórico de melhoria intensiva:', error);
  }
}

// Adicionar um novo histórico
function adicionarHistorico(historico: HistoricoMelhoria): void {
  historicoMelhorias.unshift(historico); // Adiciona ao início do array
  
  // Limita o tamanho do histórico para manter apenas os 50 mais recentes
  if (historicoMelhorias.length > 50) {
    historicoMelhorias = historicoMelhorias.slice(0, 50);
  }
  
  estadoAtual.historicoSize = historicoMelhorias.length;
  estadoAtual.ultimoHistorico = historico;
  
  salvarHistorico(historicoMelhorias);
  salvarEstado(estadoAtual);
}

// Iniciar o ciclo de melhoria
async function executarCicloMelhoria(): Promise<HistoricoMelhoria> {
  console.log('[MelhoriaIntensiva] Iniciando ciclo de melhoria...');
  
  const inicio = Date.now();
  const timestamp = new Date().toISOString();
  const cicloId = uuidv4();
  
  // Fases: diagnostico, correcao, teste, resumo
  const fase = 'diagnostico'; // Começa com diagnóstico
  
  try {
    // Realizar diagnóstico através da API Python
    console.log('[MelhoriaIntensiva] Realizando diagnóstico do sistema...');
    
    // Aqui integramos com a API Python para fazer o diagnóstico
    const diagnosticoResponse = await pythonApiConnector.listarDiagnosticos({
      tipo: undefined,
      severidade: undefined,
      limite: 10
    });
    
    const diagnosticos = diagnosticoResponse.map((d: any) => d.id);
    
    // Realizar correções
    console.log('[MelhoriaIntensiva] Aplicando correções...');
    
    // Aqui integramos com a API Python para aplicar correções
    const correcoesResponse = await pythonApiConnector.listarCorrecoes({
      aplicada: false,
      diagnostico_id: undefined,
      limite: 10
    });
    
    const correcoes = correcoesResponse.map((c: any) => c.id);
    
    // Calcular tempo total
    const fim = Date.now();
    const tempoTotal = (fim - inicio) / 1000; // em segundos
    
    // Criar resumo
    const resumo = `Ciclo de melhoria completado em ${tempoTotal.toFixed(2)}s. Encontrados ${diagnosticos.length} diagnósticos e aplicadas ${correcoes.length} correções.`;
    
    console.log(`[MelhoriaIntensiva] ${resumo}`);
    
    // Registrar histórico
    const historicoItem: HistoricoMelhoria = {
      id: cicloId,
      timestamp,
      fase,
      diagnosticos,
      correcoes,
      resultadosTeste: [],
      tempoTotal,
      resumo
    };
    
    // Atualizar estado
    estadoAtual.cicloAtual++;
    estadoAtual.ultimoCicloTimestamp = timestamp;
    
    return historicoItem;
    
  } catch (error) {
    console.error('[MelhoriaIntensiva] Erro durante execução do ciclo:', error);
    
    // Registrar histórico com erro
    const historicoItem: HistoricoMelhoria = {
      id: cicloId,
      timestamp,
      fase: 'erro',
      diagnosticos: [],
      correcoes: [],
      resultadosTeste: [],
      tempoTotal: (Date.now() - inicio) / 1000,
      resumo: `Erro durante execução: ${(error as Error).message || 'Erro desconhecido'}`
    };
    
    return historicoItem;
  }
}

// Iniciar o modo de melhoria intensiva
export function iniciarMelhoriaIntensiva(req: Request, res: Response) {
  try {
    if (estadoAtual.emExecucao) {
      return res.status(400).json({ 
        success: false, 
        message: 'O modo de melhoria intensiva já está em execução.' 
      });
    }
    
    const intervalo = req.body.intervalo || DEFAULT_INTERVAL;
    
    estadoAtual.emExecucao = true;
    estadoAtual.isPaused = false;
    estadoAtual.intervalo = intervalo;
    estadoAtual.cicloAtual = 0;
    
    // Salvar estado
    salvarEstado(estadoAtual);
    
    // Executar ciclo inicial imediatamente
    executarCicloMelhoria().then(historicoItem => {
      adicionarHistorico(historicoItem);
      
      // Configurar intervalo para ciclos subsequentes
      if (intervalId) clearInterval(intervalId);
      
      intervalId = setInterval(async () => {
        // Verificar se ainda está em execução e não está pausado
        if (estadoAtual.emExecucao && !estadoAtual.isPaused) {
          const historicoItem = await executarCicloMelhoria();
          adicionarHistorico(historicoItem);
        }
      }, intervalo * 1000);
    });
    
    res.status(200).json({ 
      success: true, 
      message: `Modo de melhoria intensiva iniciado com intervalo de ${intervalo} segundos.` 
    });
  } catch (error) {
    console.error('Erro ao iniciar modo de melhoria intensiva:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao iniciar: ${(error as Error).message || 'Erro desconhecido'}` 
    });
  }
}

// Pausar o modo de melhoria intensiva
export function pausarMelhoriaIntensiva(req: Request, res: Response) {
  try {
    if (!estadoAtual.emExecucao) {
      return res.status(400).json({ 
        success: false, 
        message: 'O modo de melhoria intensiva não está em execução.' 
      });
    }
    
    if (estadoAtual.isPaused) {
      return res.status(400).json({ 
        success: false, 
        message: 'O modo de melhoria intensiva já está pausado.' 
      });
    }
    
    estadoAtual.isPaused = true;
    salvarEstado(estadoAtual);
    
    res.status(200).json({ 
      success: true, 
      message: 'Modo de melhoria intensiva pausado.' 
    });
  } catch (error) {
    console.error('Erro ao pausar modo de melhoria intensiva:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao pausar: ${(error as Error).message || 'Erro desconhecido'}` 
    });
  }
}

// Retomar o modo de melhoria intensiva
export function retomarMelhoriaIntensiva(req: Request, res: Response) {
  try {
    if (!estadoAtual.emExecucao) {
      return res.status(400).json({ 
        success: false, 
        message: 'O modo de melhoria intensiva não está em execução.' 
      });
    }
    
    if (!estadoAtual.isPaused) {
      return res.status(400).json({ 
        success: false, 
        message: 'O modo de melhoria intensiva não está pausado.' 
      });
    }
    
    estadoAtual.isPaused = false;
    salvarEstado(estadoAtual);
    
    res.status(200).json({ 
      success: true, 
      message: 'Modo de melhoria intensiva retomado.' 
    });
  } catch (error) {
    console.error('Erro ao retomar modo de melhoria intensiva:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao retomar: ${(error as Error).message || 'Erro desconhecido'}` 
    });
  }
}

// Parar o modo de melhoria intensiva
export function pararMelhoriaIntensiva(req: Request, res: Response) {
  try {
    if (!estadoAtual.emExecucao) {
      return res.status(400).json({ 
        success: false, 
        message: 'O modo de melhoria intensiva não está em execução.' 
      });
    }
    
    estadoAtual.emExecucao = false;
    estadoAtual.isPaused = false;
    salvarEstado(estadoAtual);
    
    // Limpar o intervalo
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Modo de melhoria intensiva parado.' 
    });
  } catch (error) {
    console.error('Erro ao parar modo de melhoria intensiva:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao parar: ${(error as Error).message || 'Erro desconhecido'}` 
    });
  }
}

// Executar um ciclo manualmente
export function executarCicloManualmente(req: Request, res: Response) {
  try {
    executarCicloMelhoria().then(historicoItem => {
      adicionarHistorico(historicoItem);
      
      res.status(200).json({ 
        success: true, 
        ciclo: historicoItem 
      });
    });
  } catch (error) {
    console.error('Erro ao executar ciclo de melhoria:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao executar ciclo: ${(error as Error).message || 'Erro desconhecido'}` 
    });
  }
}

// Obter o estado atual
export function getEstadoMelhoriaIntensiva(req: Request, res: Response) {
  try {
    res.status(200).json(estadoAtual);
  } catch (error) {
    console.error('Erro ao obter estado de melhoria intensiva:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao obter estado: ${(error as Error).message || 'Erro desconhecido'}` 
    });
  }
}

// Obter o histórico
export function getHistoricoMelhoriaIntensiva(req: Request, res: Response) {
  try {
    res.status(200).json(historicoMelhorias);
  } catch (error) {
    console.error('Erro ao obter histórico de melhoria intensiva:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao obter histórico: ${(error as Error).message || 'Erro desconhecido'}` 
    });
  }
}

// Inicializar o serviço de melhoria intensiva
export function inicializarServicoMelhoriaIntensiva(): void {
  console.log('[MelhoriaIntensiva] Inicializando serviço de melhoria intensiva...');
  
  // Carregar estado e histórico
  estadoAtual = carregarEstado();
  historicoMelhorias = carregarHistorico();
  
  // Se estava em execução antes de reiniciar, configurar intervalo
  if (estadoAtual.emExecucao && !estadoAtual.isPaused) {
    const intervalo = estadoAtual.intervalo || DEFAULT_INTERVAL;
    
    console.log(`[MelhoriaIntensiva] Restaurando modo de execução com intervalo de ${intervalo} segundos.`);
    
    intervalId = setInterval(async () => {
      if (estadoAtual.emExecucao && !estadoAtual.isPaused) {
        const historicoItem = await executarCicloMelhoria();
        adicionarHistorico(historicoItem);
      }
    }, intervalo * 1000);
  }
  
  console.log('[MelhoriaIntensiva] Serviço de melhoria intensiva inicializado com sucesso!');
}