"""Fixtures de integração com PostgreSQL real.

Os testes de domínio usam um banco dedicado (padrão: batsinal_test no compose local) e são
pulados se ele não estiver acessível. O banco é recriado pelo Alembic: upgrade, downgrade
completo e upgrade de novo, provando as revisões em PostgreSQL antes dos testes de rota.
"""

import json
import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

import app.config
from app.config import Settings
from app.main import create_app
from app.seed import ARQUIVO, importar

ROOT = Path(__file__).resolve().parents[1]
PADRAO = "postgresql+psycopg://batsinal:batsinal_dev@127.0.0.1:55432/batsinal_test"
TABELAS = (
    "historico_ocupacao, sensores, vagas, ancoras, areas, estacionamentos, "
    "mapas_campus, sessoes, empresas"
)


def _url_teste() -> str:
    return os.environ.get("BATSINAL_TEST_DATABASE_URL", PADRAO)


def _garantir_banco(url: str) -> None:
    alvo = make_url(url)
    admin = create_engine(
        alvo.set(database="postgres"),
        isolation_level="AUTOCOMMIT",
        connect_args={"connect_timeout": 3},
    )
    try:
        with admin.connect() as conexao:
            existe = conexao.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :nome"), {"nome": alvo.database}
            )
            if not existe:
                conexao.execute(text(f'CREATE DATABASE "{alvo.database}"'))
    finally:
        admin.dispose()


@pytest.fixture(scope="session")
def url_banco() -> Iterator[str]:
    url = _url_teste()
    if not make_url(url).database.endswith("_test"):
        pytest.exit("BATSINAL_TEST_DATABASE_URL precisa apontar para um banco *_test.")
    try:
        _garantir_banco(url)
    except OperationalError:
        pytest.skip("PostgreSQL de teste indisponível (docker compose up -d db).")
    settings = Settings(_env_file=None, database_url=SecretStr(url))
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(app.config, "get_settings", lambda: settings)
        config = Config(str(ROOT / "alembic.ini"))
        engine = create_engine(url)
        with engine.begin() as conexao:
            # Banco exclusivo de teste: começa limpo a cada execução.
            conexao.execute(text("DROP SCHEMA IF EXISTS batsinal CASCADE"))
            conexao.execute(text("DROP TABLE IF EXISTS alembic_version"))
        engine.dispose()
        command.upgrade(config, "head")
        command.downgrade(config, "base")
        command.upgrade(config, "head")
    yield url


@pytest.fixture
def engine(url_banco) -> Iterator[Engine]:
    engine = create_engine(url_banco)
    with engine.begin() as conexao:
        conexao.execute(text(f"TRUNCATE {', '.join(f'batsinal.{t}' for t in TABELAS.split(', '))}"))
    yield engine
    engine.dispose()


@pytest.fixture
def settings(url_banco) -> Settings:
    return Settings(
        _env_file=None,
        database_url=SecretStr(url_banco),
        amostragem_segundos=0,
        simulador=True,
    )


@pytest.fixture
def client(engine, settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as instancia:
        yield instancia


@pytest.fixture
def seed(engine):
    dados = json.loads(ARQUIVO.read_text(encoding="utf-8"))
    with Session(engine, expire_on_commit=False) as session:
        empresa = importar(session, dados)
        session.commit()
    return empresa


def cadastrar(client: TestClient, slug: str, email: str | None = None) -> dict:
    resposta = client.post(
        "/api/auth/cadastro-empresa",
        json={
            "nome": f"Empresa {slug}",
            "slug": slug,
            "email": email or f"{slug}@exemplo.demo",
            "senha": "senha-segura",
        },
    )
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def auth(sessao: dict) -> dict:
    return {"Authorization": f"Bearer {sessao['token']}"}


def login_demo(client: TestClient) -> dict:
    resposta = client.post(
        "/api/auth/login", json={"email": "admin@unisagrado.demo", "senha": "Demo@123"}
    )
    assert resposta.status_code == 201, resposta.text
    return resposta.json()
