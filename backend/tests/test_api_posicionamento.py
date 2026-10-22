import threading

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Ancora, Sensor

from .conftest import auth, cadastrar, login_demo

ANCORAS = [
    {"x": 0, "z": 0, "rotacao": 25, "largura": 1.2, "profundidade": 2.8, "tiposAceitos": ["COMUM"]},
    {"x": 2, "z": 0, "rotacao": 25, "largura": 1.2, "profundidade": 2.8, "tiposAceitos": ["COMUM"]},
    {"x": 4, "z": 0, "rotacao": 0, "largura": 1.5, "profundidade": 2.8, "tiposAceitos": ["PCD"]},
]


def preparar(client):
    sessao = cadastrar(client, "empresa-a")
    h = auth(sessao)
    lot = client.post("/api/estacionamentos", headers=h, json={"nome": "Pátio"})
    assert lot.status_code == 201, lot.text
    area = client.post(
        "/api/areas",
        headers=h,
        json={"nome": "Trecho 1", "estacionamentoId": lot.json()["id"], "ancoras": ANCORAS},
    )
    assert area.status_code == 201, area.text
    area_id = area.json()["id"]
    vagas = [
        client.post(
            "/api/vagas", headers=h, json={"areaId": area_id, "rotulo": r, "tipo": t}
        ).json()
        for r, t in (("A1", "COMUM"), ("A2", "COMUM"), ("P1", "PCD"))
    ]
    detalhe = client.get(f"/api/areas/{area_id}", headers=h).json()
    # Ordenadas por x: duas posições COMUM e, por último, a PCD.
    ancoras = [a["id"] for a in detalhe["ancoras"]]
    return h, area_id, {v["rotulo"]: v["id"] for v in vagas}, ancoras, detalhe["area"]["versao"]


def posicoes(detalhe):
    return {v["rotulo"]: v.get("ancoraId") for v in detalhe["vagas"]}


def mover(client, h, vaga_id, ancora_id, versao):
    return client.put(
        f"/api/vagas/{vaga_id}/posicao", headers=h, json={"ancoraId": ancora_id, "versao": versao}
    )


def test_importacao_cria_area_sem_inventar_vagas(client):
    h, area_id, vagas, ancoras, versao = preparar(client)
    detalhe = client.get(f"/api/areas/{area_id}", headers=h).json()
    assert len(detalhe["ancoras"]) == 3 and versao == 4  # 1 + três vagas na bandeja
    assert all("ancoraId" not in v for v in detalhe["vagas"])
    assert client.get("/api/areas", headers=h).json()[0]["progresso"] == {
        "posicionadas": 0,
        "total": 3,
    }
    lot_id = detalhe["area"]["estacionamentoId"]
    invalida = client.post(
        "/api/areas",
        headers=h,
        json={"nome": "X", "estacionamentoId": lot_id, "ancoras": [{**ANCORAS[0], "largura": 0}]},
    )
    assert invalida.status_code == 422
    assert "posições mapeadas" in invalida.json()["mensagem"]
    excesso = client.post(
        "/api/areas",
        headers=h,
        json={"nome": "X", "estacionamentoId": lot_id, "ancoras": [ANCORAS[0]] * 2001},
    )
    assert excesso.status_code == 422


def test_posicionar_trocar_e_deslocar_para_bandeja(client):
    h, area_id, vagas, ancoras, versao = preparar(client)
    r = mover(client, h, vagas["A1"], ancoras[0], versao)
    assert r.status_code == 200 and posicoes(r.json())["A1"] == ancoras[0]
    versao = r.json()["area"]["versao"]
    r = mover(client, h, vagas["A2"], ancoras[2], versao)
    assert r.status_code == 422  # COMUM em posição PCD
    r = mover(client, h, vagas["A2"], ancoras[1], versao)
    versao = r.json()["area"]["versao"]
    # Origem posicionada troca as duas peças.
    r = mover(client, h, vagas["A1"], ancoras[1], versao)
    assert posicoes(r.json()) == {"A1": ancoras[1], "A2": ancoras[0], "P1": None}
    versao = r.json()["area"]["versao"]
    # Origem na bandeja: peça deslocada vai para a bandeja.
    r = mover(client, h, vagas["A1"], None, versao)
    versao = r.json()["area"]["versao"]
    r = mover(client, h, vagas["A1"], ancoras[0], versao)
    assert posicoes(r.json()) == {"A1": ancoras[0], "A2": None, "P1": None}


def test_versao_obrigatoria_e_conflito(client):
    h, area_id, vagas, ancoras, versao = preparar(client)
    sem_versao = client.put(
        f"/api/vagas/{vagas['A1']}/posicao", headers=h, json={"ancoraId": ancoras[0]}
    )
    assert sem_versao.status_code == 422
    assert mover(client, h, vagas["A1"], ancoras[0], versao - 1).status_code == 409
    assert mover(client, h, vagas["A1"], ancoras[0], versao).status_code == 200
    assert mover(client, h, vagas["A2"], ancoras[1], versao).status_code == 409


