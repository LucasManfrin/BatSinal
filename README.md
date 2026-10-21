# BatSinal

Mapeamento automático de vagas de estacionamento. Demonstração acadêmica local para a Unisagrado.

## Executar

Requer Node.js 20.19+ ou 22.12+ e npm. Na raiz: `npm install` e `npm run dev`.
O frontend fica em `http://localhost:5173`. Não precisa de backend, chave ou arquivo `.env` para o mock.

Abra a URL exibida pelo Vite. A porta 5173 é fixa; se já houver uma instância do projeto rodando, reutilize-a ou encerre-a antes de iniciar outra.

## Contas de demonstração

| Perfil | E-mail | Senha fictícia |
| --- | --- | --- |
| Administrador | `admin@unisagrado.demo` | `Demo@123` |
| Usuário | `usuario@unisagrado.demo` | `Demo@123` |
| Segundo usuário | `pedro@unisagrado.demo` | `Demo@123` |

Os botões de demonstração do login preenchem os campos; clique em **Entrar**.
Também é possível cadastrar uma empresa. Ela começa vazia e seu primeiro usuário é ADMIN.
Nunca informe dados pessoais nem senhas reais no mock: seus dados fictícios são guardados no navegador.

## Habilitar o simulador

Opcionalmente, copie `frontend/.env.example` para `frontend/.env`. O exemplo contém:

```dotenv
VITE_USE_MOCK=true
VITE_API_URL=http://localhost:8000/api
VITE_SHOW_SIMULATOR=true
```

Reinicie o servidor após alterar variáveis. O simulador só aparece com `VITE_SHOW_SIMULATOR=true` e mock ativo.
Ele funciona tanto na visão de ADMIN quanto na de USER, representando o hardware durante a apresentação.
Use o seletor de cada vaga para simular livre/ocupada/sem sinal, ou ative **Simular movimento**.
Somente vagas com sensor vinculado recebem leituras; as demais permanecem sem sinal.
O mock repete leituras a cada 10 s e a interface consulta os status a cada 3 s.

## Roteiro para apresentação

1. Entre como ADMIN e explore o painel, o filtro de período e os sensores.
2. Em **Estacionamentos**, cadastre um espaço com nome e dimensões. A posição pode ser escolhida no mapa ou digitada.
3. Abra **Editar layout**. Gere um grid pequeno, confira a prévia e confirme a substituição.
4. Arraste uma vaga. Selecione várias com Shift ou arraste no fundo; use alças para redimensionar/rotacionar.
5. Use a paleta, o painel de propriedades, os botões de movimento e a lista HTML para testar sem depender do mouse.
6. Cadastre um sensor em **Sensores** e vincule à vaga (ou vincule um sensor livre pelo editor). Copie a chave demonstrativa antes de fechar.
7. Salve o layout. Entre como USER e abra o estacionamento. Use o simulador para mostrar os status mudando automaticamente.
8. Para demonstrar alerta: no estacionamento Central, clique **Lotar para testar alerta**, feche o painel, ative **Avisar quando abrir vaga** e libere uma vaga no simulador. O aviso aparece dentro do app.
9. Adicione/remova favoritos e teste os filtros por tipo e disponibilidade. Clique no nome do bolsão para trocar a planta e consulte uma vaga.
10. No menu do avatar, abra **Perfil e preferências**, adicione um veículo e escolha o tipo de vaga preferido. Essas preferências são locais e separadas por conta.

Atalhos do editor: Ctrl+Z desfaz, Ctrl+Shift+Z refaz, Ctrl+D duplica, Delete exclui a seleção.
Setas movem 1 unidade; Shift+setas move 10. Todos têm controles HTML equivalentes.
Excluir itens do canvas pode ser desfeito antes de salvar. CRUDs destrutivos têm confirmação.
Rótulos vazios/duplicados impedem salvar; sobreposição entre vagas é um aviso visual, inclusive com rotação.
Gerar layout padrão substitui o layout salvo e desvincula os sensores das vagas antigas.

## Usar o futuro backend

Altere apenas a configuração de ambiente:

```dotenv
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api
VITE_SHOW_SIMULATOR=false
```

Não é preciso mudar componentes ou hooks. O cliente HTTP centralizado envia Bearer token e encerra a sessão em 401.
O FastAPI deverá implementar o [contrato HTTP](docs/api-contract.md), incluindo erros em camelCase e CORS para as origens locais.
Sem backend em execução, o modo real apresenta estados de erro; ele não usa dados fictícios como fallback.

## Estrutura e responsabilidades

