// Three dispatch maps: one per interaction category.
// Feature index files call register* to populate them.
// The router reads from them on every request.

export const commandHandlers = new Map();
export const modalHandlers   = new Map();
export const buttonHandlers  = new Map();

export const registerCommand = (name, fn) => commandHandlers.set(name, fn);
export const registerModal   = (namespace, fn) => modalHandlers.set(namespace, fn);
export const registerButton  = (namespace, fn) => buttonHandlers.set(namespace, fn);
