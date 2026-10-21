from io import StringIO
from pathlib import Path

from alembic import command
from alembic.config import Config
from pglast import parse_sql
from pydantic import SecretStr

import app.config
from app.config import Settings

ROOT = Path(__file__).resolve().parents[1]


def migration_sql(monkeypatch, revision, downgrade=False):
    # Somente geração offline: não conecta nem aplica DDL em banco algum.
    monkeypatch.setattr(
        app.config,
        "get_settings",
        lambda: Settings(_env_file=None, database_url=SecretStr("postgresql+psycopg://local/test")),
    )
    output = StringIO()
    config = Config(str(ROOT / "alembic.ini"), output_buffer=output)
    if downgrade:
        command.downgrade(config, revision, sql=True)
    else:
        command.upgrade(config, revision, sql=True)
    return output.getvalue()


def test_initial_migration_generates_valid_postgresql(monkeypatch):
    sql = migration_sql(monkeypatch, "head")
    assert parse_sql(sql)
    assert "CREATE TABLE batsinal.ancoras" in sql
    assert "DEFERRABLE INITIALLY DEFERRED" in sql
    assert "INSERT INTO alembic_version" in sql


def test_downgrade_targets_own_schema_without_cascade(monkeypatch):
    sql = migration_sql(monkeypatch, "0001:base", downgrade=True)
    assert parse_sql(sql)
    assert "DROP SCHEMA batsinal" in sql
    assert "CASCADE" not in sql
