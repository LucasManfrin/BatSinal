from collections.abc import Iterator

from fastapi import HTTPException, Request
from sqlalchemy import MetaData, create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import Settings


class Base(DeclarativeBase):
    metadata = MetaData(schema="batsinal")


def make_engine(settings: Settings) -> Engine | None:
    if settings.database_url is None:
        return None
    url = make_url(settings.database_url.get_secret_value())
    if url.drivername != "postgresql+psycopg":
        raise ValueError("Use uma URL PostgreSQL com o driver postgresql+psycopg.")
    # Engine é lazy: abrir a API não cria tabelas nem estabelece conexão com o banco.
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3})


def get_engine(request: Request) -> Engine:
    engine = request.app.state.engine
    if engine is None:
        raise HTTPException(503, detail="Banco não configurado.")
    return engine


def get_session(request: Request) -> Iterator[Session]:
    with Session(get_engine(request)) as session:
        yield session
