/**
 * Privacy Manager
 * 
 * Este módulo gerencia a privacidade dos dados do usuário no assistente.
 * Implementa recursos como:
 * - Criptografia local de dados sensíveis
 * - Controle de quais informações são compartilhadas com APIs externas
 * - Mascaramento automático de informações pessoais
 * - Configurações de retenção de dados
 */

import CryptoJS from 'crypto-js';

// Enum para categorias de dados a serem protegidos
export enum DataCategory {
  PERSONAL = 'personal', // Dados pessoais (nome, endereço, etc)
  BUSINESS = 'business', // Dados de negócios (finanças, estatísticas, etc)
  HEALTH = 'health',     // Dados de saúde (condições, medicamentos, etc)
  FINANCIAL = 'financial', // Dados financeiros (números de contas, etc)
  LOCATION = 'location', // Dados de localização
  COMMUNICATIONS = 'communications' // Histórico de conversas
}

// Interface para configurações de privacidade
export interface PrivacySettings {
  encryptionEnabled: boolean;
  sharingPreferences: Record<DataCategory, boolean>;
  dataRetentionDays: number;
  maskPersonalInfo: boolean;
  anonymizeAnalytics: boolean;
  localStorageOnly: boolean;
  apiRestrictions: {
    openai: boolean;
    anthropic: boolean;
    elevenlabs: boolean;
    others: boolean;
  };
  // Chave de criptografia local derivada de senha
  encryptionKey?: string;
}

// Configurações de privacidade padrão
const defaultPrivacySettings: PrivacySettings = {
  encryptionEnabled: true,
  sharingPreferences: {
    [DataCategory.PERSONAL]: false,
    [DataCategory.BUSINESS]: true,
    [DataCategory.HEALTH]: false,
    [DataCategory.FINANCIAL]: false,
    [DataCategory.LOCATION]: false,
    [DataCategory.COMMUNICATIONS]: true
  },
  dataRetentionDays: 30,
  maskPersonalInfo: true,
  anonymizeAnalytics: true,
  localStorageOnly: false,
  apiRestrictions: {
    openai: false,
    anthropic: false,
    elevenlabs: false,
    others: true
  }
};

/**
 * Classe para gerenciar a privacidade dos dados
 */
class PrivacyManager {
  private settings: PrivacySettings;
  private sessionEncryptionKey: string | null = null;
  private static instance: PrivacyManager;

  private constructor() {
    // Carrega configurações ou usa o padrão
    const savedSettings = localStorage.getItem('privacySettings');
    this.settings = savedSettings ? JSON.parse(savedSettings) : defaultPrivacySettings;
  }

  /**
   * Obtém a instância singleton
   */
  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  /**
   * Atualiza as configurações de privacidade
   */
  public updateSettings(newSettings: Partial<PrivacySettings>): PrivacySettings {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.settings;
  }

  /**
   * Salva as configurações de forma segura
   */
  private saveSettings(): void {
    // Não salva a chave de criptografia
    const { encryptionKey, ...settingsToSave } = this.settings;
    localStorage.setItem('privacySettings', JSON.stringify(settingsToSave));
  }

  /**
   * Obtém as configurações atuais
   */
  public getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * Configura senha para criptografia local
   */
  public setEncryptionPassword(password: string): void {
    // Deriva uma chave de criptografia a partir da senha
    this.sessionEncryptionKey = CryptoJS.PBKDF2(
      password,
      'assistant-salt',
      { keySize: 256 / 32, iterations: 1000 }
    ).toString();
    
    // Armazena apenas em memória, nunca persistir
    this.settings.encryptionKey = this.sessionEncryptionKey;
  }

  /**
   * Limpa a senha de criptografia (logout)
   */
  public clearEncryptionKey(): void {
    this.sessionEncryptionKey = null;
    this.settings.encryptionKey = undefined;
  }

  /**
   * Verifica se a categoria pode ser compartilhada
   */
  public canShareCategory(category: DataCategory): boolean {
    return this.settings.sharingPreferences[category] === true;
  }

  /**
   * Criptografa dados sensíveis para armazenamento local
   */
  public encryptSensitiveData(data: any): string {
    if (!this.settings.encryptionEnabled || !this.sessionEncryptionKey) {
      return JSON.stringify(data);
    }
    
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, this.sessionEncryptionKey).toString();
  }

  /**
   * Descriptografa dados sensíveis
   */
  public decryptSensitiveData(encryptedData: string): any {
    if (!this.settings.encryptionEnabled || !this.sessionEncryptionKey) {
      return JSON.parse(encryptedData);
    }
    
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.sessionEncryptionKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      return null;
    }
  }

  /**
   * Mascara informações pessoais em texto conforme as configurações
   */
  public maskPersonalInfo(text: string): string {
    if (!this.settings.maskPersonalInfo) return text;
    
    // Mascara emails
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    
    // Mascara telefones (padrões brasileiros)
    text = text.replace(/\(\d{2}\)\s?\d{4,5}-\d{4}/g, '[TELEFONE]');
    text = text.replace(/\d{2}\s?\d{4,5}-\d{4}/g, '[TELEFONE]');
    
    // Mascara números de documentos
    text = text.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF]'); // CPF
    text = text.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '[CNPJ]'); // CNPJ
    
    // Mascara dados financeiros
    text = text.replace(/\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/g, '[CARTÃO]'); // Cartão de crédito
    
    return text;
  }

  /**
   * Prepara dados para compartilhamento com APIs externas de acordo
   * com as configurações de privacidade
   */
  public prepareDataForSharing(data: any, apiName: 'openai' | 'anthropic' | 'elevenlabs' | 'others'): any {
    // Verifica se a API está restrita
    if (this.settings.apiRestrictions[apiName]) {
      throw new Error(`Compartilhamento com a API ${apiName} está desativado nas configurações de privacidade.`);
    }
    
    // Se só permitido armazenamento local, bloqueia
    if (this.settings.localStorageOnly) {
      throw new Error('Compartilhamento com serviços externos está desativado (modo offline).');
    }
    
    let processedData = { ...data };
    
    // Mascara informações se necessário
    if (typeof processedData === 'string' && this.settings.maskPersonalInfo) {
      return this.maskPersonalInfo(processedData);
    } else if (typeof processedData === 'object') {
      // Processa cada campo do objeto
      for (const key in processedData) {
        if (typeof processedData[key] === 'string') {
          processedData[key] = this.maskPersonalInfo(processedData[key]);
        }
      }
    }
    
    return processedData;
  }

  /**
   * Limpa dados mais antigos que o período de retenção
   */
  public cleanOldData(): void {
    if (!this.settings.dataRetentionDays) return;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.dataRetentionDays);
    
    // Implementação para limpar dados antigos do localStorage ou outro storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('assistant_data_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.timestamp && new Date(item.timestamp) < cutoffDate) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.error('Erro ao processar item para limpeza:', e);
        }
      }
    }
  }
}

export default PrivacyManager;