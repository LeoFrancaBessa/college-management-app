# Requisitos Não Funcionais

## Performance

- Uso individual, baixa concorrência — não há requisito de suportar múltiplos acessos
  simultâneos.
- Operações de leitura (cronograma, boards, homepage) devem responder rapidamente (< ~1s) em
  uso normal.
- A resposta da IA (interpretação do comando em linguagem natural) deve voltar em poucos
  segundos — experiência conversacional, não precisa ser instantânea.

## Segurança

- O sistema pode ser acessado remotamente (ex.: do celular, fora de casa), portanto exige
  **autenticação (login/senha)** mesmo sendo single-user — não pode ficar exposto na internet
  sem nenhuma proteção.
- Chaves/segredos de API (ex.: do provedor de IA) nunca são versionados no repositório — ficam
  em variáveis de ambiente/segredos.
- Não há necessidade de RBAC ou múltiplos perfis de acesso (Regra pétrea 7).

## Disponibilidade

- Sem SLA formal — projeto pessoal, best-effort; janelas de manutenção são aceitáveis.
- A persistência dos dados deve sobreviver a reinícios/deploys do serviço, sem perda de dados.

## Escalabilidade

- Não é um requisito relevante: volume de dados e uso é o de uma única pessoa ao longo de uma
  graduação. O sistema deve rodar confortavelmente em infraestrutura modesta (VPS pequeno,
  free-tier, ou até localmente).

## Usabilidade / Acessibilidade

- Interface responsiva — precisa funcionar bem tanto no notebook quanto no celular (ex.: para
  registrar algo rapidamente durante uma aula).
- O fluxo de ingestão via IA deve ser o caminho de menor fricção para registrar um item — é o
  principal ganho de UX do produto.
- Sem requisito formal de acessibilidade (WCAG etc.) dado o uso pessoal, mas cuidados básicos de
  legibilidade/contraste são desejáveis.

## Observabilidade (logs, métricas, auditoria)

- Logs técnicos de erros e requisições, para depuração — não é um histórico de auditoria de
  dados (isso ficou fora do MVP, ver `00-constituicao.md`).
- Como não há pré-validação nem histórico de versões, é desejável registrar (em log técnico, não
  como feature de produto) qual comando o usuário deu à IA e qual ação ela executou — facilita
  depurar um caso em que ela interprete algo errado.

## Conformidade / legal (LGPD, etc.)

- Não aplicável no sentido comercial/legal: sistema pessoal, sem dados de terceiros, sem
  finalidade comercial.
- Por serem dados pessoais do próprio usuário, boas práticas básicas de segurança (não expor
  backups publicamente, não versionar segredos) ainda se aplicam.

## Backup e portabilidade de dados

- Dados acadêmicos não são reproduzíveis pelo usuário caso se percam — deve existir uma forma de
  **exportar/fazer backup dos dados** (ex.: export em JSON) para evitar perda total em caso de
  falha de infraestrutura.
- **Confirmado: entra no MVP** (ver `RF-40` em `04-funcionalidades.md`).