def test_lote_desfazer_valida_tudo_antes_de_alterar(client):
    h, area_id, vagas, ancoras, versao = preparar(client)
    lote = [
        {"vagaId": vagas["A1"], "ancoraId": ancoras[0]},
        {"vagaId": vagas["A2"], "ancoraId": ancoras[1]},
        {"vagaId": vagas["P1"], "ancoraId": ancoras[2]},
    ]
    r = client.put(
        f"/api/areas/{area_id}/posicoes", headers=h, json={"versao": versao, "posicoes": lote}
    )
    assert r.status_code == 200, r.text
    versao = r.json()["area"]["versao"]
    repetida = [*lote[:2], {"vagaId": vagas["P1"], "ancoraId": ancoras[0]}]
    r = client.put(
        f"/api/areas/{area_id}/posicoes", headers=h, json={"versao": versao, "posicoes": repetida}
    )
    assert r.status_code == 422
    incompleta = client.put(
        f"/api/areas/{area_id}/posicoes", headers=h, json={"versao": versao, "posicoes": lote[:2]}
    )
    assert incompleta.status_code == 422
    atual = client.get(f"/api/areas/{area_id}", headers=h).json()
    assert atual["area"]["versao"] == versao
    assert posicoes(atual) == {"A1": ancoras[0], "A2": ancoras[1], "P1": ancoras[2]}


def test_restaurar_padrao_da_unisagrado(client, seed):
    h = auth(login_demo(client))
    campus = client.get("/api/public/empresas/unisagrado").json()
    area_id = campus["vagas"][0]["areaId"]
    detalhe = client.get(f"/api/areas/{area_id}", headers=h).json()
    original = posicoes(detalhe)
    primeira = next(v for v in detalhe["vagas"] if v.get("ancoraId"))
    r = mover(client, h, primeira["id"], None, detalhe["area"]["versao"])
    assert posicoes(r.json())[primeira["rotulo"]] is None
    r = client.post(
        f"/api/areas/{area_id}/restaurar-padrao",
        headers=h,
        json={"versao": r.json()["area"]["versao"]},
    )
    assert r.status_code == 201 and posicoes(r.json()) == original


def test_excluir_vaga_limpa_sensor_e_padrao(client, seed, engine):
    h = auth(login_demo(client))
    campus = client.get("/api/public/empresas/unisagrado").json()
    vaga_id = campus["vagas"][0]["id"]
    assert client.delete(f"/api/vagas/{vaga_id}", headers=h).json() is None
    with Session(engine) as session:
        assert session.scalar(select(Sensor).where(Sensor.vaga_id == vaga_id)) is None
        assert session.scalar(select(Ancora).where(Ancora.vaga_padrao_id == vaga_id)) is None
    area_id = campus["vagas"][1]["areaId"]
    assert client.delete(f"/api/areas/{area_id}", headers=h).status_code == 409
    lots = client.get("/api/estacionamentos", headers=h).json()
    assert client.delete(f"/api/estacionamentos/{lots[0]['id']}", headers=h).status_code == 200
    sensores = client.get("/api/sensores", headers=h).json()
    assert len(sensores) == 92  # sensores permanecem, alguns sem vínculo
    assert sum(1 for s in sensores if "vagaId" not in s) == lots[0]["totalVagas"] + 1


def test_vagas_rotulo_e_tipo(client):
    h, area_id, vagas, ancoras, versao = preparar(client)
    dup = client.post(
        "/api/vagas", headers=h, json={"areaId": area_id, "rotulo": " a1 ", "tipo": "MOTO"}
    )
    assert dup.status_code == 409
    versao = mover(client, h, vagas["A1"], ancoras[0], versao).json()["area"]["versao"]
    incompativel = client.put(
        f"/api/vagas/{vagas['A1']}", headers=h, json={"rotulo": "A1", "tipo": "PCD"}
    )
    assert incompativel.status_code == 422
    ok = client.put(f"/api/vagas/{vagas['A2']}", headers=h, json={"rotulo": "B9", "tipo": "MOTO"})
    assert ok.json()["rotulo"] == "B9" and ok.json()["tipo"] == "MOTO"
    assert [v["rotulo"] for v in client.get(f"/api/vagas?areaId={area_id}", headers=h).json()] == [
        "A1",
        "B9",
        "P1",
    ]


def test_movimentos_concorrentes_com_mesma_versao(client, settings):
    h, area_id, vagas, ancoras, versao = preparar(client)
    resultados: list[int] = []
    barreira = threading.Barrier(2)

    def tentar(vaga, ancora):
        with TestClient(create_app(settings)) as outro:
            barreira.wait()
            resultados.append(mover(outro, h, vagas[vaga], ancoras[ancora], versao).status_code)

    threads = [
        threading.Thread(target=tentar, args=("A1", 0)),
        threading.Thread(target=tentar, args=("A2", 0)),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(resultados) == [200, 409]
    atual = client.get(f"/api/areas/{area_id}", headers=h).json()
    assert atual["area"]["versao"] == versao + 1
    assert sum(1 for v in atual["vagas"] if v.get("ancoraId") == ancoras[0]) == 1
