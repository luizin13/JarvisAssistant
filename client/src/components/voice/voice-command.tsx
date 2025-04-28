import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Mic, MicOff, Volume2, Settings, ChevronsUpDown, Loader2, BrainCircuit, FileText, Truck, RefreshCw, Network, Wheat, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch";
import { sanitizeTextForSpeech, ttsCache } from "@/lib/text-sanitizer";

// Sistema de gerenciamento de áudio global
type AudioQueueItem = {
  id: string;
  text: string;
  type: 'server' | 'browser';
  url?: string;
  onComplete?: () => void;
};

// Singleton para gerenciar a fila de áudio
class AudioQueueManager {
  private static instance: AudioQueueManager;
  private queue: AudioQueueItem[] = [];
  private isPlaying: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentBrowserUtterance: SpeechSynthesisUtterance | null = null;

  private constructor() {}

  public static getInstance(): AudioQueueManager {
    if (!AudioQueueManager.instance) {
      AudioQueueManager.instance = new AudioQueueManager();
    }
    return AudioQueueManager.instance;
  }

  // Adiciona um item à fila
  public enqueue(item: AudioQueueItem): void {
    console.log(`[AudioQueue] Adicionando à fila: ${item.text.substring(0, 30)}...`);
    this.queue.push(item);
    
    // Se não estiver reproduzindo, inicia a reprodução
    if (!this.isPlaying) {
      this.processNext();
    }
  }

  // Limpa a fila e interrompe a reprodução atual
  public clear(): void {
    console.log(`[AudioQueue] Limpando fila com ${this.queue.length} itens`);
    this.queue = [];
    this.stopCurrentAudio();
  }

  // Processa o próximo item da fila
  private processNext(): void {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const item = this.queue.shift();
    
    if (!item) return;
    
    console.log(`[AudioQueue] Processando próximo áudio: ${item.type}`);
    
    if (item.type === 'server' && item.url) {
      this.playServerAudio(item);
    } else {
      this.playBrowserAudio(item);
    }
  }

  // Reproduz áudio do servidor
  private playServerAudio(item: AudioQueueItem): void {
    // Interrompe qualquer áudio atual
    this.stopCurrentAudio();
    
    // Cria um novo elemento de áudio
    const audio = new Audio(item.url);
    this.currentAudio = audio;
    
    // Configura eventos
    audio.onended = () => {
      console.log(`[AudioQueue] Áudio do servidor concluído`);
      this.currentAudio = null;
      if (item.onComplete) item.onComplete();
      this.processNext();
    };
    
    audio.onerror = (error) => {
      console.error(`[AudioQueue] Erro ao reproduzir áudio do servidor:`, error);
      this.currentAudio = null;
      // Tenta usar o navegador como fallback
      this.playBrowserAudio({...item, type: 'browser'});
    };
    
    // Reproduz o áudio
    audio.play()
      .then(() => console.log(`[AudioQueue] Reproduzindo áudio do servidor`))
      .catch(error => {
        console.error(`[AudioQueue] Falha ao iniciar áudio do servidor:`, error);
        this.currentAudio = null;
        // Tenta usar o navegador como fallback
        this.playBrowserAudio({...item, type: 'browser'});
      });
  }

