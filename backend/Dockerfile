FROM python:3.14-slim

ENV UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir "uv==0.13.7"

WORKDIR /srv/api

# Somente dependências de execução, exatamente as do uv.lock (o extra "dev" fica de fora).
# O projeto não é instalado: app/, migrations/ e database/ rodam a partir do WORKDIR.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-cache

COPY alembic.ini ./
COPY app ./app
COPY migrations ./migrations
COPY database ./database

RUN useradd --system --no-create-home batsinal
USER batsinal

ENV PATH="/srv/api/.venv/bin:$PATH"
EXPOSE 8000

# Inline, sem script de entrada: um .sh com CRLF (checkout no Windows) quebraria no Linux.
# O seed não altera nada se a Unisagrado já existir. Mantenha uma única réplica e um único
# worker: a tarefa de amostragem do histórico roda dentro do processo.
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
