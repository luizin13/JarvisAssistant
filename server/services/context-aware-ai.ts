/**
 * Context-Aware AI Service
 * 
 * Este serviço especializado fornece respostas de IA mais personalizadas
 * com base no contexto do usuário, suas preferências, histórico de interações
 * e feedback anterior. Usado para gerar comentários, análises e sugestões
 * mais relevantes e específicas ao contexto do negócio.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Request } from 'express';

// Configuração das APIs
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Opções para geração de análises contextuais
 */
export interface ContextAwareOptions {
  businessContext?: 'transport' | 'farm' | 'both' | 'personal';
  userMemory?: string;
  analysisType?: 'news_impact' | 'business_suggestion' | 'comment' | 'personal_advice';
  depth?: 'detailed' | 'concise' | 'comprehensive';
  tone?: 'professional' | 'casual' | 'educational' | 'motivational';
  focusAreas?: string[];
  includeActionItems?: boolean;
  maxLength?: number;
  previousResponses?: string[];
  modelPreference?: 'openai' | 'anthropic' | 'auto';
}

/**
 * Padrões para opções
 */
const defaultOptions: ContextAwareOptions = {
  analysisType: 'news_impact',
  depth: 'concise',
  tone: 'professional',
  includeActionItems: true,
  maxLength: 300,
  modelPreference: 'auto'
};

/**
 * Gera uma análise sensível ao contexto para uma notícia
 */
export async function generateContextualNewsAnalysis(
  newsTitle: string,
  newsContent: string,
  options: ContextAwareOptions = {}
): Promise<string> {
  // Mescla opções padrão com as fornecidas
  const mergedOptions: ContextAwareOptions = { ...defaultOptions, ...options };
  
  // Constrói o prompt com base no contexto
  let systemPrompt = `Você é um assistente especializado em análise de negócios, focado em ${getBusinessContext(mergedOptions.businessContext)}.
Seu objetivo é fornecer uma análise ${mergedOptions.depth} sobre o impacto desta notícia no contexto do usuário.

${mergedOptions.userMemory ? `INFORMAÇÕES DE CONTEXTO DO USUÁRIO:\n${mergedOptions.userMemory}\n\n` : ''}

DIRETRIZES:
- Use um tom ${mergedOptions.tone}
- Seja específico e prático, evite generalidades
- Foque nas implicações diretas para ${getBusinessContext(mergedOptions.businessContext)}
- Analise com profundidade ${mergedOptions.depth === 'detailed' ? 'todos os aspectos relevantes' : mergedOptions.depth === 'comprehensive' ? 'as principais dimensões' : 'o ponto mais importante'}
${mergedOptions.focusAreas ? `- Dê atenção especial a: ${mergedOptions.focusAreas.join(', ')}` : ''}
${mergedOptions.includeActionItems ? '- Inclua de 1-3 ações práticas e específicas que o usuário poderia tomar' : ''}
- Responda em português do Brasil, como se estivesse conversando diretamente com o proprietário do negócio
- Mantenha a resposta com no máximo ${mergedOptions.maxLength} caracteres

EVITE:
- Generalidades como "essa notícia é interessante" ou "isso pode impactar seu negócio"
- Repetir informações óbvias da notícia
- Usar linguagem excessivamente formal ou técnica
- Apresentar dados sem fontes confiáveis
`;

  let userPrompt = `NOTÍCIA: ${newsTitle}

CONTEÚDO: ${newsContent}

Forneça uma análise ${mergedOptions.depth} sobre o impacto desta notícia para ${getBusinessContext(mergedOptions.businessContext)}, considerando o contexto do usuário.`;

  // Escolhe a API com base na preferência e disponibilidade
  return await generateAIResponse(systemPrompt, userPrompt, mergedOptions);
}

/**
 * Gera um comentário contextualizado para uma notícia
 */
