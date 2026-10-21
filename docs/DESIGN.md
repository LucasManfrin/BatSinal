# BatSinal — interface de mobilidade

## Direção

Base noturna azul-marinho, superfícies em grafite, sinalização dourada e verde funcional.
A identidade usa um círculo aberto, um foco de luz e a letra P; não há imagens ou símbolos de personagens.
O mapa urbano e o feixe do login são desenhos vetoriais originais implementados em React/SVG.

| Papel | Token / valor principal |
| --- | --- |
| Fundo | `--bg: #0A1019` |
| Superfície | `--surface: #101923` |
| Superfície secundária | `--surface-2: #17222F` |
| Separadores | `--border: #25313F` |
| Texto | `--text: #EDF0F3` |
| Texto auxiliar | `--muted: #9AA8B9` |
| Marca e atenção | `--accent: #EFC54B` |
| Disponibilidade e sucesso | `--livre: #78C59E` |
| Ocupação / estado negativo | `--ocupada: #DF8984` |

Plus Jakarta Sans é a tipografia principal. JetBrains Mono fica restrita a identificadores e coordenadas.
Os números usam alinhamento tabular. Não há CDN ou fonte remota em tempo de execução.

## Composição e interação

- Sidebar compacta com contexto da organização, navegação, ajuda e conta. O menu mobile fechado é inerte.
- Cabeçalho com contexto, busca funcional por nome (Ctrl+K), tema e perfil.
- Consulta com resultados ordenados, disponibilidade numérica e mapa integrado; em 360 px, alternância lista/mapa.
- Menos superfícies isoladas: resultados são linhas editoriais; indicadores administrativos formam uma faixa.
- Barras verdes representam a fração livre. Status também têm texto, ícone e legenda, sem depender apenas da cor.
- Login com composição urbana e feixe discreto. Formulário mantém validação, força da senha e contas de demonstração.
- Perfil com veículos, preferências, favoritos e consultas reais feitas dentro do app. Sem históricos fictícios preenchidos.
- Editor, CRUDs, gráficos, polling, simulador e guardas de perfil continuam usando os serviços existentes.

## Limites deliberados

O esquema é ilustrativo, não um mapa georreferenciado. Não são exibidas distâncias, tempo a pé,
portões recomendados nem tipos de vaga sem dados correspondentes no contrato.
O modo geográfico usa as coordenadas recebidas pela API e tiles opcionais do OpenStreetMap.
As preferências e os veículos são locais a cada conta neste navegador. Sincronização desses novos dados com backend é trabalho futuro.

## Imagens de revisão

- [Login](redesign-login.png)
- [Consulta de estacionamentos](redesign-estacionamentos.png)
- [Consulta em 360 px](redesign-mobile.png)

As imagens documentam uma execução local com dados simulados. O grupo ainda deve testar seus próprios celulares e tecnologias assistivas.
