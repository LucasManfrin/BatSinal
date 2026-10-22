"""CRUD privado de estacionamentos, status e histórico, sempre no escopo da empresa do token."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth import EmpresaDep, SessionDep, SettingsDep
from app.errors import ApiError
from app.models import Estacionamento, Vaga
from app.models import Sensor as SensorModel
from app.schemas import EstacionamentoEntrada
from app.services.consulta import (
    detalhe_estacionamento,
    ler_vagas,
    parse_id,
    resumos,
    status_dto,
)
from app.services.ocupacao import GRANULARIDADES, heatmap, serie_ocupacao

router = APIRouter(prefix="/estacionamentos", tags=["estacionamentos"])


def buscar_estacionamento(
    session: Session, lot_id: str, empresa: EmpresaDep, bloquear: bool = False
) -> Estacionamento:
    consulta = select(Estacionamento).where(
        Estacionamento.id == parse_id(lot_id, mensagem="Estacionamento não encontrado."),
        Estacionamento.empresa_id == empresa.id,
    )
    if bloquear:
        consulta = consulta.with_for_update()
    lot = session.scalar(consulta)
    if lot is None:
        raise ApiError(404, "Estacionamento não encontrado.")
    return lot


def _aplicar(lot: Estacionamento, body: EstacionamentoEntrada, novo: bool) -> None:
    enviados = body.model_fields_set

    def valor(campo: str, atual):
        # Na edição, campos ausentes preservam o valor salvo; null/"" limpa os opcionais.
        return getattr(body, campo) if novo or campo in enviados else atual

    lot.nome = body.nome
    lot.descricao = body.descricao or ""
    lot.portao = valor("portao", lot.portao)
    lot.caminhada_destino = valor("caminhada_destino", lot.caminhada_destino)
    lot.caminhada_minutos = valor("caminhada_minutos", lot.caminhada_minutos)
    for campo in ("latitude", "longitude", "largura", "altura"):
        setattr(lot, campo, valor(campo, getattr(lot, campo)))
    if (lot.caminhada_destino is None) != (lot.caminhada_minutos is None):
        raise ApiError(
            422,
            "Informe destino e tempo de caminhada juntos.",
            {"caminhadaDestino": "Preencha o destino e os minutos, ou deixe ambos vazios."},
        )


@router.get("")
def listar(session: SessionDep, settings: SettingsDep, empresa: EmpresaDep):
    return resumos(session, empresa.id, settings.sinal_expira_segundos, publico=False)


@router.post("", status_code=201)
def criar(
    body: EstacionamentoEntrada, session: SessionDep, settings: SettingsDep, empresa: EmpresaDep
):
    lot = Estacionamento(empresa_id=empresa.id)
    _aplicar(lot, body, novo=True)
    session.add(lot)
    session.commit()
    return detalhe_estacionamento(session, lot, settings.sinal_expira_segundos, privado=True)


@router.get("/{lot_id}")
def ler(lot_id: str, session: SessionDep, settings: SettingsDep, empresa: EmpresaDep):
    lot = buscar_estacionamento(session, lot_id, empresa)
    return detalhe_estacionamento(session, lot, settings.sinal_expira_segundos, privado=True)


@router.put("/{lot_id}")
def alterar(
    lot_id: str,
    body: EstacionamentoEntrada,
    session: SessionDep,
    settings: SettingsDep,
    empresa: EmpresaDep,
):
    lot = buscar_estacionamento(session, lot_id, empresa, bloquear=True)
    _aplicar(lot, body, novo=False)
    session.commit()
    return detalhe_estacionamento(session, lot, settings.sinal_expira_segundos, privado=True)


@router.delete("/{lot_id}")
def excluir(lot_id: str, session: SessionDep, empresa: EmpresaDep):
    lot = buscar_estacionamento(session, lot_id, empresa, bloquear=True)
    # Sensores sobrevivem sem vínculo. Áreas, âncoras, vagas e histórico caem em cascata.
    session.execute(
        update(SensorModel)
        .where(SensorModel.vaga_id.in_(select(Vaga.id).where(Vaga.estacionamento_id == lot.id)))
        .values(vaga_id=None)
    )
    session.delete(lot)
    session.commit()
    return None


@router.get("/{lot_id}/status")
def status(lot_id: str, session: SessionDep, settings: SettingsDep, empresa: EmpresaDep):
    lot = buscar_estacionamento(session, lot_id, empresa)
    lidas = ler_vagas(session, settings.sinal_expira_segundos, Vaga.estacionamento_id == lot.id)
    return [status_dto(lida) for lida in lidas]


def _instante(valor: str | None, padrao: datetime) -> datetime:
    if valor is None:
        return padrao
    try:
        instante = datetime.fromisoformat(valor)
    except ValueError:
        raise ApiError(422, "Período ou granularidade inválido.") from None
    return instante if instante.tzinfo else instante.replace(tzinfo=UTC)


@router.get("/{lot_id}/ocupacao")
def ocupacao(
    lot_id: str,
    session: SessionDep,
    settings: SettingsDep,
    empresa: EmpresaDep,
    de: str | None = None,
    ate: str | None = None,
    granularidade: str = "hora",
):
    lot = buscar_estacionamento(session, lot_id, empresa)
    agora = datetime.now(UTC)
    inicio = _instante(de, agora - timedelta(days=1))
    fim = _instante(ate, agora)
    if inicio > fim or granularidade not in GRANULARIDADES:
        raise ApiError(422, "Período ou granularidade inválido.")
    return serie_ocupacao(session, lot.id, inicio, fim, granularidade, settings.fuso_horario)


@router.get("/{lot_id}/heatmap")
def mapa_calor(lot_id: str, session: SessionDep, settings: SettingsDep, empresa: EmpresaDep):
    lot = buscar_estacionamento(session, lot_id, empresa)
    return heatmap(session, lot.id, settings.fuso_horario)
