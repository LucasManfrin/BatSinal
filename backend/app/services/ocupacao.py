"""Leituras dos sensores e histórico agregado de ocupação.

Ocupação = indisponibilidade (ocupada + sem sinal), como no painel. O histórico guarda uma
amostra por estacionamento a cada 5 minutos (UPSERT do intervalo), inclusive sem movimento,
para refletir sensores que expiram.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, literal_column, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Estacionamento, HistoricoOcupacao, Vaga
from app.models import Sensor as SensorModel
from app.services.consulta import iso, ler_vagas

INTERVALO_AMOSTRA = timedelta(minutes=5)
GRANULARIDADES = {"30min": "30min", "hora": "hour", "dia": "day"}


def inicio_intervalo(instante: datetime) -> datetime:
    segundos = INTERVALO_AMOSTRA.total_seconds()
    return datetime.fromtimestamp(instante.timestamp() // segundos * segundos, UTC)


def amostrar(
    session: Session, settings: Settings, estacionamento_id: uuid.UUID | None = None
) -> int:
    agora = datetime.now(UTC)
    condicoes = [] if estacionamento_id is None else [Vaga.estacionamento_id == estacionamento_id]
    contagem: dict[uuid.UUID, dict[str, int]] = {}
    for lida in ler_vagas(session, settings.sinal_expira_segundos, *condicoes):
        item = contagem.setdefault(
            lida.vaga.estacionamento_id, {"LIVRE": 0, "OCUPADA": 0, "SEM_SINAL": 0}
        )
        item[lida.status] += 1
    lots = select(Estacionamento.id)
    if estacionamento_id is not None:
        lots = lots.where(Estacionamento.id == estacionamento_id)
    linhas = []
    for lot_id in session.scalars(lots):
        item = contagem.get(lot_id, {"LIVRE": 0, "OCUPADA": 0, "SEM_SINAL": 0})
        linhas.append(
            {
                "estacionamento_id": lot_id,
                "instante": inicio_intervalo(agora),
                "total": sum(item.values()),
                "livres": item["LIVRE"],
                "ocupadas": item["OCUPADA"],
                "sem_sinal": item["SEM_SINAL"],
            }
        )
    if linhas:
        stmt = insert(HistoricoOcupacao).values(linhas)
        session.execute(
            stmt.on_conflict_do_update(
                index_elements=["estacionamento_id", "instante"],
                set_={c: stmt.excluded[c] for c in ("total", "livres", "ocupadas", "sem_sinal")},
            )
        )
    return len(linhas)


def limpar_historico(session: Session, settings: Settings) -> None:
    limite = datetime.now(UTC) - timedelta(days=settings.retencao_historico_dias)
    session.execute(delete(HistoricoOcupacao).where(HistoricoOcupacao.instante < limite))


def pulso_simulador(session: Session) -> None:
    """Como o heartbeat do mock: dispositivos simulados repetem a última leitura."""
    session.execute(
        update(SensorModel)
        .where(SensorModel.ultimo_status.is_not(None))
        .values(ultimo_sinal_em=func.now())
    )


def ciclo_amostragem(session: Session, settings: Settings) -> None:
    if settings.simulador:
        pulso_simulador(session)
    amostrar(session, settings)
    limpar_historico(session, settings)
    session.commit()


def _ocupacao_amostra():
    return func.coalesce(
        func.round(
            (HistoricoOcupacao.total - HistoricoOcupacao.livres)
            * 100.0
            / func.nullif(HistoricoOcupacao.total, 0)
        ),
        0,
    )


def serie_ocupacao(
    session: Session,
    estacionamento_id: uuid.UUID,
    de: datetime,
    ate: datetime,
    granularidade: str,
    fuso: str,
) -> list[dict]:
    if granularidade == "30min":
        balde = func.date_bin(
            text("interval '30 minutes'"),
            HistoricoOcupacao.instante,
            literal_column("TIMESTAMPTZ '2000-01-01 00:00:00+00'"),
        )
    else:
        # date_trunc com fuso (PostgreSQL 16+): hora/dia no horário local configurado.
        balde = func.date_trunc(GRANULARIDADES[granularidade], HistoricoOcupacao.instante, fuso)
    balde = balde.label("balde")
    linhas = session.execute(
        select(
            balde,
            func.round(func.avg(_ocupacao_amostra())),
            func.round(func.avg(HistoricoOcupacao.livres)),
        )
        .where(
            HistoricoOcupacao.estacionamento_id == estacionamento_id,
            HistoricoOcupacao.instante >= de,
            HistoricoOcupacao.instante <= ate,
        )
        .group_by(balde)
        .order_by(balde)
    ).all()

    return [
        {"instante": iso(instante), "ocupacao": int(ocupacao), "livres": int(livres)}
        for instante, ocupacao, livres in linhas
    ]


def heatmap(session: Session, estacionamento_id: uuid.UUID, fuso: str) -> list[dict]:
    local = func.timezone(fuso, HistoricoOcupacao.instante)
    dia = (func.extract("isodow", local) - 1).label("dia")
    hora = func.extract("hour", local).label("hora")
    medias = {
        (int(d), int(h)): int(o)
        for d, h, o in session.execute(
            select(dia, hora, func.round(func.avg(_ocupacao_amostra())))
            .where(HistoricoOcupacao.estacionamento_id == estacionamento_id)
            .group_by(dia, hora)
        )
    }
    return [
        {"dia": d, "hora": h, "ocupacao": medias.get((d, h), 0)}
        for d in range(7)
        for h in range(24)
    ]


def registrar_leitura(
    session: Session, settings: Settings, sensor: SensorModel, status: str | None
) -> datetime:
    """status None representa SEM_SINAL simulado."""
    agora = datetime.now(UTC)
    sensor.ultimo_status = status
    sensor.ultimo_sinal_em = agora
    session.flush()
    if sensor.vaga_id is not None:
        lot_id = session.scalar(select(Vaga.estacionamento_id).where(Vaga.id == sensor.vaga_id))
        if lot_id is not None:
            amostrar(session, settings, lot_id)
    return agora
