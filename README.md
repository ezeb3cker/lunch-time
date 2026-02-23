# Launch Time - Extensão de horário de almoço

Aplicação em React (Vite) para gerenciar horário de almoço dos usuários, integrada às rotas:

- `GET https://dev.gruponfa.com/webhook/lunch-time/get_users`
- `POST https://dev.gruponfa.com/webhook/lunch-time/create_user`
- `POST https://dev.gruponfa.com/webhook/lunch-time/update_user`

## Como rodar em desenvolvimento

1. Instale as dependências:

```bash
npm install
```

2. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

3. Acesse no navegador (ajuste userId/systemId conforme necessário):

```text
http://localhost:5173/?userId=123&systemId=abc-123-xy
```

## Interface

- Painel vertical (~350 x 880 px).
- Switches:
  - `Enviar mensagem?`
  - `Transferir atendimento?` (apenas mantido em estado local, sem envio para API por enquanto).
- Campo de mensagem:
  - Visível apenas quando `Enviar mensagem?` está ativo.
- Botão principal:
  - Mostra **"Iniciar almoço"** quando `active=false`.
  - Mostra **"Encerrar almoço"`** quando `active=true`.

Um loader linear indeterminado (inspirado no componente `LinearProgress` do MUI [documentação](https://mui.com/material-ui/react-progress/#linear-indeterminate)) é exibido durante operações de carregamento e salvamento.

## Fluxo com a API

1. **Carregamento inicial**
   - Lê `userId` e `systemId` da query string da URL.
   - Chama `get_users` e filtra o resultado por `userId` + `systemId`.
   - Se encontrar:
     - Preenche `message`, `active` e `_id`.
   - Se não encontrar:
     - Mantém formulário em modo de criação.

2. **Iniciar almoço**
   - Se não houver `_id`:
     - Chama `create_user` com `{ userId, systemId, message, active: "true" }`.
   - Se já existir `_id`:
     - Chama `update_user` com `{ _id, userId, systemId, message, active: "true" }`.

3. **Encerrar almoço**
   - Chama `update_user` com `{ _id, userId, systemId, message, active: "false" }`.

