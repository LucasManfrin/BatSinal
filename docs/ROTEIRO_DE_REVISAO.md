# Roteiro de revisão do grupo

Cada integrante deve conseguir seguir uma requisição desde a tela até o mock e explicar a resposta.

| Área | O que explicar | O que conferir manualmente |
| --- | --- | --- |
| Acesso | Context, sessão do responsável e CompanyGuard | Visitante consulta sem conta; `/admin` sem sessão abre login; login inválido mostra erro |
| Consulta | queryKey por campus/empresa, cache e polling de 3 s | Contador e cores mudam sem recarregar; visitante não envia token ou altera dados |
| Lista e planta | seleção e geometria retornada pela API | Filtrar por nome e tipo; trocar bolsão; consultar vaga pelo teclado; verificar ocupada e sem sinal separadamente |
| Acesso e rota | campos opcionais e coordenadas cadastradas | Editar portão/minutos/destino; conferir estados sem informação; validar destino do link antes de usar dados reais |
| Empresa | responsável e slug | Cadastrar empresa e consultar suas vagas imediatamente sem sessão; sair e conferir que só a administração exige login |
| Cabeçalho e busca | consulta compartilhada, menu e navegação | Visitante acessa consulta e cadastro de empresa; responsável acessa administração e Minha empresa; buscar com Ctrl+K |
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
