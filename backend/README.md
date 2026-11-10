# Backend BatSinal

API FastAPI + PostgreSQL que implementa o [contrato HTTP](../docs/api-contract.md) antes demonstrado
apenas pelo MSW: conta da empresa, consulta pública, gestão, posicionamento transacional, sensores,
leituras dos dispositivos e histórico. Leia [HANDOFF](../docs/HANDOFF.md) e [AGENTS](AGENTS.md).

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

Nos comandos abaixo, substitua `uv` por `.venv/Scripts/uv.exe` nesse caso. Nenhuma dependência
nova foi adicionada ao `uv.lock`: hash de senha usa `hashlib.scrypt` da biblioteca padrão.

## Subir banco, migrar e importar a demonstração

Com Docker Desktop ativo, dentro de `backend/`:

```sh
docker compose up -d db
cp .env.example .env          # confira a URL e BATSINAL_SIMULADOR
uv run alembic upgrade head   # revisões 0001 (esquema v2) e 0002 (campos do contrato)
uv run python -m app.seed     # Unisagrado: 3 estacionamentos, 11 áreas, 92 âncoras/vagas/sensores
```

O compose usa PostgreSQL 17 (necessário 16+ por `date_trunc` com fuso), publica **somente
127.0.0.1:55432**, banco/usuário `batsinal` e senha fictícia `batsinal_dev`. O volume preserva dados.

O seed lê [database/seed-unisagrado.json](database/seed-unisagrado.json), exportado do próprio mock
por `node backend/scripts/exportar_seed_mock.ts` (na raiz), sem redesenhar a geometria. IDs legíveis
(`est-1`, `frente-ab`) viram UUID e as referências da cena são atualizadas. Três vagas começam na bandeja.
Conta fictícia **admin@unisagrado.demo / Demo@123**, gravada só como hash. Cada sensor recebe chave
aleatória (somente hash); gere uma chave para um dispositivo real com `POST /api/sensores/{id}/chave`.
Leituras e 14 dias de histórico são sintéticos; use `--sem-dados-sinteticos` para omiti-los.
Rodar o seed de novo não altera nada se o slug já existir.

Para parar preservando dados: `docker compose stop`. Não há rotina de reset destrutivo.

## Executar a API

```sh
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- `/docs`: OpenAPI de todas as rotas. `GET /api/health` e `GET /api/ready` (conexão com o banco).
- O startup não cria tabelas nem contas; o esquema é exclusivo do Alembic.
- Uma tarefa em segundo plano grava a cada `BATSINAL_AMOSTRAGEM_SEGUNDOS` (10 s) a amostra do
  intervalo de 5 min de cada estacionamento (UPSERT) e apaga histórico com mais de 14 dias.

### Frontend contra a API real

É o padrão: `npm run dev` chama `http://localhost:8000/api` sem `.env`. Para outro endereço ou para o
mock MSW (`VITE_USE_MOCK=true`), use `frontend/.env` (modelo em `frontend/.env.example`) e reinicie o
Vite. A API aceita CORS do Vite em 5173 (dev) e 4173 (preview). Com `BATSINAL_SIMULADOR=true`, o painel Simulador usa `POST /api/simulador/leituras`
e a tarefa de amostragem repete a última leitura de cada sensor simulado, como o heartbeat do mock.
Sem isso, toda vaga vira SEM_SINAL 60 s após a última leitura. Desligue o simulador ao usar sensores reais.

## Pilha completa em Docker

Na **raiz** do repositório: `docker compose up --build` (Compose 2.20+, por causa de `include`).

| Serviço | Endereço | Função |
| --- | --- | --- |
| `web` | `http://localhost:8080` | nginx com o build do frontend (`VITE_USE_MOCK=false`) e proxy de `/api/` para a API |
| `api` | `http://127.0.0.1:8000` | ao iniciar: `alembic upgrade head`, `python -m app.seed` (idempotente) e uvicorn |
| `db` | `127.0.0.1:55432` | o mesmo serviço e volume de `backend/compose.yaml` |

O navegador chama `/api` na mesma origem, então não há CORS nem URL de API fixada no bundle.
Variáveis opcionais em um `.env` na raiz:

