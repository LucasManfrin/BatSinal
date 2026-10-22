"""Uma empresa nunca lê nem altera recursos de outra: IDs conhecidos devolvem 404."""

from .conftest import auth, cadastrar, login_demo


def test_ids_de_outra_empresa_devolvem_404(client, seed):
    demo = auth(login_demo(client))
    outra = auth(cadastrar(client, "outra-empresa"))
    lot = client.get("/api/estacionamentos", headers=demo).json()[0]
    detalhe = client.get(f"/api/estacionamentos/{lot['id']}", headers=demo).json()
    vaga = next(v for v in detalhe["vagas"] if v.get("ancoraId"))
    sensor = client.get("/api/sensores", headers=demo).json()[0]

    proibidos = [
        ("get", f"/api/estacionamentos/{lot['id']}", None),
        ("get", f"/api/estacionamentos/{lot['id']}/status", None),
        ("get", f"/api/estacionamentos/{lot['id']}/ocupacao", None),
        ("get", f"/api/estacionamentos/{lot['id']}/heatmap", None),
        ("put", f"/api/estacionamentos/{lot['id']}", {"nome": "Invadido"}),
        ("delete", f"/api/estacionamentos/{lot['id']}", None),
        ("get", f"/api/areas/{vaga['areaId']}", None),
        ("put", f"/api/areas/{vaga['areaId']}", {"nome": "Invadida"}),
        ("delete", f"/api/areas/{vaga['areaId']}", None),
        ("put", f"/api/areas/{vaga['areaId']}/posicoes", {"versao": 1, "posicoes": []}),
        ("post", f"/api/areas/{vaga['areaId']}/restaurar-padrao", {"versao": 1}),
        ("get", f"/api/vagas/{vaga['id']}", None),
        ("put", f"/api/vagas/{vaga['id']}", {"rotulo": "Z", "tipo": "COMUM"}),
        ("put", f"/api/vagas/{vaga['id']}/posicao", {"ancoraId": None, "versao": 1}),
        ("delete", f"/api/vagas/{vaga['id']}", None),
        ("post", "/api/vagas", {"areaId": vaga["areaId"], "rotulo": "Z9", "tipo": "COMUM"}),
        ("post", "/api/areas", {"nome": "X", "estacionamentoId": lot["id"]}),
        ("put", f"/api/sensores/{sensor['id']}", {"nome": "Invadido"}),
        ("post", f"/api/sensores/{sensor['id']}/chave", None),
        ("delete", f"/api/sensores/{sensor['id']}", None),
        ("post", "/api/simulador/leituras", {"vagaId": vaga["id"], "status": "LIVRE"}),
    ]
    for metodo, caminho, corpo in proibidos:
        kwargs = {"headers": outra} | ({"json": corpo} if corpo is not None else {})
        resposta = getattr(client, metodo)(caminho, **kwargs)
        assert resposta.status_code in (404, 422), (metodo, caminho, resposta.text)
        assert resposta.status_code == 404 or "vincule" in resposta.json()["mensagem"].lower()

    assert client.get("/api/estacionamentos", headers=outra).json() == []
    assert client.get("/api/areas", headers=outra).json() == []
    assert client.get("/api/vagas", headers=outra).json() == []
    assert client.get("/api/sensores", headers=outra).json() == []
    # Sensor próprio não pode ser vinculado a vaga alheia.
    vinculo = client.post("/api/sensores", headers=outra, json={"nome": "S1", "vagaId": vaga["id"]})
    assert vinculo.status_code == 422
    # Nada foi alterado na empresa original.
    depois = client.get(f"/api/estacionamentos/{lot['id']}", headers=demo).json()
    assert depois == detalhe


def test_rotas_privadas_exigem_sessao(client):
    for caminho in (
        "/api/estacionamentos",
        "/api/areas",
        "/api/vagas",
        "/api/sensores",
        "/api/empresa",
    ):
        resposta = client.get(caminho)
        assert resposta.status_code == 401
        assert resposta.json()["mensagem"] == "Entre na conta da empresa para continuar."
