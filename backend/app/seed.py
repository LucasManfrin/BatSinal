"""Importa a demonstração da Unisagrado a partir de database/seed-unisagrado.json.

Uso (dentro de backend/, depois de `alembic upgrade head`):

    uv run python -m app.seed
    uv run python -m app.seed --sem-dados-sinteticos

O JSON é exportado do próprio mock (scripts/exportar_seed_mock.ts), preservando a geometria.
IDs legíveis do mock (est-1, frente-ab, ...) viram UUID; as referências dentro da cena são
atualizadas. Blocos, portões e vias mantêm seus IDs locais. Senha e chaves nunca são gravadas
em texto: a conta fictícia recebe hash e cada sensor recebe chave aleatória (somente hash).
Se o slug já existir, nada é alterado.
"""

import argparse
import copy
import json
import math
import uuid
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import make_engine
from app.models import (
    Ancora,
    Area,
    Empresa,
    Estacionamento,
    HistoricoOcupacao,
    MapaCampus,
    Sensor,
    Vaga,
)
from app.security import hash_senha, hash_token, nova_chave_dispositivo

ARQUIVO = Path(__file__).resolve().parents[1] / "database" / "seed-unisagrado.json"
SENHA_DEMO = "Demo@123"


def _fuso(nome: str):
    try:
        from zoneinfo import ZoneInfo

        return ZoneInfo(nome)
    except Exception:  # noqa: BLE001 - sem base de fusos no Windows: usa o horário de Brasília
        return timezone(timedelta(hours=-3))


def _ids(itens: list[dict]) -> dict[str, uuid.UUID]:
    return {item["id"]: uuid.uuid4() for item in itens}


def importar(
    session: Session,
    dados: dict,
    senha: str = SENHA_DEMO,
    sinteticos: bool = True,
    fuso: str = "America/Sao_Paulo",
) -> Empresa | None:
    origem = dados["empresa"]
    if session.scalar(select(Empresa.id).where(Empresa.slug == origem["slug"])):
        return None

    empresa = Empresa(
        id=uuid.uuid4(),
        nome=origem["nome"],
        slug=origem["slug"],
        email=origem["email"],
        senha_hash=hash_senha(senha),
    )
    session.add(empresa)
    session.flush()

    lot_ids = _ids(dados["estacionamentos"])
    area_ids = _ids(dados["areas"])
    ancora_ids = _ids(dados["ancoras"])
    vagas_origem = [v for lot in dados["estacionamentos"] for v in lot["vagas"]]
    vaga_ids = _ids(vagas_origem)

    for lot in dados["estacionamentos"]:
        session.add(
            Estacionamento(
                id=lot_ids[lot["id"]],
                empresa_id=empresa.id,
                nome=lot["nome"],
                descricao=lot.get("descricao") or "",
                portao=lot.get("portao"),
                caminhada_minutos=lot.get("caminhadaMinutos"),
                caminhada_destino=lot.get("caminhadaDestino"),
                latitude=lot["latitude"],
                longitude=lot["longitude"],
                largura=lot["largura"],
                altura=lot["altura"],
            )
        )
    session.flush()
    for area in dados["areas"]:
        session.add(
            Area(
                id=area_ids[area["id"]],
                empresa_id=empresa.id,
                estacionamento_id=lot_ids[area["estacionamentoId"]],
                nome=area["nome"],
                contorno=area["contorno"],
                versao=1,
            )
        )
    session.flush()
    # vagas.ancora_id e ancoras.vaga_padrao_id são FKs diferidas: o ciclo fecha no commit.
    for ancora in dados["ancoras"]:
        session.add(
            Ancora(
                id=ancora_ids[ancora["id"]],
                empresa_id=empresa.id,
                area_id=area_ids[ancora["areaId"]],
                x=ancora["x"],
                z=ancora["z"],
                rotacao=ancora["rotacao"],
                largura=ancora["largura"],
                profundidade=ancora["profundidade"],
                tipos_aceitos=ancora["tiposAceitos"],
                vaga_padrao_id=vaga_ids.get(ancora.get("vagaPadraoId")),
            )
        )
    for vaga in vagas_origem:
        session.add(
            Vaga(
                id=vaga_ids[vaga["id"]],
                empresa_id=empresa.id,
                estacionamento_id=lot_ids[vaga["estacionamentoId"]],
                area_id=area_ids[vaga["areaId"]],
                rotulo=vaga["rotulo"],
                tipo=vaga["tipo"],
                ancora_id=ancora_ids.get(vaga.get("ancoraId")),
            )
        )

    cena = copy.deepcopy(dados["mapa"])
    cena["areas"] = [
        {**a, "id": str(area_ids[a["id"]])} for a in cena["areas"] if a["id"] in area_ids
    ]
    cena["posicoes"] = [
        {**p, "vagaId": str(vaga_ids[p["vagaId"]]), "areaId": str(area_ids[p["areaId"]])}
        for p in cena["posicoes"]
        if p["vagaId"] in vaga_ids and p["areaId"] in area_ids
    ]
    session.add(MapaCampus(empresa_id=empresa.id, cena=cena))

    agora = datetime.now(UTC)
    indice_vaga = {}
    for lot in dados["estacionamentos"]:
        for i, vaga in enumerate(lot["vagas"]):
            indice_vaga[vaga["id"]] = (dados["estacionamentos"].index(lot), i)
    for sensor in dados["sensores"]:
        status = sinal = None
        if sinteticos and sensor["vagaId"] in indice_vaga:
            li, i = indice_vaga[sensor["vagaId"]]
            # Mesmo padrão do seed do mock; a vaga 19 de cada estacionamento fica sem sinal.
            if i != 18:
                status = "LIVRE" if i % (3 if li == 0 else 4) == 0 else "OCUPADA"
                sinal = agora - timedelta(seconds=2 + i % 23)
        session.add(
            Sensor(
                empresa_id=empresa.id,
                nome=sensor["nome"],
                vaga_id=vaga_ids.get(sensor["vagaId"]),
                chave_hash=hash_token(nova_chave_dispositivo()),
                ultimo_status=status,
                ultimo_sinal_em=sinal,
            )
        )

    if sinteticos:
        _historico_sintetico(session, dados, lot_ids, agora, _fuso(fuso))
    session.flush()
    return empresa


