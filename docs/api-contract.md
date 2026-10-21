# Contrato v2 — migração por fases

A sessão v2 representa a empresa. POST `/auth/cadastro-empresa` recebe `{ nome, slug, email, senha }`;
POST `/auth/login` recebe `{ email, senha }`. Ambos retornam `{ token, empresa: { id, nome, slug, email } }`.
GET `/auth/me` e GET `/empresa` retornam essa conta, sem senha. PUT `/empresa` altera `{ nome, slug }`.
PUT `/empresa/senha` recebe `{ senhaAtual, novaSenha }` e invalida as outras sessões da empresa.
Slug tem 3–60 caracteres, letras minúsculas/números separados por hífen; é único.
GET `/public/slugs/{slug}/disponivel` retorna `{ slug, disponivel }`; o cadastro confere novamente.
Senha tem mínimo de 8 caracteres. O mock usa somente senhas fictícias e tokens locais.

Leituras sem token (somente GET): `/public/empresas`, `/public/empresas/{slug}` (empresa pública e cena),
`/public/empresas/{slug}/estacionamentos`, `/public/estacionamentos/{id}` e `/public/estacionamentos/{id}/status`.
As rotas `/publico/campi/*` abaixo continuam como aliases para preservar links durante a migração.
Nunca se envia Authorization em `/public/*` ou `/publico/*`. Respostas não expõem contas ou chaves dos sensores.
Favoritos, destino e alertas do visitante ficam no aparelho, sem endpoint no servidor.
O token resolve a empresa no mock; CRUDs privados filtram por ela, inclusive ao acessar um ID conhecido.
A consulta permanece sempre aberta, sem interruptor de publicação.

O modelo por áreas/âncoras e os endpoints de posição serão acrescentados nas fases D/E.

---

# Contrato HTTP — BatSinal (empresa + consulta pública)

Prefixo: `http://localhost:8000/api`. JSON em camelCase; datas ISO 8601. O mock MSW implementa
as rotas abaixo, exceto as explicitamente marcadas como planejadas. Não há API real nesta entrega.

Visitantes não têm conta ou role. A empresa possui um responsável autenticado por Bearer token.
Cadastro cria empresa e responsável; a resposta não tem campo `role`.

## Convenções

- GET/PUT/DELETE: 200; POST: 201; DELETE retorna `null`.
- Erro: `{ "status": 422, "mensagem": "Confira os campos.", "campos": { "email": "E-mail inválido." } }`.
- 401: sem sessão; 404: recurso ausente ou de outra empresa; 405: método não permitido;
  409: conflito; 422: validação. Backend real também pode retornar 400 com o mesmo formato.
- Rotas da empresa filtram pelo `empresaId` resolvido da sessão, nunca pelo corpo enviado pelo navegador.
- Tipos completos: `frontend/src/types/index.ts`. `StatusVaga`: LIVRE, OCUPADA, SEM_SINAL.

## Consulta pública — sem Authorization

| Método / rota | Resposta |
| --- | --- |
| GET `/publico/campi` | `{ id, nome, slug }[]` de todos os campi cadastrados |
| GET `/publico/campi/{slug}/mapa` | `ConsultaCampus`: `{ mapa, vagas, vagasSemPosicao }` |
| GET `/publico/campi/{slug}/estacionamentos` | `EstacionamentoResumo[]` sem layouts internos ou sensores |
| GET `/publico/campi/{slug}/estacionamentos/{id}` | Layout de consulta, sem `sensorId` nas vagas |
| GET `/publico/campi/{slug}/estacionamentos/{id}/status` | `{ vagaId, status, atualizadoEm }[]` |

Essas rotas nunca retornam e-mails de responsáveis, senhas, hashes, IDs ou chaves dos sensores.
O ID do bolsão deve pertencer ao campus indicado. A consulta é sempre aberta, sem aprovação ou
controle de visibilidade. Escritas em `/publico/*` devolvem 405. Analytics e sensores não são públicos.

`mapa` é a cena em coordenadas locais (`MapaCampus`) ou `null` se ainda não cadastrada.
Inclui polígonos dos blocos/áreas, alturas, portões, vias e posições vinculadas por `vagaId`.
`vagas` contém somente as vagas existentes da empresa que têm posição, com tipo, rótulo e status
atual, sem identificação de sensor. `vagasSemPosicao` conta os cadastros sem localização.
O seed Unisagrado é aproximado. Detalhes em [MAPA_CAMPUS.md](MAPA_CAMPUS.md).

## Empresa e autenticação

