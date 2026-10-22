"""Sessão da empresa: token opaco com hash no banco. Visitantes não têm conta."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_session
from app.errors import ApiError
from app.models import Empresa, Sessao
from app.security import hash_token, novo_token

SessionDep = Annotated[Session, Depends(get_session)]


def get_settings_app(request: Request) -> Settings:
    return request.app.state.settings


SettingsDep = Annotated[Settings, Depends(get_settings_app)]


@dataclass(frozen=True)
class EmpresaAtual:
    id: uuid.UUID
    token_hash: str


def token_da_requisicao(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    esquema, _, valor = header.partition(" ")
    if esquema.lower() != "bearer" or not valor.strip():
        return None
    return valor.strip()


def empresa_atual(request: Request, session: SessionDep) -> EmpresaAtual:
    token = token_da_requisicao(request)
    if token:
        token_hash = hash_token(token)
        empresa_id = session.scalar(
            select(Sessao.empresa_id).where(
                Sessao.token_hash == token_hash, Sessao.expira_em > datetime.now(UTC)
            )
        )
        if empresa_id is not None:
            return EmpresaAtual(empresa_id, token_hash)
    raise ApiError(401, "Entre na conta da empresa para continuar.")


EmpresaDep = Annotated[EmpresaAtual, Depends(empresa_atual)]


def criar_sessao(session: Session, empresa: Empresa, settings: Settings) -> str:
    agora = datetime.now(UTC)
    # Limpeza oportunista de sessões vencidas desta empresa.
    session.execute(
        delete(Sessao).where(Sessao.empresa_id == empresa.id, Sessao.expira_em <= agora)
    )
    token = novo_token()
    session.add(
        Sessao(
            token_hash=hash_token(token),
            empresa_id=empresa.id,
            expira_em=agora + timedelta(hours=settings.sessao_horas),
        )
    )
    return token
