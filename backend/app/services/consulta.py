"""Leitura do domínio e montagem dos DTOs.

Cada DTO lista seus campos explicitamente: respostas públicas nunca incluem e-mail, senha,
chave ou sensorId.
"""

import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Ancora, Area, Empresa, Estacionamento, HistoricoOcupacao, MapaCampus, Vaga
from app.models import Sensor as SensorModel


def parse_id(valor: Any, status: int = 404, mensagem: str = "Recurso não encontrado.") -> uuid.UUID:
    try:
        return uuid.UUID(str(valor))
    except (ValueError, TypeError):
        raise ApiError(status, mensagem) from None


def iso(instante: datetime) -> str:
    return instante.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def sem_nulos(**campos: Any) -> dict[str, Any]:
    return {chave: valor for chave, valor in campos.items() if valor is not None}


# ---------- DTOs ----------


def empresa_publica(empresa: Empresa) -> dict:
    return {"id": str(empresa.id), "nome": empresa.nome, "slug": empresa.slug}


def conta_empresa(empresa: Empresa) -> dict:
    return {**empresa_publica(empresa), "email": empresa.email}


def estacionamento_dto(lot: Estacionamento) -> dict:
    return {
        "id": str(lot.id),
        "empresaId": str(lot.empresa_id),
        "nome": lot.nome,
        "descricao": lot.descricao or "",
        **sem_nulos(
            portao=lot.portao,
            caminhadaMinutos=lot.caminhada_minutos,
            caminhadaDestino=lot.caminhada_destino,
        ),
        "latitude": lot.latitude,
        "longitude": lot.longitude,
        "largura": lot.largura,
        "altura": lot.altura,
    }


def vaga_dto(vaga: Vaga, sensor_id: uuid.UUID | None = None, privado: bool = True) -> dict:
    return {
        "id": str(vaga.id),
        "estacionamentoId": str(vaga.estacionamento_id),
        "areaId": str(vaga.area_id),
        "rotulo": vaga.rotulo,
        "tipo": vaga.tipo,
        **sem_nulos(ancoraId=vaga.ancora_id and str(vaga.ancora_id)),
        **(sem_nulos(sensorId=sensor_id and str(sensor_id)) if privado else {}),
    }


def ancora_dto(ancora: Ancora) -> dict:
    return {
        "id": str(ancora.id),
        "areaId": str(ancora.area_id),
        "x": ancora.x,
        "z": ancora.z,
        "rotacao": ancora.rotacao,
        "largura": ancora.largura,
        "profundidade": ancora.profundidade,
        "tiposAceitos": list(ancora.tipos_aceitos),
        **sem_nulos(vagaPadraoId=ancora.vaga_padrao_id and str(ancora.vaga_padrao_id)),
    }


def area_dto(area: Area) -> dict:
    return {
        "id": str(area.id),
        "empresaId": str(area.empresa_id),
        "estacionamentoId": str(area.estacionamento_id),
        "nome": area.nome,
        "contorno": area.contorno,
        "versao": area.versao,
    }


def sensor_dto(sensor: SensorModel) -> dict:
    return {
        "id": str(sensor.id),
        "empresaId": str(sensor.empresa_id),
        "nome": sensor.nome,
        **sem_nulos(
            vagaId=sensor.vaga_id and str(sensor.vaga_id),
            ultimoSinalEm=sensor.ultimo_sinal_em and iso(sensor.ultimo_sinal_em),
        ),
    }


# ---------- Status das vagas ----------


@dataclass
class VagaLida:
    vaga: Vaga
    sensor_id: uuid.UUID | None
    status: str
    atualizado_em: datetime


def status_atual(
    ultimo_status: str | None, ultimo_sinal_em: datetime | None, agora: datetime, expira: int
) -> str:
    if ultimo_status is None or ultimo_sinal_em is None:
        return "SEM_SINAL"
    if agora - ultimo_sinal_em > timedelta(seconds=expira):
        return "SEM_SINAL"
    return ultimo_status


def ordem_natural(rotulo: str) -> list:
    # A2 antes de A10, sem diferença de caixa.
    return [
        (0, int(parte), "") if parte.isdigit() else (1, 0, parte.upper())
        for parte in re.split(r"(\d+)", rotulo)
        if parte
    ]


def ler_vagas(session: Session, expira: int, *condicoes) -> list[VagaLida]:
    agora = datetime.now(UTC)
    linhas = session.execute(
        select(Vaga, SensorModel.id, SensorModel.ultimo_status, SensorModel.ultimo_sinal_em)
        .outerjoin(SensorModel, SensorModel.vaga_id == Vaga.id)
        .where(*condicoes)
    ).all()
    linhas = sorted(linhas, key=lambda linha: ordem_natural(linha[0].rotulo))
    return [
        VagaLida(
            vaga,
            sensor_id,
            status_atual(ultimo_status, sinal, agora, expira),
            sinal or agora,
        )
        for vaga, sensor_id, ultimo_status, sinal in linhas
    ]


def status_dto(lida: VagaLida) -> dict:
    return {
        "vagaId": str(lida.vaga.id),
        "status": lida.status,
        "atualizadoEm": iso(lida.atualizado_em),
    }


def vaga_com_status_dto(lida: VagaLida, privado: bool) -> dict:
    return {
        **vaga_dto(lida.vaga, lida.sensor_id, privado),
        "status": lida.status,
        "atualizadoEm": iso(lida.atualizado_em),
    }


def tendencia(antes: int, agora: int) -> str:
    return "SUBINDO" if agora > antes else "CAINDO" if agora < antes else "ESTAVEL"


