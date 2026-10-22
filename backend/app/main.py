import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_engine, make_engine
from app.errors import registrar_erros, resposta_erro
from app.routers import areas, conta, estacionamentos, publico, sensores
from app.services.ocupacao import ciclo_amostragem

logger = logging.getLogger("batsinal")


def _amostrar(engine: Engine, settings: Settings) -> None:
    with Session(engine) as session:
        ciclo_amostragem(session, settings)


async def _tarefa_amostragem(engine: Engine, settings: Settings) -> None:
    while True:
        await asyncio.sleep(settings.amostragem_segundos)
        try:
            await asyncio.to_thread(_amostrar, engine, settings)
        except SQLAlchemyError:
            # Banco indisponível não derruba a API; a próxima rodada tenta de novo.
            logger.warning("Amostragem do histórico falhou.", exc_info=True)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = make_engine(settings)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        tarefa = None
        if engine is not None and settings.amostragem_segundos > 0:
            tarefa = asyncio.create_task(_tarefa_amostragem(engine, settings))
        yield
        if tarefa is not None:
            tarefa.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await tarefa
        if application.state.engine is not None:
            application.state.engine.dispose()

    application = FastAPI(
        title="BatSinal API",
        version="0.2.0",
        description=(
            "Consulta pública de vagas e administração por empresa. Contrato: docs/api-contract.md."
        ),
        lifespan=lifespan,
    )
    application.state.engine = engine
    application.state.settings = settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    registrar_erros(application)

    @application.exception_handler(IntegrityError)
    async def integrity_error(_: Request, exc: IntegrityError):
        # Corrida entre a validação e o commit (slug, e-mail, rótulo, âncora).
        return resposta_erro(409, "Conflito com dados salvos. Atualize e tente novamente.")

    @application.get("/api/health", tags=["infraestrutura"])
    def health():
        return {"status": "ok", "service": "batsinal-api", "stage": "api"}

    @application.get("/api/ready", tags=["infraestrutura"])
    def ready(request: Request):
        try:
            with get_engine(request).connect() as connection:
                connection.execute(text("SELECT 1"))
        except SQLAlchemyError:
            return JSONResponse(status_code=503, content={"detail": "Banco indisponível."})
        return {"status": "ok", "database": "reachable", "stage": "api"}

    for router in (
        publico.router,
        conta.router,
        estacionamentos.router,
        areas.router,
        sensores.router,
    ):
        application.include_router(router, prefix="/api")

    return application


app = create_app()