export async function generateContextualComment(
  newsTitle: string,
  newsContent: string,
  options: ContextAwareOptions = {}
): Promise<string> {
  // Configura opções para comentários
  const commentOptions: ContextAwareOptions = {
    ...defaultOptions,
    analysisType: 'comment',
    depth: 'concise',
    maxLength: 250,
    ...options
  };
  
  // Constrói o prompt para comentário
  let systemPrompt = `Você é um especialista em ${getBusinessContext(commentOptions.businessContext)} gerando um comentário insightful em uma notícia.
Seu comentário deve parecer como se fosse escrito por um especialista real da área, não por uma IA.

${commentOptions.userMemory ? `CONTEXTO DO USUÁRIO:\n${commentOptions.userMemory}\n\n` : ''}

DIRETRIZES:
- Escreva em primeira pessoa, como um especialista real que está comentando na notícia
- Adicione uma perspectiva única ou insight não óbvio
- Use um tom ${commentOptions.tone} e conversacional, típico de comentários em redes sociais
- Seja conciso mas impactante
- Responda em português do Brasil
- Ocasionalmente (30% das vezes) inclua uma pergunta retórica ou convite à reflexão
- Enfatize potenciais oportunidades ou riscos relacionados a ${getBusinessContext(commentOptions.businessContext)}
- Limite o comentário a ${commentOptions.maxLength} caracteres

EVITE:
- Iniciar com "Como especialista em..."
- Soar como um texto genérico ou de IA
- Comentários vagos ou óbvios
- Tom excessivamente formal
`;

  let userPrompt = `NOTÍCIA: ${newsTitle}

RESUMO: ${newsContent?.substring(0, 300)}...

Gere um comentário insightful para esta notícia, como se fosse um especialista real em ${getBusinessContext(commentOptions.businessContext)} comentando em uma rede social.`;

  return await generateAIResponse(systemPrompt, userPrompt, commentOptions);
}

/**
 * Gera sugestões de negócios contextualizadas
 */
export async function generateContextualBusinessSuggestion(
  businessType: 'transport' | 'farm' | 'both',
  currentChallenges: string,
  options: ContextAwareOptions = {}
): Promise<string> {
  // Configura opções para sugestões de negócios
  const suggestionOptions: ContextAwareOptions = {
    ...defaultOptions,
    businessContext: businessType,
    analysisType: 'business_suggestion',
    depth: 'detailed',
    includeActionItems: true,
    maxLength: 500,
    ...options
  };
  
  // Constrói o prompt para sugestões
  let systemPrompt = `Você é um consultor de negócios especializado em ${getBusinessContext(suggestionOptions.businessContext)}.
Sua tarefa é gerar sugestões estratégicas altamente personalizadas com base no contexto do usuário.

${suggestionOptions.userMemory ? `CONTEXTO DO USUÁRIO:\n${suggestionOptions.userMemory}\n\n` : ''}

DIRETRIZES:
- Forneça sugestões específicas, viáveis e orientadas a resultados
- Base suas recomendações nas melhores práticas do setor de ${getBusinessContext(suggestionOptions.businessContext)}
- Considere o contexto único do usuário e seus desafios atuais
- Use tom ${suggestionOptions.tone}
- Inclua uma análise clara de custo-benefício para cada sugestão
- Priorize sugestões com maior ROI e implementação mais viável
- Seja específico sobre como implementar cada sugestão
- Forneça exemplos concretos de empresas semelhantes que implementaram com sucesso (quando aplicável)
- Responda em português do Brasil

ESTRUTURA DA RESPOSTA:
1. Análise concisa da situação atual (2-3 sentenças)
2. 2-3 sugestões estratégicas específicas, cada uma com:
   - Descrição clara
   - Benefícios específicos esperados
   - Desafios potenciais de implementação
   - Passos de implementação concretos
3. Conclusão com uma perspectiva de longo prazo (1-2 sentenças)
`;

  let userPrompt = `TIPO DE NEGÓCIO: ${getBusinessContext(suggestionOptions.businessContext)}

DESAFIOS ATUAIS: ${currentChallenges}

Gere sugestões estratégicas personalizadas que ajudariam este negócio a superar os desafios mencionados e aproveitar novas oportunidades, considerando o contexto específico do usuário.`;

  return await generateAIResponse(systemPrompt, userPrompt, suggestionOptions);
}

/**
 * Gera conselhos pessoais contextualizados
 */
