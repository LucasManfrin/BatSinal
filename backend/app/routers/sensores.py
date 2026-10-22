"""Sensores da empresa, leituras dos dispositivos e simulador de demonstração."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import EmpresaDep, SessionDep, SettingsDep
from app.errors import ApiError
from app.models import Sensor as SensorModel
from app.models import Vaga
from app.schemas import Leitura, LeituraSimulada, SensorEntrada
from app.security import hash_token, nova_chave_dispositivo
from app.services.consulta import iso, parse_id, sensor_dto
from app.services.ocupacao import amostrar, registrar_leitura

router = APIRouter(tags=["sensores"])


def _buscar_sensor(session: Session, sensor_id: str, empresa: EmpresaDep) -> SensorModel:
    sensor = session.scalar(
        select(SensorModel).where(
            SensorModel.id == parse_id(sensor_id, mensagem="Sensor não encontrado."),
            SensorModel.empresa_id == empresa.id,
        )
    )
    if sensor is None:
        raise ApiError(404, "Sensor não encontrado.")
    return sensor


def _vincular(session: Session, sensor: SensorModel, vaga_id: str | None, empresa: EmpresaDep):
    if vaga_id is None:
        sensor.vaga_id = None
        return
    id_ = parse_id(vaga_id, 422, "Vaga inexistente ou já vinculada.")
    vaga = session.scalar(select(Vaga.id).where(Vaga.id == id_, Vaga.empresa_id == empresa.id))
    outro = session.scalar(
        select(SensorModel.id).where(SensorModel.vaga_id == id_, SensorModel.id != sensor.id)
    )
    if vaga is None or outro is not None:
        raise ApiError(422, "Vaga inexistente ou já vinculada.", {"vagaId": "Escolha outra vaga."})
    sensor.vaga_id = id_


@router.get("/sensores")
def listar(session: SessionDep, empresa: EmpresaDep):
    sensores = session.scalars(
        select(SensorModel)
        .where(SensorModel.empresa_id == empresa.id)
        .order_by(SensorModel.nome, SensorModel.id)
    )
    return [sensor_dto(s) for s in sensores]


@router.post("/sensores", status_code=201)
def criar(body: SensorEntrada, session: SessionDep, empresa: EmpresaDep):
    chave = nova_chave_dispositivo()
    sensor = SensorModel(empresa_id=empresa.id, nome=body.nome, chave_hash=hash_token(chave))
    session.add(sensor)
    session.flush()
    _vincular(session, sensor, body.vaga_id, empresa)
    session.commit()
    # A chave aparece somente nesta resposta; o banco guarda apenas o hash.
    return {**sensor_dto(sensor), "deviceKey": chave}


@router.put("/sensores/{sensor_id}")
def alterar(sensor_id: str, body: SensorEntrada, session: SessionDep, empresa: EmpresaDep):
    sensor = _buscar_sensor(session, sensor_id, empresa)
    sensor.nome = body.nome
    _vincular(session, sensor, body.vaga_id, empresa)
    session.commit()
    return sensor_dto(sensor)


@router.post("/sensores/{sensor_id}/chave", status_code=201)
def nova_chave(sensor_id: str, session: SessionDep, empresa: EmpresaDep):
    """Gera outra chave do dispositivo; a anterior deixa de funcionar."""
    sensor = _buscar_sensor(session, sensor_id, empresa)
    chave = nova_chave_dispositivo()
    sensor.chave_hash = hash_token(chave)
    session.commit()
    return {**sensor_dto(sensor), "deviceKey": chave}


@router.delete("/sensores/{sensor_id}")
def excluir(sensor_id: str, session: SessionDep, empresa: EmpresaDep):
    session.delete(_buscar_sensor(session, sensor_id, empresa))
    session.commit()
    return None


@router.post("/leituras", status_code=201, tags=["dispositivos"])
def receber_leitura(
    body: Leitura,
    session: SessionDep,
    settings: SettingsDep,
    x_device_key: str | None = Header(default=None),
):
    """Endpoint dos dispositivos (ESP32). Autentica pela chave do sensor, não por sessão."""
    sensor = (
        session.scalar(
            select(SensorModel).where(SensorModel.chave_hash == hash_token(x_device_key))
        )
        if x_device_key
        else None
    )
    if sensor is None:
        raise ApiError(401, "Chave do dispositivo inválida.")
    recebido = registrar_leitura(session, settings, sensor, body.status)
    session.commit()
    return {
        "sensorId": str(sensor.id),
        **({"vagaId": str(sensor.vaga_id)} if sensor.vaga_id else {}),
        "status": body.status,
        "recebidoEm": iso(recebido),
    }


@router.post("/simulador/leituras", status_code=201, tags=["simulador"])
def simular_leitura(
    body: LeituraSimulada, session: SessionDep, settings: SettingsDep, empresa: EmpresaDep
):
    """Plano B da apresentação. Desligado por padrão (BATSINAL_SIMULADOR=true para ativar)."""
    if not settings.simulador:
        raise ApiError(404, "Rota não encontrada.")
    vaga_id = parse_id(body.vaga_id, mensagem="Vaga não encontrada.")
    sensor = session.scalar(
        select(SensorModel).where(
            SensorModel.vaga_id == vaga_id, SensorModel.empresa_id == empresa.id
        )
    )
    if sensor is None:
        raise ApiError(422, "Vincule um sensor a esta vaga antes de simular.")
    if body.status == "SEM_SINAL":
        sensor.ultimo_status = None
        sensor.ultimo_sinal_em = datetime.now(UTC) - timedelta(
            seconds=settings.sinal_expira_segundos + 1
        )
        session.flush()
        lot_id = session.scalar(select(Vaga.estacionamento_id).where(Vaga.id == vaga_id))
        amostrar(session, settings, lot_id)
    else:
        registrar_leitura(session, settings, sensor, body.status)
    session.commit()
    return {"vagaId": str(vaga_id), "status": body.status}
