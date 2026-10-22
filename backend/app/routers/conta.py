"""Conta da empresa e sessões. Não há papéis nem contas de visitantes."""

from fastapi import APIRouter, Request
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.auth import EmpresaDep, SessionDep, SettingsDep, criar_sessao, token_da_requisicao
from app.errors import ApiError
from app.models import Empresa, Sessao
from app.schemas import CadastroEmpresa, EmpresaUpdate, Login, SenhaUpdate
from app.security import HASH_FICTICIO, hash_senha, hash_token, verificar_senha
from app.services.consulta import conta_empresa

router = APIRouter(tags=["conta da empresa"])


def _empresa(session: Session, empresa: EmpresaDep) -> Empresa:
    conta = session.get(Empresa, empresa.id)
    if conta is None:
        raise ApiError(401, "Entre na conta da empresa para continuar.")
    return conta


def _slug_livre(session: Session, slug: str, exceto=None) -> None:
    consulta = select(Empresa.id).where(Empresa.slug == slug)
    if exceto is not None:
        consulta = consulta.where(Empresa.id != exceto)
    if session.scalar(consulta) is not None:
        raise ApiError(
            409, "Este endereço já está em uso.", {"slug": "Escolha outro endereço para o mapa."}
        )


@router.post("/auth/cadastro-empresa", status_code=201)
def cadastrar(body: CadastroEmpresa, session: SessionDep, settings: SettingsDep):
    _slug_livre(session, body.slug)
    if session.scalar(select(Empresa.id).where(func.lower(Empresa.email) == body.email)):
        raise ApiError(409, "Este e-mail já está cadastrado.", {"email": "E-mail já cadastrado."})
    empresa = Empresa(
        nome=body.nome, slug=body.slug, email=body.email, senha_hash=hash_senha(body.senha)
    )
    session.add(empresa)
    session.flush()
    token = criar_sessao(session, empresa, settings)
    session.commit()
    return {"token": token, "empresa": conta_empresa(empresa)}


@router.post("/auth/login", status_code=201)
def login(body: Login, session: SessionDep, settings: SettingsDep):
    email = body.email.strip().lower() if isinstance(body.email, str) else ""
    senha = body.senha if isinstance(body.senha, str) else ""
    empresa = (
        session.scalar(select(Empresa).where(func.lower(Empresa.email) == email)) if email else None
    )
    valida = verificar_senha(senha, empresa.senha_hash if empresa else HASH_FICTICIO)
    if empresa is None or not valida:
        raise ApiError(401, "E-mail ou senha incorretos.")
    token = criar_sessao(session, empresa, settings)
    session.commit()
    return {"token": token, "empresa": conta_empresa(empresa)}


@router.post("/auth/logout")
def logout(session: SessionDep, empresa: EmpresaDep):
    session.execute(delete(Sessao).where(Sessao.token_hash == empresa.token_hash))
    session.commit()
    return None


@router.get("/auth/me")
def me(session: SessionDep, empresa: EmpresaDep):
    return conta_empresa(_empresa(session, empresa))


@router.get("/empresa")
def ler_empresa(session: SessionDep, empresa: EmpresaDep):
    return conta_empresa(_empresa(session, empresa))


@router.put("/empresa")
def alterar_empresa(body: EmpresaUpdate, session: SessionDep, empresa: EmpresaDep):
    conta = _empresa(session, empresa)
    _slug_livre(session, body.slug, conta.id)
    conta.nome = body.nome
    conta.slug = body.slug
    session.commit()
    return conta_empresa(conta)


@router.put("/empresa/senha")
def alterar_senha(body: SenhaUpdate, request: Request, session: SessionDep, empresa: EmpresaDep):
    conta = _empresa(session, empresa)
    if not verificar_senha(body.senha_atual, conta.senha_hash):
        raise ApiError(422, "A senha atual não confere.", {"senhaAtual": "Senha incorreta."})
    conta.senha_hash = hash_senha(body.nova_senha)
    atual = hash_token(token_da_requisicao(request) or "")
    # Invalida as outras sessões; a sessão que trocou a senha continua ativa.
    session.execute(delete(Sessao).where(Sessao.empresa_id == conta.id, Sessao.token_hash != atual))
    session.commit()
    return None
