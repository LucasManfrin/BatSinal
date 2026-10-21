# API BatSinal v2 — MSW local

O frontend usa HTTP/JSON. Este contrato é demonstrado pelo MSW, sem backend real.
No navegador, `/` consulta a Unisagrado; `/c/:slug` atende outras empresas. Isso não muda os endpoints:
o cliente continua consultando `/public/empresas/{slug}` para identificar cada campus.
O alias antigo da Unisagrado redireciona à raiz mantendo query/fragmento.

O bootstrap FastAPI em `backend/` implementa somente `GET /api/health` e `GET /api/ready`.
As rotas de domínio deste documento ainda são demonstradas **somente pelo MSW**.

Token opaco em `Authorization: Bearer ...` somente nas rotas privadas. A sessão representa a empresa,
sem papéis ou conta de motorista. A empresa é resolvida do token, nunca do corpo enviado pelo cliente.
IDs conhecidos de outra empresa devolvem 404; visitante sem token recebe 401 ao tentar administrar.

## Conta da empresa

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| POST `/auth/cadastro-empresa` | `{ nome, slug, email, senha }` | `{ token, empresa: { id, nome, slug, email } }` |
| POST `/auth/login` | `{ email, senha }` | mesma sessão |
| GET `/auth/me` | — | conta da empresa, sem senha |
| GET `/empresa` | — | conta da empresa |
| PUT `/empresa` | `{ nome, slug }` | conta atualizada |
| PUT `/empresa/senha` | `{ senhaAtual, novaSenha }` | null; invalida as outras sessões |
| GET `/public/slugs/{slug}/disponivel` | — | `{ slug, disponivel }` |

Nome tem ao menos 2 caracteres; senha ao menos 8; e-mail é único. Slug é único e tem 3–60 letras
minúsculas/números separados por hífens. A sugestão é editável, e a validação no cadastro previne corrida.

## Consulta pública — somente leitura

| GET | Resposta |
| --- | --- |
| `/public/empresas` | `{ id, nome, slug }[]` |
| `/public/empresas/{slug}` | `{ empresa, mapa, vagas, vagasSemPosicao }` |
| `/public/empresas/{slug}/estacionamentos` | resumos com livres/total das vagas posicionadas |
| `/public/estacionamentos/{id}` | estacionamento com vagas posicionadas, sem sensorId |
| `/public/estacionamentos/{id}/status` | `{ vagaId, status, atualizadoEm }[]` das posicionadas |
| `/public/areas/{id}` | `DetalheArea`: área, âncoras, vagas posicionadas com status e mapa de contexto |

Consulta sempre aberta. Nenhuma resposta pública contém e-mail de conta, senha, sensorId ou chave.
Escrita em `/public/*` e `/publico/*` devolve 405. Os aliases `/publico/campi/*` continuam lendo os mesmos
recursos para links anteriores. O cliente não envia token em nenhuma dessas rotas.

## Domínio e posições mapeadas

`Vaga`: `{ id, estacionamentoId, areaId, rotulo, tipo, ancoraId?, sensorId? }`.
`Ancora`: `{ id, areaId, x, z, rotacao, largura, profundidade, tiposAceitos, vagaPadraoId? }`.
`AreaEstacionamento`: `{ id, empresaId, estacionamentoId, nome, contorno, versao }`.
Posição/rotação/tamanho vêm da âncora; a vaga não tem coordenadas livres. Tipos: COMUM, PCD e MOTO.
As âncoras do seed derivam das posições existentes do campus, com x/z = coordenadas do mapa / 10.
A conversão é uma unidade de maquete, não metro. A geometria original do campus foi preservada.
Três vagas do seed novo começam na bandeja; migração não desposiciona vagas de quem já usava a demo.

Todas as rotas abaixo são privadas, filtradas pela empresa do token:

