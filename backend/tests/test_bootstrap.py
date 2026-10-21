from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy.exc import OperationalError

from app.config import Settings
from app.db import make_engine
from app.main import create_app


@pytest.fixture
def client():
    application = create_app(Settings(_env_file=None, database_url=None))
    with TestClient(application) as instance:
        yield instance


def test_health_without_database(client):
    assert client.get("/api/health").json()["stage"] == "bootstrap"
    assert client.get("/api/ready").status_code == 503
    # O bootstrap não se apresenta como uma implementação dos endpoints do mock.
    assert client.get("/api/public/empresas/unisagrado").status_code == 404


def test_ready_does_not_leak_connection_details(client):
    engine = MagicMock()
    engine.connect.side_effect = OperationalError("SELECT 1", {}, Exception("secret-url"))
    client.app.state.engine = engine
    response = client.get("/api/ready")
    assert response.status_code == 503
    assert response.json() == {"detail": "Banco indisponível."}


def test_ready_with_connection(client):
    engine = MagicMock()
    client.app.state.engine = engine
    assert client.get("/api/ready").json()["database"] == "reachable"


def test_cors_allows_only_configured_origins(client):
    headers = {"Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET"}
    assert client.options("/api/health", headers=headers).status_code == 200
    headers["Origin"] = "https://outro.example"
    response = client.options("/api/health", headers=headers)
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_only_postgres_driver_is_accepted():
    with pytest.raises(ValueError, match="PostgreSQL"):
        make_engine(Settings(_env_file=None, database_url=SecretStr("sqlite://")))
