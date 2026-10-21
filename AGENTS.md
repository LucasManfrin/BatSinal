# BatSinal — continuidade do repositório

Leia `docs/HANDOFF.md`, `README.md` e o Git antes de editar. Preserve implementações prontas.
Para interface, leia também `frontend/DESIGN.md`; para API, `backend/README.md` e `backend/AGENTS.md`.

## Decisões do produto

- `/` abre diretamente o mapa público da Unisagrado. O slug padrão é configurável no frontend.
- Outras empresas usam `/c/:slug`; o alias do campus padrão redireciona à raiz mantendo filtros.
- Visitantes não têm contas ou papéis. Somente empresas se autenticam para administrar.
- Consulta sempre pública. Não introduza opção de publicar/fechar mapa.
- Preserve a geometria aproximada atual; o grupo ainda validará o levantamento no campus.
- Vagas não têm coordenadas livres: ocupam âncoras. Não reintroduza editor livre ou grid.
- Preferências do visitante são locais. Não crie endpoints de usuários/favoritos.

## Verificações

Na raiz: `npm run lint`, `npm run test`, `npm run build`.
No backend, após `uv sync --extra dev --locked`: `uv run ruff check app migrations tests`,
`uv run ruff format --check app migrations tests` e `uv run pytest`.
Revise desktop/celular em mudanças visuais. Reutilize a instância Vite em 5173 se já estiver ativa.

## Limite atual

O frontend usa MSW. O backend tem infraestrutura e migração inicial, mas ainda não implementa
autenticação, consulta, CRUD ou sensores reais. Não desligue o mock antes de completar o contrato.
Não confunda teste sintático de SQL offline com aplicação/teste de restrições em PostgreSQL.
