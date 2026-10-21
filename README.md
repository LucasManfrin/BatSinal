# BatSinal

Consulta de vagas de estacionamento detectadas por sensores. Demonstração acadêmica local para a Unisagrado.

## Executar

Requer Node.js 20.19+ ou 22.12+ e npm. Na raiz:

```sh
npm install
npm run dev
```

Abra a URL do Vite, normalmente `http://localhost:5173`. Porta fixa 5173: reutilize a instância já em execução.
O mock funciona sem backend, chave ou `.env`. Fontes são empacotadas, sem CDN.

## Visitantes e empresas

- Alunos/professores consultam **sem cadastro e sem login**. A consulta abre o campus escolhido
  A página inicial oferece acesso direto à Unisagrado ou cadastro da empresa. Exemplo: `/c/unisagrado`.
- Somente empresas se cadastram em `/cadastrar-empresa`: nome, slug do mapa, e-mail e senha.
  A empresa entra em `/entrar` e administra seus estacionamentos, layouts e sensores.
- Cada empresa tem uma conta no MVP. Não existem roles USER/ADMIN, cadastro de motorista,
  gerenciamento de usuários, veículos ou favoritos.
- A consulta de todos os campi é sempre pública, desde o cadastro da empresa. Não há controle de visibilidade.
  Login é exigido apenas para acessar e alterar dados administrativos.

Conta fictícia para administrar o seed: **admin@unisagrado.demo / Demo@123**.
O botão de demonstração preenche os campos; clique em **Entrar**. Nunca use senhas ou dados pessoais reais no mock.
O seed Unisagrado contém dados apenas demonstrativos.

## Mapa do campus

Na Unisagrado, a consulta abre o **campus inteiro em uma cena isométrica**, com alternativa 2D,
zoom e deslocamento. Selecione **Bloco J** ou clique no prédio para destacar as vagas próximas;
o portão escolhido também fica destacado. A busca Ctrl+K encontra blocos e serviços.

O desenho aproxima as áreas marcadas pelo grupo. As 92 vagas do seed foram distribuídas em
fileiras nas frentes/laterais dos blocos e canteiros, mantendo as mesmas leituras dos sensores.
Não é capacidade real, mapa em escala nem cálculo de rota/tempo. Geometria e vínculos ficam
persistidos no mock; o banco real continua planejado. Veja [MAPA_CAMPUS.md](docs/MAPA_CAMPUS.md).

Campi sem cena cadastrada conservam a consulta por setores. A administração existente permanece
disponível; o editor atual altera o layout local, não a posição da vaga no mapa do campus.

## Simulador

Copie opcionalmente `frontend/.env.example` para `frontend/.env`:

```dotenv
VITE_USE_MOCK=true
VITE_API_URL=http://localhost:8000/api
VITE_SHOW_SIMULATOR=true
```

Reinicie após mudar variáveis. O simulador aparece somente na administração autenticada, com o mock ativo.
Altere as vagas vinculadas a sensores ou use **Simular movimento**. A consulta pública é apenas leitura.
O mock repete leituras a cada 10 s; as telas consultam status a cada 3 s. Sem leitura há mais de 60 s, SEM_SINAL.

## Apresentação

1. Abra o app sem conta e consulte a disponibilidade da Unisagrado.
2. Entre como empresa e explore painel, sensores e **Minha empresa**.
3. Cadastre estacionamento com nome, posição e dimensões. Portão e caminhada são opcionais.
4. Abra o editor, gere um grid e configure vagas/sensores. Salve o layout.
5. Abra o endereço da consulta em outra aba, sem login. A gestão de uma empresa nova não acessa os dados do seed.
6. Use o simulador na aba administrativa e observe os contadores/cores na consulta pública.
7. No detalhe de um bolsão lotado, ative **Avisar quando abrir vaga** e libere uma vaga. O aviso exige a página aberta.
8. No campus, escolha Bloco J e um portão, filtre o tipo de vaga e teste 2D/3D, zoom e seleção por teclado.
9. Saia da conta: a consulta permanece disponível e as rotas administrativas passam a exigir login.

