# Roteiro de revisão do grupo — v2

Cada integrante deve conseguir seguir uma requisição da tela ao handler e explicar a resposta.
Os itens abaixo são revisão humana pendente; a IA não os marca como realizados pelo grupo.

| Área | Explicar | Conferir |
| --- | --- | --- |
| Visitante | Rotas públicas, DTO e ausência de token | Abrir `/c/unisagrado` sem conta, filtrar Bloco J/portão/tipo, consultar uma vaga |
| Preferências | Hooks e chaves por campus no localStorage | Favoritar destino, recarregar, recuperar destino e testar aviso com a aba aberta |
| Empresa | Sessão da empresa, CompanyGuard e escopo do token | `/admin` sem sessão abre `/entrar`; outra empresa não acessa os IDs do seed |
| Cadastro | Sugestão/edição do slug e validação final | Slug ocupado/inválido, senha curta, sucesso com entrada automática |
| Maquete | Geometria existente, âncora e vaga separadas | Ver de perto, voltar ao campus, pan/zoom/rotação limitada, alternativa 2D |
| Ímã | Raios relativos à largura, smoothstep e histerese | Pegar peça, aproximar, encaixar, afastar até soltar e largar fora da área |
| Troca e histórico | Validação integral, versão e snapshots | Trocar duas compatíveis, desfazer/refazer, restaurar padrão e testar versão divergente |
| Bandeja e importação | Vaga nova sem posição e levantamento JSON | Cadastrar vaga/área, importar posições reais; nenhuma grade é inventada |
| Sem WebGL | Lista equivalente e anúncios aria-live | Tab/setas/Enter para posicionar, Escape para cancelar; conferir foco visível |
| Sensores | Vínculo único, expiração em 60 s | Vaga sem sensor, seletor inline, leituras variadas, simulador na administração |
| Painel | Resumo/pico calculados e histórico sintético | Conferir valores da linha e do heatmap, trocar período/estacionamento |
| Persistência | Migração e armazenamento local compartilhado | Recarregar após posicionar; conferir erro se armazenamento estiver bloqueado |
| Visual | Regras de frontend/DESIGN.md | Desktop e celular, tema claro/noturno, texto sem logo, símbolos além das cores |
| Offline | Assets/fontes locais | Campus, cena e lista sem internet; Google Maps e tiles opcionais exigem rede |
| Banco futuro | FKs compostas e transação sob bloqueio da área | Revisar SQL e testar em PostgreSQL antes de implementar; não está aplicado |

Não há editor livre, gerador de grid, rotação manual de vaga, contas de motorista ou papéis.
A migração ainda reconhece o formato antigo somente para preservar os dados existentes.
Confiram no campus entradas, sentidos, vagas físicas, acessibilidade e os vínculos dos sensores.
Registrem correções humanas em [USO_DE_IA.md](USO_DE_IA.md).