```text
frontend/src/
  app/                 providers, rotas e carregamento das telas
  components/ui/       controles acessíveis baseados em Radix
  components/layout/   sidebar, navegação, identidade original
  components/lot/      canvas Konva e mapa Leaflet
  features/auth/       sessão com React Context e guarda por perfil
  features/estacionamentos/  consultas TanStack Query e favoritos
  features/editor/     estado de UI, seleção e histórico com Zustand
  features/sensores/   simulador opt-in
  pages/               telas de usuário, autenticação e administração
  lib/                 cliente HTTP e utilitários de geometria/formatação
  mocks/               handlers MSW, seed, armazenamento e leituras simuladas
  types/               interfaces compartilhadas com o contrato
  test/                testes de comportamento, HTTP, autenticação e editor
backend/               somente README; FastAPI a fazer
hardware/              somente README; ESP32 + HC-SR04 a fazer
docs/                  contrato e declaração de uso de IA
```

TanStack Query guarda dados vindos da API e faz polling; Zustand guarda somente UI/editor.
Somente o mock/simulador conhece o armazenamento fictício. As telas consultam dados por HTTP/JSON.
Plus Jakarta Sans é a fonte principal; JetBrains Mono identifica contadores, status e dados técnicos. Ambas são empacotadas por `@fontsource`. A marca e a planta são SVGs locais.
Após instalar as dependências, a consulta e a planta funcionam sem internet. O mapa de posição do cadastro usa tiles opcionais do OpenStreetMap;
os campos de latitude/longitude continuam disponíveis se os tiles falharem. Abrir rotas no Google Maps exige internet.

## Interface e preferências

A consulta usa lista compacta à esquerda e planta técnica do setor selecionado à direita. No celular,
as áreas ficam empilhadas; selecionar o nome do bolsão leva à planta, com um link para retornar à lista.
O cabeçalho contém apenas logo, campus, total de vagas e avatar. Favoritos, perfil, tema, busca global e administração ficam no menu da conta.

Use a busca da lista ou **Ctrl+K** para a busca global. Verde representa vagas livres; vagas ocupadas usam cinza escuro,
e vagas sem sinal têm hachura e texto. As barras da lista mostram a fração **indisponível** (ocupadas + sem sinal), com valor acessível.
O botão **Navegar até o bolsão** abre o Google Maps em outra aba com as coordenadas cadastradas, sem solicitar geolocalização ao navegador.
Ele não representa reserva nem navegação interna entre vagas.

Portão, destino e minutos de caminhada são campos opcionais da API, editáveis na administração.
Se faltarem, a interface informa a ausência. Os exemplos do seed são **simulados**, sem equivalência validada com acessos reais da Unisagrado.
A migração acrescenta esses campos ao seed antigo sem apagar cadastros ou layouts editados.

O perfil reúne veículos (apelido e tipo, sem placa), preferência de vaga, favoritos, consultas recentes,
dados da conta e tema. Veículos, preferência e histórico são guardados no `localStorage`, por usuário,
e não geram novos endpoints. Favoritos continuam usando a API. Alterar os dados de acesso continua sendo responsabilidade do administrador.
Os dados reais de acesso e caminhada precisam ser cadastrados e mantidos pela organização. O app não estima tempos nem recomenda portões a partir da ocupação.

Decisões visuais e imagens: [design do produto](docs/DESIGN.md).

## Verificar o projeto

Execute na raiz ou em `frontend/`:

```sh
npm run lint
npm run test
npm run build
npm run preview
```

`lint` inclui ESLint sem warnings e Prettier. Para formatar: `npm run format`.
Os testes cobrem cálculos, grid, snap, sobreposição com rotação, status acessível, login válido/inválido,
cadastro, proteção real de rota, permissões do mock, isolamento por empresa, favoritos, vínculo de sensores e undo/redo.
Também cobrem filtros e planta real do setor, navegação por coordenadas, atualização dos status, menu da conta,
dados de acesso opcionais, migração que preserva dados, veículos, preferências e histórico separados por conta.
Última validação: 36 testes aprovados em sete arquivos.
O worker MSW já está versionado em `frontend/public`; não é preciso gerá-lo para rodar.
Ao atualizar MSW no futuro, regenere-o com `npx msw init frontend/public` na raiz.

## Limites da demonstração

- Históricos são sintéticos, com 14 dias e picos nos horários de entrada; não representam uso real da universidade.
- “Ocupação” no painel é a porcentagem de vagas indisponíveis: ocupadas + sem sinal. A legenda separa os estados.
- Alertas são in-app e exigem a página do estacionamento aberta; não há push, e-mail, reserva ou garantia de vaga.
- O mock usa sessões opacas e senhas fictícias em armazenamento local. JWT, hash, revogação e autenticação do dispositivo pertencem ao futuro backend.
- Alterações persistidas do mock são recebidas pelas outras abas, mas não há controle de edição concorrente. Prefira uma aba para o roteiro; o token de sessão é compartilhado pelo navegador.
- Para voltar ao seed, limpe os dados deste site no navegador. Isso apaga os cadastros fictícios locais. Sair da conta preserva esses cadastros.
- O frontend não acessa banco de dados nem contém implementação de backend/hardware.
- O grupo ainda deve revisar o código, testar nos próprios dispositivos e preencher a avaliação humana em [USO_DE_IA.md](docs/USO_DE_IA.md).