- `BATSINAL_WEB_PORT` (8080): porta do site.
- `BATSINAL_WEB_BIND` (127.0.0.1): use `0.0.0.0` para abrir no celular ou receber leituras do ESP32
  (`http://<ip>:8080/api/leituras`). A conta de demonstração tem senha pública: só em rede de confiança.
- `BATSINAL_SIMULADOR` (true): liga o simulador na API e no painel. Exige `--build` ao mudar, pois
  também entra no bundle. Use `false` ao ligar sensores reais.

Para parar preservando dados: `docker compose stop`. `docker compose down -v` **apaga o banco**.
Testes sem Python local: `docker compose run --rm tests` na raiz (Ruff, formatação e pytest). O serviço
tem perfil `test`, então não sobe no `up`; lê `backend/` em modo somente leitura e usa o banco `batsinal_test`.
Com `uv` instalado, `uv run pytest` em `backend/` usa o mesmo PostgreSQL e o mesmo banco de teste.
Não escale a API: a tarefa de amostragem roda dentro do único processo uvicorn.

## Sensores reais (ESP32)

```http
POST /api/leituras
X-Device-Key: bs_...
Content-Type: application/json

{ "status": "LIVRE" }   // ou "OCUPADA"
```

A chave aparece uma única vez (`deviceKey`) ao criar o sensor ou gerar uma nova chave.
O dispositivo deve repetir a leitura a cada poucos segundos (bem menos que 60 s), mesmo sem mudança.

## Estrutura

```text
app/
  main.py         factory, CORS, erros, tarefa de amostragem
  config.py       BATSINAL_* (sessão, expiração do sinal, fuso, retenção, simulador)
  db.py models.py engine/sessão e ORM alinhado às migrações
  auth.py security.py  sessão por token opaco (hash SHA-256) e senha scrypt
  errors.py       ErroApi { status, mensagem, campos? } para todas as falhas
  schemas.py      corpos de requisição (camelCase)
  routers/        conta, publico, estacionamentos, areas (+ vagas), sensores (+ leituras, simulador)
  services/       consulta (DTOs explícitos), posicionamento (bloqueio/versão), ocupacao (histórico)
  seed.py         importador da demonstração
migrations/       0001 esquema v2, 0002 campos do contrato
```

## Testes e qualidade

```sh
uv run ruff check app migrations tests
uv run ruff format --check app migrations tests
uv run pytest
uv lock --check
```

**53 testes.** Os de infraestrutura, SQL offline e corpos de requisição rodam sem banco. Os de integração usam um banco
dedicado `batsinal_test` no mesmo PostgreSQL (criado se faltar; sobrescreva com
`BATSINAL_TEST_DATABASE_URL`, que precisa terminar em `_test`). A cada execução o esquema é recriado
por `upgrade head → downgrade base → upgrade head`. Sem PostgreSQL acessível, eles são pulados.

Cobrem: cadastro/login/logout/expiração/troca de senha com revogação; consulta pública sem segredos
e 405 em escrita; isolamento por empresa (IDs conhecidos → 404); posicionamento, troca, bandeja,
tipos, versão obrigatória/409, lote atômico, restaurar padrão, exclusões com limpeza de vínculos;
dois movimentos concorrentes com a mesma versão (um 200, outro 409); chaves de dispositivo,
leituras, expiração para SEM_SINAL, simulador, amostragem/retenção, ocupação e heatmap; e as
restrições do próprio PostgreSQL (âncora única diferida, FKs compostas entre empresas, rótulo sem caixa).

## Fontes de verdade

- [Migrações](migrations/versions/): não edite revisões aplicadas; crie outra.
- [Referência SQL](database/schema.proposta.sql): origem de `0001`; não executar como inicializador.
- [Contrato](../docs/api-contract.md) · [Arquitetura e transações](../docs/ARQUITETURA_BACKEND.md) ·
  [Mapa e limites do levantamento](../docs/MAPA_CAMPUS.md) · [Exemplo de âncoras](database/ancoras.exemplo.json).

Referências: [FastAPI Settings](https://fastapi.tiangolo.com/advanced/settings/),
[SQLAlchemy Engine](https://docs.sqlalchemy.org/en/20/core/engines.html),
[Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html) e
[imagem oficial PostgreSQL](https://hub.docker.com/_/postgres).
