# Declaração de uso de IA

## Ferramenta e modelo

- Codex, agente baseado em GPT-6.1, em 21/10/2026.
- Pedido: implementação de uma demonstração local do BatSinal conforme o documento do grupo.
- Uso: geração de código, documentação, dados sintéticos e testes; revisão automatizada de tipos e lint.
- Não foram usados dados reais de alunos, sensores reais ou credenciais de serviços.

## Registro por fase

### Fase 0 — Repositório

A IA criou o monorepositório, scripts de entrada, arquivos ignorados e espaços para backend/hardware.
Revisão do grupo: conferir autoria, nome da instituição, convenções e adequar esta declaração às regras da disciplina.

## Correções e avaliação do grupo

Preencher após a leitura e demonstração individual:

| Integrante | Trecho revisado e explicado | Erro/limitação encontrado | Correção realizada | Avaliação da contribuição |
| --- | --- | --- | --- | --- |
| A preencher pelo grupo | | | | |

Não declarar revisões humanas que ainda não aconteceram. Código gerado por IA precisa ser compreendido pelo grupo.

### Fase 1 — Estrutura do frontend
A IA configurou React 18, Vite, TypeScript estrito, Tailwind, fontes locais e ferramentas de qualidade. Dependências do editor, mapas e mock instaladas pelo npm.
Revisão do grupo: entender os scripts e os tokens; fontes e logo não dependem de CDN.


### Fase 2 — Contrato e API mockada
A IA criou tipos, cliente HTTP, MSW com CRUD, seed de 14 dias e permissões por empresa e perfil. O armazenamento opcional local guarda apenas dados fictícios da demo.
Revisão do grupo: comparar contrato e futuros schemas FastAPI; o mock não substitui segurança real (JWT, hash de senhas e chaves).


### Fase 3 — Autenticação
A IA implementou cadastro de empresa, login, validação de campos, força/visibilidade de senha e guardas por role. A interface inclui logo original de holofote, shell administrativo e navegação móvel.
Revisão do grupo: testar ADMIN e USER, entender Context e guardas; nunca usar dados pessoais ou senhas reais no mock.


### Retomada — auditoria do estado existente
A IA verificou o Git limpo e os quatro commits já existentes, preservando a autenticação, os tipos, os handlers e os componentes de UI. Encontrou e corrigiu a leitura do corpo em DELETE /favoritos.

### Fase 4 — Consulta de vagas
Telas de lista, mapa com fallback, favoritos, perfil e detalhe foram ligadas aos hooks HTTP existentes. Canvas de consulta com polling, zoom, pan, status e lista HTML equivalente; alerta in-app na transição de zero para alguma vaga livre.
Revisão do grupo: conferir significado dos status, teste sem internet e uso por teclado. Alertas só funcionam com a página aberta.


### Fase 5 — Administração
A IA conectou CRUDs de estacionamentos, sensores e usuários à API existente, com confirmação de exclusão, erros inline e chave demonstrativa exibida só ao criar o sensor.
Revisão do grupo: percorrer criar/editar/remover e testar isolamento entre empresas; a chave mock é ilustrativa.

### Fase 6 — Editor de layout
A IA implementou Konva com gerador e preview, seleção múltipla, drag/drop, Transformer, snap, duplicação, undo/redo via Zustand e propriedades HTML com vínculo de sensor. Incluiu validações geométricas e bloqueio ao sair com mudanças pendentes.
Revisão do grupo: entender a transformação de coordenadas e testar teclado e edição; sobreposição é aviso, rótulos duplicados impedem salvar.

### Fase 7 — Painel
A IA conectou KPIs, gráfico Recharts por período, heatmap de 14 dias, mapa das vagas e tabela de sensores. O histórico é sintético e a ocupação inclui vagas sem sinal entre as indisponíveis.
Revisão do grupo: conferir unidades, períodos e definição do pico do dia com o contrato.

### Fase 8 — Simulador e apresentação
A IA implementou simulador opt-in, temas, responsividade, legendas redundantes e estados de erro/vazio/carregamento. Copiou .env.example para .env local (ignorado pelo Git) para habilitar o simulador na conferência.
Revisão do grupo: validar em celulares reais e com internet desligada; os tiles do mapa são o único recurso online opcional.

### Fase 9 — Testes, revisão e documentação

A IA criou 25 testes de comportamento e integração HTTP em Vitest/Testing Library/MSW.
Foram verificados: ocupação/tendência, grid, snap, sobreposição com rotação, status com texto e ícone,
labels de select, login válido/inválido, cadastro, bloqueio de rota para USER, isolamento de empresa,
favoritos (incluindo DELETE), vínculo/sinal de sensor, proteção do próprio ADMIN e undo/redo.
O README agora explica instalação, contas fictícias, variáveis de ambiente, roteiro de apresentação,
troca para o FastAPI, responsabilidades dos módulos e limitações. Há um roteiro de revisão separado
em `ROTEIRO_DE_REVISAO.md` e uma captura da interface em `preview.png`.

Conferências executadas pela IA no navegador local:

- Login ADMIN e carregamento de painel, tabela e consulta de vagas.
- Seleção e arrasto de vaga com snap; propriedades numéricas atualizadas e aviso de sobreposição.
- Aviso ao navegar com alterações não salvas e descarte da alteração de teste.
- Contador mudou de 13 para 14 ao liberar uma vaga no simulador, sem recarregar a página.
- Alerta in-app apareceu ao passar de zero para uma vaga livre. Status originais foram restaurados.
- Cadastro fictício de estacionamento, preview e geração de grid 1×2.
- Criação/vínculo de sensor, exibição única de chave demonstrativa, seleção via checkbox HTML e salvamento de layout.
- Exclusão confirmada somente dos registros criados para a verificação, preservando o seed.

