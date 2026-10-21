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
Vagas ocupadas usam cinza escuro. Sem sinal tem hachura, ícone e nome próprios; nunca é tratado como vaga livre.
Erros de formulário continuam tendo texto explícito e cor de erro.

## Organização e ações

- Header horizontal: logo, campus, total de vagas livres e avatar. O menu da conta mantém favoritos,
  perfil, busca global, tema, administração e saída. Ctrl+K continua abrindo a busca.
- Administração com navegação horizontal, sem coluna lateral.
- Lista compacta: nome, portão, livres/total, minutos e destino a pé, fração indisponível e navegação.
- Nome do bolsão é um botão de seleção. A planta usa `vagas`, `elementos` e dimensões do layout salvo,
  com status consultados por HTTP a cada 3 segundos. Não é um mapa decorativo ou uma grade inventada.
- Cada vaga tem seleção por mouse ou teclado. Detalhes aparecem abaixo do desenho; há lista HTML alternativa.
- Filtros por nome, disponibilidade, favorito e tipo mantidos. Nenhum resultado também limpa a seleção da planta.
- Desktop com lista e planta lado a lado; mobile empilhado, com acesso direto à planta e retorno aos bolsões.
- Simulador no fluxo da página, sem cobrir o mapa. Editor, CRUDs, autenticação e perfil preservados.

## Origem dos dados

Portão, tempo e destino a pé são campos opcionais do contrato, editáveis no cadastro. Dados ausentes não são estimados.
O seed contém exemplos **simulados**, identificados na consulta; não representam acessos reais validados do campus.
A migração do armazenamento antigo acrescenta os novos campos ao seed e preserva layouts e cadastros existentes.

Navegação abre o Google Maps em outra aba com as coordenadas cadastradas. O app não solicita localização,
calcula rotas, desenha trajetos internos nem garante vagas. A planta local e a consulta funcionam offline;
rotas externas e tiles opcionais do cadastro exigem internet.

## Capturas da implementação atual

- [Consulta desktop](mobility-estacionamentos.png)
- [Lista em 360 px](mobility-mobile.png)
- [Planta em 360 px](mobility-mobile-planta.png)

As capturas documentam dados simulados. O grupo ainda deve validar os acessos reais, celulares e tecnologias assistivas.
As imagens `redesign-*.png` registram a versão anterior, substituída por esta direção.
