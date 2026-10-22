"""Áreas, âncoras importadas, vagas e posicionamento. Escopo sempre na empresa do token."""

from fastapi import APIRouter
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import func, select

from app.auth import EmpresaDep, SessionDep, SettingsDep
from app.errors import ApiError
from app.models import Ancora, Area, Estacionamento, Vaga
from app.models import Sensor as SensorModel
from app.schemas import (
    AncoraImportada,
    AreaCriacao,
    AreaUpdate,
    PosicaoVaga,
    PosicoesArea,
    VagaCriacao,
    VagaUpdate,
    Versao,
)
from app.services import posicionamento
from app.services.consulta import (
    area_dto,
    buscar_area,
    detalhe_area,
    ordem_natural,
    parse_id,
    progresso,
    vaga_dto,
)

router = APIRouter(tags=["áreas e vagas"])
LIMITE_IMPORTACAO = 2000
_ancoras_importadas = TypeAdapter(list[AncoraImportada])


# ---------- Áreas ----------


@router.get("/areas")
def listar_areas(session: SessionDep, empresa: EmpresaDep, estacionamentoId: str | None = None):
    consulta = select(Area).where(Area.empresa_id == empresa.id).order_by(Area.nome, Area.id)
    if estacionamentoId:
        consulta = consulta.where(
            Area.estacionamento_id
            == parse_id(estacionamentoId, mensagem="Estacionamento não encontrado.")
        )
    return [
        {**area_dto(area), "progresso": progresso(session, area)}
        for area in session.scalars(consulta)
    ]


@router.get("/areas/{area_id}")
def ler_area(area_id: str, session: SessionDep, settings: SettingsDep, empresa: EmpresaDep):
    area = buscar_area(session, area_id, empresa.id)
    return detalhe_area(session, area, settings.sinal_expira_segundos, privado=True)


@router.post("/areas", status_code=201)
def criar_area(body: AreaCriacao, session: SessionDep, empresa: EmpresaDep):
    lot = session.scalar(
        select(Estacionamento).where(
            Estacionamento.id
            == parse_id(body.estacionamento_id, mensagem="Estacionamento não encontrado."),
            Estacionamento.empresa_id == empresa.id,
        )
    )
    if lot is None:
        raise ApiError(404, "Estacionamento não encontrado.")
    if len(body.ancoras) > LIMITE_IMPORTACAO:
        raise ApiError(422, f"Envie até {LIMITE_IMPORTACAO} posições mapeadas.")
    try:
        ancoras = _ancoras_importadas.validate_python(body.ancoras)
    except ValidationError as error:
        primeiro = error.errors()[0]
        raise ApiError(
            422,
            "Confira coordenadas, dimensões e tipos das posições mapeadas.",
            {"ancoras": f"Posição {primeiro['loc'][0]}: campo {primeiro['loc'][-1]} inválido."},
        ) from None
    # Âncoras são o levantamento importado: sem grade gerada e sem vaga padrão.
    area = Area(empresa_id=empresa.id, estacionamento_id=lot.id, nome=body.nome, contorno=[])
    session.add(area)
    session.flush()
    session.add_all(
        Ancora(
            empresa_id=empresa.id,
            area_id=area.id,
            x=a.x,
            z=a.z,
            rotacao=a.rotacao,
            largura=a.largura,
            profundidade=a.profundidade,
            tipos_aceitos=list(dict.fromkeys(a.tipos_aceitos)),
        )
        for a in ancoras
    )
    session.commit()
    return area_dto(area)


@router.put("/areas/{area_id}")
def alterar_area(area_id: str, body: AreaUpdate, session: SessionDep, empresa: EmpresaDep):
    area = posicionamento.bloquear_area(
        session, parse_id(area_id, mensagem="Área não encontrada."), empresa.id
    )
    # Somente metadados: a versão é opcional aqui, mas, se enviada, precisa conferir.
    if body.versao is not None:
        posicionamento.exigir_versao(area, body.versao)
    area.nome = body.nome
    area.versao += 1
    session.commit()
    return area_dto(area)


@router.delete("/areas/{area_id}")
def excluir_area(area_id: str, session: SessionDep, empresa: EmpresaDep):
    area = posicionamento.bloquear_area(
        session, parse_id(area_id, mensagem="Área não encontrada."), empresa.id
    )
    if session.scalar(select(func.count()).select_from(Vaga).where(Vaga.area_id == area.id)):
        raise ApiError(409, "Remova as vagas antes de excluir esta área.")
    session.delete(area)
    session.commit()
    return None


@router.put("/areas/{area_id}/posicoes")
def definir_posicoes(
    area_id: str,
    body: PosicoesArea,
    session: SessionDep,
    settings: SettingsDep,
    empresa: EmpresaDep,
):
    area = posicionamento.definir_lote(session, empresa.id, area_id, body.posicoes, body.versao)
    session.commit()
    return detalhe_area(session, area, settings.sinal_expira_segundos, privado=True)