Revisão do grupo: executar o roteiro nos próprios computadores e celulares, testar o mapa sem internet
e revisar a navegação integral por teclado/leitor de tela. Isso ainda não representa certificação de acessibilidade.
Não houve revisão humana registrada pela IA.

## Dificuldades, erros e correções automáticas

- O estado inicial tinha autenticação e handlers prontos, mas ainda faltavam o roteador, os estilos e as telas conectadas.
  A IA continuou esses módulos e manteve as funcionalidades existentes; aplicou formatação padronizada ao código.
- O mock ignorava o corpo de DELETE e impedia remover favoritos. A leitura foi corrigida e recebeu teste HTTP.
- A primeira compilação apontou tipos incompatíveis na navegação e na geometria Konva. Foram corrigidos sem usar `any`.
- Um teste novo usou uma opção do Playwright que não existe na Testing Library. O TypeScript detectou isso e a opção foi removida.
- O lint identificou imports sem uso, dependência de hook e arquivos fora do formato; a IA corrigiu os apontamentos e reexecutou as verificações.
- O build inicial concentrou canvas/mapa/gráficos em um arquivo grande. A IA separou o carregamento das telas com React.lazy.
- A inspeção visual encontrou sobreposição do simulador com a barra de salvar. O editor agora reserva espaço para manter os botões acessíveis.
- O menu recolhido no mobile podia receber foco. A IA adicionou `inert` e `aria-hidden`; a seleção múltipla também tem checkboxes HTML.
- Selects podiam misturar o label com os textos das opções. A IA adicionou `aria-labelledby` e teste de nome acessível.
- O timeout do mapa podia reiniciar durante o polling; o callback foi estabilizado. Botões de zoom e notificações receberam rótulos em português.
- Leituras do mock persistiam o store sem necessidade. Agora só mutações persistem, e outras abas recebem alterações por evento de armazenamento.
  Ainda não há controle de concorrência, e o token é compartilhado entre abas do mesmo navegador.
- Houve reinício transitório da prévia ao criar o `.env` local. A IA reutilizou o servidor já em execução e reabriu a aba de conferência.

## Avaliação provisória da contribuição da IA

A IA produziu a implementação e verificações automatizadas, reduzindo o trabalho inicial de estrutura,
interface e integração com o mock. O grupo precisa avaliar a legibilidade e aprender a explicar cada fluxo.
Não estão implementados backend, autenticação segura de produção, hardware, push/e-mail nem reservas.
Dados, posições e históricos são demonstrativos. Testes automatizados e conferência visual não substituem
testes com hardware real, revisão humana e validação de acessibilidade em dispositivos reais.


## Resultado das verificações da integração inicial
- npm run lint: aprovado (ESLint sem warnings e Prettier).
- npm run test: 25 testes aprovados em 5 arquivos.
- npm run build: aprovado (TypeScript estrito e build Vite).
- Conferência visual local registrada acima; backend/hardware e validação em dispositivos reais permanecem fora desta entrega.

## Redesign — identidade urbana e consulta integrada

A pedido do usuário, a IA auditou o Git e os arquivos existentes antes do redesign e manteve
os serviços HTTP, o contrato, a autenticação, os CRUDs, o canvas, o editor e o simulador.
A interface passou a usar azul-marinho, grafite, dourado controlado e verde para disponibilidade/sucesso.
A tipografia principal é Plus Jakarta Sans empacotada localmente. Logo, esquema urbano e feixe do login
são desenhos originais em SVG, sem imagens de banco ou símbolos de personagens.

Contribuições implementadas pela IA:

- Navegação compacta, cabeçalho contextual e busca funcional de estacionamentos com Ctrl+K.
- Consulta com lista e esquema integrados, filtros, favoritos, números de disponibilidade e barras
  proporcionais à fração livre. Filtrar os resultados mantém as posições do esquema.
- Login com composição urbana, mantendo validações e contas de demonstração.
- Perfil com veículos, preferências de vaga, favoritos da API e últimas consultas feitas no app.
  Veículos, preferências e histórico ficam no navegador, separados por conta; não foram inventados endpoints.
- Indicadores administrativos em uma faixa mais compacta, nova paleta no canvas/editor e textos diretos.
- Adaptação móvel com alternância lista/mapa e simulador compacto; no perfil ele fica oculto para
  manter os controles acessíveis.

Não foram inventados portões, distâncias, tempos de caminhada ou tipos de vaga ausentes no contrato.
O esquema é explicitamente ilustrativo e sem escala. O mapa geográfico opcional continua usando
as coordenadas da API e tiles do OpenStreetMap.

### Verificação e correções do redesign

A IA acrescentou quatro testes de integração para busca/lista/esquema, remoção HTTP de favorito,
veículos com confirmação e isolamento por conta, preferências aplicadas à consulta e histórico sem duplicatas.
Os testes de autenticação foram ajustados aos novos textos dos botões.

Na execução simultânea de build e testes, dois testes excederam o tempo de espera. A suíte foi limitada
a dois workers e os tempos de espera foram ajustados; a execução isolada completa aprovou os 29 testes
em seis arquivos. O lint e o build de produção (TypeScript e Vite) também aprovaram.
A inspeção visual foi feita pela IA no navegador local em desktop
e em 360 px, incluindo login, busca, consulta, detalhe, perfil, painel e editor. A consulta móvel não apresentou
rolagem horizontal. Um conflito visual entre simulador e controles foi corrigido.

As decisões, os limites e as capturas estão em [DESIGN.md](DESIGN.md).
Revisão humana ainda pendente: celulares reais, navegação integral por teclado/leitor de tela,
contraste nos dois temas e entendimento dos novos estados. Não há certificação de acessibilidade
nem revisão humana registrada nesta fase.

