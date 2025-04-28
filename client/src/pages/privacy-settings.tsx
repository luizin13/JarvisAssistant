import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import PrivacyManager, { DataCategory, PrivacySettings } from '@/lib/privacy-manager';
import { 
  Shield, 
  ShieldAlert, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Share2, 
  Clock, 
  Trash2, 
  Server, 
  Cloud, 
  AlertTriangle,
  CheckCircle,
  Download,
  FileText
} from 'lucide-react';

export default function PrivacySettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrivacySettings>(PrivacyManager.getInstance().getSettings());
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [encryptionEnabled, setEncryptionEnabled] = useState<boolean>(settings.encryptionEnabled);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'encrypted'>('json');
  
  const handleToggleCategory = (category: DataCategory) => {
    const newPreferences = {
      ...settings.sharingPreferences,
      [category]: !settings.sharingPreferences[category]
    };
    
    updateSettings({
      sharingPreferences: newPreferences
    });
  };
  
  const handleToggleAPI = (api: 'openai' | 'anthropic' | 'elevenlabs' | 'others') => {
    const newRestrictions = {
      ...settings.apiRestrictions,
      [api]: !settings.apiRestrictions[api]
    };
    
    updateSettings({
      apiRestrictions: newRestrictions
    });
  };
  
  const handleRetentionChange = (value: number[]) => {
    updateSettings({
      dataRetentionDays: value[0]
    });
  };
  
  const updateSettings = (newSettings: Partial<PrivacySettings>) => {
    const updatedSettings = PrivacyManager.getInstance().updateSettings(newSettings);
    setSettings(updatedSettings);
  };
  
  const handleEncryptionToggle = () => {
    if (!encryptionEnabled) {
      setEncryptionEnabled(true);
    } else {
      updateSettings({ encryptionEnabled: false });
      setEncryptionEnabled(false);
      PrivacyManager.getInstance().clearEncryptionKey();
      
      toast({
        title: "Criptografia desativada",
        description: "Seus dados não estão mais sendo criptografados localmente.",
        variant: "destructive"
      });
    }
  };
  
  const setupEncryption = () => {
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, confirme a senha corretamente.",
        variant: "destructive"
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "Use uma senha com pelo menos 8 caracteres para garantir segurança.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      PrivacyManager.getInstance().setEncryptionPassword(password);
      updateSettings({ encryptionEnabled: true });
      
      setPassword('');
      setConfirmPassword('');
      
      toast({
        title: "Criptografia configurada",
        description: "Seus dados serão criptografados localmente com sua senha.",
      });
    } catch (error) {
      toast({
        title: "Erro ao configurar criptografia",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive"
      });
    }
  };
  
  const cleanOldData = () => {
    try {
      PrivacyManager.getInstance().cleanOldData();
      
      toast({
        title: "Dados antigos removidos",
        description: `Dados anteriores a ${settings.dataRetentionDays} dias foram removidos.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao limpar dados",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive"
      });
    }
  };
  
  const exportData = () => {
    try {
      // Obter todos os dados do assistente
      const dataToExport: Record<string, any> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('assistant_')) {
          try {
            dataToExport[key] = JSON.parse(localStorage.getItem(key) || '{}');
          } catch (e) {
            dataToExport[key] = localStorage.getItem(key);
          }
        }
      }
      
      let dataStr;
      
      if (exportFormat === 'encrypted' && settings.encryptionEnabled) {
        // Exportar dados criptografados
        dataStr = PrivacyManager.getInstance().encryptSensitiveData(dataToExport);
      } else {
        // Exportar como JSON normal
        dataStr = JSON.stringify(dataToExport, null, 2);
      }
      
      // Criar arquivo para download
      const blob = new Blob([dataStr], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `assistente-dados-${new Date().toISOString().split('T')[0]}.${exportFormat === 'encrypted' ? 'enc' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      toast({
        title: "Dados exportados com sucesso",
        description: `Seus dados foram exportados no formato ${exportFormat === 'encrypted' ? 'criptografado' : 'JSON'}.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar dados",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="flex items-center mb-8">
        <Shield className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Configurações de Privacidade</h1>
      </div>
      
      <Alert className="mb-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Importante sobre sua privacidade</AlertTitle>
        <AlertDescription>
          Configure como o assistente gerencia seus dados pessoais e como eles são compartilhados com serviços externos.
          Essas configurações ajudam a proteger sua privacidade, mas não garantem proteção total contra todos os riscos.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="sharing" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="sharing" className="flex items-center">
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhamento
          </TabsTrigger>
          <TabsTrigger value="encryption" className="flex items-center">
            <Lock className="mr-2 h-4 w-4" />
            Criptografia
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Retenção
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </TabsTrigger>
        </TabsList>
        
        {/* Aba de Compartilhamento */}
        <TabsContent value="sharing">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share2 className="mr-2 h-5 w-5" />
                  Preferências de Compartilhamento de Dados
                </CardTitle>
                <CardDescription>
                  Defina quais categorias de dados podem ser compartilhadas com serviços externos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dados Pessoais</Label>
                      <p className="text-sm text-muted-foreground">
                        Nome, endereço, contatos
                      </p>
                    </div>
                    <Switch 
                      checked={settings.sharingPreferences[DataCategory.PERSONAL]}
                      onCheckedChange={() => handleToggleCategory(DataCategory.PERSONAL)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dados de Negócios</Label>
                      <p className="text-sm text-muted-foreground">
                        Estatísticas de negócios, vendas, projetos
                      </p>
                    </div>
                    <Switch 
                      checked={settings.sharingPreferences[DataCategory.BUSINESS]}
                      onCheckedChange={() => handleToggleCategory(DataCategory.BUSINESS)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dados de Saúde</Label>
                      <p className="text-sm text-muted-foreground">
                        Informações médicas, medicamentos, hábitos
                      </p>
                    </div>
                    <Switch 
                      checked={settings.sharingPreferences[DataCategory.HEALTH]}
                      onCheckedChange={() => handleToggleCategory(DataCategory.HEALTH)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dados Financeiros</Label>
                      <p className="text-sm text-muted-foreground">
                        Informações bancárias, transações, investimentos
                      </p>
                    </div>
                    <Switch 
                      checked={settings.sharingPreferences[DataCategory.FINANCIAL]}
                      onCheckedChange={() => handleToggleCategory(DataCategory.FINANCIAL)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dados de Localização</Label>
                      <p className="text-sm text-muted-foreground">
                        Histórico de localizações, endereços frequentes
                      </p>
                    </div>
                    <Switch 
                      checked={settings.sharingPreferences[DataCategory.LOCATION]}
                      onCheckedChange={() => handleToggleCategory(DataCategory.LOCATION)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Histórico de Conversas</Label>
                      <p className="text-sm text-muted-foreground">
                        Mensagens trocadas com o assistente
                      </p>
                    </div>
                    <Switch 
                      checked={settings.sharingPreferences[DataCategory.COMMUNICATIONS]}
                      onCheckedChange={() => handleToggleCategory(DataCategory.COMMUNICATIONS)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cloud className="mr-2 h-5 w-5" />
                  Restrições a Serviços Externos
                </CardTitle>
                <CardDescription>
                  Controle quais APIs externas podem ser utilizadas pelo sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <Label>OpenAI (ChatGPT)</Label>
                        <Badge variant="outline" className="ml-2">Principal</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Usado para chat, processamento de texto e imagens
                      </p>
                    </div>
                    {/* Invertemos a lógica pois o switch deve indicar "permitir" e não "restringir" */}
                    <Switch 
                      checked={!settings.apiRestrictions.openai}
                      onCheckedChange={() => handleToggleAPI('openai')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Anthropic (Claude)</Label>
                      <p className="text-sm text-muted-foreground">
                        Modelo alternativo de IA para conversas
                      </p>
                    </div>
                    <Switch 
                      checked={!settings.apiRestrictions.anthropic}
                      onCheckedChange={() => handleToggleAPI('anthropic')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>ElevenLabs</Label>
                      <p className="text-sm text-muted-foreground">
                        Síntese de voz natural para áudio
                      </p>
                    </div>
                    <Switch 
                      checked={!settings.apiRestrictions.elevenlabs}
                      onCheckedChange={() => handleToggleAPI('elevenlabs')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Outros Serviços</Label>
                      <p className="text-sm text-muted-foreground">
                        APIs complementares (clima, notícias, etc.)
                      </p>
                    </div>
                    <Switch 
                      checked={!settings.apiRestrictions.others}
                      onCheckedChange={() => handleToggleAPI('others')}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="local-storage-only" 
                      checked={settings.localStorageOnly}
                      onCheckedChange={() => updateSettings({ localStorageOnly: !settings.localStorageOnly })}
                    />
                    <Label htmlFor="local-storage-only" className="font-medium">Modo Offline (Local)</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-7">
                    Força o aplicativo a operar apenas com armazenamento local, sem conexões externas.
                    <br />
                    <span className="text-amber-500 dark:text-amber-400">
                      Atenção: Isso limitará severamente a funcionalidade do assistente.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="mr-2 h-5 w-5" />
                  Mascaramento de Informações
                </CardTitle>
                <CardDescription>
                  Configure como o sistema trata detalhes pessoais em textos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="mask-personal-info" 
                      checked={settings.maskPersonalInfo}
                      onCheckedChange={() => updateSettings({ maskPersonalInfo: !settings.maskPersonalInfo })}
                    />
                    <Label htmlFor="mask-personal-info">Mascarar Informações Pessoais</Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-7">
                    Substitui automaticamente emails, telefones, CPFs, números de cartão e outros dados pessoais 
                    por marcadores genéricos antes de compartilhar com serviços externos.
                  </p>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <Switch 
                      id="anonymize-analytics" 
                      checked={settings.anonymizeAnalytics}
                      onCheckedChange={() => updateSettings({ anonymizeAnalytics: !settings.anonymizeAnalytics })}
                    />
                    <Label htmlFor="anonymize-analytics">Anonimizar Dados Analíticos</Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-7">
                    Remove identificadores pessoais dos dados analíticos antes de agregá-los.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Aba de Criptografia */}
        <TabsContent value="encryption">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                Criptografia Local
              </CardTitle>
              <CardDescription>
                Proteja seus dados armazenados localmente com criptografia forte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="encryption-toggle" 
                  checked={encryptionEnabled}
                  onCheckedChange={handleEncryptionToggle}
                />
                <Label htmlFor="encryption-toggle">Ativar Criptografia Local</Label>
                
                {settings.encryptionEnabled ? (
                  <Badge className="ml-auto bg-green-100 text-green-800 border-green-200 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Inativo
                  </Badge>
                )}
              </div>
              
              <div className={encryptionEnabled && !settings.encryptionEnabled ? "block" : "hidden"}>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina uma senha para criptografar seus dados. Esta senha não será armazenada em nenhum lugar
                  e você precisará fornecê-la sempre que quiser acessar seus dados criptografados.
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="encryption-password">Senha de Criptografia</Label>
                    <div className="relative">
                      <Input 
                        id="encryption-password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite uma senha forte" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirme a Senha</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      placeholder="Confirme sua senha" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button onClick={setupEncryption}>
                    <Key className="mr-2 h-4 w-4" />
                    Configurar Criptografia
                  </Button>
                </div>
              </div>
              
              {settings.encryptionEnabled && (
                <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/10 dark:border-green-800 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Criptografia ativa</AlertTitle>
                  <AlertDescription>
                    Seus dados sensíveis estão protegidos com criptografia AES-256.
                    Não compartilhe sua senha e lembre-se que ela não pode ser recuperada.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Retenção */}
        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Políticas de Retenção
              </CardTitle>
              <CardDescription>
                Defina por quanto tempo seus dados serão armazenados no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Período de Retenção de Dados</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dados mais antigos que este período serão automaticamente excluídos.
                  </p>
                  
                  <div className="mt-6 px-2">
                    <Slider
                      defaultValue={[settings.dataRetentionDays]}
                      max={365}
                      min={7}
                      step={1}
                      onValueChange={handleRetentionChange}
                    />
                    
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-muted-foreground">7 dias</span>
                      <span className="text-sm font-medium">{settings.dataRetentionDays} dias</span>
                      <span className="text-sm text-muted-foreground">1 ano</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button onClick={cleanOldData} variant="outline" className="flex items-center">
                    <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                    Limpar Dados Antigos Agora
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Esta ação removerá imediatamente todos os dados mais antigos que o período de retenção configurado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="mr-2 h-5 w-5" />
                Armazenamento de Dados
              </CardTitle>
              <CardDescription>
                Gerencie onde e como seus dados são armazenados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Server className="h-4 w-4 mr-2" />
                      Armazenamento Local
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dados armazenados apenas no navegador local deste dispositivo.
                      Maior privacidade, mas limitado ao dispositivo atual.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Cloud className="h-4 w-4 mr-2" />
                      Sincronização em Nuvem
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-amber-500 dark:text-amber-400">Em desenvolvimento.</span> Permitirá 
                      sincronização entre dispositivos com criptografia de ponta a ponta.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Exportação */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="mr-2 h-5 w-5" />
                Exportação de Dados
              </CardTitle>
              <CardDescription>
                Exporte seus dados para backup ou uso em outros serviços.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Formato de Exportação</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <div 
                    className={`border rounded-lg p-4 flex-1 cursor-pointer ${exportFormat === 'json' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setExportFormat('json')}
                  >
                    <h3 className="font-medium mb-1 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      JSON (Legível)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Exporta dados em formato legível e compatível com outras aplicações.
                      Não protege seus dados confidenciais.
                    </p>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-4 flex-1 cursor-pointer ${exportFormat === 'encrypted' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setExportFormat('encrypted')}
                  >
                    <h3 className="font-medium mb-1 flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Criptografado 
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Exporta dados criptografados com sua senha local.
                      {!settings.encryptionEnabled && (
                        <span className="text-amber-500 block mt-1">
                          Requer criptografia ativada.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={exportData} 
                className="w-full"
                disabled={exportFormat === 'encrypted' && !settings.encryptionEnabled}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Meus Dados
              </Button>
              
              <p className="text-sm text-muted-foreground">
                O arquivo exportado conterá todas as suas conversas, configurações e outros dados armazenados pelo assistente.
                {exportFormat === 'encrypted' && settings.encryptionEnabled && (
                  <span className="block mt-1 text-blue-600 dark:text-blue-400">
                    Será necessário sua senha de criptografia para acessar os dados exportados.
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldAlert className="mr-2 h-5 w-5" />
                Exclusão de Dados
              </CardTitle>
              <CardDescription>
                Opções para remover seus dados do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Todos os Meus Dados
                </Button>
                
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    Esta ação excluirá permanentemente todos os seus dados e não pode ser desfeita.
                    Recomendamos exportar seus dados antes de prosseguir.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}