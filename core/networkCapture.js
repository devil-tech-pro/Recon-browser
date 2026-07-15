const { Buffer } = require("buffer");


function cloneHeaders(headers = {}) {
  const result = {};

  for (
    const [name, value]
    of Object.entries(headers)
  ) {
    result[name] =
      Array.isArray(value)
        ? [...value]
        : value;
  }

  return result;
}


function extractUploadBody(uploadData) {
  if (!Array.isArray(uploadData)) {
    return "";
  }

  const chunks = [];

  for (const item of uploadData) {
    if (!item) {
      continue;
    }

    if (item.bytes !== undefined) {
      try {
        let buffer;

        if (Buffer.isBuffer(item.bytes)) {
          buffer = Buffer.from(
            item.bytes
          );

        } else if (
          item.bytes instanceof ArrayBuffer
        ) {
          buffer = Buffer.from(
            new Uint8Array(
              item.bytes
            )
          );

        } else if (
          ArrayBuffer.isView(
            item.bytes
          )
        ) {
          buffer = Buffer.from(
            item.bytes.buffer,
            item.bytes.byteOffset,
            item.bytes.byteLength
          );

        } else {
          buffer = Buffer.from(
            item.bytes
          );
        }

        chunks.push(buffer);

      } catch (error) {
        console.error(
          "[BODY] BYTES ERROR:",
          error.message
        );
      }
    }
  }

  if (!chunks.length) {
    return "";
  }

  return Buffer
    .concat(chunks)
    .toString("utf8");
}


function normalizeMethod(method) {
  return String(
    method || "GET"
  ).toUpperCase();
}


function normalizeURL(url) {
  return String(url || "");
}


