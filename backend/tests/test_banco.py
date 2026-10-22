"""Restrições aplicadas pelo próprio PostgreSQL, independentemente da API."""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Ancora, Area, Empresa, Estacionamento, Vaga


def _empresa(session, slug):
    empresa = Empresa(nome=slug, slug=slug, email=f"{slug}@x.demo", senha_hash="x")
    session.add(empresa)
    session.flush()
    lot = Estacionamento(empresa_id=empresa.id, nome="Pátio")
    session.add(lot)
    session.flush()
    area = Area(empresa_id=empresa.id, estacionamento_id=lot.id, nome="Trecho", contorno=[])
    session.add(area)
    session.flush()
    ancora = Ancora(
        empresa_id=empresa.id,
        area_id=area.id,
        x=0,
        z=0,
        largura=1,
        profundidade=2,
        tipos_aceitos=["COMUM"],
    )
    session.add(ancora)
    session.flush()
    return empresa, lot, area, ancora


def _vaga(empresa, lot, area, rotulo, ancora=None):
    return Vaga(
        empresa_id=empresa.id,
        estacionamento_id=lot.id,
        area_id=area.id,
        rotulo=rotulo,
        tipo="COMUM",
        ancora_id=ancora,
    )


def test_ancora_recebe_uma_vaga_no_commit_e_troca_e_permitida(engine):
    with Session(engine) as session:
        empresa, lot, area, ancora = _empresa(session, "empresa-a")
        session.add_all(
            [_vaga(empresa, lot, area, "A1", ancora.id), _vaga(empresa, lot, area, "A2")]
        )
        session.commit()
        a1, a2 = session.scalars(select(Vaga).order_by(Vaga.rotulo)).all()
        # Troca: unicidade diferida permite o estado intermediário duplicado.
        a2.ancora_id = ancora.id
        session.flush()
        a1.ancora_id = None
        session.commit()
        a1.ancora_id = ancora.id
        with pytest.raises(IntegrityError):
            session.commit()


def test_chaves_compostas_impedem_cruzar_empresas(engine):
    with Session(engine) as session:
        a, lot_a, area_a, ancora_a = _empresa(session, "empresa-a")
        b, lot_b, area_b, _ = _empresa(session, "empresa-b")
        session.commit()
        session.add(_vaga(b, lot_b, area_b, "B1", ancora_a.id))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
        session.add(_vaga(b, lot_a, area_a, "B1"))
        with pytest.raises(IntegrityError):
            session.commit()


def test_rotulo_unico_sem_caixa_e_tipos_validos(engine):
    with Session(engine) as session:
        empresa, lot, area, _ = _empresa(session, "empresa-a")
        session.add_all([_vaga(empresa, lot, area, "A1"), _vaga(empresa, lot, area, " a1")])
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
        empresa, lot, area, _ = _empresa(session, "empresa-c")
        session.add(
            Ancora(
                id=uuid.uuid4(),
                empresa_id=empresa.id,
                area_id=area.id,
                x=0,
                z=0,
                largura=1,
                profundidade=1,
                tipos_aceitos=["CAMINHAO"],
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()


def test_caminhada_exige_destino_e_minutos(engine):
    with Session(engine) as session:
        empresa, *_ = _empresa(session, "empresa-a")
        session.add(Estacionamento(empresa_id=empresa.id, nome="X", caminhada_minutos=3))
        with pytest.raises(IntegrityError):
            session.commit()
