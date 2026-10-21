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

- Alunos/professores consultam **sem cadastro e sem login**. A entrada abre o único campus cadastrado
  ou mostra uma escolha de campi. Exemplo: `/c/unisagrado`.
- Somente empresas se cadastram em `/cadastro`: nome da empresa, responsável, e-mail e senha.
  O responsável entra em `/login` e administra seus estacionamentos, layouts e sensores.
- Cada empresa tem um responsável no MVP. Não existem roles USER/ADMIN, cadastro de motorista,
  gerenciamento de usuários, veículos ou favoritos.
- A consulta de todos os campi é sempre pública, desde o cadastro da empresa. Não há controle de visibilidade.
  Login é exigido apenas para acessar e alterar dados administrativos.

Conta fictícia para administrar o seed: **admin@unisagrado.demo / Demo@123**.
O botão de demonstração preenche os campos; clique em **Entrar**. Nunca use senhas ou dados pessoais reais no mock.
O seed Unisagrado contém dados apenas demonstrativos.

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
8. Teste busca, tipo de vaga, seleção de setor, planta e lista de vagas por teclado.
9. Saia da conta: a consulta permanece disponível e as rotas administrativas passam a exigir login.

Editor: Ctrl+Z desfaz, Ctrl+Shift+Z refaz, Ctrl+D duplica e Delete exclui. Setas movem 1 unidade;
Shift+setas, 10. Existem controles HTML equivalentes. Alterações pendentes têm aviso de saída.
Rótulos vazios/duplicados impedem salvar; sobreposição é aviso. Gerar layout padrão substitui as vagas e desvincula sensores.

## Interface e dados

Lista e planta do bolsão ficam lado a lado no desktop e empilhadas no celular. O nome seleciona o setor;
a planta usa a geometria do layout salvo. Verde indica livre; cinza, ocupada; hachura e ícone indicam sem sinal.
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
Última suíte: **34 testes em sete arquivos**. Cobertura de consulta anônima, cadastro e acesso público imediato,
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
