# BatSinal — consulta de mobilidade

## Direção atual

Grafite fosco, superfícies em ardósia, números técnicos e informação operacional. Sem sidebar,
ilustração urbana de fundo, slogans, emojis ou blocos flutuantes sobre a planta.
Ícones são SVGs monocromáticos Lucide; o logo é original.

| Papel | Token / valor |
| --- | --- |
| Fundo | `--bg: #0A0C10` |
| Cabeçalho e planta | `#0E1117` |
| Superfície | `--surface: #131720` |
| Superfície secundária | `--surface-2: #161B26` |
| Separadores | `--border: rgb(255 255 255 / 8%)` |
| Texto | `--text: #E8EAEE` |
| Texto auxiliar | `--muted: #969DA9` |
| Marca, seleção e ação principal | `--accent: #FBBF24` |
| Disponibilidade / sucesso | `--livre: #7CB89D` |

Plus Jakarta Sans no texto; JetBrains Mono em contadores e status. Fontes empacotadas localmente.
Vagas ocupadas usam cinza escuro. Sem sinal tem contorno tracejado no campus e nome próprio; nunca é tratado como vaga livre.
Erros de formulário continuam tendo texto explícito e cor de erro.

## Organização e ações

- Header horizontal: logo, campus, total de vagas livres e menu. Visitantes consultam sem conta;
  o menu oferece busca, tema e acesso para empresas. O responsável também acessa administração,
  Minha empresa e saída. Ctrl+K continua abrindo a busca.
- Administração com navegação horizontal, sem coluna lateral.
- Na Unisagrado, mapa contínuo em projeção isométrica, prédios com volume e alternativa 2D.
  A imagem marcada pelo grupo orienta frentes/laterais e canteiros; o desenho é aproximado.
- Seletor de bloco/serviço e entrada de veículos. A seleção destaca o destino e lista vagas próximas,
  sem exigir escolha de estacionamento. Ctrl+K busca os blocos/serviços.
- Cada vaga mantém seu ID e leitura HTTP. Filtros por livres e tipo, seleção por mouse/teclado,
  lista HTML, zoom, deslocamento e enquadramento. Falha HTTP retira a indicação de livre.
- Desktop com lista e mapa lado a lado; mobile com controles, mapa e lista em sequência.
  Selecionar uma vaga aproxima e retorna ao mapa no celular.
- Campi ainda sem cena conservam a consulta por setores e o editor existente.
- Simulador apenas na administração autenticada. Visitantes não alteram dados.
- Cadastro exclusivo de empresas. Não há perfil, favoritos ou veículos de motoristas.
- Minha empresa reúne responsável e link da consulta, sempre pública. Não há controle de visibilidade.

## Origem dos dados

Portão, tempo e destino a pé são campos opcionais do contrato, editáveis no cadastro. Dados ausentes não são estimados.
O seed contém exemplos **simulados**, identificados na consulta; não representam acessos reais validados do campus.
A migração do armazenamento antigo acrescenta os novos campos ao seed e preserva layouts e cadastros existentes.

As 92 vagas demonstrativas existentes foram posicionadas em 11 trechos na cena do campus.
A quantidade não representa capacidade real. Geometria, persistência, limite da proximidade e
diferença entre editor local e mapa completo estão em [MAPA_CAMPUS.md](MAPA_CAMPUS.md).

Navegação abre o Google Maps em outra aba com as coordenadas cadastradas. O app não solicita localização,
calcula rotas, desenha trajetos internos nem garante vagas. A planta local e a consulta funcionam offline;
rotas externas e tiles opcionais do cadastro exigem internet.

## Capturas da implementação atual

- [Campus isométrico e destino J](campus-isometrico.png)
- [Consulta do campus em 360 px](campus-mobile.png)

- [Cadastro exclusivo de empresa](cadastro-empresa.png)
- [Menu da consulta sem conta](consulta-sem-conta.png)
- [Minha empresa](minha-empresa.png)

- [Consulta desktop](mobility-estacionamentos.png)
- [Lista em 360 px](mobility-mobile.png)
- [Planta em 360 px](mobility-mobile-planta.png)

As capturas documentam dados simulados. As imagens `mobility-*` registram a consulta por setores
antes de retirar as contas de visitantes. O grupo ainda deve validar os acessos reais, celulares e tecnologias assistivas.
As imagens `redesign-*.png` registram a versão anterior, substituída por esta direção.
