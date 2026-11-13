// A failed event must never stop the worker, so the failure is logged and swallowed.
export function reportFailures(eventName, handler) {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (err) {
      console.error(`[Pinboard] event=${eventName} failed`, err);
    }
  };
}
