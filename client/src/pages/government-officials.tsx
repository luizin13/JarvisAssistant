import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { GovernmentOfficial } from "@/lib/types";

export default function GovernmentOfficialsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState<string | undefined>();
  const [selectedAuthority, setSelectedAuthority] = useState<string | undefined>();
  const [selectedCreditProgram, setSelectedCreditProgram] = useState<string | undefined>();
  const [selectedOfficial, setSelectedOfficial] = useState<GovernmentOfficial | null>(null);
  
  const [useApiSource, setUseApiSource] = useState(true);
  
  const { data: officials, isLoading, error } = useQuery<GovernmentOfficial[]>({
    queryKey: [
      '/api/government-officials', 
      selectedInstitution, 
      selectedAuthority, 
      selectedCreditProgram,
      useApiSource ? 'api' : 'mock'
    ],
    queryFn: async ({ queryKey }) => {
      const [endpoint, institution, authority, creditProgram, source] = queryKey;
      const params = new URLSearchParams();
      
      if (institution) params.append('institution', institution as string);
      if (authority) params.append('authority', authority as string);
      if (creditProgram) params.append('creditProgram', creditProgram as string);
      if (source) params.append('source', source as string);
      
      // Adicionar parâmetros específicos da API oficial
      if (source === 'api') {
        // Se temos busca de texto, usamos como nome para a API
        if (searchTerm) params.append('nome', searchTerm);
      }
      
      const url = `${endpoint}?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar autoridades governamentais');
      }
      
      return response.json();
    }
  });
  
  const getAuthorityBadge = (authority: string) => {
    switch (authority) {
      case "alta":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Autoridade Alta</Badge>;
      case "média":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Autoridade Média</Badge>;
      case "baixa":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Autoridade Baixa</Badge>;
      default:
        return null;
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  const filteredOfficials = officials?.filter(official => {
    if (searchTerm === "") return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      official.name.toLowerCase().includes(searchLower) ||
      official.position.toLowerCase().includes(searchLower) ||
      official.institution.toLowerCase().includes(searchLower) ||
      official.creditProgram.toLowerCase().includes(searchLower) ||
      official.department.toLowerCase().includes(searchLower)
    );
  });
  
  // Lista de instituições únicas para o filtro
  const institutionsSet = new Set<string>();
  officials?.forEach(official => institutionsSet.add(official.institution));
  const institutions = Array.from(institutionsSet).sort();
  
  // Lista de programas de crédito únicos para o filtro  
  const creditProgramsSet = new Set<string>();
  officials?.forEach(official => creditProgramsSet.add(official.creditProgram));
  const creditPrograms = Array.from(creditProgramsSet).sort();
  
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Autoridades Governamentais de Crédito
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Informações sobre os responsáveis por programas de crédito para agricultura e transporte.
        </p>
      </div>
      
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Fonte de dados</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Dados simulados</span>
              <Switch
                checked={useApiSource}
                onCheckedChange={setUseApiSource}
                id="api-source"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">API oficial</span>
            </div>
          </div>
          <CardDescription>
            {useApiSource 
              ? "Utilizando a API oficial do Portal da Transparência para buscar dados atuais."
              : "Utilizando dados simulados para demonstração."}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"></i>
              <Input 
                type="text" 
                placeholder="Buscar autoridades..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select 
              onValueChange={(value) => setSelectedInstitution(value !== "all" ? value : undefined)} 
              defaultValue="all"
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas instituições" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas instituições</SelectItem>
                {institutions?.map(institution => (
                  <SelectItem key={institution} value={institution}>{institution}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              onValueChange={(value) => setSelectedCreditProgram(value !== "all" ? value : undefined)} 
              defaultValue="all"
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos programas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos programas</SelectItem>
                {creditPrograms?.map(program => (
                  <SelectItem key={program} value={program}>{program}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              onValueChange={(value) => setSelectedAuthority(value !== "all" ? value : undefined)} 
              defaultValue="all"
            >
              <SelectTrigger>
                <SelectValue placeholder="Qualquer autoridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer autoridade</SelectItem>
                <SelectItem value="alta">Autoridade Alta</SelectItem>
                <SelectItem value="média">Autoridade Média</SelectItem>
                <SelectItem value="baixa">Autoridade Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <p className="text-red-700 dark:text-red-400">Erro ao carregar as autoridades governamentais</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredOfficials?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <i className="ri-user-search-line text-3xl text-gray-500 dark:text-gray-400"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma autoridade encontrada</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Não encontramos autoridades que correspondam aos seus critérios de busca. Tente modificar os filtros ou realizar uma nova busca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOfficials?.map((official) => (
              <Card key={official.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12 border border-gray-200 dark:border-gray-700">
                      <AvatarImage src={official.photoUrl} alt={official.name} />
                      <AvatarFallback>{getInitials(official.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{official.name}</CardTitle>
                      <CardDescription className="line-clamp-1">{official.position}</CardDescription>
                      {official.appointmentDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Nomeado em: {new Date(official.appointmentDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <i className="ri-building-line text-gray-500 dark:text-gray-400 mr-2"></i>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{official.institution}</span>
                    </div>
                    <div className="flex items-center">
                      <i className="ri-government-line text-gray-500 dark:text-gray-400 mr-2"></i>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{official.department}</span>
                    </div>
                    <div className="flex items-center">
                      <i className="ri-bank-card-line text-gray-500 dark:text-gray-400 mr-2"></i>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{official.creditProgram}</span>
                    </div>
                    <div className="flex items-center">
                      <i className="ri-map-pin-line text-gray-500 dark:text-gray-400 mr-2"></i>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{official.region}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-3">
                  {getAuthorityBadge(official.authority)}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedOfficial(official)}
                      >
                        Ver detalhes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{official.name}</DialogTitle>
                        <DialogDescription>
                          {official.position} - {official.institution}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex justify-center mb-2">
                          <Avatar className="h-32 w-32 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={official.photoUrl} alt={official.name} />
                            <AvatarFallback className="text-3xl">{getInitials(official.name)}</AvatarFallback>
                          </Avatar>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="font-semibold text-gray-700 dark:text-gray-300">Cargo:</div>
                          <div className="col-span-2">{official.position}</div>
                          
                          <div className="font-semibold text-gray-700 dark:text-gray-300">Departamento:</div>
                          <div className="col-span-2">{official.department}</div>
                          
                          <div className="font-semibold text-gray-700 dark:text-gray-300">Instituição:</div>
                          <div className="col-span-2">{official.institution}</div>
                          
                          <div className="font-semibold text-gray-700 dark:text-gray-300">Programa:</div>
                          <div className="col-span-2">{official.creditProgram}</div>
                          
                          <div className="font-semibold text-gray-700 dark:text-gray-300">Região:</div>
                          <div className="col-span-2">{official.region}</div>
                          
                          <div className="font-semibold text-gray-700 dark:text-gray-300">Autoridade:</div>
                          <div className="col-span-2">{getAuthorityBadge(official.authority)}</div>
                          
                          {official.appointmentDate && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Data de nomeação:</div>
                              <div className="col-span-2">{new Date(official.appointmentDate).toLocaleDateString('pt-BR')}</div>
                            </>
                          )}
                          
                          {official.contactInfo && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Contato:</div>
                              <div className="col-span-2">{official.contactInfo}</div>
                            </>
                          )}
                          
                          {official.email && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Email:</div>
                              <div className="col-span-2">
                                <a href={`mailto:${official.email}`} className="text-primary-600 hover:underline">
                                  {official.email}
                                </a>
                              </div>
                            </>
                          )}
                          
                          {official.phone && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Telefone:</div>
                              <div className="col-span-2">{official.phone}</div>
                            </>
                          )}
                          
                          {official.officeAddress && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Endereço:</div>
                              <div className="col-span-2">{official.officeAddress}</div>
                            </>
                          )}
                          
                          {official.education && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Formação:</div>
                              <div className="col-span-2">{official.education}</div>
                            </>
                          )}
                          
                          {official.officialWebsite && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Site oficial:</div>
                              <div className="col-span-2">
                                <a href={official.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                                  Visitar site <i className="ri-external-link-line text-xs"></i>
                                </a>
                              </div>
                            </>
                          )}
                          
                          {official.dataSource && (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300">Fonte dos dados:</div>
                              <div className="col-span-2 text-xs">{official.dataSource}</div>
                            </>
                          )}
                        </div>
                        
                        {official.biography && (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Biografia:</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {official.biography}
                            </p>
                          </div>
                        )}
                        
                        {official.careerBackground && (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Experiência:</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {official.careerBackground}
                            </p>
                          </div>
                        )}
                        
                        {official.responsibilityAreas && official.responsibilityAreas.length > 0 && (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Áreas de Responsabilidade:</div>
                            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {official.responsibilityAreas.map((area, index) => (
                                <li key={index}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {official.recentActions && official.recentActions.length > 0 && (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Ações Recentes:</div>
                            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {official.recentActions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {official.recentPublications && official.recentPublications.length > 0 && (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Publicações Recentes:</div>
                            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {official.recentPublications.map((publication, index) => (
                                <li key={index}>{publication}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {official.socialMedia && (official.socialMedia.linkedin || official.socialMedia.twitter) && (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Redes Sociais:</div>
                            <div className="flex space-x-3">
                              {official.socialMedia.linkedin && (
                                <a href={official.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  <i className="ri-linkedin-box-fill text-2xl"></i>
                                </a>
                              )}
                              {official.socialMedia.twitter && (
                                <a href={official.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600">
                                  <i className="ri-twitter-x-fill text-2xl"></i>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}