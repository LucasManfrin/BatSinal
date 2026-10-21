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

