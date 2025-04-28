# JARVIS - Assistente Inteligente para Gestão de Negócios

![JARVIS Logo](public/logo-jarvis.png)

Sistema inteligente de IA multiagente para gestão de negócios, desenvolvido para otimizar fluxos de trabalho em setores de transporte e agricultura.

## Arquitetura

O JARVIS é construído com uma arquitetura de microserviços baseada em TypeScript e integra múltiplos sistemas de IA:

- **Frontend React**: Interface dinâmica para monitoramento do sistema com design inspirado no visual JARVIS/Iron Man
- **Estrutura Multi-Agente**: Framework avançado de comunicação entre agentes de IA especializados
- **Integrações IA**: OpenAI, Anthropic Claude e Perplexity para diferentes tipos de processamento
- **Síntese de Voz**: ElevenLabs para voz natural em português brasileiro
- **Diagnósticos em Tempo Real**: Sistema de monitoramento e auto-aprendizado adaptativo

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+ e npm
- Chaves de API para serviços externos (OpenAI, Anthropic, ElevenLabs, Perplexity)
- Python 3.10+ para componentes de análise e diagnóstico

### Instalação

1. Clone o repositório
   ```bash
   git clone git@github.com:luizin13/JarvisAssistant.git
   cd JarvisAssistant
   ```

2. Instale as dependências
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas chaves de API
   ```

4. Inicie o sistema
   ```bash
   npm run dev
   ```

### Configuração de Chaves API

O sistema requer as seguintes chaves de API:

- `OPENAI_API_KEY`: Para interações com modelo GPT-4o
- `ANTHROPIC_API_KEY`: Para interações com Claude 3
- `PERPLEXITY_API_KEY`: Para consultas de dados online
- `ELEVENLABS_API_KEY`: Para síntese de voz em português
- `SLACK_BOT_TOKEN` e `SLACK_CHANNEL_ID`: Para notificações (opcional)
- `API_GOV_DADOS`: Para acesso a dados governamentais (opcional)

## Melhorias Recentes

### Confiabilidade e Desempenho

- **Gerenciamento de Cache**: Implementado sistema LRU (Least Recently Used) para limitar uso de memória
- **Tratamento de Timeouts**: Adicionada função `executeWithTimeout` para prevenir bloqueios de API
- **Tentativas Exponenciais**: Sistema de retry com backoff exponencial para APIs externas
- **Logging Centralizado**: Serviço unificado para registros de operações e diagnósticos

### Clientes de IA

- **OpenAI**: Melhorado com tratamento de valores nulos, timeout e cache
- **Anthropic**: Atualizado para novas versões do Claude 3, com gerenciamento otimizado
- **Perplexity**: Implementado para consultas que exigem dados atualizados da internet

### Sistema de Auto-Melhoria

- **Gerenciador de Auto-Melhoria**: Sistema de diagnóstico e otimização automáticos
- **Modo de Melhoria Intensiva**: Análise profunda e correção de problemas identificados
- **Orquestrador de Inteligência**: Gerenciamento dinâmico de provedores de IA baseado em desempenho

## Ferramentas e Tecnologias

- TypeScript/Node.js para backend e frontend
- Express para API REST
- React com TailwindCSS para interface responsiva
- WebSockets para comunicação em tempo real
- APIs de IA de última geração (GPT-4o, Claude 3, Perplexity)
- Sistema de síntese de voz ElevenLabs
- APIs governamentais para dados especializados

## Desenvolvimento e Contribuição

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona feature X'`)
4. Push para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request

## Desenvolvimento Futuro

- Expansão da API pública para desenvolvedores
- Adição de novos agentes especializados
- Melhorias no sistema de voz e reconhecimento de contexto
- Integração com mais fontes de dados governamentais

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.