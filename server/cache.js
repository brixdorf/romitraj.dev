// Remembers an answer for a while, so that many visitors cause only a few requests to the
// service behind it. "ask" fetches a fresh answer (or nothing, if the service is down).
// A good answer is kept for "goodFor" milliseconds. After a failure nothing is shown, and the
// service is left alone for "retryAfter" milliseconds before it is asked again.
export function remembered(ask, { goodFor, retryAfter }) {
  let value = null;
  let until = 0;
  let pending = null;
  return () => {
    if (Date.now() < until) return Promise.resolve(value);
    // Visitors who arrive while a request is on its way share that one request.
    pending ??= ask()
      .catch(() => null)
      .then((answer) => {
        value = answer || null;
        until = Date.now() + (value ? goodFor : retryAfter);
        pending = null;
        return value;
      });
    return pending;
  };
}
