/**
 * 📦 Caixa de Comando Inteligente - GPT-Agent-Alpha x Luiz
 * ✅ Executa comandos pendentes direto no Replit via bot interno
 */

import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// Obtendo caminho do diretório atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMANDO_PATH = path.join(process.cwd(), 'comandos-pendentes.json');

interface ComandoPendente {
  tipo: string;
  conteudo: string;
  contexto?: string;
  prioridade?: string;
  origem?: string;
}

/**
 * Lê comandos do arquivo comandos-pendentes.json
 */
function lerComandosPendentes(): ComandoPendente[] {
  try {
    // Criar arquivo se não existir
    if (!fs.existsSync(COMANDO_PATH)) {
      fs.writeFileSync(COMANDO_PATH, '[]', 'utf8');
      return [];
    }
    
    const comandosJson = fs.readFileSync(COMANDO_PATH, 'utf8');
    return JSON.parse(comandosJson);
  } catch (error) {
    console.error('Erro ao ler comandos pendentes:', error);
    return [];
  }
}

/**
 * Apaga os comandos executados
 */
function limparComandosPendentes(): void {
  try {
    fs.writeFileSync(COMANDO_PATH, '[]', 'utf8');
    console.log('📦 Comandos pendentes apagados com sucesso');
  } catch (error) {
    console.error('Erro ao limpar comandos pendentes:', error);
  }
}

/**
 * Adiciona um novo comando à lista
 */
function adicionarComando(comando: ComandoPendente): void {
  try {
    const comandos = lerComandosPendentes();
    comandos.push(comando);
    fs.writeFileSync(COMANDO_PATH, JSON.stringify(comandos, null, 2), 'utf8');
    console.log('📦 Novo comando adicionado com sucesso');
  } catch (error) {
    console.error('Erro ao adicionar comando:', error);
  }
}

/**
 * Executa cada comando pendente via bot
 */
async function executarComandos(): Promise<{ executados: number, erros: number }> {
  try {
    const comandos = lerComandosPendentes();
    
    if (comandos.length === 0) {
      return { executados: 0, erros: 0 };
    }
    
    let executados = 0;
    let erros = 0;
    
    for (const comando of comandos) {
      try {
        // Fazer chamada para o GPT-Agent-Alpha executar o comando (usando a mesma porta do servidor)
        const response = await fetch('http://localhost:5000/api/bot-gpt-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer luiz2024legadoimparavel'
          },
          body: JSON.stringify(comando)
        });
        
        if (response.ok) {
          console.log(`📦 Comando executado com sucesso: ${comando.tipo} - ${comando.conteudo.substring(0, 30)}...`);
          executados++;
        } else {
          console.error(`📦 Erro ao executar comando: ${await response.text()}`);
          erros++;
        }
      } catch (error) {
        console.error('📦 Erro ao executar comando:', error);
        erros++;
      }
    }
    
    // Limpar comandos após execução
    limparComandosPendentes();
    
    return { executados, erros };
  } catch (error) {
    console.error('Erro ao executar comandos:', error);
    return { executados: 0, erros: 1 };
  }
}

// Rota para executar comandos pendentes
router.post('/executar-comandos', async (_req: Request, res: Response) => {
  try {
    const resultado = await executarComandos();
    
    res.json({
      status: 'sucesso',
      mensagem: `${resultado.executados} comandos executados com sucesso. ${resultado.erros} erros.`,
      detalhes: resultado
    });
  } catch (error) {
    console.error('Erro ao processar requisição de execução de comandos:', error);
    res.status(500).json({
      status: 'erro',
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Rota para adicionar um comando
router.post('/adicionar-comando', async (req: Request, res: Response) => {
  try {
    const comando: ComandoPendente = req.body;
    
    if (!comando.tipo || !comando.conteudo) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Comando inválido. Forneça tipo e conteúdo.'
      });
    }
    
    adicionarComando(comando);
    
    res.json({
      status: 'sucesso',
      mensagem: 'Comando adicionado à fila com sucesso',
      comando
    });
  } catch (error) {
    console.error('Erro ao adicionar comando:', error);
    res.status(500).json({
      status: 'erro',
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Rota para listar comandos pendentes
router.get('/comandos-pendentes', (_req: Request, res: Response) => {
  try {
    const comandos = lerComandosPendentes();
    
    res.json({
      status: 'sucesso',
      total: comandos.length,
      comandos
    });
  } catch (error) {
    console.error('Erro ao listar comandos pendentes:', error);
    res.status(500).json({
      status: 'erro',
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

export default router;