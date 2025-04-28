/**
 * Testes automatizados para API do Multi-Agent System
 * 
 * Este script executa testes contra a API do sistema multi-agente
 * para verificar o comportamento e a estabilidade do sistema.
 */

import fetch from 'node-fetch';
import assert from 'assert';

// URL base para os testes (altere se necessário)
const BASE_URL = 'http://localhost:5000';

// Configurações
const NUM_TESTS = 20;
const TASKS_PER_TEST = 3;
const TEST_TIMEOUT = 30000; // 30 segundos para cada teste

// Array para armazenar IDs de tarefas criadas (para limpeza)
const createdTaskIds = [];

/**
 * Wrapper de teste com timeout
 */
async function runWithTimeout(testFn, timeout) {
  return Promise.race([
    testFn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

/**
 * Helper para verificar se um erro HTTP ocorreu
 */
function checkForHttpError(response) {
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  return response;
}

/**
 * Cria uma nova tarefa
 */
async function createTask(title, description, businessType = 'both') {
  const response = await fetch(`${BASE_URL}/api/multi-agent/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description,
      context: {
        businessType,
        additionalContext: 'Este é um teste automatizado.'
      }
    }),
  }).then(checkForHttpError);

  const data = await response.json();
  console.log(`Tarefa criada: ${data.id} - ${data.title}`);
  createdTaskIds.push(data.id);
  return data;
}

/**
 * Obtém uma tarefa específica
 */
async function getTask(taskId) {
  const response = await fetch(`${BASE_URL}/api/multi-agent/tasks/${taskId}`)
    .then(checkForHttpError);
  
  return response.json();
}

/**
 * Lista todas as tarefas
 */
async function listTasks() {
  const response = await fetch(`${BASE_URL}/api/multi-agent/tasks`)
    .then(checkForHttpError);
  
  return response.json();
}

/**
 * Submete input do usuário para uma etapa
 */
async function submitUserInput(taskId, stepId, input) {
  const response = await fetch(`${BASE_URL}/api/multi-agent/tasks/${taskId}/steps/${stepId}/input`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  }).then(checkForHttpError);

  return response.json();
}

/**
 * Teste: Criar uma nova tarefa e verificar se ela foi criada corretamente
 */
async function testCreateTask() {
  console.log('Teste: Criar uma nova tarefa');
  
  const title = `Teste ${Date.now()}`;
  const description = 'Esta é uma tarefa de teste criada automaticamente.';
  
  const task = await createTask(title, description);
  
  assert.strictEqual(task.title, title);
  assert.strictEqual(task.description, description);
  assert.ok(task.id);
  
  console.log('✅ Teste de criação de tarefa concluído com sucesso!');
  return task;
}

/**
 * Teste: Obter uma tarefa específica
 */
async function testGetTask(taskId) {
  console.log(`Teste: Obter tarefa ${taskId}`);
  
  const task = await getTask(taskId);
  
  assert.strictEqual(task.id, taskId);
  assert.ok(task.title);
  assert.ok(task.description);
  
  console.log('✅ Teste de obtenção de tarefa concluído com sucesso!');
  return task;
}

/**
 * Teste: Listar todas as tarefas
 */
async function testListTasks() {
  console.log('Teste: Listar tarefas');
  
  const tasks = await listTasks();
  
  assert.ok(Array.isArray(tasks));
  
  console.log(`Tarefas encontradas: ${tasks.length}`);
  console.log('✅ Teste de listagem de tarefas concluído com sucesso!');
  return tasks;
}

/**
 * Executa uma série de testes contra a API
 */
async function runTests() {
  console.log('Iniciando testes do sistema multi-agente...');
  
  // Teste 1: Listar tarefas iniciais
  await runWithTimeout(() => testListTasks(), TEST_TIMEOUT);
  
  // Execute vários testes em sequência
  for (let i = 0; i < NUM_TESTS; i++) {
    console.log(`\n===== Iniciando teste ${i + 1} de ${NUM_TESTS} =====\n`);
    
    // Cria tarefas para o teste atual
    const tasks = [];
    for (let j = 0; j < TASKS_PER_TEST; j++) {
      const taskTitle = `Teste ${i + 1}.${j + 1} - ${Date.now()}`;
      const taskDesc = `Descrição do teste ${i + 1}.${j + 1} criado em ${new Date().toISOString()}`;
      
      // Alterna tipos de negócio para variedade
      const businessType = ['transport', 'farm', 'both'][j % 3];
      
      try {
        const task = await runWithTimeout(
          () => createTask(taskTitle, taskDesc, businessType),
          TEST_TIMEOUT
        );
        tasks.push(task);
      } catch (error) {
        console.error(`❌ Erro ao criar tarefa #${j + 1} no teste ${i + 1}:`, error);
      }
    }
    
    // Testa obtenção das tarefas criadas
    for (const task of tasks) {
      try {
        await runWithTimeout(() => testGetTask(task.id), TEST_TIMEOUT);
      } catch (error) {
        console.error(`❌ Erro ao obter tarefa ${task.id}:`, error);
      }
    }
    
    // Testa listagem de tarefas (deve incluir as novas)
    try {
      await runWithTimeout(() => testListTasks(), TEST_TIMEOUT);
    } catch (error) {
      console.error('❌ Erro ao listar tarefas:', error);
    }
    
    console.log(`\n===== Teste ${i + 1} concluído =====\n`);
  }
  
  console.log('\n===== Todos os testes foram concluídos! =====\n');
  
  // Exibe estatísticas
  console.log(`Total de tarefas criadas: ${createdTaskIds.length}`);
  
  // Poderia implementar uma limpeza se necessário
  // console.log('Limpando tarefas de teste...');
  // for (const taskId of createdTaskIds) {
  //   try {
  //     await fetch(`${BASE_URL}/api/multi-agent/tasks/${taskId}`, { method: 'DELETE' });
  //   } catch (error) {
  //     console.error(`Erro ao excluir tarefa ${taskId}:`, error);
  //   }
  // }
}

// Execute os testes
runTests().catch(error => {
  console.error('Erro ao executar testes:', error);
  process.exit(1);
});