def resumo_dto(session: Session, lot: Estacionamento, lidas: list[VagaLida]) -> dict:
    livres = [lida for lida in lidas if lida.status == "LIVRE"]
    antes = session.scalar(
        select(HistoricoOcupacao.livres)
        .where(
            HistoricoOcupacao.estacionamento_id == lot.id,
            HistoricoOcupacao.instante <= datetime.now(UTC) - timedelta(minutes=15),
        )
        .order_by(HistoricoOcupacao.instante.desc())
        .limit(1)
    )
    return {
        **estacionamento_dto(lot),
        "totalVagas": len(lidas),
        "vagasLivres": len(livres),
        "tendencia": tendencia(len(livres) if antes is None else antes, len(livres)),
        "livresPorTipo": {
            tipo: sum(1 for lida in livres if lida.vaga.tipo == tipo)
            for tipo in ("COMUM", "PCD", "MOTO")
        },
    }


def resumos(session: Session, empresa_id: uuid.UUID, expira: int, publico: bool) -> list[dict]:
    lots = session.scalars(
        select(Estacionamento)
        .where(Estacionamento.empresa_id == empresa_id)
        .order_by(Estacionamento.nome, Estacionamento.id)
    ).all()
    condicoes = [Vaga.empresa_id == empresa_id]
    if publico:
        condicoes.append(Vaga.ancora_id.is_not(None))
    por_lot: dict[uuid.UUID, list[VagaLida]] = {}
    for lida in ler_vagas(session, expira, *condicoes):
        por_lot.setdefault(lida.vaga.estacionamento_id, []).append(lida)
    return [resumo_dto(session, lot, por_lot.get(lot.id, [])) for lot in lots]


def detalhe_estacionamento(session: Session, lot: Estacionamento, expira: int, privado: bool):
    condicoes = [Vaga.estacionamento_id == lot.id]
    if not privado:
        condicoes.append(Vaga.ancora_id.is_not(None))
    lidas = ler_vagas(session, expira, *condicoes)
    return {
        **estacionamento_dto(lot),
        "vagas": [vaga_dto(lida.vaga, lida.sensor_id, privado) for lida in lidas],
    }


# ---------- Mapa e áreas ----------


def mapa_dto(session: Session, empresa_id: uuid.UUID) -> dict | None:
    """Geometria salva combinada com nomes atuais das áreas; nunca contém status ou segredos."""
    mapa = session.get(MapaCampus, empresa_id)
    if mapa is None or mapa.cena is None:
        return None
    cena = dict(mapa.cena)
    nomes = {
        str(area_id): nome
        for area_id, nome in session.execute(
            select(Area.id, Area.nome).where(Area.empresa_id == empresa_id)
        )
    }
    cena["areas"] = [
        {**area, "nome": nomes[area["id"]]}
        for area in cena.get("areas", [])
        if area.get("id") in nomes
    ]
    cena["posicoes"] = [p for p in cena.get("posicoes", []) if p.get("areaId") in nomes]
    return cena


def buscar_area(session: Session, area_id: Any, empresa_id: uuid.UUID | None = None) -> Area:
    id_ = parse_id(area_id, mensagem="Área não encontrada.")
    consulta = select(Area).where(Area.id == id_)
    if empresa_id is not None:
        consulta = consulta.where(Area.empresa_id == empresa_id)
    area = session.scalar(consulta)
    if area is None:
        raise ApiError(404, "Área não encontrada.")
    return area


def detalhe_area(session: Session, area: Area, expira: int, privado: bool) -> dict:
    condicoes = [Vaga.area_id == area.id]
    if not privado:
        condicoes.append(Vaga.ancora_id.is_not(None))
    ancoras = session.scalars(
        select(Ancora).where(Ancora.area_id == area.id).order_by(Ancora.x, Ancora.z, Ancora.id)
    ).all()
    return {
        "area": area_dto(area),
        "mapa": mapa_dto(session, area.empresa_id),
        "ancoras": [ancora_dto(a) for a in ancoras],
        "vagas": [
            vaga_com_status_dto(lida, privado) for lida in ler_vagas(session, expira, *condicoes)
        ],
    }


def progresso(session: Session, area: Area) -> dict:
    vagas = session.scalars(select(Vaga).where(Vaga.area_id == area.id)).all()
    return {
        "posicionadas": sum(1 for v in vagas if v.ancora_id is not None),
        "total": len(vagas),
    }


def consulta_campus(session: Session, empresa: Empresa, expira: int) -> dict:
    lidas = ler_vagas(session, expira, Vaga.empresa_id == empresa.id)
    ancoras = {
        a.id: a for a in session.scalars(select(Ancora).where(Ancora.empresa_id == empresa.id))
    }
    vagas = []
    for lida in lidas:
        ancora = ancoras.get(lida.vaga.ancora_id) if lida.vaga.ancora_id else None
        if ancora is None:
            continue
        vagas.append(
            {
                "id": str(lida.vaga.id),
                "rotulo": lida.vaga.rotulo,
                "tipo": lida.vaga.tipo,
                "status": lida.status,
                "atualizadoEm": iso(lida.atualizado_em),
                "areaId": str(lida.vaga.area_id),
                # Âncoras usam unidade da maquete; a cena do campus usa coordenadas x10.
                "ponto": [ancora.x * 10, ancora.z * 10],
                "rotacao": ancora.rotacao,
            }
        )
    return {
        "empresa": empresa_publica(empresa),
        "mapa": mapa_dto(session, empresa.id),
        "vagas": vagas,
        "vagasSemPosicao": len(lidas) - len(vagas),
    }
