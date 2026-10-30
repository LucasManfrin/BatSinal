# Publicidade na consulta pública

O BatSinal combina mensalidade da instituição e publicidade. Estudantes e visitantes
continuam consultando gratuitamente, sem conta. Há uma única cota por instituição,
com campanha comercial de 30 dias e possibilidade de negociação direta por lances.
Esta etapa não implementa leilão, cobrança, métricas ou recebimento de propostas.

## Onde configurar

Edite [`frontend/src/features/publicidade/config.ts`](../frontend/src/features/publicidade/config.ts).
É uma configuração editorial no código, sem formulário administrativo ou endpoint novo.
Funciona igualmente com MSW e com FastAPI. Alterações precisam de novo build/deploy em produção.
Nunca coloque credenciais ou dados privados nesse arquivo: seu conteúdo integra o frontend público.

- `publicidade.contato`: canal comercial geral. **Pendente: o projeto não tem um canal oficial cadastrado.**
  Aceita `mailto:`, `tel:` ou HTTPS, por exemplo o endereço oficial do WhatsApp comercial.
- `publicidade.instituicoes[slug]`: configura somente a instituição identificada pelo slug público.
  Não há herança de campanhas entre empresas. Se mudar um slug, atualize sua chave aqui.
- `contato` dentro da instituição: substituição opcional do contato geral. Uma string vazia
  deixa o contato dessa instituição pendente, mesmo se houver canal geral configurado.
- `campanha: null` ou `ativa: false`: espaço disponível, com “Anuncie aqui”.

Exemplo **fictício**, apenas para orientar a edição (não está ativado no site):

```ts
publicidade.instituicoes['slug-da-instituicao'] = {
  contato: 'mailto:comercial@example.com', // Troque pelo canal oficial.
  campanha: {
    ativa: true,
    anunciante: 'Nome da marca',
    imagem: '/publicidade/marca.webp',
    texto: 'Mensagem curta da oferta para o público universitário.',
    botao: 'Conheça a oferta',
    destino: 'https://example.com/oferta',
    inicio: '2026-11-01T00:00:00-03:00',
    fim: '2026-12-01T00:00:00-03:00',
  },
};
```

Coloque imagens locais em `frontend/public/publicidade/` e referencie sem o prefixo `public`.
Também são aceitas imagens HTTPS. A imagem é opcional; quando ausente ou indisponível,
o banner usa as iniciais e mantém nome, mensagem e link. Prefira logos com margem, pois
a imagem é ajustada com `object-fit: contain`, sem corte. Use nome, mensagem e botão curtos
(sugestão: 32, 90 e 24 caracteres); o card reserva a mesma altura em todos os estados.

Datas usam ISO 8601 **com fuso explícito**. O início é inclusivo e o fim exclusivo.
O frontend consulta o relógio do aparelho a cada segundo para ativar/encerrar uma oferta
com a aba aberta; não é uma garantia de veiculação validada pelo servidor.
Campanhas desativadas, futuras, vencidas, incompletas, com datas inválidas ou destino
fora de HTTPS mostram o espaço disponível. A duração é configurada editorialmente:
combine e registre 30 dias no período da campanha.

## Navegação e contato

O banner aparece acima da consulta, inclusive durante seu carregamento, com altura
reservada de 144 px no desktop e 212 px no celular. Não cobre filtros nem controles do mapa.
“Anuncie aqui” abre `/anunciar` no campus padrão ou `/c/:slug/anunciar` nas outras instituições.
A página explica público, segmentos, cota, negociação e a gratuidade da consulta.
O link de retorno preserva a query de filtros e o fragmento da consulta.

“Envie sua proposta” só oferece um link quando existe contato configurado. Sem canal,
a página informa a pendência e não apresenta envio ou confirmação fictícios.
O link de oferta abre na mesma aba e tem `rel="sponsored"`. Não há rastreamento de cliques.
