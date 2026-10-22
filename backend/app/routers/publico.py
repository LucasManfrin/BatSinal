"""Consulta pública: somente leitura, sem token, sem e-mail, senha, chave ou sensorId."""

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import SessionDep, SettingsDep
from app.errors import ApiError
from app.models import Empresa, Estacionamento, Vaga
from app.schemas import SLUG_RE
from app.services.consulta import (
    buscar_area,
    consulta_campus,
    detalhe_area,
    detalhe_estacionamento,
    empresa_publica,
    ler_vagas,
    parse_id,
    resumos,
    status_dto,
)

router = APIRouter(tags=["consulta pública"])


def _empresa_por_slug(session: Session, slug: str) -> Empresa:
    empresa = session.scalar(select(Empresa).where(Empresa.slug == slug))
    if empresa is None:
        raise ApiError(404, "Campus não encontrado.")
    return empresa


def _estacionamento(session: Session, lot_id: str, empresa: Empresa | None = None):
    id_ = parse_id(lot_id, mensagem="Estacionamento não encontrado.")
    consulta = select(Estacionamento).where(Estacionamento.id == id_)
    if empresa is not None:
        consulta = consulta.where(Estacionamento.empresa_id == empresa.id)
    lot = session.scalar(consulta)
    if lot is None:
        raise ApiError(404, "Estacionamento não encontrado.")
    return lot


def _status_publico(session: Session, lot: Estacionamento, expira: int):
    lidas = ler_vagas(
        session, expira, Vaga.estacionamento_id == lot.id, Vaga.ancora_id.is_not(None)
    )
    return [status_dto(lida) for lida in lidas]


@router.get("/public/empresas")
def listar_empresas(session: SessionDep):
    return [empresa_publica(e) for e in session.scalars(select(Empresa).order_by(Empresa.nome))]


@router.get("/public/slugs/{slug}/disponivel")
def slug_disponivel(slug: str, session: SessionDep):
    valido = 3 <= len(slug) <= 60 and bool(SLUG_RE.match(slug))
    ocupado = valido and session.scalar(select(Empresa.id).where(Empresa.slug == slug))
    return {"slug": slug, "disponivel": valido and not ocupado}


@router.get("/public/empresas/{slug}")
def campus(slug: str, session: SessionDep, settings: SettingsDep):
    empresa = _empresa_por_slug(session, slug)
    return consulta_campus(session, empresa, settings.sinal_expira_segundos)


@router.get("/public/empresas/{slug}/estacionamentos")
def estacionamentos_da_empresa(slug: str, session: SessionDep, settings: SettingsDep):
    empresa = _empresa_por_slug(session, slug)
    return resumos(session, empresa.id, settings.sinal_expira_segundos, publico=True)


@router.get("/public/estacionamentos/{lot_id}")
def estacionamento(lot_id: str, session: SessionDep, settings: SettingsDep):
    lot = _estacionamento(session, lot_id)
    return detalhe_estacionamento(session, lot, settings.sinal_expira_segundos, privado=False)


@router.get("/public/estacionamentos/{lot_id}/status")
def status(lot_id: str, session: SessionDep, settings: SettingsDep):
    lot = _estacionamento(session, lot_id)
    return _status_publico(session, lot, settings.sinal_expira_segundos)


@router.get("/public/areas/{area_id}")
def area(area_id: str, session: SessionDep, settings: SettingsDep):
    return detalhe_area(
        session, buscar_area(session, area_id), settings.sinal_expira_segundos, privado=False
    )


# Aliases /publico/campi/* preservados para links anteriores.
@router.get("/publico/campi")
def campi(session: SessionDep):
    return listar_empresas(session)


@router.get("/publico/campi/{slug}/mapa")
def campus_mapa(slug: str, session: SessionDep, settings: SettingsDep):
    empresa = _empresa_por_slug(session, slug)
    return consulta_campus(session, empresa, settings.sinal_expira_segundos)


@router.get("/publico/campi/{slug}/estacionamentos")
def campi_estacionamentos(slug: str, session: SessionDep, settings: SettingsDep):
    return estacionamentos_da_empresa(slug, session, settings)


@router.get("/publico/campi/{slug}/estacionamentos/{lot_id}")
def campi_estacionamento(slug: str, lot_id: str, session: SessionDep, settings: SettingsDep):
    lot = _estacionamento(session, lot_id, _empresa_por_slug(session, slug))
    return detalhe_estacionamento(session, lot, settings.sinal_expira_segundos, privado=False)


@router.get("/publico/campi/{slug}/estacionamentos/{lot_id}/status")
def campi_status(slug: str, lot_id: str, session: SessionDep, settings: SettingsDep):
    lot = _estacionamento(session, lot_id, _empresa_por_slug(session, slug))
    return _status_publico(session, lot, settings.sinal_expira_segundos)


@router.api_route("/public/{caminho:path}", methods=["POST", "PUT", "PATCH", "DELETE"])
@router.api_route("/publico/{caminho:path}", methods=["POST", "PUT", "PATCH", "DELETE"])
def somente_leitura(caminho: str):
    raise ApiError(405, "A consulta pública permite apenas leitura.")
