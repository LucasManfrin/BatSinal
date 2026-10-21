# API e banco — instruções para os próximos agentes

Leia `README.md` nesta pasta, `../docs/HANDOFF.md`, `../docs/api-contract.md` e
`../docs/ARQUITETURA_BACKEND.md` antes de implementar o domínio.

## Base existente

- FastAPI em `app/main.py`: health, readiness de conexão, CORS e factory testável.
- Configuração tipada em `app/config.py`; conexão e sessão em `app/db.py`.
- PostgreSQL via psycopg; Alembic em `migrations/`; revisão inicial `0001` sem seed.
- Dependências resolvidas em `uv.lock`; Python 3.12–3.14. Não versione `.env` ou `.venv`.
- Não há modelos ORM de domínio nem rotas do contrato ainda. Crie-os incrementalmente.

## Migrações

`0001_initial.py` é o snapshot inicial do SQL v2. Depois de utilizado, não o edite para evoluir
o banco: crie outra revisão. `database/schema.proposta.sql` é referência, não inicializador paralelo.
Não use `Base.metadata.create_all()` na inicialização da API.

O `target_metadata` do Alembic fica **None** enquanto o ORM estiver incompleto, para que
autogenerate não interprete metadata vazia como pedido de apagar tabelas. Só o habilite depois
de modelar o esquema completo e conferir o diff em um PostgreSQL de desenvolvimento.

Vaga/âncora/área/sensor devem pertencer à mesma empresa. A empresa vem da sessão validada.
Posicionamento exige versão e transação com bloqueio da área; troca e desfazer são atômicos.
Valide ambos os tipos antes de trocar. Não remova as constraints compostas ou a unicidade diferível.
Ao excluir vaga, limpe vínculo do sensor e `ancoras.vaga_padrao_id` na mesma transação.

## Seed e API

Não transporte senhas/chaves em texto do mock ao banco. Gere hashes e somente dados fictícios.
IDs ilustrativos do mock não são UUID: o importador deverá mapear IDs de empresas, áreas, vagas
e âncoras e atualizar suas referências no JSON da cena. Blocos/portões locais podem manter IDs do mapa.
Preserve a geometria de `../frontend/src/mocks/campus.ts`; não a redesenhe ao criar o seed.
DTO público precisa listar campos explicitamente, sem e-mail, senha, chave ou sensorId.
Mantenha camelCase no contrato HTTP, snake_case no banco. Padronize erros do domínio com `ErroApi`.

## Testar

Use o ambiente e comandos do README. Os testes atuais não precisam de PostgreSQL:
cobrem infraestrutura e geração/análise do SQL. Acrescente testes reais de constraints,
isolamento, concorrência, upgrade/downgrade e rotas quando o domínio for implementado.