export async function generatePersonalAdvice(
  situation: string,
  goal: string,
  options: ContextAwareOptions = {}
): Promise<string> {
  // Configura opções para conselhos pessoais
  const adviceOptions: ContextAwareOptions = {
    ...defaultOptions,
    businessContext: 'personal',
    analysisType: 'personal_advice',
    depth: 'comprehensive',
    tone: 'motivational',
    includeActionItems: true,
    maxLength: 400,
    ...options
  };
  
  // Constrói o prompt para conselhos pessoais
  let systemPrompt = `Você é um coach pessoal e de carreira experiente.
Sua tarefa é fornecer conselhos personalizados que ajudem o usuário a atingir seus objetivos.

${adviceOptions.userMemory ? `CONTEXTO DO USUÁRIO:\n${adviceOptions.userMemory}\n\n` : ''}

DIRETRIZES:
- Forneça conselhos personalizados baseados na situação específica do usuário
- Use um tom ${adviceOptions.tone} e encorajador, mas realista
- Equilibre ambição com passos práticos e alcançáveis
- Considere o bem-estar geral e equilíbrio vida-trabalho
- Baseie seus conselhos em psicologia positiva e ciência comportamental
- Adapte recomendações ao contexto cultural brasileiro
- Responda em português do Brasil
- Seja específico sobre como implementar cada conselho
- Inclua 1-3 ações imediatas e específicas que possam ser implementadas hoje ou esta semana
- Limite a resposta a ${adviceOptions.maxLength} caracteres

ESTRUTURA DA RESPOSTA:
1. Breve validação da situação atual (1-2 sentenças)
2. Perspectiva construtiva sobre o desafio/objetivo
3. 2-3 conselhos específicos com passos detalhados
4. Uma nota motivacional para concluir
`;

  let userPrompt = `SITUAÇÃO ATUAL: ${situation}

OBJETIVO: ${goal}

Forneça conselhos personalizados que ajudem a atingir este objetivo, considerando a situação atual e o contexto específico.`;

  return await generateAIResponse(systemPrompt, userPrompt, adviceOptions);
}

/**
 * Função central para gerar respostas de IA usando a API preferida
 */
async function generateAIResponse(
  systemPrompt: string,
  userPrompt: string,
  options: ContextAwareOptions
): Promise<string> {
  // Determina qual modelo usar
  const modelToUse = determineModelToUse(options.modelPreference);
  
  try {
    // Usa OpenAI
    if (modelToUse === 'openai') {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: Math.ceil(options.maxLength ? options.maxLength / 2 : 500),
      });

      return completion.choices[0].message.content || "Não foi possível gerar uma análise neste momento.";
    } 
    // Usa Anthropic
    else if (modelToUse === 'anthropic') {
      const message = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025. Do not change this unless explicitly requested by the user.
        max_tokens: Math.ceil(options.maxLength ? options.maxLength / 2 : 500),
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt,
      });

      // Verifica se há conteúdo na resposta e se é do tipo texto
      if (message.content && message.content.length > 0 && message.content[0].type === 'text') {
        return message.content[0].text;
      }
      
      return "Não foi possível gerar uma resposta neste momento.";
    }
  } catch (error) {
    console.error('Erro ao gerar resposta de IA:', error);
    return "Não foi possível gerar uma análise neste momento devido a um erro no serviço.";
  }
}

/**
 * Determina qual modelo usar com base na preferência e disponibilidade
 */
function determineModelToUse(preference: string = 'auto'): 'openai' | 'anthropic' {
  // Se uma preferência específica foi definida e a API está disponível, use-a
  if (preference === 'openai' && process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  
  if (preference === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  
  // Caso contrário, use o que estiver disponível
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  
  // Padrão para OpenAI se ambos estiverem disponíveis
  return 'openai';
}

/**
 * Formata o contexto de negócio para uso nos prompts
 */
function getBusinessContext(context?: string): string {
  switch(context) {
    case 'transport': 
      return 'empresas de transporte e logística';
    case 'farm': 
      return 'agronegócio e fazendas';
    case 'both': 
      return 'empresas de transporte e agronegócio';
    case 'personal': 
      return 'desenvolvimento pessoal e profissional';
    default: 
      return 'negócios diversos';
  }
}

/**
 * Extrai o contexto do usuário da requisição
 */
export function extractUserContextFromRequest(req: Request): ContextAwareOptions {
  const options: ContextAwareOptions = {};
  
  // Extrai contexto do corpo da requisição
  if (req.body) {
    if (req.body.businessContext) {
      options.businessContext = req.body.businessContext;
    }
    
    if (req.body.userMemory) {
      options.userMemory = req.body.userMemory;
    }
    
    if (req.body.depth) {
      options.depth = req.body.depth;
    }
    
    if (req.body.tone) {
      options.tone = req.body.tone;
    }
    
    if (req.body.focusAreas && Array.isArray(req.body.focusAreas)) {
      options.focusAreas = req.body.focusAreas;
    }
    
    if (req.body.includeActionItems !== undefined) {
      options.includeActionItems = req.body.includeActionItems;
    }
    
    if (req.body.maxLength) {
      options.maxLength = req.body.maxLength;
    }
    
    if (req.body.modelPreference) {
      options.modelPreference = req.body.modelPreference;
    }
  }
  
  return options;
}