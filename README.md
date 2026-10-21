# BatSinal

Consulta pública de vagas e administração de uma maquete de estacionamento com sensores.
Demonstração acadêmica local para a Unisagrado, com API simulada por MSW.

## Executar

Requer Node.js 20.19+ ou 22.12+ e npm. Na raiz:

```sh
npm install
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://127.0.0.1:5173`. Reutilize a instância
que já estiver na porta 5173. Não é necessário backend, chave ou arquivo `.env` para a demo.

Conta fictícia: **admin@unisagrado.demo / Demo@123**. O botão de demonstração preenche o login.
Use somente dados fictícios: senhas e cadastros do mock ficam no armazenamento local do navegador.

## Visitante sem conta

`/` oferece **Ver o mapa da Unisagrado** e **Sou uma empresa**. O visitante entra em `/c/unisagrado`
sem cadastro, escolhe bloco/serviço e pode filtrar portão, tipo e vagas livres. A lista ordena por
proximidade relativa ao destino na ilustração, sem prometer metros, minutos ou rota interna.

Favoritos de destinos, último destino e **Avisar quando abrir vaga** ficam no próprio aparelho,
separados por campus. O aviso é um toast e funciona apenas com a aba aberta, na mudança de zero
para vaga livre. Não há favoritos no servidor, push, e-mail ou conta de motorista.

**Ver de perto** ou clicar em uma área abre a maquete 3D do trecho. Selecione uma vaga para ver
tipo, status e última leitura; **Voltar ao campus** recupera a consulta. Sem WebGL há planta/lista.

## Empresa

Cadastro em `/cadastrar-empresa`: nome, slug sugerido e editável, e-mail e senha com ao menos
oito caracteres. O endereço é conferido e o cadastro entra automaticamente no painel.
Login em `/entrar`. `/admin/*` exige sessão da empresa, sem papéis ou perfis de motorista.

Cada empresa acessa apenas seus estacionamentos, áreas, vagas e sensores. A API mock resolve
a empresa pelo token e verifica a propriedade de todos os IDs. O mapa de qualquer empresa é
sempre público, desde o cadastro; a sessão só é necessária para administrar.

O primeiro acesso tem checklist de estacionamento, sensores, posicionamento e link público.
**Minha empresa** permite alterar nome/slug e trocar a senha. Sair preserva os cadastros locais.

## Posicionar vagas

Em `/admin/posicionar`, escolha uma área. A cena central usa as posições já mapeadas; a bandeja
contém vagas ainda sem posição. Arraste uma peça da bandeja ou de outra posição: o ímã aproxima,
alinha e encaixa. Ao soltar, a alteração é salva no mock e aparece na consulta pública.

- Posição ocupada: troca as duas peças quando os tipos são compatíveis; peça da bandeja desloca a outra para a bandeja.
- Soltura fora de uma posição: retorna à origem. Falha de gravação mantém a posição anterior e informa o erro.
- **Desfazer**, **Refazer** e **Restaurar padrão mapeado** operam sobre o lote inteiro; restauração pede confirmação.
- Histórico de desfazer pertence à área aberta e não persiste ao mudar de área ou recarregar.
- Vaga sem sensor oferece seletor inline para vincular um sensor livre.
- **Posicionar por lista** oferece o mesmo resultado por teclado/toque, inclusive sem WebGL. Escolha a vaga, use Tab/setas nas posições, Enter para encaixar e Escape para cancelar.
- Movimento reduzido do sistema dispensa interpolação.

Não existe editor livre 2D, desenho manual, gerador de grid ou rotação manual das peças.
Vaga guarda `ancoraId`; coordenadas, rotação, dimensões e tipos permitidos pertencem à âncora.

Empresa nova pode cadastrar área e importar um levantamento JSON de posições. Sem arquivo,
a área fica vazia: o app não inventa vagas físicas. Formato de exemplo em
[ancoras.exemplo.json](backend/database/ancoras.exemplo.json), apenas ilustrativo e sem escala real.
Depois, cadastre vagas na bandeja e sensores para vinculá-los às peças.

