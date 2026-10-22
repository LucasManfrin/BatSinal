"""Erros no formato ErroApi do frontend: { status, mensagem, campos? }."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status: int, mensagem: str, campos: dict[str, str] | None = None):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem
        self.campos = campos


def resposta_erro(status: int, mensagem: str, campos: dict[str, str] | None = None):
    content: dict = {"status": status, "mensagem": mensagem}
    if campos:
        content["campos"] = campos
    return JSONResponse(status_code=status, content=content)


MENSAGENS_HTTP = {
    401: "Entre na conta da empresa para continuar.",
    404: "Rota não encontrada.",
    405: "Método não permitido.",
}


def _mensagem_campo(error: dict) -> str:
    ctx = error.get("ctx") or {}
    tipo = error["type"]
    if tipo == "missing":
        return "Campo obrigatório."
    if tipo == "string_too_short":
        return f"Informe pelo menos {ctx.get('min_length')} caracteres."
    if tipo == "string_too_long":
        return f"Use até {ctx.get('max_length')} caracteres."
    if tipo in ("greater_than_equal", "less_than_equal", "greater_than", "less_than"):
        return "Valor fora do intervalo permitido."
    if tipo in ("float_parsing", "int_parsing", "float_type", "int_type", "finite_number"):
        return "Informe um número válido."
    if tipo == "int_from_float":
        return "Informe um número inteiro."
    if tipo in ("literal_error", "enum"):
        return "Valor inválido."
    if tipo == "value_error":
        return str(ctx.get("error") or error.get("msg", "Valor inválido."))
    return "Valor inválido."


def _nome_campo(loc: tuple) -> str:
    partes = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(partes) or "corpo"


def registrar_erros(application: FastAPI) -> None:
    @application.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        return resposta_erro(exc.status, exc.mensagem, exc.campos)

    @application.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        campos: dict[str, str] = {}
        for error in exc.errors():
            campos.setdefault(_nome_campo(error["loc"]), _mensagem_campo(error))
        return resposta_erro(422, "Confira os campos informados.", campos)

    @application.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        mensagem = MENSAGENS_HTTP.get(exc.status_code)
        if mensagem is None:
            mensagem = exc.detail if isinstance(exc.detail, str) else "Não foi possível concluir."
        return resposta_erro(exc.status_code, mensagem)
