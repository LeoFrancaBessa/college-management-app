# Specs — Spec-Driven Development

Este diretório contém as especificações do sistema, escritas **antes** da implementação.
A ideia é que código, testes e arquitetura derivem destes documentos — e não o contrário.

## Ordem recomendada de preenchimento

1. [`00-constituicao.md`](./00-constituicao.md) — Regras de negócio pétreas e princípios inegociáveis do projeto.
2. [`01-visao-geral.md`](./01-visao-geral.md) — O que é o sistema, objetivo, escopo.
3. [`02-glossario.md`](./02-glossario.md) — Termos e definições do domínio (linguagem ubíqua).
4. [`03-casos-de-uso.md`](./03-casos-de-uso.md) — Atores e casos de uso.
5. [`04-funcionalidades.md`](./04-funcionalidades.md) — Funcionalidades / requisitos funcionais, agrupadas por módulo.
6. [`05-modelo-de-dominio.md`](./05-modelo-de-dominio.md) — Entidades, atributos, relacionamentos, invariantes.
7. [`06-requisitos-nao-funcionais.md`](./06-requisitos-nao-funcionais.md) — Performance, segurança, disponibilidade, etc.

## Specs de feature

A pasta [`features/`](./features/) guarda a especificação detalhada de cada funcionalidade maior,
uma vez que ela é definida em `04-funcionalidades.md`. Cada feature terá seu próprio arquivo
`features/<nome-da-feature>.md` com o detalhamento necessário para implementação (regras específicas,
critérios de aceite, casos de borda).

## Regra de ouro

- **Regras pétreas** (`00-constituicao.md`) só mudam com decisão explícita e justificada — nunca como
  efeito colateral de uma feature.
- Toda funcionalidade nova deve referenciar os casos de uso e regras de negócio que a motivam.
- Se o código diverge da spec, ou a spec está desatualizada, ou o código está errado — resolva a
  divergência antes de seguir.
