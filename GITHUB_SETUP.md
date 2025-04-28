# Instruções para Integração com GitHub

Este documento fornece os passos necessários para configurar e sincronizar este projeto com o repositório GitHub.

## Configuração Inicial

1. Abra o Shell do Replit e execute os seguintes comandos:

```bash
# Configurar informações do usuário git
git config --global user.name "luizin13"
git config --global user.email "seu-email@exemplo.com"

# Verificar a conexão com GitHub
ssh -T git@github.com
```

Se a autenticação estiver funcionando, você verá uma mensagem como:
```
Hi luizin13! You've successfully authenticated, but GitHub does not provide shell access.
```

## Inicialização do Repositório

Se precisar inicializar o repositório:

```bash
# Reinicializar o repositório Git se necessário
rm -rf .git
git init
git add .
git commit -m "Versão inicial do JARVIS Assistant"
git branch -M main
git remote add origin git@github.com:luizin13/JarvisAssistant.git
```

## Sincronização com GitHub

Para enviar alterações para o GitHub:

```bash
# Adicionar arquivos modificados
git add README.md LICENSE .env.example .gitignore
git add server/openai.ts server/anthropic.ts server/perplexity.ts
git add server/services/cache-manager.ts server/services/logging-service.ts
git add server/utils/api-utils.ts

# Fazer commit
git commit -m "Atualiza documentação e aprimora serviços de IA"

# Enviar para GitHub
git push -u origin main
```

## Arquivos Importantes para Commit

Os seguintes arquivos foram atualizados recentemente:

- `README.md` - Documentação atualizada do projeto
- `LICENSE` - Licença MIT
- `.env.example` - Modelo de variáveis de ambiente
- `.gitignore` - Configuração para ignorar arquivos desnecessários
- `server/openai.ts` - Cliente OpenAI com tratamento de erros
- `server/anthropic.ts` - Cliente Anthropic atualizado
- `server/perplexity.ts` - Cliente Perplexity para dados online
- `server/services/cache-manager.ts` - Sistema de cache LRU
- `server/services/logging-service.ts` - Serviço de logging centralizado
- `server/utils/api-utils.ts` - Utilitários de API com timeout

## Backup Alternativo

Se encontrar problemas para usar o Git diretamente, você pode baixar o arquivo de backup criado:

```bash
# Download do arquivamento
curl -o /tmp/jarvis-backup.tar.gz https://replit.com/ENDPOINT_TO_FILE

# Extrair em uma nova pasta
mkdir -p ~/jarvis-backup
tar -xzvf /tmp/jarvis-backup.tar.gz -C ~/jarvis-backup
```

Este arquivo pode ser importado manualmente para um novo repositório.