O editor livre 2D e o gerador de layout foram removidos. A página **Posicionar vagas** usa as posições
mapeadas; as âncoras e o encaixe 3D entram nas próximas fases v2. Os IDs e as leituras existentes são preservados.

## Interface e dados

Na consulta do campus, o mapa completo mostra prédios, portões, vias e vagas. Verde indica livre;
cinza, ocupada; contorno tracejado indica sem sinal. A lista ordena vagas pela proximidade visual
da entrada do bloco, sem estimar metros ou tempo. Campi sem cena usam a lista/planta existente.
Barras da lista representam vagas indisponíveis (ocupadas + sem sinal). A busca global abre com Ctrl+K.
Plus Jakarta Sans e JetBrains Mono são locais. Ícones são SVGs Lucide e o logo é original.

O botão **Navegar até o bolsão** abre o Google Maps em outra aba com as coordenadas cadastradas.
Portões, tempos e coordenadas do seed são **ilustrativos** e precisam ser substituídos por dados validados.
Campos ausentes são informados; o frontend não calcula tempos de caminhada ou rotas internas.

O mapa próprio do campus será salvo no banco como GeoJSON, separado das posições lógicas das vagas.
O arquivo inicial da Unisagrado está vazio, para receber o levantamento real do grupo.
Consulta e planta locais funcionam offline após instalar as dependências; rotas externas e tiles opcionais do cadastro exigem internet.

## Backend e banco planejados

- [Arquitetura e próximos passos](docs/ARQUITETURA_BACKEND.md)
- [Esquema PostgreSQL proposto](backend/database/schema.proposta.sql)
- [Formato do mapa](backend/database/mapa-campus.schema.json)
- [Mapa inicial vazio da Unisagrado](backend/database/mapa-unisagrado.inicial.geojson)
- [Contrato HTTP atual](docs/api-contract.md)

Proposta: FastAPI + SQLAlchemy + PostgreSQL + Alembic. A API real ainda não foi implementada e o SQL
não foi aplicado a um banco. O frontend continua usando MSW. Para integrar a API futura, altere
`VITE_USE_MOCK=false` e `VITE_API_URL`; o frontend sempre acessa HTTP/JSON, nunca o banco diretamente.

## Verificar

```sh
npm run lint
npm run test
npm run build
npm run preview
```

`lint` inclui ESLint sem warnings e Prettier. Formatação: `npm run format`.
Última suíte: **41 testes em oito arquivos**. Cobertura de mapa contínuo, destino, leituras e falhas, consulta anônima, cadastro e acesso público imediato,
isolamento, proteção administrativa, DTO público, migração, seleção, teclado, acesso, sensores e geometria.
O worker MSW já está versionado; ao atualizar a dependência, regenere com `npx msw init frontend/public`.

## Limites e revisão

- Sessões, chaves e senhas do mock são fictícias. Autenticação e validação reais pertencem ao backend.
- Não há banco, hardware integrado, reserva, pagamento, push/e-mail ou garantia de vaga.
- Históricos são sintéticos. O painel chama de ocupação a fração indisponível, incluindo sem sinal.
- O mock compartilha alterações entre abas, mas não controla edição concorrente. Sair não apaga cadastros.
- Para voltar ao seed, limpar dados do site apaga os cadastros fictícios locais. Não é necessário para atualizar o app.
- O grupo deve testar os próprios dispositivos, mapear acessos reais e revisar o código.

[Uso de IA](docs/USO_DE_IA.md) · [Roteiro de revisão](docs/ROTEIRO_DE_REVISAO.md) · [Design](docs/DESIGN.md)

V2 — Fase A: favoritos, último destino e alertas de vaga são locais ao aparelho e separados por campus. O aviso exige a aba aberta. Cadastro confere disponibilidade do slug e entra automaticamente no painel. O primeiro acesso mostra um checklist; Minha empresa permite editar nome/slug e trocar a senha.
