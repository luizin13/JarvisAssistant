/**
 * Utilitário para preparar texto para síntese de voz
 * 
 * Este módulo contém funções para melhorar a qualidade da pronúncia
 * em sistemas de Text-to-Speech, especialmente para português brasileiro.
 */

// Mapeamento de siglas comuns para sua forma falada
const SIGLAS_MAP: Record<string, string> = {
  "CEO": "ciíô",
  "CFO": "ciéfi ô",
  "COO": "ciôô",
  "CTO": "citêô",
  "CPF": "cêpêéfi",
  "CNPJ": "cêênêpêjóta",
  "ERP": "êrrêpê",
  "CRM": "cêêrrêémi",
  "BI": "bií",
  "KPI": "kápíái",
  "ROI": "ârroái",
  "P&L": "pêânéli",
  "TI": "tê í",
  "IoT": "aiôtê",
  "API": "êipíái",
  "GPS": "gêpêéci",
  "PIB": "píbi",
  "TPS": "têpêéssi",
  "RH": "êrriága",
  "PLR": "pêélêérri",
  "PDF": "pêdêéfi",
  "URL": "úrrél",
  "HTML": "agátêémêéli",
  "CSS": "cêésséss",
  "SQL": "êsquiuél",
  "SaaS": "sáss",
  "PaaS": "páss",
  "IaaS": "iáss",
  "AI": "êí",
  "IA": "ií",
  "ML": "êmélli",
  "AWS": "êdábliuéss",
  "GCP": "gêcêpê",
  "MVP": "êmêvêpê",
  "OKR": "ôkêérri",
  "SLA": "êsséllêá",
  "etc": "et cetera",
  "R$": "reais",
  "USD": "dólares",
  "€": "euros",
  "£": "libras",
  "¥": "ienes",
  "IBAMA": "ibama",
  "IBGE": "ibegê",
  "INSS": "iiênêéssêéssi",
  "FGTS": "êfêgêtêéssê",
  "NFe": "nota fiscal eletrônica",
  "NF-e": "nota fiscal eletrônica",
  "NFC-e": "nota fiscal de consumidor eletrônica",
  "CTe": "conhecimento de transporte eletrônico",
  "CT-e": "conhecimento de transporte eletrônico",
  "MDFe": "manifesto de documentos fiscais eletrônico",
  "MDF-e": "manifesto de documentos fiscais eletrônico",
  "SPED": "sistema público de escrituração digital",
  "DANFE": "danfê",
  "ICMS": "ícêémêéssi",
  "IPI": "ipí",
  "ISS": "ísséssê",
  "COFINS": "côfins",
  "PIS": "pís",
  "CSLL": "cêéssêéllêéllê",
  "IRPJ": "írrapêjota",
  "IRPF": "írrapêéfi",
  "ISSQN": "ísséssêquêéne",
  "IPTU": "ipetú",
  "IPVA": "ipevá",
  "DETRAN": "detran",
  "CONTRAN": "contran",
  "ANTT": "antetê",
  "DUT": "dêutê",
  "CRLV": "cêérrêéllevê",
  "CNH": "cêénêága",
  "MEI": "mei",
  "SIMPLES": "simples",
  "BNDES": "bêênedêéssi",
  "PIX": "pix",
  "TED": "tede",
  "DOC": "doque",
  "IOF": "iôéfi",
  "CDI": "cêdêí",
  "SELIC": "sélique",
  "PGBL": "pêgêbêéli",
  "VGBL": "vêgêbêéli",
  "CDB": "cêdêbê",
  "LCI": "éli cê í",
  "LCA": "éli cê á",
  "LTI": "êli tê í",
  "LTA": "êli tê á",
  "CRI": "cêérri í",
  "CRA": "cêérri á",
  "FII": "êfi í í",
  "FIAGRO": "fiágro",
};

// Expressões regulares para identificar padrões específicos
const NUMBER_REGEX = /\b\d+(?:[\.,]\d+)?(?:\s?(?:%|porcento|por cento))?\b/g;
const DATE_REGEX = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g;
const TIME_REGEX = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URL_REGEX = /\bhttps?:\/\/[^\s]+\b/g;
const ACRONYM_REGEX = /\b[A-Z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+?55)?\s?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/g;
const MONEY_REGEX = /\b(?:R\$|USD|€|£|¥)\s?\d+(?:[\.,]\d+)?\b/g;
const DOCUMENT_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/g; // CPF
const CNPJ_REGEX = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const MIXED_CASE_ACRONYM_REGEX = /\b(?:[A-Z][a-z]*){2,}\b/g; // Detecta acrônimos em CamelCase
const HYPHENATED_WORDS_REGEX = /\b\w+(?:-\w+)+\b/g; // Palavras com hífen

