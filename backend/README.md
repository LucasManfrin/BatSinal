# Backend BatSinal

Esta pasta contém **planejamento**, não uma API já implementada.

- [Arquitetura e próximos passos](../docs/ARQUITETURA_BACKEND.md)
- [Esquema PostgreSQL proposto](database/schema.proposta.sql)
- [Formato do mapa do campus](database/mapa-campus.schema.json)
- [Arquivo vazio para o levantamento da Unisagrado](database/mapa-unisagrado.inicial.geojson)
- [Contrato consumido pelo frontend/mock](../docs/api-contract.md)

Proposta: FastAPI + SQLAlchemy + PostgreSQL + Alembic. Um responsável por empresa;
visitantes consultam todos os campi sem conta. O mapa próprio ficará no banco como cena local
2,5D e GeoJSON em JSONB. A [cena aproximada](../docs/MAPA_CAMPUS.md) já é demonstrada pelo mock.

O SQL é uma proposta, ainda não aplicada a um PostgreSQL. Não executar em banco com dados sem revisar
e transformar o esquema em migração. O desenho aproximado não substitui um levantamento real.