  // Reproduz áudio usando a API de síntese de voz do navegador
  private playBrowserAudio(item: AudioQueueItem): void {
    // Interrompe qualquer áudio atual
    this.stopCurrentAudio();
    
    // Verifica se a API é suportada
    if (!window.speechSynthesis) {
      console.error(`[AudioQueue] Síntese de fala não suportada pelo navegador`);
      if (item.onComplete) item.onComplete();
      this.processNext();
      return;
    }
    
    try {
      // Cria uma nova utterance
      const utterance = new SpeechSynthesisUtterance(item.text);
      this.currentBrowserUtterance = utterance;
      
      // Configura a voz para português, se disponível
      const voices = window.speechSynthesis.getVoices();
      const portugueseVoice = voices.find(voice => 
        voice.lang.includes('pt') || voice.name.includes('Portuguese')
      );
      
      if (portugueseVoice) {
        utterance.voice = portugueseVoice;
      }
      
      // Configura eventos
      utterance.onend = () => {
        console.log(`[AudioQueue] Síntese de voz do navegador concluída`);
        this.currentBrowserUtterance = null;
        if (item.onComplete) item.onComplete();
        this.processNext();
      };
      
      utterance.onerror = (event) => {
        console.error(`[AudioQueue] Erro na síntese de voz do navegador:`, event);
        this.currentBrowserUtterance = null;
        if (item.onComplete) item.onComplete();
        this.processNext();
      };
      
      // Reproduz a fala
      window.speechSynthesis.speak(utterance);
      console.log(`[AudioQueue] Usando síntese de voz do navegador`);
    } catch (error) {
      console.error(`[AudioQueue] Erro ao iniciar síntese de voz do navegador:`, error);
      if (item.onComplete) item.onComplete();
      this.processNext();
    }
  }

  // Interrompe qualquer áudio em reprodução
  private stopCurrentAudio(): void {
    // Para áudio do servidor
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      } catch (error) {
        console.error(`[AudioQueue] Erro ao interromper áudio do servidor:`, error);
      }
    }
    
    // Para síntese de voz do navegador
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        this.currentBrowserUtterance = null;
      } catch (error) {
        console.error(`[AudioQueue] Erro ao interromper síntese de voz:`, error);
      }
    }
  }
}

// Exporta a instância para uso global
export const audioQueue = AudioQueueManager.getInstance();

// Função para parar qualquer síntese de voz atualmente em reprodução
function stopAllAudio() {
  audioQueue.clear();
}

// Função para parar qualquer síntese de voz do navegador (legado, mantido para compatibilidade)
function stopBrowserSpeech() {
  // Esta função agora apenas delega para o audioQueue.clear()
  audioQueue.clear();
}

// Interface para os resultados reconhecidos
interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

interface VoiceCommandResponse {
  content: string;
  type?: 'text' | 'briefing' | 'alert' | 'action' | 'navigation' | 'multiagent';
  actionRequired?: boolean;
  actionType?: 'navigate' | 'generate' | 'filter' | 'search' | 'refresh' | 'create_task' | 'submit_input';
  actionTarget?: string;
  actionParams?: Record<string, any>;
  relatedData?: any;
  taskId?: string;
  stepId?: string;
}

interface VoiceCommandProps {
  onCommand?: (command: string) => void;
  onAction?: (action: VoiceCommandResponse) => void;
  isListening?: boolean;
  className?: string;
}

// Interface para configurações de voz
interface VoiceSettings {
  voiceType: 'clara' | 'bella' | 'nicole' | 'maria' | 'ana' | 'custom';
  stability: number;
  similarity: number;
  style: number;
  responseStyle: 'conciso' | 'detalhado' | 'técnico' | 'simples';
  isOffline: boolean;
}

