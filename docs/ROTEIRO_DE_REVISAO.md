# Roteiro de revisão do grupo

Cada integrante deve conseguir seguir uma requisição desde a tela até o mock e explicar a resposta.

| Área | O que explicar | O que conferir manualmente |
| --- | --- | --- |
| Autenticação | Context, token e RoleGuard | USER digitando `/admin` volta à consulta; login inválido mostra erro |
| Consulta | queryKey, cache e polling de 3 s | Contador e cores mudam sem recarregar; favoritos podem ser removidos |
| Lista e esquema | seleção, ordenação e posições estáveis | Filtrar por nome e tipo; limpar filtros; alternar lista/mapa em celular; esquema não representa rotas reais |
| Perfil | preferências locais por conta e favoritos via HTTP | Adicionar veículo, cancelar/confirmar remoção, aplicar preferência na consulta e conferir visitas recentes |
| Busca global | consulta compartilhada e navegação | Abrir com Ctrl+K, buscar por nome e visitar o detalhe |
| Mock | empresa da sessão, handlers e seed | Nova empresa não enxerga o campus seed; CRUD persiste ao recarregar |
| Canvas | coordenadas lógicas e escala | Zoom, pan, centralizar, clicar numa vaga e consultar pela lista HTML |
| Editor | snapshots de undo/redo e baseline | Arrastar, rotacionar, duplicar, excluir, desfazer e sair com alterações |
| Geometria | grade e projeção dos cantos para detectar sobreposição | Vagas apenas encostadas não geram aviso; rotacionadas são consideradas |
| Sensores | vaga única, leitura e expiração em 60 s | Sem sensor = sem sinal; chave aparece somente na criação |
| Painel | histórico, período, média e indisponibilidade | Trocar estacionamento/período, conferir gráfico e heatmap |
| Sem internet | fontes empacotadas e tiles opcionais | Desligar internet depois da instalação; consulta e editor continuam funcionando |
| Acessibilidade | labels, foco, textos e controles HTML | Navegar com Tab, usar campos numéricos e lista de objetos do editor |

O mock não ensina segurança de produção. Estudem separadamente hash de senha, JWT, autorização no backend,
CORS e validação das chaves de dispositivo antes de conectar sensores reais.

Registrem problemas encontrados e correções humanas na tabela de `USO_DE_IA.md`.