/**
 * Sanitiza um texto para melhorar a pronúncia em sistemas TTS
 * 
 * @param text Texto original a ser sanitizado
 * @returns Texto processado para melhor pronúncia
 */
export function sanitizeTextForSpeech(text: string): string {
  if (!text) return text;

  let processedText = text;
  
  // Substitui URLs por descrição genérica
  processedText = processedText.replace(URL_REGEX, 'link do website');
  
  // Substitui emails por descrição genérica
  processedText = processedText.replace(EMAIL_REGEX, 'endereço de email');
  
  // Formata valores monetários para leitura natural
  processedText = processedText.replace(MONEY_REGEX, (match) => {
    // Extrai o valor numérico
    const value = match.replace(/[^\d,\.]/g, '');
    
    // Identifica a moeda
    if (match.includes('R$')) {
      return `${value} reais`;
    } else if (match.includes('USD')) {
      return `${value} dólares`;
    } else if (match.includes('€')) {
      return `${value} euros`;
    } else if (match.includes('£')) {
      return `${value} libras`;
    } else if (match.includes('¥')) {
      return `${value} ienes`;
    }
    
    return match;
  });
  
  // Formata números para leitura natural
  processedText = processedText.replace(NUMBER_REGEX, (match) => {
    // Limpa o número de caracteres não numéricos
    const cleanedNumber = match.replace(/[^\d,\.]/g, '');
    
    // Verifica se é porcentagem
    if (match.includes('%') || match.includes('porcento') || match.includes('por cento')) {
      return cleanedNumber + ' por cento';
    }
    
    return cleanedNumber;
  });
  
  // Formata números de telefone para leitura natural
  processedText = processedText.replace(PHONE_REGEX, (match) => {
    // Remove caracteres não numéricos
    const cleanNumber = match.replace(/[^\d]/g, '');
    
    // Formata de acordo com o comprimento
    if (cleanNumber.length === 8) {
      // Telefone fixo local: XXXX-XXXX
      return `${cleanNumber.substring(0, 4)} ${cleanNumber.substring(4)}`;
    } else if (cleanNumber.length === 9) {
      // Celular local: 9XXXX-XXXX
      return `${cleanNumber.substring(0, 5)} ${cleanNumber.substring(5)}`;
    } else if (cleanNumber.length === 10) {
      // Telefone fixo com DDD: (XX)XXXX-XXXX
      return `${cleanNumber.substring(0, 2)} ${cleanNumber.substring(2, 6)} ${cleanNumber.substring(6)}`;
    } else if (cleanNumber.length === 11) {
      // Celular com DDD: (XX)9XXXX-XXXX
      return `${cleanNumber.substring(0, 2)} ${cleanNumber.substring(2, 7)} ${cleanNumber.substring(7)}`;
    }
    
    // Retorna o número formatado com espaços a cada 2 dígitos para facilitar a pronúncia
    return cleanNumber.match(/.{1,2}/g)?.join(' ') || cleanNumber;
  });
  
  // Formata documentos (CPF) para leitura natural
  processedText = processedText.replace(DOCUMENT_REGEX, (match) => {
    // Remove caracteres não numéricos
    const cleanDoc = match.replace(/[^\d]/g, '');
    
    // Formata CPF com espaços
    return `${cleanDoc.substring(0, 3)} ${cleanDoc.substring(3, 6)} ${cleanDoc.substring(6, 9)} ${cleanDoc.substring(9)}`;
  });
  
  // Formata CNPJ para leitura natural
  processedText = processedText.replace(CNPJ_REGEX, (match) => {
    // Remove caracteres não numéricos
    const cleanDoc = match.replace(/[^\d]/g, '');
    
    // Formata CNPJ com espaços
    return `${cleanDoc.substring(0, 2)} ${cleanDoc.substring(2, 5)} ${cleanDoc.substring(5, 8)} ${cleanDoc.substring(8, 12)} ${cleanDoc.substring(12)}`;
  });
  
  // Formata datas para leitura natural
  processedText = processedText.replace(DATE_REGEX, (match) => {
    const parts = match.split('/');
    return `${parts[0]} do ${parts[1]}${parts[2] ? ` de ${parts[2]}` : ''}`;
  });
  
  // Formata horas para leitura natural
  processedText = processedText.replace(TIME_REGEX, (match) => {
    const parts = match.split(':');
    if (parts[0] === '00' || parts[0] === '0') {
      return `meia noite${parts[1] !== '00' ? ` e ${parts[1]} minutos` : ''}`;
    } else if (parts[0] === '12') {
      return `meio dia${parts[1] !== '00' ? ` e ${parts[1]} minutos` : ''}`;
    } else if (parseInt(parts[0]) > 12) {
      return `${parseInt(parts[0]) - 12} horas da tarde${parts[1] !== '00' ? ` e ${parts[1]} minutos` : ''}`;
    } else {
      return `${parts[0]} horas${parts[1] !== '00' ? ` e ${parts[1]} minutos` : ''}`;
    }
  });
  
  // Melhora pronúncia de palavras com hífen
  processedText = processedText.replace(HYPHENATED_WORDS_REGEX, (match) => {
    return match.replace(/-/g, ' ');
  });
  
  // Substitui siglas e acrônimos por suas pronúncias
  processedText = processedText.replace(ACRONYM_REGEX, (match) => {
    return SIGLAS_MAP[match] || match;
  });
  
  // Substitui acrônimos em CamelCase por sua pronúncia
  processedText = processedText.replace(MIXED_CASE_ACRONYM_REGEX, (match) => {
    // Verifica se é um acrônimo em CamelCase como NomeProduto
    if (match.match(/^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/)) {
      // Separa as palavras com espaço para melhor pronúncia
      return match.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    return match;
  });
  
  // Adiciona pausa natural após pontuação
  processedText = processedText
    .replace(/\.\s+/g, '. ')
    .replace(/!\s+/g, '! ')
    .replace(/\?\s+/g, '? ')
    .replace(/:\s+/g, ': ')
    .replace(/;\s+/g, '; ');

  // Remove caracteres problemáticos
  processedText = processedText
    .replace(/\*/g, '')
    .replace(/\_/g, '')
    .replace(/\~\~/g, '')
    .replace(/\\n/g, '. ')
    .replace(/\s+/g, ' ');
    
  // Quebra sentenças muito longas para melhorar a entonação
  if (processedText.length > 150) {
    const sentences = processedText.split(/[.!?]/);
    processedText = sentences.join('. ');
  }
  
  return processedText.trim();
}

/**
 * Sistema de cache para mensagens TTS
 * Evita solicitações repetidas para o mesmo texto
 */
export class TTSCacheManager {
  private static instance: TTSCacheManager;
  private cache: Map<string, string> = new Map(); // chave: hash do texto, valor: URL do áudio
  private readonly MAX_CACHE_SIZE = 50; // Limita o tamanho do cache para evitar uso excessivo de memória

  private constructor() {}

  public static getInstance(): TTSCacheManager {
    if (!TTSCacheManager.instance) {
      TTSCacheManager.instance = new TTSCacheManager();
    }
    return TTSCacheManager.instance;
  }

  /**
   * Gera uma chave de cache baseada no texto e nas configurações de voz
   */
  private generateCacheKey(text: string, voiceConfig: Record<string, any>): string {
    // Simplifica pegando apenas os primeiros 100 caracteres + hash básico dos parâmetros
    const textPrefix = text.substring(0, 100);
    const configString = JSON.stringify(voiceConfig);
    return `${textPrefix}_${this.simpleHash(configString)}`;
  }

  /**
   * Função de hash simples para gerar chaves de cache
   */
  private simpleHash(str: string): string {
    if (!str) return '0';
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converte para 32bit integer
    }
    return hash.toString(16); // Converte para string em base 16 (hex)
  }

  /**
   * Adiciona um item ao cache
   */
  public addToCache(text: string, voiceConfig: Record<string, any>, audioUrl: string): void {
    const key = this.generateCacheKey(text, voiceConfig);
    
    // Se o cache estiver cheio, remove o item mais antigo
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Pega a primeira chave do cache (mais antiga)
      for (const key of this.cache.keys()) {
        this.cache.delete(key);
        break; // Remove apenas o primeiro item
      }
    }
    
    this.cache.set(key, audioUrl);
    console.log(`[TTSCache] Adicionado à cache: ${key.substring(0, 20)}...`);
  }

  /**
   * Busca um item no cache
   * @returns URL do áudio ou undefined se não encontrado
   */
  public getFromCache(text: string, voiceConfig: Record<string, any>): string | undefined {
    const key = this.generateCacheKey(text, voiceConfig);
    const cachedUrl = this.cache.get(key);
    
    if (cachedUrl) {
      console.log(`[TTSCache] Hit de cache: ${key.substring(0, 20)}...`);
    }
    
    return cachedUrl;
  }

  /**
   * Limpa todo o cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('[TTSCache] Cache limpo');
  }
}

// Exporta a instância única do cache
export const ttsCache = TTSCacheManager.getInstance();