export default function VoiceCommand({ 
  onCommand, 
  onAction,
  isListening: externalIsListening,
  className = ""
}: VoiceCommandProps) {
  // Estados para funcionamento básico
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Estado para configurações de voz
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceType: 'maria',
    stability: 0.6,
    similarity: 0.85,
    style: 0.35,
    responseStyle: 'conciso',
    isOffline: false
  });
  
  const [isBrainOpen, setIsBrainOpen] = useState(false);
  
  // Referência ao objeto de reconhecimento de voz
  const recognitionRef = useRef<any>(null);

  // Sincroniza estado interno com prop externa se fornecida
  useEffect(() => {
    if (externalIsListening !== undefined) {
      setIsListening(externalIsListening);
    }
  }, [externalIsListening]);
  
  // Inicializa o reconhecimento de voz na montagem do componente
  useEffect(() => {
    // Verificar suporte do navegador
    // Definição de tipo para compatibilidade com a API de reconhecimento de fala
    interface Window {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    }
    
    const windowWithSpeech = window as unknown as Window;
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      
      // Configuração para português brasileiro
      recognition.lang = 'pt-BR';
      recognition.continuous = true; // Continua reconhecendo até ser parado
      recognition.interimResults = true; // Mostra resultados intermediários
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }
        
        // Atualiza o texto reconhecido
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        
        // Se for um resultado final, processa o comando
        if (finalTranscript && !isProcessing) {
          processCommand(finalTranscript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Erro de reconhecimento de voz:", event.error);
        setError(`Erro de reconhecimento: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        if (isListening) {
          recognition.start(); // Reinicia se ainda estiver em modo de escuta
        }
      };
      
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Erro ao inicializar reconhecimento de voz:", err);
      setError("Falha ao inicializar o reconhecimento de voz.");
    }
    
    return () => {
      // Limpa ao desmontar o componente
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Inicia ou para o reconhecimento de voz
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
  
  // Processa o comando reconhecido
  const processCommand = async (command: string) => {
    // Chama o callback se fornecido
    if (onCommand) {
      onCommand(command);
    }
    
    setIsProcessing(true);
    
    try {
      // Envia o comando e as configurações para o backend processar
      const result = await apiRequest<VoiceCommandResponse>('/api/voice-command', {
        method: 'POST',
        body: JSON.stringify({ 
          command,
          userId: 1, // Usando um ID padrão
          isOffline: voiceSettings.isOffline,
          responseStyle: voiceSettings.responseStyle,
          voiceType: voiceSettings.voiceType
        })
      });
      
      if (!result || !result.content) {
        setError("Não foi possível obter uma resposta do assistente.");
        return;
      }
      
      // Processa a resposta com base no tipo
      setResponse(result.content);
      
      // Reproduz a resposta em áudio
      speakResponse(result.content);
      
      // Verifica se há ações para executar
      if (result.type === 'navigation' && result.actionType === 'navigate') {
        // Se tivermos callback para ações, passamos a ação
        if (onAction) {
          onAction(result);
        } else {
          // Navegação direta se não tiver callback
          if (result.actionTarget === 'back') {
            window.history.back();
          } else if (result.actionTarget) {
            window.location.href = result.actionTarget;
          }
        }
      } 
      // Ação para geração de briefing
      else if (result.type === 'action' && result.actionType === 'generate' && result.actionTarget === 'briefing') {
        if (onAction) {
          onAction(result);
        } else {
          // Se não tiver callback, tentamos gerar o briefing diretamente
          const type = result.actionParams?.type || 'daily';
          generateBriefing(type);
        }
      }
      // Ação para atualização de dados
      else if (result.type === 'action' && result.actionType === 'refresh') {
        if (onAction) {
          onAction(result);
        }
      } 
      // Ação para o sistema multi-agente
      else if ((result.type === 'multiagent' || (result.type === 'action' && (result.actionTarget === 'multi-agent' || result.actionType === 'create_task')))) {
        if (onAction) {
          onAction(result);
        } else {
          // Define a mensagem de resposta para o usuário
          const initialMessage = "Vou criar uma tarefa no sistema multi-agente para você. Aguarde um momento...";
          setResponse(initialMessage);
          await speakResponse(initialMessage);
          
          try {
            // Prepara os dados da tarefa
            const taskData = {
              title: 'Tarefa criada por comando de voz',
              description: "Por favor, especifique o que você gostaria que o sistema multi-agente realizasse.",
              businessType: 'both',
              additionalContext: `Tarefa criada via assistente de voz a pedido de Luiz em ${new Date().toLocaleDateString('pt-BR')}`
            };
            
            // Se temos parâmetros específicos na resposta, usamos eles
            if (result.actionParams) {
              console.log('Usando parâmetros fornecidos:', result.actionParams);
              if (result.actionParams.title) taskData.title = result.actionParams.title;
              if (result.actionParams.description) taskData.description = result.actionParams.description;
              if (result.actionParams.businessType) taskData.businessType = result.actionParams.businessType;
              if (result.actionParams.additionalContext) taskData.additionalContext = result.actionParams.additionalContext;
            }
            
            // Se temos um ID de tarefa, significa que o backend já criou a tarefa
            if (result.taskId) {
              console.log('Tarefa já criada pelo backend com ID:', result.taskId);
              
              // Usa o ID fornecido pelo backend
              const successMessage = `Tarefa criada com sucesso no sistema multi-agente. Os especialistas estão analisando sua solicitação.`;
              setResponse(successMessage);
              await speakResponse(successMessage);
            } else {
              // Caso contrário, precisamos criar a tarefa pelo cliente
              console.log('Criando tarefa no sistema multi-agente pelo cliente:', taskData);
              
              const response = await fetch('/api/multi-agent/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
              });
              
              if (!response.ok) {
                throw new Error(`Erro ao criar tarefa: ${response.status} ${response.statusText}`);
              }
              
              const createTaskResponse = await response.json();
              console.log('Tarefa criada com sucesso pelo cliente:', createTaskResponse);
              
              const successMessage = `Tarefa criada com sucesso no sistema multi-agente. Os especialistas estão analisando sua solicitação.`;
              setResponse(successMessage);
              await speakResponse(successMessage);
            }
            
            // Invalida a consulta para atualizar a lista de tarefas
            try {
              // Importa o queryClient para invalidar as consultas
              const { queryClient } = await import('../../lib/queryClient');
              queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks'] });
              
              // Se temos um ID específico, invalida também a consulta para esse ID
              if (result.taskId) {
                queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks', result.taskId] });
              }
            } catch (err) {
              console.error('Erro ao invalidar consultas:', err);
            }
            
            // Navega para a página de multi-agente se não estiver nela
            if (window.location.pathname !== '/multi-agent') {
              console.log('Redirecionando para o sistema multi-agente...');
              window.location.href = '/multi-agent';
            } else {
              // Se já estiver na página, recarrega-a para mostrar a nova tarefa
              window.location.reload();
            }
          } catch (error) {
            console.error('Erro ao criar tarefa via comando de voz:', error);
            const errorMessage = "Não foi possível criar a tarefa no sistema multi-agente. Por favor, tente novamente ou acesse diretamente a página de Multi-Agentes.";
            setError(errorMessage);
            await speakResponse(errorMessage);
            
            // Mesmo em caso de erro, tenta navegar para a página do multi-agente
            if (window.location.pathname !== '/multi-agent') {
              setTimeout(() => {
                window.location.href = '/multi-agent';
              }, 3000);
            }
          }
        }
      }
      // Ação para busca ou filtro
      else if ((result.type === 'action' && (result.actionType === 'search' || result.actionType === 'filter'))) {
        if (onAction) {
          onAction(result);
        }
      }
      // Para alertas importantes que requerem ação
      else if (result.type === 'alert' && result.actionRequired) {
        if (onAction) {
          onAction(result);
        }
      }
    } catch (err) {
      console.error("Erro ao processar comando:", err);
      setError("Falha ao processar o comando de voz.");
      setResponse("");
    } finally {
      setIsProcessing(false);
      setTranscript("");
    }
  };
  
  // Função para transformar texto em fala com voz natural usando o sistema de fila de áudio
  const speakResponse = async (text: string): Promise<void> => {
    try {
      setIsProcessing(true);
      
      // Verifica se o texto está vazio
      if (!text.trim()) {
        console.error("Texto para síntese de voz está vazio");
        setIsProcessing(false);
        return;
      }

      // Sanitiza o texto para melhorar a pronúncia
      const sanitizedText = sanitizeTextForSpeech(text);
      console.log(`[Voice] Texto sanitizado: ${sanitizedText.substring(0, 50)}...`);

      // Gera um ID único para este item de áudio
      const audioId = `voice_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Configuração da voz que será usada como chave de cache
      const voiceConfig = {
        voiceType: voiceSettings.voiceType,
        stability: voiceSettings.stability,
        similarity: voiceSettings.similarity,
        style: voiceSettings.style
      };
      
      // Cria uma promessa que será resolvida quando o áudio terminar
      return new Promise(async (resolve) => {
        try {
          // Se o modo offline estiver ativado, usa a API de voz do navegador diretamente
          if (voiceSettings.isOffline) {
            console.log('[Voice] Modo offline ativado, usando síntese do navegador');
            audioQueue.enqueue({
              id: audioId,
              text: sanitizedText,
              type: 'browser',
              onComplete: () => {
                setIsProcessing(false);
                resolve();
              }
            });
            return;
          }
          
          // Verifica o cache primeiro (se não estiver em modo offline)
          const cachedAudioUrl = ttsCache.getFromCache(sanitizedText, voiceConfig);
          if (cachedAudioUrl) {
            console.log('[Voice] Usando áudio em cache');
            audioQueue.enqueue({
              id: audioId,
              text: sanitizedText,
              type: 'server',
              url: cachedAudioUrl,
              onComplete: () => {
                setIsProcessing(false);
                resolve();
              }
            });
            return;
          }
          
          // Primeiro nível: API de alta qualidade (ElevenLabs)
          console.log('[Voice] Requisitando áudio de alta qualidade');
          const response = await fetch('/api/speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: sanitizedText,
              ...voiceConfig,
              useCache: true // Sempre usa cache para economizar requisições
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Erro na API de síntese: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.audioUrl) {
            // Adiciona ao cache para uso futuro
            ttsCache.addToCache(sanitizedText, voiceConfig, data.audioUrl);
            
            // Se temos uma URL, usamos o áudio do servidor
            audioQueue.enqueue({
              id: audioId,
              text: sanitizedText,
              type: 'server',
              url: data.audioUrl,
              onComplete: () => {
                setIsProcessing(false);
                resolve();
              }
            });
          } else {
            throw new Error("URL de áudio não fornecida pela API");
          }
        } catch (elevenLabsError) {
          console.warn("Erro na síntese via ElevenLabs, tentando OpenAI:", elevenLabsError);
          
          try {
            // Segundo nível: API alternativa (OpenAI)
            console.log('[Voice] Tentando fallback com OpenAI TTS');
            const openaiResponse = await fetch('/api/speech/openai', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: sanitizedText
              }),
            });
            
            if (!openaiResponse.ok) {
              throw new Error(`Erro na API OpenAI: ${openaiResponse.status}`);
            }
            
            const openaiData = await openaiResponse.json();
            
            if (openaiData.audioUrl) {
              // Enfileira para reprodução
              audioQueue.enqueue({
                id: audioId,
                text: sanitizedText,
                type: 'server',
                url: openaiData.audioUrl,
                onComplete: () => {
                  setIsProcessing(false);
                  resolve();
                }
              });
              return;
            }
            
            throw new Error("URL de áudio não fornecida pela API OpenAI");
          } catch (openaiError) {
            console.warn("Erro na síntese via OpenAI, usando navegador:", openaiError);
            
            // Terceiro nível: Síntese do navegador
            audioQueue.enqueue({
              id: audioId,
              text: sanitizedText,
              type: 'browser',
              onComplete: () => {
                setIsProcessing(false);
                resolve();
              }
            });
          }
        }
      });
    } catch (e) {
      console.error("Erro geral na síntese de voz:", e);
      setIsProcessing(false);
      return Promise.resolve(); // Resolução em caso de erro para não interromper o fluxo
    }
  };
  
  // Função para atualizar configurações de voz
  const updateVoiceSettings = (key: keyof VoiceSettings, value: any) => {
    setVoiceSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Função para gerar um briefing específico
  const generateBriefing = async (type: 'daily' | 'weekly' | 'transport' | 'farm') => {
    setIsProcessing(true);
    setResponse(`Gerando briefing ${type === 'daily' ? 'diário' : type === 'weekly' ? 'semanal' : type === 'transport' ? 'de transportes' : 'agrícola'}...`);
    
    try {
      const result = await apiRequest('/api/audio-briefing', {
        method: 'POST',
        body: JSON.stringify({ type })
      });
      
      if (result) {
        setResponse(`Briefing ${type} gerado com sucesso!`);
        // Se temos onAction implementado, notificamos a ação
        if (onAction) {
          onAction({
            content: `Briefing ${type} gerado com sucesso!`,
            type: 'action',
            actionType: 'generate',
            actionTarget: 'briefing',
            actionParams: { type }
          });
        }
      } else {
        setError("Não foi possível gerar o briefing. Tente novamente mais tarde.");
      }
    } catch (err) {
      console.error("Erro ao gerar briefing:", err);
      setError("Ocorreu um erro ao gerar o briefing. Tente novamente mais tarde.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`overflow-hidden commander-panel ${className}`}>
      <CardContent className="p-4 commander-section">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              {isListening 
                ? <><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></span> Ouvindo Comandante...</>
                : <><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Painel de Comando JARVIS</>
              }
            </h3>
            <div className="flex items-center space-x-2">
              <Popover open={isBrainOpen} onOpenChange={setIsBrainOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" title="Cérebro Avançado">
                    <BrainCircuit size={16} className="text-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-sm">Cérebro Avançado</h4>
                      <span className="text-xs text-muted-foreground">Versão 1.0</span>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-primary/5 rounded-md border border-primary/10">
                        <h3 className="text-sm font-medium mb-1">Sistema Multi-Agente</h3>
                        <p className="text-xs text-gray-600">O sistema multi-agente está processando {Math.floor(Math.random() * 3) + 2} tarefas em segundo plano.</p>
                        <div className="mt-2 h-1.5 w-full bg-muted overflow-hidden rounded-full">
                          <div 
                            className="h-full bg-primary rounded-full animate-pulse" 
                            style={{ width: `${65 + Math.floor(Math.random() * 25)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-primary/5 transition-colors">
                        <h3 className="text-sm font-medium mb-1">Memória de Longo Prazo</h3>
                        <p className="text-xs text-gray-600">173 contextos armazenados e disponíveis para recuperação</p>
                      </div>
                      
                      <div className="p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-primary/5 transition-colors">
                        <h3 className="text-sm font-medium mb-1">Academia Interna</h3>
                        <p className="text-xs text-gray-600">7 modelos mentais e 12 livros disponíveis para consulta</p>
                      </div>
                      
                      <div className="p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-primary/5 transition-colors">
                        <h3 className="text-sm font-medium mb-1">Auto-Melhoria</h3>
                        <p className="text-xs text-gray-600">Próxima verificação do sistema em: 3h 45min</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Settings size={16} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-sm">Configurações Pessoais</h4>
                      <span className="text-xs text-muted-foreground">Controle de Voz</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor="voice-type">Voz</Label>
                        </div>
                        <Select 
                          value={voiceSettings.voiceType}
                          onValueChange={(value) => updateVoiceSettings('voiceType', value)}
                        >
                          <SelectTrigger id="voice-type">
                            <SelectValue placeholder="Escolha uma voz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="maria">Maria (Ultra Natural)</SelectItem>
                            <SelectItem value="ana">Ana (Premium)</SelectItem>
                            <SelectItem value="clara">Clara (Padrão)</SelectItem>
                            <SelectItem value="bella">Bella (Expressiva)</SelectItem>
                            <SelectItem value="nicole">Nicole (Profissional)</SelectItem>
                            <SelectItem value="custom">Personalizada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor="response-style">Estilo de Resposta</Label>
                        </div>
                        <Select 
                          value={voiceSettings.responseStyle}
                          onValueChange={(value) => updateVoiceSettings('responseStyle', value as any)}
                        >
                          <SelectTrigger id="response-style">
                            <SelectValue placeholder="Estilo de resposta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conciso">Conciso</SelectItem>
                            <SelectItem value="detalhado">Detalhado</SelectItem>
                            <SelectItem value="técnico">Técnico</SelectItem>
                            <SelectItem value="simples">Simples</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor="stability-slider">Estabilidade</Label>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(voiceSettings.stability * 100)}%
                          </span>
                        </div>
                        <Slider
                          id="stability-slider"
                          min={0}
                          max={1}
                          step={0.01}
                          value={[voiceSettings.stability]}
                          onValueChange={(value) => updateVoiceSettings('stability', value[0])}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor="similarity-slider">Similaridade</Label>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(voiceSettings.similarity * 100)}%
                          </span>
                        </div>
                        <Slider
                          id="similarity-slider"
                          min={0}
                          max={1}
                          step={0.01}
                          value={[voiceSettings.similarity]}
                          onValueChange={(value) => updateVoiceSettings('similarity', value[0])}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor="style-slider">Expressividade</Label>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(voiceSettings.style * 100)}%
                          </span>
                        </div>
                        <Slider
                          id="style-slider"
                          min={0}
                          max={1}
                          step={0.01}
                          value={[voiceSettings.style]}
                          onValueChange={(value) => updateVoiceSettings('style', value[0])}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="offline-mode" className="text-sm">Modo Offline</Label>
                          <Switch
                            id="offline-mode"
                            checked={voiceSettings.isOffline}
                            onCheckedChange={(value) => updateVoiceSettings('isOffline', value)}
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => ttsCache.clearCache()}
                          className="text-xs h-7"
                        >
                          Limpar Cache
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                variant={isListening ? "destructive" : "default"}
                size="icon"
                onClick={toggleListening}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => speakResponse(response)}
                disabled={!response || isProcessing}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {transcript && (
            <div className="p-3 bg-muted/50 rounded-md border border-primary/10">
              <p className="text-sm">
                <span className="font-medium text-primary">COMANDANTE:</span> {transcript}
              </p>
            </div>
          )}
          
          {response && (
            <div className="p-3 bg-primary/10 rounded-md border border-primary/20 commander-monitor">
              <p className="text-sm commander-monitor-line">
                <span className="font-medium text-primary">JARVIS:</span> {response}
              </p>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              <p className="text-sm">
                <span className="font-medium">ALERTA:</span> {error}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              className="commander-button"
              onClick={() => generateBriefing('daily')}
              disabled={isProcessing}
            >
              <FileText className="mr-2 h-4 w-4" />
              Briefing Diário
            </Button>
            <Button 
              variant="outline" 
              className="commander-button"
              onClick={() => generateBriefing('transport')}
              disabled={isProcessing}
            >
              <Truck className="mr-2 h-4 w-4" />
              Briefing Transportes
            </Button>
            <Button 
              variant="outline" 
              className="commander-button"
              onClick={() => generateBriefing('farm')}
              disabled={isProcessing}
            >
              <FileText className="mr-2 h-4 w-4" />
              Briefing Agro
            </Button>
            <Button 
              variant="outline" 
              className="commander-button"
              onClick={() => generateBriefing('weekly')}
              disabled={isProcessing}
            >
              <FileText className="mr-2 h-4 w-4" />
              Análise Semanal
            </Button>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="commander-footer px-4 py-2">
        <div className="flex justify-between items-center w-full">
          <div className="commander-status">
            <div className="commander-status-icon"></div>
            <p className="text-xs">
              {isListening 
                ? "Sistema ativo: aguardando comandos vocais..."
                : "Sistema pronto: aguardando ativação"}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 commander-button"
              title="Atualizar dados de mercado"
            >
              <RefreshCw size={12} className="mr-1" />
              Atualizar
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 commander-button"
              title="Ir para Sistema Multi-Agente"
              onClick={() => window.location.href = '/multi-agent'}
            >
              <Network size={12} className="mr-1" />
              Multi-Agente
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}