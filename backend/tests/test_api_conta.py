from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Empresa, Sessao

from .conftest import auth, cadastrar


def test_cadastro_entra_e_guarda_somente_hash(client, engine):
    sessao = cadastrar(client, "minha-empresa", "Contato@Exemplo.demo")
    assert sessao["empresa"] == {
        "id": sessao["empresa"]["id"],
        "nome": "Empresa minha-empresa",
        "slug": "minha-empresa",
        "email": "contato@exemplo.demo",
    }
    assert client.get("/api/auth/me", headers=auth(sessao)).json()["slug"] == "minha-empresa"
    with Session(engine) as session:
        empresa = session.scalar(select(Empresa))
        assert empresa.senha_hash.startswith("scrypt$")
        assert "senha-segura" not in empresa.senha_hash
        token_hash = session.scalar(select(Sessao.token_hash))
        assert token_hash != sessao["token"]


def test_cadastro_valida_campos_e_conflitos(client):
    cadastrar(client, "empresa-a", "a@exemplo.demo")
    invalido = client.post(
        "/api/auth/cadastro-empresa",
        json={"nome": "X", "slug": "Com Espaço", "email": "nada", "senha": "curta"},
    )
    assert invalido.status_code == 422
    assert set(invalido.json()["campos"]) == {"nome", "slug", "email", "senha"}
    base = {"nome": "Outra", "senha": "senha-segura"}
    slug = client.post(
        "/api/auth/cadastro-empresa", json={**base, "slug": "empresa-a", "email": "b@exemplo.demo"}
    )
    assert slug.status_code == 409 and "slug" in slug.json()["campos"]
    email = client.post(
        "/api/auth/cadastro-empresa", json={**base, "slug": "empresa-b", "email": "A@exemplo.demo"}
    )
    assert email.status_code == 409 and "email" in email.json()["campos"]
    disponivel = client.get("/api/public/slugs/empresa-a/disponivel").json()
    assert disponivel == {"slug": "empresa-a", "disponivel": False}
    assert client.get("/api/public/slugs/empresa-c/disponivel").json()["disponivel"] is True
    assert client.get("/api/public/slugs/A_B/disponivel").json()["disponivel"] is False


def test_login_logout_e_sessao_vencida(client, engine):
    cadastrar(client, "empresa-a", "a@exemplo.demo")
    errado = client.post("/api/auth/login", json={"email": "a@exemplo.demo", "senha": "errada!!"})
    assert errado.status_code == 401
    assert errado.json() == {"status": 401, "mensagem": "E-mail ou senha incorretos."}
    assert client.post("/api/auth/login", json={}).status_code == 401
    sessao = client.post(
        "/api/auth/login", json={"email": " A@Exemplo.demo ", "senha": "senha-segura"}
    ).json()
    assert client.get("/api/empresa", headers=auth(sessao)).status_code == 200
    assert client.post("/api/auth/logout", headers=auth(sessao)).status_code == 200
    assert client.get("/api/empresa", headers=auth(sessao)).status_code == 401

    outra = client.post(
        "/api/auth/login", json={"email": "a@exemplo.demo", "senha": "senha-segura"}
    ).json()
    with Session(engine) as session:
        session.execute(update(Sessao).values(expira_em=datetime.now(UTC) - timedelta(seconds=1)))
        session.commit()
    assert client.get("/api/auth/me", headers=auth(outra)).status_code == 401
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer "}).status_code == 401


def test_alterar_empresa_e_senha_revoga_outras_sessoes(client):
    primeira = cadastrar(client, "empresa-a", "a@exemplo.demo")
    cadastrar(client, "ocupado")
    segunda = client.post(
        "/api/auth/login", json={"email": "a@exemplo.demo", "senha": "senha-segura"}
    ).json()
    conflito = client.put(
        "/api/empresa", headers=auth(primeira), json={"nome": "Nova", "slug": "ocupado"}
    )
    assert conflito.status_code == 409
    alterada = client.put(
        "/api/empresa", headers=auth(primeira), json={"nome": " Nova Empresa ", "slug": "nova"}
    )
    assert alterada.json()["nome"] == "Nova Empresa" and alterada.json()["slug"] == "nova"

    errada = client.put(
        "/api/empresa/senha",
        headers=auth(primeira),
        json={"senhaAtual": "nao-confere", "novaSenha": "outra-senha"},
    )
    assert errada.status_code == 422
    ok = client.put(
        "/api/empresa/senha",
        headers=auth(primeira),
        json={"senhaAtual": "senha-segura", "novaSenha": "outra-senha"},
    )
    assert ok.status_code == 200 and ok.json() is None
    assert client.get("/api/auth/me", headers=auth(primeira)).status_code == 200
    assert client.get("/api/auth/me", headers=auth(segunda)).status_code == 401
    novo_login = client.post(
        "/api/auth/login", json={"email": "a@exemplo.demo", "senha": "outra-senha"}
    )
    assert novo_login.status_code == 201
