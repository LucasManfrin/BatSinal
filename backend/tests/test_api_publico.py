import json

import pytest

from .conftest import auth, cadastrar, login_demo

SEGREDOS = ("sensorId", "email", "senha", "chave", "deviceKey", "token")


def _sem_segredos(resposta):
    assert resposta.status_code == 200, resposta.text
    texto = json.dumps(resposta.json())
    for segredo in SEGREDOS:
        assert f'"{segredo}' not in texto, segredo
    return resposta.json()


def test_campus_publico_da_unisagrado(client, seed):
    campus = _sem_segredos(client.get("/api/public/empresas/unisagrado"))
    assert campus["empresa"] == {"id": str(seed.id), "nome": "Unisagrado", "slug": "unisagrado"}
    assert len(campus["vagas"]) == 89 and campus["vagasSemPosicao"] == 3
    mapa = campus["mapa"]
    assert len(mapa["areas"]) == 11 and len(mapa["predios"]) > 0
    # Referências da cena apontam para os UUIDs das áreas e vagas importadas.
    areas = {a["id"] for a in mapa["areas"]}
    assert {v["areaId"] for v in campus["vagas"]} <= areas
    assert {p["areaId"] for p in mapa["posicoes"]} <= areas
    vaga = campus["vagas"][0]
    assert set(vaga) == {
        "id",
        "rotulo",
        "tipo",
        "status",
        "atualizadoEm",
        "areaId",
        "ponto",
        "rotacao",
    }
    assert {v["status"] for v in campus["vagas"]} <= {"LIVRE", "OCUPADA", "SEM_SINAL"}


def test_estacionamentos_status_e_area_publicos(client, seed):
    lots = _sem_segredos(client.get("/api/public/empresas/unisagrado/estacionamentos"))
    assert sorted(lot["totalVagas"] for lot in lots) == [20, 32, 37]
    central = next(lot for lot in lots if lot["nome"] == "Estacionamento Central")
    assert central["portao"].startswith("Portão 1") and central["caminhadaMinutos"] == 2
    assert set(central["livresPorTipo"]) == {"COMUM", "PCD", "MOTO"}

    detalhe = _sem_segredos(client.get(f"/api/public/estacionamentos/{central['id']}"))
    assert len(detalhe["vagas"]) == 37 and all(v["ancoraId"] for v in detalhe["vagas"])
    status = _sem_segredos(client.get(f"/api/public/estacionamentos/{central['id']}/status"))
    assert len(status) == 37

    area_id = detalhe["vagas"][0]["areaId"]
    area = _sem_segredos(client.get(f"/api/public/areas/{area_id}"))
    assert area["area"]["id"] == area_id and area["mapa"]["nome"] == "Unisagrado"
    assert all(v["ancoraId"] for v in area["vagas"])

    # Aliases antigos leem os mesmos recursos.
    assert len(_sem_segredos(client.get("/api/publico/campi"))) == 1
    alias = _sem_segredos(client.get("/api/publico/campi/unisagrado/mapa"))
    assert alias["vagasSemPosicao"] == 3
    assert _sem_segredos(
        client.get(f"/api/publico/campi/unisagrado/estacionamentos/{central['id']}/status")
    )


def test_privado_mostra_bandeja_e_sensores(client, seed):
    sessao = login_demo(client)
    lots = client.get("/api/estacionamentos", headers=auth(sessao)).json()
    assert sorted(lot["totalVagas"] for lot in lots) == [20, 32, 40]
    central = next(lot for lot in lots if lot["nome"] == "Estacionamento Central")
    detalhe = client.get(f"/api/estacionamentos/{central['id']}", headers=auth(sessao)).json()
    assert sum(1 for v in detalhe["vagas"] if "ancoraId" not in v) == 3
    assert all(v["sensorId"] for v in detalhe["vagas"])
    status = client.get(f"/api/estacionamentos/{central['id']}/status", headers=auth(sessao))
    assert len(status.json()) == 40


@pytest.mark.parametrize("metodo", ["post", "put", "delete"])
def test_consulta_publica_somente_leitura(client, metodo):
    for caminho in ("/api/public/empresas", "/api/public/areas/x", "/api/publico/campi/a"):
        resposta = getattr(client, metodo)(caminho)
        assert resposta.status_code == 405
        assert resposta.json()["status"] == 405


def test_recursos_inexistentes(client, seed):
    assert client.get("/api/public/empresas/nao-existe").status_code == 404
    assert client.get("/api/public/estacionamentos/est-1").status_code == 404
    assert client.get("/api/public/areas/frente-ab").json() == {
        "status": 404,
        "mensagem": "Área não encontrada.",
    }


def test_empresa_nova_tem_mapa_publico_vazio(client):
    cadastrar(client, "nova-empresa")
    campus = _sem_segredos(client.get("/api/public/empresas/nova-empresa"))
    assert campus["mapa"] is None and campus["vagas"] == [] and campus["vagasSemPosicao"] == 0
    assert _sem_segredos(client.get("/api/public/empresas/nova-empresa/estacionamentos")) == []
