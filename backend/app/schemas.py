"""Corpos de requisição. O contrato HTTP usa camelCase; campos extras são ignorados."""

import re
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints
from pydantic.alias_generators import to_camel

TipoVaga = Literal["COMUM", "PCD", "MOTO"]
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _vazio_para_none(value: Any) -> Any:
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _slug(value: Any) -> Any:
    if not isinstance(value, str) or not (3 <= len(value) <= 60) or not SLUG_RE.match(value):
        raise ValueError("Use de 3 a 60 letras minúsculas, números e hífens.")
    return value


def _email(value: Any) -> Any:
    if not isinstance(value, str):
        raise ValueError("Informe um e-mail válido.")
    value = value.strip().lower()
    if len(value) > 254 or not EMAIL_RE.match(value):
        raise ValueError("Informe um e-mail válido.")
    return value


Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
Rotulo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Slug = Annotated[str, BeforeValidator(_slug)]
Email = Annotated[str, BeforeValidator(_email)]
Senha = Annotated[str, StringConstraints(min_length=8, max_length=256)]
TextoOpcional = Annotated[
    str | None,
    BeforeValidator(_vazio_para_none),
    StringConstraints(strip_whitespace=True, max_length=100),
]
IdOpcional = Annotated[str | None, BeforeValidator(_vazio_para_none)]


class Entrada(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class CadastroEmpresa(Entrada):
    nome: Nome
    slug: Slug
    email: Email
    senha: Senha


class Login(Entrada):
    email: Any = ""
    senha: Any = ""


class EmpresaUpdate(Entrada):
    nome: Nome
    slug: Slug


class SenhaUpdate(Entrada):
    senha_atual: str
    nova_senha: Senha


class EstacionamentoEntrada(Entrada):
    nome: Nome
    descricao: str | None = Field(default=None, max_length=2000)
    portao: TextoOpcional = None
    caminhada_destino: TextoOpcional = None
    caminhada_minutos: Annotated[
        int | None, BeforeValidator(_vazio_para_none), Field(ge=1, le=120)
    ] = None
    latitude: float = Field(default=-22.327, ge=-90, le=90)
    longitude: float = Field(default=-49.054, ge=-180, le=180)
    largura: float = Field(default=780, ge=200, le=10000)
    altura: float = Field(default=680, ge=200, le=10000)


class AncoraImportada(Entrada):
    x: float = Field(ge=-10000, le=10000, allow_inf_nan=False)
    z: float = Field(ge=-10000, le=10000, allow_inf_nan=False)
    rotacao: float = Field(ge=-360, le=360, allow_inf_nan=False)
    largura: float = Field(gt=0, le=1000, allow_inf_nan=False)
    profundidade: float = Field(gt=0, le=1000, allow_inf_nan=False)
    tipos_aceitos: list[TipoVaga] = Field(min_length=1, max_length=3)


class AreaCriacao(Entrada):
    nome: Rotulo
    estacionamento_id: str
    # Validadas no serviço, para responder com a mensagem própria da importação.
    ancoras: list[Any] = Field(default_factory=list)


class AreaUpdate(Entrada):
    nome: Rotulo
    versao: int | None = None


class Versao(Entrada):
    versao: int | None = None


class PosicaoVaga(Entrada):
    ancora_id: str | None
    versao: int | None = None


class ItemPosicao(Entrada):
    vaga_id: str
    ancora_id: str | None


class PosicoesArea(Entrada):
    versao: int | None = None
    posicoes: list[ItemPosicao] = Field(max_length=5000)


class VagaCriacao(Entrada):
    area_id: str
    rotulo: Rotulo
    tipo: TipoVaga


class VagaUpdate(Entrada):
    rotulo: Rotulo
    tipo: TipoVaga


class SensorEntrada(Entrada):
    nome: Nome
    vaga_id: IdOpcional = None


class Leitura(Entrada):
    status: Literal["LIVRE", "OCUPADA"]


class LeituraSimulada(Entrada):
    vaga_id: str
    status: Literal["LIVRE", "OCUPADA", "SEM_SINAL"]
