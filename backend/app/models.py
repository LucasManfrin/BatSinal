"""Modelos ORM alinhados às revisões Alembic 0001 e 0002.

O esquema é criado somente pelo Alembic; estes modelos não chamam create_all().
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    DateTime,
    Double,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

TIPOS_VAGA = ("COMUM", "PCD", "MOTO")


def _uuid() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[uuid.UUID] = _uuid()
    nome: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    email: Mapped[str] = mapped_column(String(254))
    senha_hash: Mapped[str] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )


class Sessao(Base):
    __tablename__ = "sessoes"

    token_hash: Mapped[str] = mapped_column(Text, primary_key=True)
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batsinal.empresas.id", ondelete="CASCADE")
    )
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )


class MapaCampus(Base):
    __tablename__ = "mapas_campus"

    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batsinal.empresas.id"), primary_key=True
    )
    cena: Mapped[dict | None] = mapped_column(JSONB)
    geojson: Mapped[dict] = mapped_column(
        JSONB, server_default=text("""'{"type":"FeatureCollection","features":[]}'::jsonb""")
    )
    versao: Mapped[int] = mapped_column(Integer, server_default=text("1"))
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )


class Estacionamento(Base):
    __tablename__ = "estacionamentos"

    id: Mapped[uuid.UUID] = _uuid()
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batsinal.empresas.id")
    )
    nome: Mapped[str] = mapped_column(String(120))
    descricao: Mapped[str | None] = mapped_column(Text)
    portao: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7, asdecimal=False))
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7, asdecimal=False))
    caminhada_minutos: Mapped[int | None] = mapped_column(Integer)
    caminhada_destino: Mapped[str | None] = mapped_column(String(100))
    largura: Mapped[float] = mapped_column(Double, server_default=text("780"))
    altura: Mapped[float] = mapped_column(Double, server_default=text("680"))


class Area(Base):
    __tablename__ = "areas"
    __table_args__ = (
        ForeignKeyConstraint(
            ["estacionamento_id", "empresa_id"],
            ["batsinal.estacionamentos.id", "batsinal.estacionamentos.empresa_id"],
            ondelete="CASCADE",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid()
    empresa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    estacionamento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    nome: Mapped[str] = mapped_column(String(120))
    contorno: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    versao: Mapped[int] = mapped_column(Integer, server_default=text("1"))


class Ancora(Base):
    __tablename__ = "ancoras"
    __table_args__ = (
        ForeignKeyConstraint(
            ["area_id", "empresa_id"],
            ["batsinal.areas.id", "batsinal.areas.empresa_id"],
            ondelete="CASCADE",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid()
    empresa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    x: Mapped[float] = mapped_column(Double)
    z: Mapped[float] = mapped_column(Double)
    largura: Mapped[float] = mapped_column(Double)
    profundidade: Mapped[float] = mapped_column(Double)
    rotacao: Mapped[float] = mapped_column(Double, server_default=text("0"))
    tipos_aceitos: Mapped[list[str]] = mapped_column(ARRAY(Text))
    # FK composta para vagas criada por ALTER TABLE em 0001 (ciclo vagas <-> ancoras).
    vaga_padrao_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True)


class Vaga(Base):
    __tablename__ = "vagas"
    __table_args__ = (
        ForeignKeyConstraint(
            ["area_id", "estacionamento_id", "empresa_id"],
            ["batsinal.areas.id", "batsinal.areas.estacionamento_id", "batsinal.areas.empresa_id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["ancora_id", "area_id", "empresa_id"],
            ["batsinal.ancoras.id", "batsinal.ancoras.area_id", "batsinal.ancoras.empresa_id"],
            deferrable=True,
            initially="DEFERRED",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid()
    empresa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    estacionamento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    rotulo: Mapped[str] = mapped_column(String(100))
    tipo: Mapped[str] = mapped_column(String(10))
    ancora_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))


class Sensor(Base):
    __tablename__ = "sensores"
    __table_args__ = (
        ForeignKeyConstraint(
            ["vaga_id", "empresa_id"],
            ["batsinal.vagas.id", "batsinal.vagas.empresa_id"],
            deferrable=True,
            initially="DEFERRED",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid()
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batsinal.empresas.id")
    )
    vaga_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True)
    nome: Mapped[str] = mapped_column(String(120))
    chave_hash: Mapped[str] = mapped_column(Text, unique=True)
    # NULL com sinal recente também é SEM_SINAL (usado pelo simulador).
    ultimo_status: Mapped[str | None] = mapped_column(String(10))
    ultimo_sinal_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class HistoricoOcupacao(Base):
    __tablename__ = "historico_ocupacao"

    estacionamento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("batsinal.estacionamentos.id", ondelete="CASCADE"),
        primary_key=True,
    )
    instante: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    total: Mapped[int] = mapped_column(Integer)
    livres: Mapped[int] = mapped_column(Integer)
    ocupadas: Mapped[int] = mapped_column(Integer)
    sem_sinal: Mapped[int] = mapped_column(Integer)
