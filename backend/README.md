# Backend BatSinal — base para implementação

Já existe uma base executável de FastAPI, configuração, CORS, conexão PostgreSQL e Alembic.
**As rotas de negócio ainda estão no mock do frontend.** Esta base não substitui o MSW.
Leia [HANDOFF](../docs/HANDOFF.md) e [AGENTS](AGENTS.md) antes de continuar.

## Preparar o ambiente

Python 3.12–3.14 e [uv](https://docs.astral.sh/uv/) são os requisitos. Dentro de `backend/`:

```sh
uv sync --extra dev --locked
```

Se uv não estiver instalado, esta alternativa cria somente um ambiente local (PowerShell):

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install uv
.venv/Scripts/uv.exe sync --extra dev --locked --inexact
```

Nos comandos abaixo, substitua `uv` por `.venv/Scripts/uv.exe` nesse caso. O `uv.lock` é versionado;
não atualize todas as dependências para começar a trabalhar.

## Banco de desenvolvimento

Com Docker Desktop ativo, dentro de `backend/`:

```sh
docker compose up -d db
```

O compose usa PostgreSQL 17, publica **somente 127.0.0.1:55432**, com banco/usuário `batsinal` e
senha fictícia `batsinal_dev`, destinados a desenvolvimento. O volume nomeado preserva dados.
Não há inicializador SQL paralelo: o esquema é criado somente pelo Alembic.

Copie `.env.example` para `.env` e confira a URL do banco local antes de migrar:

```sh
uv run alembic upgrade head
uv run alembic current
```

A revisão `0001` cria o esquema `batsinal` com suas tabelas e constraints, sem seed. Não aplique
essa revisão em um banco antigo com o mesmo esquema já criado manualmente: primeiro avalie uma
migração de adoção dos dados. Não use `create_all()` no startup. Veja `AGENTS.md` sobre autogenerate.

Para parar os containers preservando dados: `docker compose stop`. Não é necessário apagar volumes
para atualizar o código. Não há rotina de reset destrutivo nesta base.

## Executar a API

```sh
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- `/docs`: documentação do bootstrap.
- `GET /api/health`: processo ativo, funciona sem PostgreSQL.
- `GET /api/ready`: testa **somente conexão** com o banco, retorna 503 se ausente/indisponível.
- CORS permite por padrão os dois endereços locais do Vite em 5173.

O startup não cria tabelas, contas ou sessões e não conecta automaticamente ao banco.
Readiness não significa que autenticação ou domínio estão implementados; esses endpoints ainda retornam 404.

## Testes e qualidade

```sh
uv run ruff check app migrations tests
uv run ruff format --check app migrations tests
uv run pytest
uv lock --check
```

Os sete testes atuais cobrem health/readiness, CORS, driver PostgreSQL e geração/análise do SQL de
upgrade/downgrade. Funcionam sem banco. PGlAST verifica a sintaxe PostgreSQL, não o comportamento
das constraints. Acrescente testes de integração em PostgreSQL quando implementar o ORM e as rotas.

Na preparação inicial, o daemon Docker estava desligado. A migração **não foi aplicada** e não
foi alegada validação de banco real. O frontend continua funcionando sem esse ambiente.

## Fontes de verdade e sequência

- [Migração inicial](migrations/versions/0001_initial.py): snapshot versionado do esquema v2.
- [Referência SQL](database/schema.proposta.sql): desenho que originou `0001`; não executar como segundo inicializador.
- [Contrato do mock](../docs/api-contract.md): alvo das futuras rotas, ainda não implementadas aqui.
- [Arquitetura e transações](../docs/ARQUITETURA_BACKEND.md).
- [Mapa e limites do levantamento](../docs/MAPA_CAMPUS.md).
- [Exemplo de âncoras](database/ancoras.exemplo.json) e GeoJSON inicial vazio em `database/`.

Comece por ORM e testes reais da migração; depois conta/sessão, consulta/CRUD, transações de vagas,
importação do campus e ingestão dos sensores. Só integre `VITE_USE_MOCK=false` depois de completar
e testar o contrato. A empresa vem da sessão; visitantes não têm conta e o mapa é sempre público.

Referências usadas na base: [FastAPI Settings](https://fastapi.tiangolo.com/advanced/settings/),
[SQLAlchemy Engine](https://docs.sqlalchemy.org/en/20/core/engines.html),
[Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html) e
[imagem oficial PostgreSQL](https://hub.docker.com/_/postgres).
