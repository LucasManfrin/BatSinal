# BatSinal — maquete magnética

Este arquivo orienta todo trabalho futuro de interface neste repositório.

## Conceito

Uma maquete de arquitetura que acompanha a maquete física do grupo: placa de base com borda,
blocos de papel/argila e vagas como peças pequenas que encaixam. O mapa ocupa a maior área.
O encaixe magnético é o único momento de assinatura; não acrescentar decoração para preencher espaço.

## Tokens e leitura

Papel #F3EFE6, papel secundário #EAE4D7, linha #D8D0BF, tinta #1C1B18,
tinta suave #6A645A, sinal #F2B705. Texto sobre sinal usa tinta. Livre #1F8F55 é cor de peça;
texto pequeno de disponibilidade usa verde escuro #176B40 para contraste AA no papel.
Pares conferidos por luminância relativa: tinta/papel 15,01:1; suave/papel 5,11:1;
suave/papel secundário 4,63:1; verde escuro/papel 5,69:1; tinta/sinal 9,47:1;
foco/papel 4,66:1. Isso verifica esses pares, sem declarar auditoria integral de acessibilidade.
Ocupada #4A4741 recua. Sem sinal tem tracejado, hachura e ícone, além do texto.
Base #CFC6B2, topo dos blocos #D9CDB6 e lateral #C9BB9F. Noite opcional mantém matizes quentes.
Uma elevação: 0 8px 24px rgb(28 27 24 / 12%), reservada para peça levantada e painel lateral.

Atkinson Hyperlegible 400/700 para texto; Barlow Condensed 600/700 para títulos e números.
Pacotes @fontsource locais, sem CDN. Números tabulares. Monoespaçada somente em códigos/chaves.
Texto normal a partir de 14 px, rótulos de formulário 14 px. Elementos de maquete podem ter rótulos
menores, com equivalente em lista HTML. Foco de 3 px em #896500, deslocado 3 px.
Botão com canto de 6 px, peso 700, altura mínima 44 px. Inputs com borda de tinta suave e altura 46 px.

## Layout e texto

- Público: busca/destino sobre a maquete, filtros compactos, resumo e lista lateral; bottom sheet no celular.
- Empresa: frase com disponibilidade e pico calculados, cena em dois terços da largura e lista operacional.
- Posicionar: áreas, cena e bandeja. Teclado/lista equivalentes à manipulação 3D.
- Preparação do mapa: quatro etapas com números/checks, quantidades reais e divisórias finas;
  quatro colunas no desktop, duas na faixa intermediária e uma no celular. Link público em linha própria.
  Na Unisagrado o endereço canônico é `/`, que abre diretamente a consulta.
- Separar grupos por espaço e linhas finas; cartões só quando delimitam uma tarefa independente.
- Painéis sem bloquear o restante da página para formulários, busca e detalhes. Modal só para excluir/restaurar.
- Falar de bloco, portão, vaga e sensor específicos. Não prometer rota, distância ou tempo que não foram medidos.
- Um indicador de atualização por tela. Ocupada é estado normal, sem vermelho de alarme.

## Padrões proibidos

Gradientes, vidro/blur, brilho/glow/bloom, bounce/elastic, monoespaçada decorativa,
caixa alta espaçada, ícone grande acima de título, KPIs iguais em faixa, cartões dentro de cartões,
frases que serviriam a qualquer dashboard e dependência de fontes/modelos/ambientes em CDN.
Movimento apenas de transform/opacity, 120–200 ms ease-out; transição de área até 500 ms.
Respeitar prefers-reduced-motion, inclusive no encaixe.

## Referências do próprio produto

- `docs/v2-campus.png`: mapa público, destino e disponibilidade.
- `docs/v2-painel.png`: visão geral da empresa.
- `docs/v2-posicionar.png`: cena e bandeja magnética.

Antes de cada commit visual: cobrir o logo, ler os textos e confirmar que descrevem estacionamento,
blocos e sensores reais do mock. Conferir desktop, celular, foco e contraste dos pares usados no texto.

## Referências técnicas

- https://r3f.docs.pmnd.rs/getting-started/installation (Fiber 8 para React 18).
- https://drei.docs.pmnd.rs/controls/introduction (controles e frameloop demand).
- https://drei.docs.pmnd.rs/misc/html (rótulos DOM, sem fonte remota).