| Método / rota | Acesso | Corpo | Resposta |
| --- | --- | --- | --- |
| POST `/auth/cadastro-empresa` | Público | `{ nomeEmpresa, nome, email, senha }` | `{ token, administrador }` |
| POST `/auth/login` | Público | `{ email, senha }` | `{ token, administrador }` |
| GET `/auth/me` | Responsável | — | `{ id, empresaId, nome, email }` |
| GET `/empresa` | Responsável | — | `{ id, nome, slug }` |

Senha demonstrativa exige 8 caracteres, minúscula, maiúscula e número. E-mail é único.
Slug é criado a partir do nome, com sufixo se já existir. Empresa nova já pode ser consultada sem login.
Não existe campo `publicado` nem endpoint para fechar a consulta. Sessões mock usam tokens opacos e senhas fictícias; segurança real
está no [planejamento do backend](ARQUITETURA_BACKEND.md).

Não existem cadastro/login de visitante, roles USER/ADMIN, CRUD de usuários ou favoritos no contrato atual.
Os antigos endpoints `/usuarios` e `/favoritos` foram retirados. Rotas antigas da interface redirecionam.

## Estacionamentos — responsável autenticado

| Método / rota | Corpo / consulta | Resposta |
| --- | --- | --- |
| GET `/estacionamentos` | — | Resumos da própria empresa |
| POST `/estacionamentos` | `{ nome, descricao?, latitude, longitude, largura, altura, portao?, caminhadaMinutos?, caminhadaDestino? }` | Detalhe |
| GET `/estacionamentos/{id}` | — | Campos do estacionamento, vagas e elementos |
| PUT `/estacionamentos/{id}` | Mesmos campos do cadastro | Detalhe |
| DELETE `/estacionamentos/{id}` | — | `null` |
| POST `/estacionamentos/{id}/layout-padrao` | `{ linhas, colunas, largura?, altura?, espacamento? }` | Detalhe |
| PUT `/estacionamentos/{id}/layout` | `{ vagas, elementos }` | Detalhe |
| GET `/estacionamentos/{id}/status` | — | Status das vagas |

Resumo inclui `totalVagas`, `vagasLivres`, `tendencia` e `livresPorTipo: { COMUM, PCD, MOTO }`.
Tendência compara livres atuais com a leitura disponível até 15 minutos antes.
Dimensões do bolsão: 200..10000; latitude -90..90 e longitude -180..180.
Grid: 1..20 linhas e 1..30 colunas; padrão 53×86, espaço 10; precisa caber no layout.
Rótulos de vaga são únicos e não vazios. Salvar layout é atômico; geração substitui as vagas anteriores.

Portão e destino aceitam até 100 caracteres. Minutos: inteiro 1..120; tempo e destino devem vir juntos.
Para limpar, enviar `caminhadaMinutos: null` e `caminhadaDestino: ""`; para portão, `portao: ""`.
Omitir campos opcionais no PUT preserva seus valores anteriores. Seed de acesso/caminhada é fictício.

## Sensores — responsável autenticado

| Método / rota | Corpo | Resposta |
| --- | --- | --- |
| GET `/sensores` | — | `Sensor[]` da empresa |
| POST `/sensores` | `{ nome, vagaId? }` | Sensor + `deviceKey` ilustrativa, exibida uma vez |
| PUT `/sensores/{id}` | `{ nome, vagaId? }` | Sensor |
| DELETE `/sensores/{id}` | — | `null` |

Um sensor por vaga e vice-versa. Sem sensor ou leitura há mais de 60 segundos, SEM_SINAL.

## Analytics — responsável autenticado

- GET `/estacionamentos/{id}/ocupacao?de=ISO&ate=ISO&granularidade=30min|hora|dia`:
  `{ instante, ocupacao, livres }[]`.
- GET `/estacionamentos/{id}/heatmap`: `{ dia, hora, ocupacao }[]`, dia 0=segunda, hora 0..23.

Ocupação significa indisponibilidade: (total − livres)/total; inclui sem sinal. Seed sintético de 14 dias.

## Planejado para a API real — ainda não implementado no mock

- GET/PUT `/empresa/mapa`: cena e GeoJSON, PUT com `{ versao, cena, geojson }`; conflito de versão: 409.
- PUT `/dispositivo/vagas/{id}/status`: chave do sensor vinculado em `X-Device-Key`;
  `{ status: "LIVRE" | "OCUPADA" }`; hora de recebimento definida pelo servidor.
- Controle `layoutVersao` ao salvar o layout na API real.

Mapas, esquema SQL e limites estão em [ARQUITETURA_BACKEND.md](ARQUITETURA_BACKEND.md).
O frontend só acessa HTTP/JSON. Backend real precisará de CORS para as origens locais,
hash de senha, validade de token, autenticação de dispositivo e testes de isolamento.
