from fastapi import FastAPI, Body, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
import uuid
from pathlib import Path

# Modelos de dados
class Tarefa(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titulo: str
    descricao: str
    estado: str = "pendente"  # pendente, em_andamento, concluida, falha
    agente_responsavel: Optional[str] = None
    prioridade: str = "normal"  # baixa, normal, alta, critica
    timestamp_criacao: str = Field(default_factory=lambda: datetime.now().isoformat())
    timestamp_atualizacao: Optional[str] = None
    resultado: Optional[str] = None
    contexto: Optional[Dict[str, Any]] = None

class Diagnostico(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str  # sistema, agente, tarefa, conexao
    descricao: str
    severidade: str = "info"  # info, aviso, erro, critico
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    detalhes: Optional[Dict[str, Any]] = None
    sugestoes: Optional[List[str]] = None

class Correcao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    diagnostico_id: Optional[str] = None
    descricao: str
    codigo: Optional[str] = None
    aplicada: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    resultado: Optional[str] = None

class Sugestao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str  # otimizacao, nova_funcionalidade, correcao, arquitetura
    titulo: str
    descricao: str
    prioridade: str = "media"  # baixa, media, alta
    implementada: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    detalhes: Optional[Dict[str, Any]] = None

# Inicialização do armazenamento
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

TAREFAS_FILE = DATA_DIR / "tarefas.json"
DIAGNOSTICOS_FILE = DATA_DIR / "diagnosticos.json"
CORRECOES_FILE = DATA_DIR / "correcoes.json"
SUGESTOES_FILE = DATA_DIR / "sugestoes.json"

# Funções de persistência
def carregar_dados(arquivo: Path, default=None):
    if default is None:
        default = []
    
    if not arquivo.exists():
        return default
    
    try:
        with open(arquivo, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return default

def salvar_dados(arquivo: Path, dados):
    with open(arquivo, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, default=str, indent=2)

# Inicialização da API
app = FastAPI(
    title="API Privada Assistente Inteligente",
    description="API para gerenciamento de tarefas, diagnósticos e melhorias do sistema de assistentes inteligentes",
    version="1.0.0"
)

# Configurar CORS para permitir acesso do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restringir para domínios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas da API
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "API Privada Assistente Inteligente - Luiz",
        "timestamp": datetime.now().isoformat()
    }

# Rotas para Tarefas
@app.post("/tarefa", response_model=Tarefa, status_code=status.HTTP_201_CREATED)
async def criar_tarefa(tarefa: Tarefa = Body(...)):
    tarefas = carregar_dados(TAREFAS_FILE)
    tarefas.append(tarefa.dict())
    salvar_dados(TAREFAS_FILE, tarefas)
    return tarefa

@app.get("/tarefas", response_model=List[Tarefa])
async def listar_tarefas(
    estado: Optional[str] = Query(None),
    agente: Optional[str] = Query(None),
    prioridade: Optional[str] = Query(None),
    limite: int = Query(100, ge=1, le=1000)
):
    tarefas = carregar_dados(TAREFAS_FILE)
    
    # Aplicar filtros
    if estado:
        tarefas = [t for t in tarefas if t.get("estado") == estado]
    if agente:
        tarefas = [t for t in tarefas if t.get("agente_responsavel") == agente]
    if prioridade:
        tarefas = [t for t in tarefas if t.get("prioridade") == prioridade]
    
    # Ordenar por prioridade e timestamp
    tarefas.sort(key=lambda x: (
        {"critica": 0, "alta": 1, "normal": 2, "baixa": 3}.get(x.get("prioridade", "normal"), 2),
        x.get("timestamp_criacao", "")
    ))
    
    return tarefas[:limite]

@app.get("/tarefa/{tarefa_id}", response_model=Tarefa)
async def obter_tarefa(tarefa_id: str):
    tarefas = carregar_dados(TAREFAS_FILE)
    for tarefa in tarefas:
        if tarefa.get("id") == tarefa_id:
            return tarefa
    raise HTTPException(status_code=404, detail=f"Tarefa {tarefa_id} não encontrada")

@app.patch("/tarefa/{tarefa_id}", response_model=Tarefa)
async def atualizar_tarefa(tarefa_id: str, atualizacao: Dict[str, Any] = Body(...)):
    tarefas = carregar_dados(TAREFAS_FILE)
    
    for i, tarefa in enumerate(tarefas):
        if tarefa.get("id") == tarefa_id:
            # Atualizar campos
            tarefas[i].update(atualizacao)
            # Atualizar timestamp
            tarefas[i]["timestamp_atualizacao"] = datetime.now().isoformat()
            salvar_dados(TAREFAS_FILE, tarefas)
            return tarefas[i]
    
    raise HTTPException(status_code=404, detail=f"Tarefa {tarefa_id} não encontrada")

# Rotas para Diagnósticos
@app.post("/diagnostico", response_model=Diagnostico, status_code=status.HTTP_201_CREATED)
async def criar_diagnostico(diagnostico: Diagnostico = Body(...)):
    diagnosticos = carregar_dados(DIAGNOSTICOS_FILE)
    diagnosticos.append(diagnostico.dict())
    salvar_dados(DIAGNOSTICOS_FILE, diagnosticos)
    return diagnostico

@app.get("/diagnosticos", response_model=List[Diagnostico])
async def listar_diagnosticos(
    tipo: Optional[str] = Query(None),
    severidade: Optional[str] = Query(None),
    limite: int = Query(100, ge=1, le=1000)
):
    diagnosticos = carregar_dados(DIAGNOSTICOS_FILE)
    
    # Aplicar filtros
    if tipo:
        diagnosticos = [d for d in diagnosticos if d.get("tipo") == tipo]
    if severidade:
        diagnosticos = [d for d in diagnosticos if d.get("severidade") == severidade]
    
    # Ordenar por severidade e timestamp
    diagnosticos.sort(key=lambda x: (
        {"critico": 0, "erro": 1, "aviso": 2, "info": 3}.get(x.get("severidade", "info"), 3),
        x.get("timestamp", "")
    ), reverse=True)
    
    return diagnosticos[:limite]

# Rotas para Correções
@app.post("/correcao", response_model=Correcao, status_code=status.HTTP_201_CREATED)
async def criar_correcao(correcao: Correcao = Body(...)):
    correcoes = carregar_dados(CORRECOES_FILE)
    correcoes.append(correcao.dict())
    salvar_dados(CORRECOES_FILE, correcoes)
    return correcao

@app.get("/correcoes", response_model=List[Correcao])
async def listar_correcoes(
    aplicada: Optional[bool] = Query(None),
    diagnostico_id: Optional[str] = Query(None),
    limite: int = Query(100, ge=1, le=1000)
):
    correcoes = carregar_dados(CORRECOES_FILE)
    
    # Aplicar filtros
    if aplicada is not None:
        correcoes = [c for c in correcoes if c.get("aplicada") == aplicada]
    if diagnostico_id:
        correcoes = [c for c in correcoes if c.get("diagnostico_id") == diagnostico_id]
    
    # Ordenar por timestamp
    correcoes.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return correcoes[:limite]

# Rotas para Sugestões
@app.post("/sugestao", response_model=Sugestao, status_code=status.HTTP_201_CREATED)
async def criar_sugestao(sugestao: Sugestao = Body(...)):
    sugestoes = carregar_dados(SUGESTOES_FILE)
    sugestoes.append(sugestao.dict())
    salvar_dados(SUGESTOES_FILE, sugestoes)
    return sugestao

@app.get("/sugestoes", response_model=List[Sugestao])
async def listar_sugestoes(
    tipo: Optional[str] = Query(None),
    prioridade: Optional[str] = Query(None),
    implementada: Optional[bool] = Query(None),
    limite: int = Query(100, ge=1, le=1000)
):
    sugestoes = carregar_dados(SUGESTOES_FILE)
    
    # Aplicar filtros
    if tipo:
        sugestoes = [s for s in sugestoes if s.get("tipo") == tipo]
    if prioridade:
        sugestoes = [s for s in sugestoes if s.get("prioridade") == prioridade]
    if implementada is not None:
        sugestoes = [s for s in sugestoes if s.get("implementada") == implementada]
    
    # Ordenar por prioridade e timestamp
    sugestoes.sort(key=lambda x: (
        {"alta": 0, "media": 1, "baixa": 2}.get(x.get("prioridade", "media"), 1),
        x.get("timestamp", "")
    ))
    
    return sugestoes[:limite]

# Rota para Status do Sistema
@app.get("/status")
async def obter_status():
    tarefas = carregar_dados(TAREFAS_FILE)
    diagnosticos = carregar_dados(DIAGNOSTICOS_FILE)
    correcoes = carregar_dados(CORRECOES_FILE)
    sugestoes = carregar_dados(SUGESTOES_FILE)
    
    # Contar tarefas por estado
    tarefas_por_estado = {}
    for tarefa in tarefas:
        estado = tarefa.get("estado", "pendente")
        tarefas_por_estado[estado] = tarefas_por_estado.get(estado, 0) + 1
    
    # Contar diagnósticos por severidade
    diagnosticos_por_severidade = {}
    for diag in diagnosticos:
        severidade = diag.get("severidade", "info")
        diagnosticos_por_severidade[severidade] = diagnosticos_por_severidade.get(severidade, 0) + 1
    
    # Contar correções aplicadas/pendentes
    correcoes_aplicadas = sum(1 for c in correcoes if c.get("aplicada", False))
    
    # Contar sugestões implementadas/pendentes
    sugestoes_implementadas = sum(1 for s in sugestoes if s.get("implementada", False))
    
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "tarefas": {
            "total": len(tarefas),
            "por_estado": tarefas_por_estado
        },
        "diagnosticos": {
            "total": len(diagnosticos),
            "por_severidade": diagnosticos_por_severidade
        },
        "correcoes": {
            "total": len(correcoes),
            "aplicadas": correcoes_aplicadas,
            "pendentes": len(correcoes) - correcoes_aplicadas
        },
        "sugestoes": {
            "total": len(sugestoes),
            "implementadas": sugestoes_implementadas,
            "pendentes": len(sugestoes) - sugestoes_implementadas
        }
    }

# Rota de integração com o orquestrador
@app.get("/orquestrador/ciclos")
async def listar_ciclos_orquestrador():
    try:
        # Esta parte será implementada para conectar ao orquestrador Node.js
        from requests import get
        
        response = get("http://localhost:5000/api/system-orchestrator/status")
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": "Erro ao conectar com o orquestrador", "status_code": response.status_code}
    except Exception as e:
        return {"error": f"Erro ao conectar com o orquestrador: {str(e)}"}

@app.post("/orquestrador/executar-ciclo")
async def executar_ciclo_orquestrador():
    try:
        # Esta parte será implementada para conectar ao orquestrador Node.js
        from requests import post
        
        response = post("http://localhost:5000/api/system-orchestrator/execute-cycle")
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": "Erro ao executar ciclo no orquestrador", "status_code": response.status_code}
    except Exception as e:
        return {"error": f"Erro ao executar ciclo no orquestrador: {str(e)}"}

# Para iniciar o servidor, execute:
# uvicorn api:app --reload --port 8000