## Campus e dados preservados

O campus mantém a geometria aproximada enviada pelo grupo: blocos, vias, portões e 11 trechos.
As 92 posições demonstrativas originais viraram âncoras. Uma instalação nova deixa três peças
na bandeja; uma instalação existente preserva seus vínculos e dados, sem reset do navegador.

O mock persiste cadastros, mapa, posições, leituras e sessões em `batsinal.mock.v1`.
Migração reconhece formatos antigos apenas para preservar contas de empresas e seus dados;
layouts antigos ficam como snapshot de referência, sem editor. Preferências do visitante são separadas.
Falha ao persistir uma escrita administrativa reverte a operação e devolve erro 507.

A geometria não tem escala ou levantamento geográfico. Quantidades não representam a capacidade
real. O grupo precisa validar entradas, tipos de posição e vínculos dos sensores na maquete física.
Veja [MAPA_CAMPUS.md](docs/MAPA_CAMPUS.md). Não há cálculo de trajeto, reserva ou garantia de vaga.

## Simulador e integração futura

Opcionalmente copie `frontend/.env.example` para `frontend/.env`:

```dotenv
VITE_USE_MOCK=true
VITE_API_URL=http://localhost:8000/api
VITE_SHOW_SIMULATOR=true
```

Reinicie o Vite depois de mudar essas variáveis. O simulador aparece apenas na administração
autenticada. Altere uma vaga vinculada ou use **Simular movimento** e observe a consulta em outra aba.
O mock repete leituras a cada 10 s e a consulta usa polling de 3 s. Sem leitura há mais de 60 s ou
sem sensor, o status é **SEM_SINAL**. Gráficos e leituras do seed são sintéticos.

Campus, cena 3D, ícones e fontes são locais, sem CDN. Google Maps e tiles opcionais de localização
exigem internet; a consulta/lista não depende deles. A maquete 3D é carregada sob demanda;
o build ainda informa um chunk Three.js de cerca de 688 kB antes de gzip.

API real e banco continuam **planejados**, sem servidor ou PostgreSQL implementados/aplicados.
Proposta: FastAPI + SQLAlchemy + PostgreSQL + Alembic. O mapa ficará em JSONB; áreas, âncoras,
vagas e sensores terão tabelas relacionadas. Não há tabela de motoristas ou editor livre.

- [Contrato HTTP implementado no mock](docs/api-contract.md)
- [Arquitetura do backend e transações](docs/ARQUITETURA_BACKEND.md)
- [Esquema PostgreSQL proposto](backend/database/schema.proposta.sql)
- [Formato GeoJSON futuro](backend/database/mapa-campus.schema.json)
- [Mapa geográfico inicial vazio](backend/database/mapa-unisagrado.inicial.geojson)

Quando a API existir, configure `VITE_USE_MOCK=false` e `VITE_API_URL`. O frontend usa somente HTTP/JSON.
O mock compartilha armazenamento entre abas, mas não oferece bloqueio concorrente de banco;
a versão reduz sobrescritas e a API real deverá verificar a versão sob bloqueio da área.

## Verificar e revisar

```sh
npm run lint
npm run test
npm run build
npm run preview
```

Lint inclui ESLint e Prettier; formate com `npm run format`. Suíte atual: **53 testes em 12 arquivos**,
incluindo ímã, troca atômica, persistência/erro de armazenamento, versão, isolamento, cadastro,
consulta anônima, preferências locais, migração, status, teclado e alternativa sem WebGL.
O worker MSW é versionado; após atualizar MSW, regenere com `npx msw init frontend/public`.
Durante alterações no próprio mock em desenvolvimento, recarregue a página se o worker perder a conexão.

[Uso de IA](docs/USO_DE_IA.md) · [Revisão do grupo](docs/ROTEIRO_DE_REVISAO.md) · [Design vigente](frontend/DESIGN.md)

Referências visuais atuais: [campus](docs/v2-campus.png), [área](docs/v2-area.png),
[painel](docs/v2-painel.png) e [posicionamento](docs/v2-posicionar.png).
