"""Vínculos vaga <-> âncora.

Toda escrita bloqueia a linha da área (SELECT ... FOR UPDATE), confere a versão, valida o lote
inteiro e só então altera os vínculos. A unicidade de vagas.ancora_id é diferida até o commit,
o que permite trocar duas peças na mesma transação.
"""

import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Ancora, Area, Vaga
from app.models import Sensor as SensorModel
from app.services.consulta import parse_id

MSG_VERSAO = "Esta área mudou em outra janela. Atualize antes de tentar novamente."


def bloquear_area(session: Session, area_id: uuid.UUID, empresa_id: uuid.UUID) -> Area:
    area = session.scalar(
        select(Area)
        .where(Area.id == area_id, Area.empresa_id == empresa_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if area is None:
        raise ApiError(404, "Área não encontrada.")
    return area


def exigir_versao(area: Area, versao: int | None) -> None:
    if versao is None:
        raise ApiError(
            422, "Informe a versão da área.", {"versao": "Envie a versão atual da área."}
        )
    if versao != area.versao:
        raise ApiError(409, MSG_VERSAO)


def vagas_da_area(session: Session, area: Area) -> list[Vaga]:
    return list(
        session.scalars(
            select(Vaga).where(Vaga.area_id == area.id).execution_options(populate_existing=True)
        )
    )


def aplicar(session: Session, area: Area, posicoes: dict[uuid.UUID, uuid.UUID | None]) -> None:
    vagas = vagas_da_area(session, area)
    ancoras = {a.id: a for a in session.scalars(select(Ancora).where(Ancora.area_id == area.id))}
    if len(posicoes) != len(vagas) or any(v.id not in posicoes for v in vagas):
        raise ApiError(422, "Informe todas as vagas desta área uma única vez.")
    usadas: set[uuid.UUID] = set()
    for vaga in vagas:
        ancora_id = posicoes[vaga.id]
        if ancora_id is None:
            continue
        ancora = ancoras.get(ancora_id)
        if ancora is None or vaga.tipo not in ancora.tipos_aceitos or ancora_id in usadas:
            raise ApiError(422, "Posição incompatível, repetida ou fora desta área.")
        usadas.add(ancora_id)
    # Lote validado por inteiro antes de alterar qualquer peça.
    for vaga in vagas:
        vaga.ancora_id = posicoes[vaga.id]
    area.versao += 1
    session.flush()


def mover_vaga(
    session: Session, empresa_id: uuid.UUID, vaga_id: str, ancora_id: str | None, versao: int | None
) -> Area:
    id_ = parse_id(vaga_id, mensagem="Vaga não encontrada.")
    area_id = session.scalar(
        select(Vaga.area_id).where(Vaga.id == id_, Vaga.empresa_id == empresa_id)
    )
    if area_id is None:
        raise ApiError(404, "Vaga não encontrada.")
    area = bloquear_area(session, area_id, empresa_id)
    exigir_versao(area, versao)
    vagas = vagas_da_area(session, area)
    vaga = next((v for v in vagas if v.id == id_), None)
    if vaga is None:
        # A vaga mudou de área ou foi excluída entre a leitura e o bloqueio.
        raise ApiError(409, MSG_VERSAO)
    destino = (
        None
        if ancora_id is None
        else parse_id(ancora_id, 422, "Posição incompatível, repetida ou fora desta área.")
    )
    posicoes = {v.id: v.ancora_id for v in vagas}
    if destino is not None:
        deslocada = next((v for v in vagas if v.ancora_id == destino and v.id != id_), None)
        if deslocada is not None:
            # Origem posicionada: troca. Origem na bandeja: a outra peça vai para a bandeja.
            posicoes[deslocada.id] = vaga.ancora_id
    posicoes[id_] = destino
    aplicar(session, area, posicoes)
    return area


def definir_lote(
    session: Session, empresa_id: uuid.UUID, area_id: str, itens: list, versao: int | None
) -> Area:
    area = bloquear_area(session, parse_id(area_id, mensagem="Área não encontrada."), empresa_id)
    exigir_versao(area, versao)
    posicoes: dict[uuid.UUID, uuid.UUID | None] = {}
    for item in itens:
        vaga_id = parse_id(item.vaga_id, 422, "Lista de posições inválida.")
        if vaga_id in posicoes:
            raise ApiError(422, "Lista de posições inválida.")
        posicoes[vaga_id] = (
            None
            if item.ancora_id is None
            else parse_id(item.ancora_id, 422, "Posição incompatível, repetida ou fora desta área.")
        )
    aplicar(session, area, posicoes)
    return area


def restaurar_padrao(
    session: Session, empresa_id: uuid.UUID, area_id: str, versao: int | None
) -> Area:
    area = bloquear_area(session, parse_id(area_id, mensagem="Área não encontrada."), empresa_id)
    exigir_versao(area, versao)
    padrao = {
        a.vaga_padrao_id: a.id
        for a in session.scalars(
            select(Ancora).where(Ancora.area_id == area.id, Ancora.vaga_padrao_id.is_not(None))
        )
    }
    # Somente vínculos originais existentes; não inventa âncoras para áreas importadas.
    aplicar(session, area, {v.id: padrao.get(v.id) for v in vagas_da_area(session, area)})
    return area


def excluir_vaga(session: Session, vaga: Vaga) -> None:
    session.execute(update(SensorModel).where(SensorModel.vaga_id == vaga.id).values(vaga_id=None))
    session.execute(
        update(Ancora).where(Ancora.vaga_padrao_id == vaga.id).values(vaga_padrao_id=None)
    )
    session.delete(vaga)
    session.flush()
