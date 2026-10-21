from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import Settings, get_settings
from app.db import get_engine, make_engine


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = make_engine(settings)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        yield
        if application.state.engine is not None:
            application.state.engine.dispose()

    application = FastAPI(
        title="BatSinal API",
        version="0.1.0",
        description="Base técnica. Autenticação, consulta e gestão ainda não implementadas.",
        lifespan=lifespan,
    )
    application.state.engine = engine
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @application.get("/api/health", tags=["infraestrutura"])
    def health():
        return {"status": "ok", "service": "batsinal-api", "stage": "bootstrap"}

    @application.get("/api/ready", tags=["infraestrutura"])
    def ready(request: Request):
        try:
            with get_engine(request).connect() as connection:
                connection.execute(text("SELECT 1"))
        except SQLAlchemyError:
            return JSONResponse(status_code=503, content={"detail": "Banco indisponível."})
        return {"status": "ok", "database": "reachable", "stage": "bootstrap"}

    return application


app = create_app()
