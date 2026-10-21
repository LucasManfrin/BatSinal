from alembic import context

from app.config import get_settings
from app.db import make_engine

settings = get_settings()
if settings.database_url is None:
    raise RuntimeError("Configure BATSINAL_DATABASE_URL no backend/.env antes de migrar.")

# Sem ORM de domínio ainda. None faz autogenerate recusar a operação, em vez de
# interpretar metadata vazia como uma solicitação para apagar todas as tabelas.
target_metadata = None

if context.is_offline_mode():
    context.configure(
        url=settings.database_url.get_secret_value(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = make_engine(settings)
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()