def _historico_sintetico(session, dados, lot_ids, agora, fuso) -> None:
    """Histórico demonstrativo de 14 dias a cada 30 min, mesma fórmula do mock."""
    inicio = agora.replace(minute=agora.minute - agora.minute % 30, second=0, microsecond=0)
    linhas = []
    for li, lot in enumerate(dados["estacionamentos"]):
        total = len(lot["vagas"])
        for i in range(14 * 48 + 1):
            instante = inicio - timedelta(minutes=30 * (14 * 48 - i))
            local = instante.astimezone(fuso)
            hora = local.hour + local.minute / 60
            pico = sum(math.exp(-((hora - c) ** 2) / 6) * 48 for c in (7.5, 12, 18.5))
            fator = 0.5 if local.weekday() >= 5 else 1
            ocupacao = min(98, math.floor((22 + pico + math.sin(i * 1.7 + li) * 5) * fator + 0.5))
            livres = max(0, min(total, math.floor(total * (1 - ocupacao / 100) + 0.5)))
            linhas.append(
                HistoricoOcupacao(
                    estacionamento_id=lot_ids[lot["id"]],
                    instante=instante,
                    total=total,
                    livres=livres,
                    ocupadas=total - livres,
                    sem_sinal=0,
                )
            )
    session.add_all(linhas)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--arquivo", type=Path, default=ARQUIVO)
    parser.add_argument(
        "--sem-dados-sinteticos",
        action="store_true",
        help="Não grava leituras nem histórico demonstrativos.",
    )
    args = parser.parse_args()
    settings = get_settings()
    engine = make_engine(settings)
    if engine is None:
        raise SystemExit("Configure BATSINAL_DATABASE_URL no backend/.env antes do seed.")
    dados = json.loads(args.arquivo.read_text(encoding="utf-8"))
    with Session(engine, expire_on_commit=False) as session:
        empresa = importar(
            session,
            dados,
            sinteticos=not args.sem_dados_sinteticos,
            fuso=settings.fuso_horario,
        )
        if empresa is None:
            print(f"Empresa '{dados['empresa']['slug']}' já existe. Nada foi alterado.")
            return
        session.commit()
    engine.dispose()
    print(
        f"Importado: {empresa.nome} ({empresa.slug}), {len(dados['estacionamentos'])} "
        f"estacionamentos, {len(dados['areas'])} áreas, {len(dados['ancoras'])} âncoras, "
        f"{len(dados['sensores'])} sensores. Conta fictícia: {empresa.email} / {SENHA_DEMO}."
    )
    print("Chaves dos sensores não são exibidas: gere uma com POST /api/sensores/{id}/chave.")


if __name__ == "__main__":
    main()
