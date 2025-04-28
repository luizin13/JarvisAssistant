import axios from "axios";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

// Configuração da API do ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Diretório para armazenar arquivos de áudio gerados
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Certificar-se de que o diretório existe
try {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    console.log(`Diretório de áudio criado em ${AUDIO_DIR}`);
  }
} catch (error) {
  console.error('Erro ao criar diretório de áudio:', error);
}

// IDs de vozes femininas em português brasileiro
const VOICE_IDS = {
  // Estes são IDs de vozes pré-definidas do ElevenLabs com suporte a português
  CLARA: 'pNInz6obpgDQGcFmaJgB', // Clara - Voz feminina, entonação natural
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // Bella - Voz feminina, tom quente
  NICOLE: '8qHQZdJ6au8YBT2nFRrG', // Nicole - Voz feminina profissional
  MARIA: 'ThT5KcBeYPX3keUQqHPh', // Maria - Voz extremamente natural para português
  ANA: '29vD33N1CtxCmqQRPOHJ', // Ana - Voz premium de alta qualidade
  CUSTOM: 'custom-voice-id' // Substitua pelo seu ID de voz customizada se tiver uma
};

/**
 * Interface para opções de síntese de voz
 */
interface VoiceOptions {
  voiceType?: 'clara' | 'bella' | 'nicole' | 'maria' | 'ana' | 'custom';
  stability?: number;
  similarity?: number;
  style?: number;
  useCache?: boolean;
}

/**
 * Gera áudio natural a partir de texto usando a API TTS do ElevenLabs
 * @param text Texto a ser convertido em áudio
 * @param options Opções de configuração da voz (opcional)
 * @returns URL para o arquivo de áudio gerado
 */
export async function generateSpeechWithElevenLabs(
  text: string, 
  options?: VoiceOptions
): Promise<{ audioUrl: string }> {
  try {
    // Configurações padrão - com estilo mais expressivo e natural
    const defaultOptions: Required<VoiceOptions> = {
      voiceType: 'maria',
      stability: 0.5, // Estabilidade menor para mais expressão
      similarity: 0.9, // Similaridade maior para mais naturalidade
      style: 0.65, // Mais estilo para aumentar a expressividade emocional
      useCache: true
    };
    
    // Mescla as opções padrão com as fornecidas
    const voiceOptions = { ...defaultOptions, ...options };
    
    // Seleciona o ID da voz com base no tipo escolhido
    let selectedVoiceId;
    switch (options?.voiceType) {
      case 'bella':
        selectedVoiceId = VOICE_IDS.BELLA;
        break;
      case 'nicole':
        selectedVoiceId = VOICE_IDS.NICOLE;
        break;
      case 'maria':
        selectedVoiceId = VOICE_IDS.MARIA;
        break;
      case 'ana':
        selectedVoiceId = VOICE_IDS.ANA;
        break;
      case 'custom':
        selectedVoiceId = VOICE_IDS.CUSTOM;
        break;
      default:
        selectedVoiceId = VOICE_IDS.MARIA; // Agora usando Maria como voz padrão
    }
    
    // Gera o hash baseado no texto e nas opções da voz (para cache específico por voz)
    const optionsString = JSON.stringify({
      voice: voiceOptions.voiceType,
      stability: voiceOptions.stability,
      similarity: voiceOptions.similarity,
      style: voiceOptions.style
    });
    
    const hash = createHash('md5').update(text + optionsString).digest('hex');
    const fileName = `${hash}.mp3`;
    const filePath = path.join(AUDIO_DIR, fileName);
    const publicUrl = `/audio/${fileName}`;
    
    // Verifica se já existe um arquivo para este texto e estas opções (cache)
    if (voiceOptions.useCache && fs.existsSync(filePath)) {
      console.log(`Arquivo de áudio encontrado em cache: ${filePath}`);
      return { audioUrl: publicUrl };
    }

    // Sanitiza o texto para garantir melhor pronúncia
    const sanitizedText = sanitizeTextForSpeech(text);
    
    console.log(`Usando voz do ElevenLabs (${voiceOptions.voiceType})`);
    
    // Configuração para a síntese de voz
    const requestBody = {
      text: sanitizedText,
      model_id: 'eleven_multilingual_v2', // Modelo multilíngue que suporta português
      voice_settings: {
        stability: voiceOptions.stability,
        similarity_boost: voiceOptions.similarity,
        style: voiceOptions.style,
        use_speaker_boost: true // Melhora a clareza da voz
      }
    };

    console.log('Gerando áudio com ElevenLabs...');
    
    // Gera o áudio utilizando a API direta do ElevenLabs
    const ttsUrl = `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}`;
    
    // Faz a requisição para a API do ElevenLabs
    const response = await axios({
      method: 'POST',
      url: ttsUrl,
      data: requestBody,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      responseType: 'arraybuffer'
    });
    
    if (!response.data) {
      throw new Error("Resposta vazia da API do ElevenLabs");
    }
    
    // Converte a resposta para buffer
    const buffer = Buffer.from(response.data);
    
    // Salva o arquivo de áudio
    fs.writeFileSync(filePath, buffer);
    console.log(`Arquivo de áudio gerado e salvo em: ${filePath}`);
    
    return { audioUrl: publicUrl };
  } catch (error) {
    console.error("Erro ao gerar áudio com ElevenLabs:", error);
    
    // Se ocorrer um erro, tente usar a OpenAI como fallback
    try {
      console.log("Usando OpenAI como fallback para gerar áudio");
      const openaiService = await import('./openai');
      return await openaiService.generateSpeech(text);
    } catch (fallbackError) {
      console.error("Erro no fallback da OpenAI:", fallbackError);
      throw new Error("Falha ao gerar áudio. Por favor, tente novamente mais tarde.");
    }
  }
}

/**
 * Prepara o texto para síntese de voz
 * @param text Texto a ser sanitizado
 * @returns Texto preparado para melhor pronúncia
 */
function sanitizeTextForSpeech(text: string): string {
  // Remove caracteres especiais excessivos que não são letras, números, pontuação ou espaços
  let cleanText = text.replace(/[^a-zA-ZáàâãéèêíìóòôõúùûçÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÛÇ0-9.,;:!?()[\]{}""''`´\s-]/g, '');
  
  // Substitui abreviações comuns para melhorar a pronúncia
  const abbreviations: Record<string, string> = {
    'Dr.': 'Doutor',
    'Sr.': 'Senhor',
    'Sra.': 'Senhora',
    'Prof.': 'Professor',
    'R$': 'reais',
    '%': 'por cento',
    'Km': 'quilômetros',
    'Kg': 'quilos',
    'Nº': 'número',
    'nº': 'número',
    // Adicionar outras abreviações conforme necessário
  };
  
  // Substitui as abreviações
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    cleanText = cleanText.replace(regex, full);
  });
  
  // Adiciona pausas com pontuação para melhorar o ritmo da fala
  cleanText = cleanText.replace(/[.!?]\s+/g, match => match + ' ');
  
  // Melhora a pronúncia de siglas lendo letra por letra
  cleanText = cleanText.replace(/\b[A-Z]{2,}\b/g, match => {
    // Adiciona espaços entre as letras para que sejam pronunciadas separadamente
    return match.split('').join('. ') + '.';
  });
  
  return cleanText;
}