# Contrato HTTP — BatSinal v1

Prefixo padrão: `http://localhost:8000/api`. JSON em **camelCase**. Datas ISO 8601 com fuso.
IDs são strings opacas. Autenticação: `Authorization: Bearer <token>`.
O frontend usa exclusivamente HTTP; o mock MSW intercepta as mesmas URLs.

## Convenções

- Sucesso: GET/PUT/DELETE 200; POST 201. DELETE retorna `null`, exceto favoritos, que retorna a lista atual.
- Erro: `{ "status": 422, "mensagem": "Confira os campos informados.", "campos": { "email": "Informe um e-mail válido." } }`.
- 400/422: formato/validação; 401: sem sessão; 403: perfil sem permissão; 404: recurso ausente ou de outra empresa; 409: e-mail duplicado.
- Todos os recursos são filtrados pela empresa do usuário autenticado. ADMIN também pode consultar as telas de USER.
- `Role`: ADMIN | USER. `TipoVaga`: COMUM | PCD | MOTO. `StatusVaga`: LIVRE | OCUPADA | SEM_SINAL.
- Objetos e interfaces completas: `frontend/src/types/index.ts`.

## Autenticação e usuários

| Método e rota | Acesso | Corpo | Resposta |
| --- | --- | --- | --- |
| POST `/auth/cadastro-empresa` | Público | `{ nomeEmpresa, nome, email, senha }` | `{ token, usuario }` |
| POST `/auth/login` | Público | `{ email, senha }` | `{ token, usuario }` |
| GET `/auth/me` | Logado | — | `Usuario` |
| GET `/usuarios` | ADMIN | — | `Usuario[]` |
| POST `/usuarios` | ADMIN | `{ nome, email, senha, role }` | `Usuario` |
| PUT `/usuarios/{id}` | ADMIN | `{ nome, email, role, senha? }` | `Usuario` |
| DELETE `/usuarios/{id}` | ADMIN | — | `null` |

Senha inicial com ≥ 8 caracteres, minúscula, maiúscula e número. E-mail único.
Não se permite excluir a própria conta ou remover o próprio perfil ADMIN.
`Usuario`: `{ id, empresaId, nome, email, role }`; senhas nunca retornam.

## Estacionamentos

| Método e rota | Acesso | Corpo / consulta | Resposta |
| --- | --- | --- | --- |
| GET `/estacionamentos` | Logado | — | `EstacionamentoResumo[]` |
| POST `/estacionamentos` | ADMIN | `{ nome, descricao?, latitude, longitude, largura, altura }` | `DetalheEstacionamento` |
| GET `/estacionamentos/{id}` | Logado | — | `DetalheEstacionamento` |
| PUT `/estacionamentos/{id}` | ADMIN | `{ nome, descricao?, latitude, longitude, largura, altura }` | `DetalheEstacionamento` |
| DELETE `/estacionamentos/{id}` | ADMIN | — | `null` |
| POST `/estacionamentos/{id}/layout-padrao` | ADMIN | `{ linhas, colunas, largura?, altura?, espacamento? }` | `DetalheEstacionamento` |
| PUT `/estacionamentos/{id}/layout` | ADMIN | `{ vagas: Vaga[], elementos: ElementoLayout[] }` | `DetalheEstacionamento` |
| GET `/estacionamentos/{id}/status` | Logado | Polling a cada 3 s | `StatusVagaAtual[]` |

`EstacionamentoResumo` adiciona `totalVagas`, `vagasLivres`, `tendencia` e `livresPorTipo: { COMUM, PCD, MOTO }`.
`tendencia` compara livres atuais com a leitura disponível até 15 minutos atrás: SUBINDO | ESTAVEL | CAINDO.
`DetalheEstacionamento` contém os campos do estacionamento + `vagas` + `elementos`.
Dimensões do estacionamento entre 200 e 10000; latitude -90..90, longitude -180..180.
Grid: 1..20 linhas, 1..30 colunas; tamanho padrão 53×86, espaço 10. O grid precisa caber no canvas.
O gerador substitui o layout existente; o cliente mostra preview e confirmação antes de chamar o endpoint.
Salvar layout é atômico, com rótulos únicos não vazios e sensores únicos da mesma empresa.
Uma vaga nova sem sensor permanece SEM_SINAL. Excluir estacionamento desvincula sensores e limpa favoritos/histórico.

## Sensores e favoritos

| Método e rota | Acesso | Corpo | Resposta |
| --- | --- | --- | --- |
| GET `/sensores` | ADMIN | — | `Sensor[]` |
| POST `/sensores` | ADMIN | `{ nome, vagaId? }` | `Sensor & { deviceKey }` |
| PUT `/sensores/{id}` | ADMIN | `{ nome, vagaId? }` | `Sensor` |
| DELETE `/sensores/{id}` | ADMIN | — | `null` |
| GET `/favoritos` | Logado | — | `string[]` de IDs |
| POST `/favoritos` | Logado | `{ estacionamentoId }` | `string[]` |
| DELETE `/favoritos` | Logado | `{ estacionamentoId }` | `string[]` |

Um sensor só pode estar em uma vaga e vice-versa. `deviceKey` só aparece na resposta de criação.
O mock gera uma chave ilustrativa, sem uso real. Em produção o backend deve armazenar hash e validar a chave.
Sem leitura há mais de 60 s, ou sem sensor vinculado, a vaga é SEM_SINAL.

## Analytics

| Método e rota | Acesso | Consulta | Resposta |
| --- | --- | --- | --- |
| GET `/estacionamentos/{id}/ocupacao` | ADMIN | `de`, `ate` (ISO), `granularidade=30min\|hora\|dia` | `{ instante, ocupacao, livres }[]` |
| GET `/estacionamentos/{id}/heatmap` | ADMIN | — | `{ dia, hora, ocupacao }[]` |

`ocupacao`: porcentagem 0..100, calculada como (total − livres)/total; por isso inclui vagas sem sinal entre as indisponíveis.
`dia`: 0=segunda, 6=domingo. `hora`: 0..23, no fuso local da demonstração.
Seed: 14 dias, intervalos de 30 minutos e picos sintéticos às 7h30, 12h e 18h30. Dados são ilustrativos.
Períodos retornam a média de cada agrupamento; o painel calcula o pico do dia a partir das leituras de hoje.

## Dispositivo (fora do frontend)

`PUT /dispositivo/vagas/{id}/status`, header `X-Device-Key`, corpo `{ status, atualizadoEm }`.
Este endpoint **não é implementado nem chamado pelo frontend**. O simulador local representa o dispositivo.
Alertas in-app só existem enquanto a página do estacionamento está aberta; push/e-mail serão futuros serviços do backend.

## Futuro FastAPI

Pydantic com `alias_generator=to_camel` e campos Python em snake_case. Exception handler traduz erros 422 para o formato acima.
CORS: permitir `http://localhost:5173` e `http://127.0.0.1:5173`, incluindo header Authorization e métodos usados.
Swagger em `/docs`; OpenAPI em `/openapi.json`. Manter esta especificação coerente com o OpenAPI.
JWT, hash de senhas, revogação, autorização e chaves de dispositivo precisam de implementação real no backend.
