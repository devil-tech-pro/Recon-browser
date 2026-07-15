class RequestStore {
  constructor(limit = 2000) {
    this.requests = new Map();
    this.limit = limit;
  }

  create(details) {
    const request = {
      id: details.id,
      timestamp: Date.now(),
      method: details.method || "GET",
      url: details.url || "",
      resourceType: details.resourceType || "other",
      requestHeaders: {},
      requestBody: "",
      statusCode: null,
      statusLine: "",
      responseHeaders: {},
      fromCache: false,
      error: null,
      completed: false
    };

    this.requests.set(details.id, request);
    this.trim();

    return request;
  }

  get(id) {
    return this.requests.get(id);
  }

  getOrCreate(details) {
    return this.get(details.id) || this.create(details);
  }

  update(id, data) {
    const request = this.requests.get(id);

    if (!request) {
      return null;
    }

    Object.assign(request, data);

    return request;
  }

  clear() {
    this.requests.clear();
  }

  trim() {
    while (this.requests.size > this.limit) {
      const firstKey = this.requests.keys().next().value;
      this.requests.delete(firstKey);
    }
  }
}

module.exports = RequestStore;
