import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VoiceCommandCompactProps {
  onCommand?: (command: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

export default function VoiceCommandCompact({
  onCommand,
  onProcessingChange,
  className = '',
  size = 'md',
  variant = 'primary',
  disabled = false
}: VoiceCommandCompactProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Referência para o reconhecimento de voz
  const recognitionRef = React.useRef<any>(null);
  
  // Inicializa o reconhecimento de voz
  useEffect(() => {
    // Verifica se o navegador suporta reconhecimento de voz
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Reconhecimento de voz não suportado pelo navegador');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        handleCommand(finalTranscript.trim());
      } else if (interimTranscript) {
        setTranscript(interimTranscript.trim());
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Erro no reconhecimento de voz:', event.error);
      setError(`Erro no reconhecimento: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      }
    };
  }, [isListening]);
  
  // Notifica sobre mudanças no estado de processamento
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);
  
  // Processa o comando reconhecido
  const handleCommand = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Notifica o callback com o comando
      if (onCommand) {
        onCommand(text);
      }
      
      // Processa o comando diretamente
      const response = await apiRequest('/api/voice-command', {
        method: 'POST',
        body: JSON.stringify({
          command: text,
          context: 'compact'
        })
      });
      
      const result = await response.json();
      
      // Lida com a resposta (pode ser personalizado conforme necessário)
      console.log('Resposta do comando de voz:', result);
      
    } catch (error) {
      console.error('Erro ao processar comando de voz:', error);
      setError('Erro ao processar comando');
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };
  
  // Inicia ou para o reconhecimento de voz
  const toggleListening = () => {
    if (disabled) return;
    
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } else {
      setIsListening(true);
      setError(null);
      setTranscript('');
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Erro ao iniciar reconhecimento:', error);
        }
      }
    }
  };
  
  // Define as classes de tamanho
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  // Define as classes de variante
  const variantClasses = {
    primary: isListening 
      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
      : 'bg-primary/10 text-primary hover:bg-primary/20',
    secondary: isListening 
      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' 
      : 'bg-secondary/10 text-secondary hover:bg-secondary/20',
    ghost: isListening 
      ? 'bg-muted/50 text-primary hover:bg-muted/70' 
      : 'text-muted-foreground hover:bg-muted/30'
  };
  
  // Renderiza ícone baseado no estado
  const renderIcon = () => {
    if (isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    } else if (isSpeaking) {
      return <Volume2 className="h-4 w-4" />;
    } else if (isListening) {
      return <Mic className="h-4 w-4" />;
    } else {
      return <MicOff className="h-4 w-4" />;
    }
  };
  
  return (
    <Button
      type="button"
      className={`voice-interface-element rounded-full p-0 ${sizeClasses[size]} ${variantClasses[variant]} ${className} ${isListening ? 'ring-2 ring-primary/30 ring-offset-2' : ''}`}
      style={{
        transition: 'var(--cognitive-transition-emphasis)',
        boxShadow: isListening ? 'var(--cognitive-shadow-medium)' : 'var(--cognitive-shadow-soft)',
        transform: isListening ? 'scale(1.05)' : 'scale(1)'
      }}
      onClick={toggleListening}
      disabled={disabled || isProcessing}
      title={isListening ? 'Clique para parar de escutar' : 'Clique para comandar por voz'}
    >
      {renderIcon()}
      
      {transcript && (
        <span className="sr-only">{transcript}</span>
      )}
      
      {error && (
        <span className="sr-only">Erro: {error}</span>
      )}
    </Button>
  );
}