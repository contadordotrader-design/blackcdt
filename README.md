# Painel de Resultados · Black 2026 (Contador do Trader)

App com uma aba por área: **Visão geral, Operacional, Marketing, Comercial PF e Comercial PJ**.
Cada dono lança os números do dia até as 18h, marca as tarefas como feitas, e a visão geral consolida metas, funil, faturamento, alertas de atraso e a regra de "10 dias sem venda".

## Subir no Railway (uns 10 minutos)

1. Crie um repositório no GitHub (privado) e envie esta pasta inteira (sem `node_modules`).
2. No Railway: **New Project → Deploy from GitHub repo** e escolha o repositório.
3. No mesmo projeto: **New → Database → PostgreSQL**. Ligue o banco ao serviço do app:
   em *Variables* do app, adicione `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`.
4. Ainda em *Variables*, crie:
   - `APP_PASSWORD` = a senha que a equipe vai usar para entrar
   - `SESSION_SECRET` = qualquer texto longo e aleatório
5. Em *Settings → Networking*, clique **Generate Domain**. Esse é o link do painel.

As tabelas e as 31 tarefas iniciais (calendário da Black) são criadas sozinhas no primeiro start.
Sem `DATABASE_URL`, o app grava num arquivo `data.json` (bom só para teste local, o Railway apaga o arquivo a cada deploy).

## Rodar no computador

```
npm install
APP_PASSWORD=teste npm start
```
Abra http://localhost:3000

## Onde mudar as coisas

- `shared/config.js`: áreas, campos do lançamento diário, frentes, metas padrão, fases do calendário e tarefas iniciais.
- As metas também podem ser editadas pelo próprio painel (Visão geral → Editar metas).
- Exportar todos os lançamentos: botão **Exportar CSV** na visão geral.
