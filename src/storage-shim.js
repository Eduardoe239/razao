// Substitui a API window.storage (usada dentro do Claude) por localStorage,
// pra rodar exatamente o mesmo App.jsx aqui na sua máquina.
const PREFIX = "razao:";

window.storage = {
  async get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return null;
    return { key, value: raw, shared: false };
  },
  async set(key, value) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value, shared: false };
  },
  async delete(key) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix = "") {
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX + prefix))
      .map((k) => k.slice(PREFIX.length));
    return { keys, prefix, shared: false };
  },
};