@router.post("/areas/{area_id}/restaurar-padrao", status_code=201)
def restaurar_padrao(
    area_id: str, body: Versao, session: SessionDep, settings: SettingsDep, empresa: EmpresaDep
):
    area = posicionamento.restaurar_padrao(session, empresa.id, area_id, body.versao)
    session.commit()
    return detalhe_area(session, area, settings.sinal_expira_segundos, privado=True)


# ---------- Vagas ----------


def _sensor_da_vaga(session, vaga: Vaga):
    return session.scalar(select(SensorModel.id).where(SensorModel.vaga_id == vaga.id))


def _buscar_vaga(session, vaga_id: str, empresa: EmpresaDep) -> Vaga:
    vaga = session.scalar(
        select(Vaga).where(
            Vaga.id == parse_id(vaga_id, mensagem="Vaga não encontrada."),
            Vaga.empresa_id == empresa.id,
        )
    )
    if vaga is None:
        raise ApiError(404, "Vaga não encontrada.")
    return vaga


def _rotulo_livre(session, estacionamento_id, rotulo: str, exceto=None) -> None:
    consulta = select(Vaga.id).where(
        Vaga.estacionamento_id == estacionamento_id,
        func.upper(func.trim(Vaga.rotulo)) == rotulo.strip().upper(),
    )
    if exceto is not None:
        consulta = consulta.where(Vaga.id != exceto)
    if session.scalar(consulta) is not None:
        raise ApiError(
            409, "Este rótulo já existe no estacionamento.", {"rotulo": "Use outro rótulo."}
        )


@router.get("/vagas")
def listar_vagas(session: SessionDep, empresa: EmpresaDep, areaId: str | None = None):
    consulta = (
        select(Vaga, SensorModel.id)
        .outerjoin(SensorModel, SensorModel.vaga_id == Vaga.id)
        .where(Vaga.empresa_id == empresa.id)
    )
    if areaId:
        consulta = consulta.where(Vaga.area_id == parse_id(areaId, mensagem="Área não encontrada."))
    linhas = sorted(
        session.execute(consulta).all(), key=lambda linha: ordem_natural(linha[0].rotulo)
    )
    return [vaga_dto(vaga, sensor_id) for vaga, sensor_id in linhas]


@router.get("/vagas/{vaga_id}")
def ler_vaga(vaga_id: str, session: SessionDep, empresa: EmpresaDep):
    vaga = _buscar_vaga(session, vaga_id, empresa)
    return vaga_dto(vaga, _sensor_da_vaga(session, vaga))


@router.post("/vagas", status_code=201)
def criar_vaga(body: VagaCriacao, session: SessionDep, empresa: EmpresaDep):
    area = posicionamento.bloquear_area(
        session, parse_id(body.area_id, mensagem="Área não encontrada."), empresa.id
    )
    _rotulo_livre(session, area.estacionamento_id, body.rotulo)
    # Nasce na bandeja: sem âncora e sem coordenadas próprias.
    vaga = Vaga(
        empresa_id=empresa.id,
        estacionamento_id=area.estacionamento_id,
        area_id=area.id,
        rotulo=body.rotulo,
        tipo=body.tipo,
    )
    session.add(vaga)
    area.versao += 1
    session.commit()
    return vaga_dto(vaga)


@router.put("/vagas/{vaga_id}")
def alterar_vaga(vaga_id: str, body: VagaUpdate, session: SessionDep, empresa: EmpresaDep):
    vaga = _buscar_vaga(session, vaga_id, empresa)
    area = posicionamento.bloquear_area(session, vaga.area_id, empresa.id)
    session.refresh(vaga)
    if vaga.ancora_id is not None:
        ancora = session.get(Ancora, vaga.ancora_id)
        if ancora is not None and body.tipo not in ancora.tipos_aceitos:
            raise ApiError(422, "Retire a vaga da posição antes de mudar seu tipo.")
    _rotulo_livre(session, vaga.estacionamento_id, body.rotulo, vaga.id)
    vaga.rotulo = body.rotulo
    vaga.tipo = body.tipo
    area.versao += 1
    session.commit()
    return vaga_dto(vaga, _sensor_da_vaga(session, vaga))


@router.delete("/vagas/{vaga_id}")
def excluir_vaga(vaga_id: str, session: SessionDep, empresa: EmpresaDep):
    vaga = _buscar_vaga(session, vaga_id, empresa)
    area = posicionamento.bloquear_area(session, vaga.area_id, empresa.id)
    posicionamento.excluir_vaga(session, vaga)
    area.versao += 1
    session.commit()
    return None


@router.put("/vagas/{vaga_id}/posicao")
def posicionar_vaga(
    vaga_id: str,
    body: PosicaoVaga,
    session: SessionDep,
    settings: SettingsDep,
    empresa: EmpresaDep,
):
    area = posicionamento.mover_vaga(session, empresa.id, vaga_id, body.ancora_id, body.versao)
    session.commit()
    return detalhe_area(session, area, settings.sinal_expira_segundos, privado=True)