function startNetworkCapture({
  targetSession,
  requestStore,
  interceptorStore,
  processInterceptorRequest,
  sendNetworkEvent,
  sendInterceptorEvent
}) {
  const filter = {
    urls: [
      "http://*/*",
      "https://*/*"
    ]
  };


  /*
   * Electron request id -> body
   */

  const bodyStore =
    new Map();


  /*
   * Recent request references.
   *
   * CDP and webRequest use different
   * request IDs, so method + URL are
   * used for body correlation.
   */

  const recentRequests =
    [];


  function rememberRequest(request) {
    const existingIndex =
      recentRequests.findIndex(
        (item) =>
          item.request === request
      );

    if (existingIndex !== -1) {
      recentRequests.splice(
        existingIndex,
        1
      );
    }

    recentRequests.push({
      request,
      method:
        normalizeMethod(
          request.method
        ),
      url:
        normalizeURL(
          request.url
        ),
      timestamp:
        Date.now()
    });


    /*
     * Prevent unlimited memory growth.
     */

    while (
      recentRequests.length > 500
    ) {
      recentRequests.shift();
    }


    const cutoff =
      Date.now() - 120000;

    while (
      recentRequests.length &&
      recentRequests[0].timestamp <
        cutoff
    ) {
      recentRequests.shift();
    }
  }


  function findRecentRequest(
    method,
    url
  ) {
    const targetMethod =
      normalizeMethod(method);

    const targetURL =
      normalizeURL(url);


    for (
      let index =
        recentRequests.length - 1;

      index >= 0;

      index -= 1
    ) {
      const item =
        recentRequests[index];

      if (
        item.method ===
          targetMethod &&
        item.url ===
          targetURL
      ) {
        return item.request;
      }
    }

    return null;
  }


  function publishBodyUpdate(
    request,
    body
  ) {
    request.requestBody =
      String(body || "");


    sendNetworkEvent(
      "request-updated",
      request
    );


    const interceptorUpdated =
      interceptorStore
        .updateRequestBody(
          request.method,
          request.url,
          request.requestBody
        );


    console.log(
      `[BODY] NETWORK UPDATE ` +
      `${request.method} ` +
      `${request.url} ` +
      `${Buffer.byteLength(
        request.requestBody
      )} BYTES`
    );


    if (interceptorUpdated) {
      console.log(
        `[BODY] INTERCEPTOR UPDATE ` +
        `${request.method} ` +
        `${request.url}`
      );


      sendInterceptorEvent({
        type:
          "queue-updated",

        enabled:
          interceptorStore
            .isEnabled(),

        scopeMode:
          interceptorStore
            .getScopeMode(),

        currentHost:
          interceptorStore
            .getCurrentHost(),

        queue:
          interceptorStore
            .getQueue()
      });
    }
  }


  /*
   * =====================================================
   * STAGE 1
   *
   * METHOD + URL + UPLOAD BODY
   * =====================================================
   */

  targetSession.webRequest
    .onBeforeRequest(
      filter,

      (details, callback) => {
        const request =
          requestStore
            .getOrCreate(details);


        const body =
          extractUploadBody(
            details.uploadData
          );


        bodyStore.set(
          String(details.id),
          body
        );


        Object.assign(
          request,
          {
            timestamp:
              Date.now(),

            method:
              details.method ||
              "GET",

            url:
              details.url ||
              "",

            resourceType:
              details.resourceType ||
              "other",

            requestBody:
              body
          }
        );


        rememberRequest(
          request
        );


        console.log(
          `[REQUEST] ${details.id} ` +
          `${request.method} ` +
          `${request.url} ` +
          `BODY=${Buffer.byteLength(
            body
          )}`
        );


        sendNetworkEvent(
          "request-started",
          request
        );


        callback({});
      }
    );


  /*
   * =====================================================
   * STAGE 2
   *
   * HEADERS + INTERCEPT
   * =====================================================
   */

  targetSession.webRequest
    .onBeforeSendHeaders(
      filter,

      (details, callback) => {
        const request =
          requestStore
            .getOrCreate(details);


        const requestId =
          String(details.id);


        const capturedBody =
          bodyStore.has(requestId)
            ? bodyStore.get(requestId)
            : String(
                request.requestBody ||
                ""
              );


        Object.assign(
          request,
          {
            method:
              details.method ||
              request.method ||
              "GET",

            url:
              details.url ||
              request.url ||
              "",

            resourceType:
              details.resourceType ||
              request.resourceType ||
              "other",

            requestHeaders:
              cloneHeaders(
                details.requestHeaders
              ),

            requestBody:
              String(
                capturedBody || ""
              )
          }
        );


        rememberRequest(
          request
        );


        console.log(
          `[HEADERS] ${details.id} ` +
          `${request.method} ` +
          `BODY=${Buffer.byteLength(
            request.requestBody
          )}`
        );


        sendNetworkEvent(
          "request-updated",
          request
        );


        const held =
          processInterceptorRequest({
            request: {
              id:
                request.id,

              timestamp:
                request.timestamp,

              method:
                request.method,

              url:
                request.url,

              resourceType:
                request.resourceType,

              requestHeaders:
                cloneHeaders(
                  request.requestHeaders
                ),

              requestBody:
                String(
                  request.requestBody ||
                  ""
                )
            },

            callback,

            interceptorStore,

            sendEvent:
              sendInterceptorEvent
          });


        if (held) {
          return;
        }


        callback({
          requestHeaders:
            details.requestHeaders
        });
      }
    );


  /*
   * =====================================================
   * RESPONSE HEADERS
   * =====================================================
   */

  targetSession.webRequest
    .onHeadersReceived(
      filter,

      (details, callback) => {
        const request =
          requestStore
            .getOrCreate(details);


        Object.assign(
          request,
          {
            statusCode:
              details.statusCode ??
              null,

            statusLine:
              details.statusLine ||
              "",

            responseHeaders:
              cloneHeaders(
                details.responseHeaders
              )
          }
        );


        sendNetworkEvent(
          "request-updated",
          request
        );


        callback({
          responseHeaders:
            details.responseHeaders
        });
      }
    );


  /*
   * =====================================================
   * COMPLETED
   * =====================================================
   */

  targetSession.webRequest
    .onCompleted(
      filter,

      (details) => {
        const request =
          requestStore
            .getOrCreate(details);


        Object.assign(
          request,
          {
            statusCode:
              details.statusCode ??
              request.statusCode,

            fromCache:
              Boolean(
                details.fromCache
              ),

            completed:
              true,

            error:
              null
          }
        );


        sendNetworkEvent(
          "request-completed",
          request
        );


        bodyStore.delete(
          String(details.id)
        );
      }
    );


  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  targetSession.webRequest
    .onErrorOccurred(
      filter,

      (details) => {
        const request =
          requestStore
            .getOrCreate(details);


        Object.assign(
          request,
          {
            completed:
              true,

            error:
              details.error ||
              "Unknown network error"
          }
        );


        sendNetworkEvent(
          "request-error",
          request
        );


        bodyStore.delete(
          String(details.id)
        );
      }
    );


  console.log(
    "[NETWORK] BODY-AWARE CAPTURE ENGINE STARTED"
  );


  /*
   * =====================================================
   * CDP BODY CONTROLLER
   * =====================================================
   */

  return {
    ingestRequestBody({
      method,
      url,
      body
    }) {
      const requestBody =
        String(body || "");


      if (!requestBody) {
        return false;
      }


      const request =
        findRecentRequest(
          method,
          url
        );


      if (!request) {
        console.log(
          `[BODY] NO MATCH ` +
          `${normalizeMethod(method)} ` +
          `${normalizeURL(url)}`
        );

        return false;
      }


      publishBodyUpdate(
        request,
        requestBody
      );


      return true;
    }
  };
}


module.exports =
  startNetworkCapture;
