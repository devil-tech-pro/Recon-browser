class InterceptorStore {
  constructor() {
    this.enabled = false;

    this.scopeMode =
      "current-host";

    this.currentHost = "";

    this.queue = [];

    this.pending = new Map();
  }


  setEnabled(value) {
    this.enabled =
      Boolean(value);

    console.log(
      `[INTERCEPT] State: ${
        this.enabled
          ? "ON"
          : "OFF"
      }`
    );

    if (!this.enabled) {
      this.forwardAll();
    }

    return this.enabled;
  }


  isEnabled() {
    return this.enabled;
  }


  setScopeMode(mode) {
    if (
      mode !== "current-host" &&
      mode !== "all-hosts"
    ) {
      return this.scopeMode;
    }

    this.scopeMode = mode;

    console.log(
      `[INTERCEPT] Scope: ${mode}`
    );

    return this.scopeMode;
  }


  getScopeMode() {
    return this.scopeMode;
  }


  setCurrentHost(host) {
    this.currentHost =
      String(host || "")
        .toLowerCase()
        .trim();

    console.log(
      `[INTERCEPT] Current host: ${
        this.currentHost || "NONE"
      }`
    );

    return this.currentHost;
  }


  getCurrentHost() {
    return this.currentHost;
  }


  normalizeHost(host) {
    return String(host || "")
      .toLowerCase()
      .replace(/^www\./, "");
  }


  shouldIntercept(url) {
    if (!this.enabled) {
      return false;
    }

    if (
      this.scopeMode ===
      "all-hosts"
    ) {
      return true;
    }

    if (!this.currentHost) {
      return false;
    }

    try {
      const requestURL =
        new URL(url);

      const requestHost =
        this.normalizeHost(
          requestURL.hostname
        );

      const scopeHost =
        this.normalizeHost(
          this.currentHost
        );

      return (
        requestHost === scopeHost ||
        requestHost.endsWith(
          `.${scopeHost}`
        )
      );

    } catch {
      return false;
    }
  }


  hold(requestData, callback) {
    const request = {
      id:
        requestData.id,

      method:
        String(
          requestData.method || "GET"
        ),

      url:
        String(
          requestData.url || ""
        ),

      resourceType:
        String(
          requestData.resourceType ||
          "other"
        ),

      timestamp:
        requestData.timestamp ||
        Date.now(),

      requestHeaders: {
        ...(requestData.requestHeaders || {})
      },

      requestBody:
        String(
          requestData.requestBody || ""
        )
    };

    this.queue.push(request);

    this.pending.set(
      request.id,
      {
        request,
        callback
      }
    );

    console.log(
      `[INTERCEPT] HOLD ${request.method} ${request.url}`
    );

    return request;
  }


  updateRequestBody(
    method,
    url,
    body
  ) {
    const normalizedMethod =
      String(method || "")
        .toUpperCase();

    const normalizedURL =
      String(url || "");

    const requestBody =
      String(body ?? "");

    if (!requestBody) {
      return false;
    }

    const request =
      [...this.queue]
        .reverse()
        .find(
          (item) =>
            String(
              item.method || ""
            ).toUpperCase() ===
              normalizedMethod &&

            String(
              item.url || ""
            ) ===
              normalizedURL
        );

    if (!request) {
      return false;
    }

    request.requestBody =
      requestBody;

    const pending =
      this.pending.get(
        request.id
      );

    if (pending) {
      pending.request.requestBody =
        requestBody;
    }

    return true;
  }


  getPendingRequest(id) {
    const pending =
      this.pending.get(id);

    if (!pending) {
      return null;
    }

    return {
      ...pending.request,

      requestHeaders: {
        ...(pending.request
          .requestHeaders || {})
      },

      requestBody:
        String(
          pending.request
            .requestBody || ""
        )
    };
  }


  getQueue() {
    return this.queue.map(
      (request) => ({
        ...request,

        requestHeaders: {
          ...(request.requestHeaders || {})
        },

        requestBody:
          String(
            request.requestBody || ""
          )
      })
    );
  }


  getNext() {
    return this.queue[0] || null;
  }


  forward(id) {
    const pending =
      this.pending.get(id);

    if (!pending) {
      return false;
    }

    this.pending.delete(id);

    this.queue =
      this.queue.filter(
        (request) =>
          request.id !== id
      );

    pending.callback({
      requestHeaders:
        pending.request
          .requestHeaders
    });

    return true;
  }


  cancelForReplay(id) {
    const pending =
      this.pending.get(id);

    if (!pending) {
      return false;
    }

    this.pending.delete(id);

    this.queue =
      this.queue.filter(
        (request) =>
          request.id !== id
      );

    pending.callback({
      cancel: true
    });

    return true;
  }


  drop(id) {
    const pending =
      this.pending.get(id);

    if (!pending) {
      return false;
    }

    this.pending.delete(id);

    this.queue =
      this.queue.filter(
        (request) =>
          request.id !== id
      );

    pending.callback({
      cancel: true
    });

    return true;
  }


  forwardAll() {
    const ids = [
      ...this.pending.keys()
    ];

    for (const id of ids) {
      this.forward(id);
    }
  }
}


module.exports =
  InterceptorStore;
