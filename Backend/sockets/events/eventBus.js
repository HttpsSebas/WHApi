const handlers = new Map();

export function on(event, handler) {
  if (!handlers.has(event)) handlers.set(event, []);
  handlers.get(event).push(handler);
}

export async function emit(event, payload) {
  const eventHandlers = handlers.get(event) ?? [];
  await Promise.all(eventHandlers.map((h) => h(payload)));
}