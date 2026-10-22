# Continuidade — BatSinal

## O que está pronto

Frontend React/TypeScript com consulta pública diretamente em `/`, mapa contínuo da Unisagrado,
filtros por destino, visualização de área 3D e alternativa 2D/lista. Cadastro/login são exclusivos
das empresas. Há painel, gestão, sensores simulados, posicionamento magnético, troca atômica,
histórico da tela e preferências locais do visitante. A identidade vigente é `frontend/DESIGN.md`.

`/c/unisagrado` é um alias de compatibilidade; preserva query/fragmento ao redirecionar para `/`.
Outras empresas continuam em `/c/:slug`. `VITE_DEFAULT_CAMPUS_SLUG` define o campus da raiz;
se alterar o slug dessa empresa, atualize essa configuração e reinicie o Vite.

O checklist administrativo foi padronizado: quatro etapas, quantidades reais, progresso das vagas
e cópia do link canônico. Ele some quando as quatro etapas estiverem concluídas.

## Backend: contrato implementado

`backend/app` implementa todo o contrato de [api-contract.md](api-contract.md) com FastAPI,
SQLAlchemy e PostgreSQL 17 (compose em 127.0.0.1:55432). Migrações `0001` (esquema v2) e `0002`
(dimensões/acesso dos estacionamentos, índices) foram aplicadas e revertidas em PostgreSQL real.
`python -m app.seed` importa a Unisagrado a partir do mock, com IDs convertidos para UUID.
Há ingestão de leituras por chave de dispositivo, simulador opcional e histórico agregado real.
Testes de integração rodam em um banco `batsinal_test` recriado pelo Alembic a cada execução.

O frontend continua com `VITE_USE_MOCK=true` por padrão. Para usar a API real, siga
`backend/README.md` (seção "Frontend contra a API real"). O Simulador e o logout já tratam os dois modos.

## Onde continuar

| Próxima etapa | Arquivos de referência | Critério de conclusão |
| --- | --- | --- |
| Firmware dos sensores | `hardware/README.md`, `backend/README.md` (Sensores reais) | ESP32 envia `POST /api/leituras` com `X-Device-Key` a cada poucos segundos |
| Integração no navegador | `frontend/.env.example`, `backend/README.md` | Consulta, gestão, posicionamento e simulador conferidos manualmente com `VITE_USE_MOCK=false` em desktop e celular |
| Importador do campus | `backend/app/seed.py`, `backend/scripts/exportar_seed_mock.ts` | Importar prédios/portões/vias validados de outras empresas, não só o seed da Unisagrado |
| Produção | `docs/ARQUITETURA_BACKEND.md` (Próximos passos) | HTTPS, limite de tentativas de login, backups e decisão sobre o MSW como padrão |

O seed do mock usa IDs legíveis (`est-1`, `frente-j` etc.); `app/seed.py` gera UUIDs e atualiza as
referências da cena. Se mudar `campus.ts`/`positions.ts`, reexporte com
`node backend/scripts/exportar_seed_mock.ts`. As coordenadas da maquete não são metros nem lat/long.

## Verificações e limites registrados

Frontend: `npm run lint`, `npm run test`, `npm run build`. Backend: comandos em `backend/README.md`.
A revisão frontend contém testes novos da raiz pública, alias, empresa logada e checklist.
Capturas da revisão: [consulta na raiz](v2-raiz.png) e [preparação do mapa](v2-preparacao.png).
O painel também foi conferido em largura móvel; as colunas da maquete não alargam mais a página.
Backend: Ruff e pytest; os testes de integração aplicam e revertem as migrações em PostgreSQL real.
O frontend contra a API real foi verificado por chamadas HTTP e testes de rota, ainda não por uma
revisão manual completa no navegador com `VITE_USE_MOCK=false`.

O grupo ainda precisa validar posições, acessos e sensores da maquete física. Não foi declarada
revisão humana de código nem validação geográfica da instituição. Registrem correções em `USO_DE_IA.md`.
