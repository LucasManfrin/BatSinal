# Mapa único da Unisagrado

A consulta de `/c/unisagrado` usa uma cena isométrica (2,5D), com opção 2D, zoom, deslocamento,
seleção de bloco e de vaga. O desenho interpreta a imagem com marcações enviada pelo grupo.
É uma aproximação visual, sem escala, georreferenciamento ou dimensões levantadas no local.

O visitante escolhe um bloco/serviço e, opcionalmente, o portão de veículos. O bloco e a entrada
são destacados; a lista mostra vagas próximas. Portão 2 é indicado como pedestre e não aparece
na seleção de entrada de veículos, conforme a legenda da referência original. Os portões
e as entradas dos prédios ainda precisam de conferência no campus.

Proximidade usa distância euclidiana no desenho até a entrada ilustrativa do bloco, com raio
de 220 unidades locais. Não corresponde a metros, tempo de caminhada, percurso acessível ou
rota dirigível. Escolher um portão apenas o destaca: ainda não existe grafo de circulação validado.

## Dados e persistência

- O seed da cena fica em `frontend/src/mocks/campus.ts`; a interface recebe tudo por HTTP.
- Blocos têm contornos livres, alturas ilustrativas e entrada. Vias são polilinhas com largura;
  áreas de vagas usam polígonos, e cada vaga tem posição e rotação independentes.
- As 92 vagas **demonstrativas que já existiam** foram distribuídas em 11 trechos das áreas
  marcadas. As quantidades não foram contadas da imagem nem representam capacidade real.
- `posicoes[].vagaId` vincula a cena às vagas existentes. Leituras são as mesmas do simulador,
  painel e sensores, consultadas a cada 3 segundos. Sem leitura válida há 60 s, SEM_SINAL.
- O mock persiste `mapas` no armazenamento local. A migração acrescenta a cena ao seed antigo,
  preservando mapas já salvos, layouts, sensores, histórico e sessões. Não há reset do navegador.
- Vagas excluídas deixam de aparecer; novas vagas sem posição não são desenhadas artificialmente.
  A consulta informa a quantidade ainda não mapeada. Alterar o grid do editor não reposiciona
  a vaga no campus: o editor de cena completa ainda não foi implementado.
- Outras empresas sem cena mantêm a consulta anterior. A Unisagrado apresenta o campus inteiro,
  sem exigir que o visitante escolha um estacionamento. Grupos administrativos foram preservados.

Na proposta PostgreSQL, `mapas_campus.cena` (JSONB) guarda a geometria local, alturas e vínculos.
O campo `geojson` permanece para um futuro levantamento em longitude/latitude. São sistemas
de coordenadas distintos: não converter posições da ilustração em coordenadas geográficas por estimativa.
Status e credenciais de sensores não ficam gravados na cena.

O serviço real deverá validar estrutura, limites de coordenadas, IDs únicos, contornos sem
autointerseção, referência a vaga da mesma empresa e uma posição por vaga. A restrição SQL
proposta verifica apenas que `cena` é um objeto JSON. Salvar deverá usar controle de versão
e transação. A API real e o PostgreSQL continuam planejados, não implementados.

## Conferência antes do mapeamento real

1. Confirmar as entradas dos prédios, portões de veículos e sentidos de circulação.
2. Contar vagas por trecho e conferir posições, rótulos, PCD, motos e restrições.
3. Associar cada sensor à vaga física correta e retirar dados demonstrativos.
4. Levantar caminhos dirigíveis e de pedestres antes de oferecer rotas ou tempos.

As capturas `campus-isometrico.png` e `campus-mobile.png` documentam a demonstração.
