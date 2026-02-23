const BASE_URL = "https://dev.gruponfa.com/webhook/lunch-time";

export async function getUsers(userId, systemId) {
  const url = `${BASE_URL}/get_users?userId=${encodeURIComponent(
    userId
  )}&systemId=${encodeURIComponent(systemId)}`;

  const res = await fetch(url, {
    method: "GET"
  });

  if (!res.ok) {
    throw new Error("Falha ao buscar usuários.");
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.filter(
    (u) => String(u.userId) === String(userId) && String(u.systemId) === String(systemId)
  );
}

export async function createUser({
  _id,
  userId,
  systemId,
  message,
  active,
  sendMessage,
  transferAttendance,
  sendReadyMessage,
  idMessage
}) {
  const payload = {
    _id: _id ? String(_id) : "",
    userId: String(userId),
    systemId: String(systemId),
    message: message || "",
    active: active ? "true" : "false",
    sendMessage: sendMessage ? "true" : "false",
    transferAttendance: transferAttendance ? "true" : "false",
    sendReadyMessage: sendReadyMessage ? "true" : "false",
    idMessage: idMessage || ""
  };

  const res = await fetch(`${BASE_URL}/create_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao criar usuário.");
  }

  return res.json();
}

export async function updateUser({
  _id,
  userId,
  systemId,
  message,
  active,
  sendMessage,
  transferAttendance,
  sendReadyMessage,
  idMessage
}) {
  const payload = {
    _id: String(_id),
    userId: String(userId),
    systemId: String(systemId),
    message: message || "",
    active: active ? "true" : "false",
    sendMessage: sendMessage ? "true" : "false",
    transferAttendance: transferAttendance ? "true" : "false",
    sendReadyMessage: sendReadyMessage ? "true" : "false",
    idMessage: idMessage || ""
  };

  const res = await fetch(`${BASE_URL}/update_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao atualizar usuário.");
  }

  return res.json();
}

export async function getMessages(userId, systemId) {
  const payload = {
    userId: String(userId),
    systemId: String(systemId)
  };

  // Observação: GET com body não é suportado de forma consistente em browsers.
  // A API de exemplo mostra GET com body; para funcionar no frontend, tentamos POST.
  const tryPost = async () => {
    const res = await fetch(`${BASE_URL}/get_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Falha ao buscar mensagens.");
    }

    return res.json();
  };

  const tryGet = async () => {
    const url = `${BASE_URL}/get_message?userId=${encodeURIComponent(
      userId
    )}&systemId=${encodeURIComponent(systemId)}`;

    const res = await fetch(url, {
      method: "GET"
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Falha ao buscar mensagens.");
    }

    return res.json();
  };

  let data;
  try {
    data = await tryPost();
  } catch (e) {
    // fallback: tenta GET com querystring
    data = await tryGet();
  }

  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.messages)
      ? data.messages
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return arr.filter(
    (m) => String(m.userId) === String(userId) && String(m.systemId) === String(systemId)
  );
}

export async function createMessage({ userId, systemId, message, title }) {
  const payload = {
    userId: String(userId),
    systemId: String(systemId),
    message: String(message),
    title: title ? String(title) : ""
  };

  const res = await fetch(`${BASE_URL}/create_message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao criar mensagem.");
  }

  return res.json();
}

export async function updateMessage({ _id, userId, systemId, message, title }) {
  const payload = {
    _id: String(_id),
    userId: String(userId),
    systemId: String(systemId),
    message: String(message),
    title: title ? String(title) : ""
  };

  const res = await fetch(`${BASE_URL}/update_message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao atualizar mensagem.");
  }

  return res.json();
}

export async function deleteMessage({ _id, userId, systemId }) {
  const payload = {
    _id: String(_id),
    userId: String(userId),
    systemId: String(systemId)
  };

  const res = await fetch(`${BASE_URL}/delete_message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao excluir mensagem.");
  }

  return res.json();
}
