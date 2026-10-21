# Backend BatSinal

Esta pasta contém **planejamento**, não uma API já implementada.

- [Arquitetura e próximos passos](../docs/ARQUITETURA_BACKEND.md)
- [Esquema PostgreSQL proposto](database/schema.proposta.sql)
- [Formato do mapa do campus](database/mapa-campus.schema.json)
- [Arquivo vazio para o levantamento da Unisagrado](database/mapa-unisagrado.inicial.geojson)
- [Contrato consumido pelo frontend/mock](../docs/api-contract.md)

Proposta: FastAPI + SQLAlchemy + PostgreSQL + Alembic. Um responsável por empresa;
visitantes consultam campi publicados sem conta. O mapa próprio fica no banco como GeoJSON em JSONB.

O SQL é uma proposta, ainda não aplicada a um PostgreSQL. Não executar em banco com dados sem revisar
e transformar o esquema em migração. Nenhum mapa real foi desenhado ou importado nesta etapa.