| Método e rota | Corpo / comportamento |
| --- | --- |
| GET `/areas?estacionamentoId={id}` | áreas com `progresso: { posicionadas, total }` |
| GET `/areas/{id}` | `DetalheArea`, incluindo peças na bandeja |
| POST `/areas` | `{ nome, estacionamentoId, ancoras?: [...] }`; importa levantamento, sem gerar grade |
| PUT `/areas/{id}` | `{ nome, versao? }`; altera somente metadados |
| DELETE `/areas/{id}` | exclui área vazia; 409 se houver vagas |
| GET `/vagas?areaId={id}` e `/vagas/{id}` | vagas da própria empresa |
| POST `/vagas` | `{ areaId, rotulo, tipo }`; nasce na bandeja |
| PUT `/vagas/{id}` | `{ rotulo, tipo }`; tipo deve ser compatível com a posição atual |
| DELETE `/vagas/{id}` | remove peça e desvincula sensor |
| PUT `/vagas/{id}/posicao` | `{ ancoraId: string \| null, versao? }`; retorna `DetalheArea` |
| PUT `/areas/{id}/posicoes` | `{ versao?, posicoes: [{ vagaId, ancoraId: string \| null }] }`; lote completo para desfazer/refazer |
| POST `/areas/{id}/restaurar-padrao` | `{ versao? }`; restaura somente vínculos originais existentes; retorna `DetalheArea` |

Uma posição recebe uma peça. Trocar uma vaga posicionada com outra ocupada troca os dois vínculos;
quando a origem é a bandeja, a peça deslocada vai para a bandeja. Ambos os tipos precisam ser compatíveis.
Todas as referências e tipos são validados antes de alterar o lote. Cada escrita incrementa `area.versao`.
O frontend envia a versão nas operações de posicionamento; versão divergente retorna 409, sem sobrescrever.
O campo é opcional no contrato mock para clientes antigos. Na API real deverá ser obrigatório.
O histórico de desfazer fica na tela e é limpo ao trocar de área/recarregar. A operação é recusada se
as posições já tiverem mudado fora do histórico. Restaurar não inventa âncoras para áreas importadas.

O arquivo de importação de área é um array JSON de `{ x, z, rotacao, largura, profundidade, tiposAceitos }`.
IDs são gerados pelo servidor, e `areaId` vem da nova área. Limite: 2000 posições por importação.
Não há desenho, escala automática, edição livre ou gerador de posições no frontend.

## Estacionamentos, sensores e leituras

CRUD privado `/estacionamentos` e `/sensores`. Estacionamento exige nome; metadados antigos de acesso
são preservados, sem prometer tempo de caminhada. Um sensor se vincula a uma única vaga da mesma empresa.
POST `/sensores` retorna `deviceKey` ilustrativa uma única vez; GET não a retorna.
A consulta atualiza a cada 3 s. Sem sensor ou leitura válida há mais de 60 s: SEM_SINAL.
O simulador escreve no store; telas reais continuam usando HTTP. Leituras do seed são sintéticas.

GET `/estacionamentos/{id}/ocupacao?de=ISO&ate=ISO&granularidade=hora|dia|30min` e `/heatmap` são privados.
Ocupação é indisponibilidade, incluindo SEM_SINAL; histórico sintético de 14 dias.

## Respostas e limites

Erros: `{ status, mensagem, campos? }`. 401 sessão ausente; 404 ausente/outra empresa;
405 método proibido; 409 conflito de slug/versão/área ocupada; 422 campos ou posições inválidos;
507 armazenamento local indisponível. Nesse caso, o mock reverte a escrita e informa o erro.
POST retorna 201; demais operações 200, exclusão null. O mock armazena somente credenciais fictícias.

Não existem endpoints de usuários, favoritos ou editor livre. Preferências locais do visitante:
`batsinal:favoritos:{slug}`, `batsinal:destino:{slug}` e `batsinal:alertas:{slug}`.
O aviso de vaga é toast na aba aberta, sem push ou serviço em segundo plano.
A proposta PostgreSQL e a validação necessária da API real estão em ARQUITETURA_BACKEND.md.
