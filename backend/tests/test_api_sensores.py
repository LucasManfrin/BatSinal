from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import HistoricoOcupacao, Sensor
from app.services.ocupacao import ciclo_amostragem, inicio_intervalo

from .conftest import auth, cadastrar, login_demo


def _area_com_vaga(client, h):
    lot = client.post("/api/estacionamentos", headers=h, json={"nome": "Pátio"}).json()
    area = client.post(
        "/api/areas", headers=h, json={"nome": "Trecho", "estacionamentoId": lot["id"]}
    ).json()
    vaga = client.post(
        "/api/vagas", headers=h, json={"areaId": area["id"], "rotulo": "A1", "tipo": "COMUM"}
    ).json()
    return lot, vaga


def test_chave_aparece_uma_vez_e_leitura_autentica_dispositivo(client, engine):
    h = auth(cadastrar(client, "empresa-a"))
    lot, vaga = _area_com_vaga(client, h)
    criado = client.post(
        "/api/sensores", headers=h, json={"nome": "Sensor A1", "vagaId": vaga["id"]}
    )
    assert criado.status_code == 201
    chave = criado.json()["deviceKey"]
    assert "deviceKey" not in client.get("/api/sensores", headers=h).json()[0]
    with Session(engine) as session:
        assert chave not in session.scalar(select(Sensor.chave_hash))

    status = client.get(f"/api/estacionamentos/{lot['id']}/status", headers=h).json()
    assert status[0]["status"] == "SEM_SINAL"
    assert client.post("/api/leituras", json={"status": "LIVRE"}).status_code == 401
    assert (
        client.post("/api/leituras", headers={"X-Device-Key": "x"}, json={"status": "LIVRE"})
    ).status_code == 401
    leitura = client.post(
        "/api/leituras", headers={"X-Device-Key": chave}, json={"status": "LIVRE"}
    )
    assert leitura.status_code == 201 and leitura.json()["vagaId"] == vaga["id"]
    assert client.get(f"/api/estacionamentos/{lot['id']}/status", headers=h).json()[0][
        "status"
    ] == ("LIVRE")
    resumo = client.get("/api/estacionamentos", headers=h).json()[0]
    assert resumo["vagasLivres"] == 1 and resumo["livresPorTipo"]["COMUM"] == 1
    with Session(engine) as session:
        amostra = session.scalar(select(HistoricoOcupacao))
        assert (amostra.total, amostra.livres) == (1, 1)

    # Leitura com mais de 60 s vira SEM_SINAL.
    with Session(engine) as session:
        session.execute(
            update(Sensor).values(ultimo_sinal_em=datetime.now(UTC) - timedelta(seconds=61))
        )
        session.commit()
    assert client.get(f"/api/estacionamentos/{lot['id']}/status", headers=h).json()[0][
        "status"
    ] == ("SEM_SINAL")

    nova = client.post(f"/api/sensores/{criado.json()['id']}/chave", headers=h).json()["deviceKey"]
    assert (
        client.post(
            "/api/leituras", headers={"X-Device-Key": chave}, json={"status": "LIVRE"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/leituras", headers={"X-Device-Key": nova}, json={"status": "OCUPADA"}
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/leituras", headers={"X-Device-Key": nova}, json={"status": "SEM_SINAL"}
        ).status_code
        == 422
    )


def test_vinculo_unico_e_desvincular(client):
    h = auth(cadastrar(client, "empresa-a"))
    _, vaga = _area_com_vaga(client, h)
    s1 = client.post("/api/sensores", headers=h, json={"nome": "S1", "vagaId": vaga["id"]}).json()
    duplicado = client.post("/api/sensores", headers=h, json={"nome": "S2", "vagaId": vaga["id"]})
    assert duplicado.status_code == 422
    s2 = client.post("/api/sensores", headers=h, json={"nome": "S2", "vagaId": ""}).json()
    assert "vagaId" not in s2
    solto = client.put(f"/api/sensores/{s1['id']}", headers=h, json={"nome": "S1", "vagaId": ""})
    assert "vagaId" not in solto.json()
    movido = client.put(
        f"/api/sensores/{s2['id']}", headers=h, json={"nome": "S2", "vagaId": vaga["id"]}
    )
    assert movido.json()["vagaId"] == vaga["id"]
    assert client.get(f"/api/vagas/{vaga['id']}", headers=h).json()["sensorId"] == s2["id"]
    assert client.delete(f"/api/sensores/{s2['id']}", headers=h).json() is None
    assert "sensorId" not in client.get(f"/api/vagas/{vaga['id']}", headers=h).json()


def test_simulador_e_pulso(client, engine, seed, settings):
    h = auth(login_demo(client))
    lot = client.get("/api/estacionamentos", headers=h).json()[0]
    vaga = client.get(f"/api/estacionamentos/{lot['id']}", headers=h).json()["vagas"][0]
    url = f"/api/estacionamentos/{lot['id']}/status"

    def status():
        return next(
            s["status"] for s in client.get(url, headers=h).json() if s["vagaId"] == vaga["id"]
        )

    assert (
        client.post(
            "/api/simulador/leituras", headers=h, json={"vagaId": vaga["id"], "status": "OCUPADA"}
        ).status_code
        == 201
    )
    assert status() == "OCUPADA"
    client.post(
        "/api/simulador/leituras", headers=h, json={"vagaId": vaga["id"], "status": "SEM_SINAL"}
    )
    assert status() == "SEM_SINAL"
    with Session(engine) as session:
        session.execute(
            update(Sensor).values(ultimo_sinal_em=datetime.now(UTC) - timedelta(minutes=5))
        )
        session.commit()
        ciclo_amostragem(session, settings)
        atual = session.scalar(
            select(func.count())
            .select_from(HistoricoOcupacao)
            .where(HistoricoOcupacao.instante == inicio_intervalo(datetime.now(UTC)))
        )
        # Retenção de 14 dias remove a amostra sintética mais antiga.
        limite = datetime.now(UTC) - timedelta(days=settings.retencao_historico_dias)
        antigas = session.scalar(
            select(func.count())
            .select_from(HistoricoOcupacao)
            .where(HistoricoOcupacao.instante < limite)
        )
    # Pulso revive leituras simuladas, mas não a vaga marcada SEM_SINAL.
    assert status() == "SEM_SINAL"
    statuses = {s["status"] for s in client.get(url, headers=h).json()}
    assert {"LIVRE", "OCUPADA"} <= statuses
    assert atual == 3 and antigas == 0  # UPSERT de uma amostra por estacionamento


def test_simulador_desligado_responde_404(client, engine, seed, url_banco):
    from fastapi.testclient import TestClient
    from pydantic import SecretStr

    from app.main import create_app

    settings = Settings(_env_file=None, database_url=SecretStr(url_banco), amostragem_segundos=0)
    with TestClient(create_app(settings)) as desligado:
        h = auth(login_demo(desligado))
        resposta = desligado.post(
            "/api/simulador/leituras", headers=h, json={"vagaId": "x", "status": "LIVRE"}
        )
        assert resposta.status_code == 404


def test_ocupacao_e_heatmap(client, seed):
    h = auth(login_demo(client))
    lot = client.get("/api/estacionamentos", headers=h).json()[0]
    base = f"/api/estacionamentos/{lot['id']}"
    de = (datetime.now(UTC) - timedelta(days=2)).isoformat().replace("+00:00", "Z")
    dia = client.get(f"{base}/ocupacao", headers=h, params={"de": de, "granularidade": "dia"})
    assert dia.status_code == 200 and 2 <= len(dia.json()) <= 3
    meia = client.get(f"{base}/ocupacao", headers=h, params={"granularidade": "30min"}).json()
    assert 47 <= len(meia) <= 50
    assert all(0 <= p["ocupacao"] <= 100 for p in meia)
    assert (
        client.get(f"{base}/ocupacao", headers=h, params={"granularidade": "ano"}).status_code
        == 422
    )
    assert client.get(f"{base}/ocupacao", headers=h, params={"de": "ontem"}).status_code == 422
    calor = client.get(f"{base}/heatmap", headers=h).json()
    assert len(calor) == 168 and {c["dia"] for c in calor} == set(range(7))
    assert any(c["ocupacao"] > 0 for c in calor)
