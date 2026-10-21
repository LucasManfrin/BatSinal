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

## Backend: preparado, domínio ainda pendente

`backend/app` já inicia FastAPI com `/api/health`, `/api/ready`, CORS, configurações e conexão lazy.
`backend/compose.yaml` define PostgreSQL 17 local em 55432, com volume nomeado.
`backend/migrations/versions/0001_initial.py` define empresas, sessões, mapa, estacionamentos,
áreas, âncoras, vagas, sensores e histórico. Não inclui contas, senhas ou seed de mapas.
`uv.lock` fixa as dependências; há testes de infraestrutura e análise sintática de SQL PostgreSQL.

**Ainda não existem** autenticação real, modelos ORM de domínio, rotas públicas/CRUD, ingestão de
sensores ou agregações reais. O frontend permanece com `VITE_USE_MOCK=true`.
Não aponte o frontend para o backend de infraestrutura esperando o contrato completo.

## Onde continuar

| Próxima etapa | Arquivos de referência | Critério de conclusão |
| --- | --- | --- |
| ORM e banco real | `backend/migrations/versions/0001_initial.py`, `backend/app/db.py` | Modelos alinhados à migração, upgrade/downgrade e constraints testados em PostgreSQL |
| Conta e autorização | `frontend/src/mocks/handlers.ts`, `docs/api-contract.md` | Hash de senha, sessão revogável/expirável; isolamento por empresa inclusive em IDs conhecidos |
| Consulta e CRUD | `frontend/src/types/index.ts`, `docs/api-contract.md` | Respostas camelCase, erros compatíveis e DTO público sem segredos; consulta sem login |
| Posicionamento | `frontend/src/mocks/areaMutations.ts` | Versão obrigatória, bloqueio da área, troca/lote/restauração atômicos com teste concorrente |
| Importação do campus | `frontend/src/mocks/campus.ts`, `frontend/src/mocks/positions.ts` | IDs convertidos para UUID, referências consistentes, geometria preservada e âncoras persistidas |
| Sensores/histórico | `hardware/README.md`, `docs/ARQUITETURA_BACKEND.md` | Chaves com hash, expiração de leitura, amostras agregadas reais e simulador separado |
| Integração final | `frontend/.env.example`, testes das duas pastas | Contrato completo funcionando antes de desativar MSW; testar navegador e dispositivos do grupo |

O seed atual usa IDs legíveis (`est-1`, `frente-j` etc.); o SQL usa UUID. Não copie esses IDs
diretamente para colunas UUID. O importador deve produzir um mapa de IDs e atualizar os vínculos
de áreas/vagas no JSON. As coordenadas da maquete não são metros nem longitude/latitude.

## Verificações e limites registrados

Frontend: `npm run lint`, `npm run test`, `npm run build`. Backend: comandos em `backend/README.md`.
A revisão frontend contém testes novos da raiz pública, alias, empresa logada e checklist.
Capturas da revisão: [consulta na raiz](v2-raiz.png) e [preparação do mapa](v2-preparacao.png).
O painel também foi conferido em largura móvel; as colunas da maquete não alargam mais a página.
Os testes de migração geram upgrade/downgrade offline e analisam SQL; não provam execução de DDL.

Nesta preparação o Docker CLI estava disponível, mas o Docker Desktop/daemon não estava ativo.
Nenhum PostgreSQL foi iniciado ou modificado, e a migração não foi aplicada. A próxima etapa de
banco deve iniciar o ambiente dedicado e testar a migração de verdade. Não há remoto Git configurado;
a integração solicitada é feita na `main` local, sem publicação remota.

O grupo ainda precisa validar posições, acessos e sensores da maquete física. Não foi declarada
revisão humana de código nem validação geográfica da instituição. Registrem correções em `USO_DE_IA.md`.
