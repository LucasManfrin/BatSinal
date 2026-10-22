# API e banco — instruções para os próximos agentes

Leia `README.md` nesta pasta, `../docs/HANDOFF.md`, `../docs/api-contract.md` e
`../docs/ARQUITETURA_BACKEND.md` antes de alterar o domínio.

## Estado

- O contrato do mock está implementado: conta, consulta pública, CRUD, posicionamento, sensores,
  leituras (`/leituras`), simulador opcional e histórico. Rotas em `app/routers`, regras em `app/services`.
- Modelos ORM em `app/models.py`, alinhados às revisões `0001` e `0002` (colunas e tipos conferidos
  com `compare_metadata` em PostgreSQL). Constraints compostas e índices de expressão existem
  **somente nas migrações**.
- Dependências fixadas em `uv.lock`; Python 3.12–3.14. Não versione `.env` ou `.venv`.

## Migrações

Revisões aplicadas não são editadas: crie outra. `database/schema.proposta.sql` é referência,
não inicializador. Não use `Base.metadata.create_all()`.

`target_metadata` do Alembic continua **None** de propósito: como as constraints compostas e os
índices de expressão não estão declarados no ORM, o autogenerate proporia removê-los.
Escreva as próximas revisões à mão e teste upgrade/downgrade (a suíte faz isso em `batsinal_test`).

## Regras que não podem regredir

- A empresa vem da sessão validada; nunca de `empresaId` no corpo. IDs de outra empresa → 404.
- DTOs públicos listam campos explicitamente, sem e-mail, senha, chave ou sensorId (ver `services/consulta.py`).
- Posicionamento: versão obrigatória, `SELECT ... FOR UPDATE` na área, lote validado por inteiro
  antes de alterar. Troca depende da unicidade diferida de `vagas.ancora_id`.
- Excluir vaga limpa sensor e `ancoras.vaga_padrao_id` na mesma transação; área com vagas → 409.
- Senhas com scrypt; tokens e chaves de dispositivo guardados só como SHA-256. Trocar a senha revoga
  as outras sessões. A chave do dispositivo aparece uma única vez.
- camelCase no HTTP, snake_case no banco. Erros sempre no formato ErroApi (`app/errors.py`).
- Visitantes não têm conta; não crie endpoints de usuários/favoritos. Mapa sempre público.

## Testar

Comandos no README. Os testes de integração precisam do PostgreSQL do compose e usam um banco
`*_test` recriado a cada execução — nunca aponte `BATSINAL_TEST_DATABASE_URL` para dados reais.
Acrescente testes de rota e de restrição junto de cada mudança de domínio.
