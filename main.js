const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  net
} = require("electron");

const path =
  require("path");

const RequestStore =
  require("./store/requestStore");

const InterceptorStore =
  require(
    "./interceptor/interceptorStore"
  );

const processInterceptorRequest =
  require(
    "./interceptor/interceptorServer"
  );

const startNetworkCapture =
  require(
    "./core/networkCapture"
  );


let mainWindow = null;

let captureStarted = false;

let captureController = null;


const requestStore =
  new RequestStore();

const interceptorStore =
  new InterceptorStore();


function sendNetworkEvent(
  type,
  request
) {
  if (
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {
    return;
  }


  mainWindow.webContents.send(
    "network:event",
    {
      type,

      request: {
        ...request,

        requestHeaders: {
          ...(
            request.requestHeaders ||
            {}
          )
        },

        responseHeaders: {
          ...(
            request.responseHeaders ||
            {}
          )
        },

        requestBody:
          String(
            request.requestBody ||
            ""
          )
      }
    }
  );
}


function sendInterceptorEvent(
  payload
) {
  if (
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {
    return;
  }


  mainWindow.webContents.send(
    "interceptor:event",
    payload
  );
}


function sendInterceptorState() {
  sendInterceptorEvent({
    type:
      "state",

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


function isLocalLabHost(hostname) {
  const host =
    String(hostname || "")
      .toLowerCase()
      .trim();


  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  );
}


function getHeaderValue(
  headers,
  targetName
) {
  const target =
    String(targetName)
      .toLowerCase();


  for (
    const [name, value]
    of Object.entries(
      headers || {}
    )
  ) {
    if (
      String(name)
        .toLowerCase() ===
      target
    ) {
      return Array.isArray(value)
        ? value.join(", ")
        : String(value || "");
    }
  }


  return "";
}


function setHeaderValue(
  headers,
  targetName,
  value
) {
  const target =
    String(targetName)
      .toLowerCase();


  for (
    const name
    of Object.keys(headers)
  ) {
    if (
      name.toLowerCase() ===
      target
    ) {
      headers[name] =
        String(value);

      return;
    }
  }


  headers[targetName] =
    String(value);
}


function prepareEditedBody(
  body,
  headers
) {
  const editorBody =
    String(body || "");


  const contentType =
    getHeaderValue(
      headers,
      "content-type"
    ).toLowerCase();


  /*
   * Renderer shows decoded values.
   *
   * Convert readable form values back
   * to valid URL encoded wire format.
   */

  if (
    contentType.includes(
      "application/x-www-form-urlencoded"
    )
  ) {
    const params =
      new URLSearchParams();


    const pairs =
      editorBody.split("&");


    for (const pair of pairs) {
      if (!pair) {
        continue;
      }


      const separator =
        pair.indexOf("=");


      let key;

      let value;


      if (separator === -1) {
        key = pair;
        value = "";

      } else {
        key =
          pair.slice(
            0,
            separator
          );

        value =
          pair.slice(
            separator + 1
          );
      }


      params.append(
        key,
        value
      );
    }


    return params.toString();
  }


  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      return JSON.stringify(
        JSON.parse(editorBody)
      );

    } catch {
      throw new Error(
        "INVALID JSON BODY"
      );
    }
  }


  return editorBody;
}


function parseRawRequest(
  rawRequest,
  originalURL
) {
  const text =
    String(rawRequest || "")
      .replace(/\r\n/g, "\n");


  const separatorIndex =
    text.indexOf("\n\n");


  const headerText =
    separatorIndex === -1
      ? text
      : text.slice(
          0,
          separatorIndex
        );


  const editorBody =
    separatorIndex === -1
      ? ""
      : text.slice(
          separatorIndex + 2
        );


  const lines =
    headerText.split("\n");


  const requestLine =
    lines.shift();


  const match =
    requestLine?.match(
      /^([A-Z]+)\s+(\S+)\s+HTTP\/\d(?:\.\d)?$/i
    );


  if (!match) {
    throw new Error(
      "INVALID RAW REQUEST LINE"
    );
  }


  const method =
    match[1].toUpperCase();


  const requestPath =
    match[2];


  const headers = {};


  for (const line of lines) {
    const index =
      line.indexOf(":");


    if (index === -1) {
      continue;
    }


    const name =
      line
        .slice(0, index)
        .trim();


    const value =
      line
        .slice(index + 1)
        .trim();


    if (name) {
      headers[name] =
        value;
    }
  }


  const original =
    new URL(originalURL);


  const finalURL =
    new URL(
      requestPath,
      original.origin
    ).toString();


  const body =
    prepareEditedBody(
      editorBody,
      headers
    );


  setHeaderValue(
    headers,
    "Content-Length",
    Buffer.byteLength(body)
  );


  return {
    method,
    url:
      finalURL,
    headers,
    body
  };
}


function replayLocalRequest(
  editedRequest
) {
  return new Promise(
    (resolve, reject) => {
      let parsedURL;


      try {
        parsedURL =
          new URL(
            editedRequest.url
          );

      } catch {
        reject(
          new Error(
            "INVALID REPLAY URL"
          )
        );

        return;
      }


      if (
        !isLocalLabHost(
          parsedURL.hostname
        )
      ) {
        reject(
          new Error(
            "EDITED REPLAY LIMITED TO LOCAL LAB"
          )
        );

        return;
      }


      const browserSession =
        session.fromPartition(
          "persist:reconbrowser"
        );


      const replayRequest =
        net.request({
          method:
            editedRequest.method,

          url:
            editedRequest.url,

          session:
            browserSession
        });


      const blockedHeaders =
        new Set([
          "host",
          "content-length",
          "connection",
          "transfer-encoding"
        ]);


      for (
        const [name, value]
        of Object.entries(
          editedRequest.headers ||
          {}
        )
      ) {
        if (
          blockedHeaders.has(
            name.toLowerCase()
          )
        ) {
          continue;
        }


        try {
          replayRequest.setHeader(
            name,
            String(value)
          );

        } catch (error) {
          console.log(
            `[REPLAY] HEADER SKIPPED ${name}: ${error.message}`
          );
        }
      }


      replayRequest.on(
        "response",

        (response) => {
          const chunks = [];


          response.on(
            "data",

            (chunk) => {
              chunks.push(
                Buffer.from(chunk)
              );
            }
          );


          response.on(
            "end",

            () => {
              const responseBody =
                Buffer
                  .concat(chunks)
                  .toString("utf8");


              console.log(
                `[REPLAY] HTTP ${response.statusCode}`
              );


              resolve({
                statusCode:
                  response.statusCode,

                headers:
                  response.headers,

                body:
                  responseBody
              });
            }
          );
        }
      );


      replayRequest.on(
        "error",
        reject
      );


      if (
        editedRequest.body &&
        ![
          "GET",
          "HEAD"
        ].includes(
          editedRequest.method
        )
      ) {
        console.log(
          `[REPLAY] BODY ${editedRequest.body}`
        );


        replayRequest.write(
          editedRequest.body
        );
      }


      replayRequest.end();
    }
  );
}


function startCaptureEngine() {
  if (captureStarted) {
    return;
  }


  const browserSession =
    session.fromPartition(
      "persist:reconbrowser"
    );


  captureController =
    startNetworkCapture({
      targetSession:
        browserSession,

      requestStore,

      interceptorStore,

      processInterceptorRequest,

      sendNetworkEvent,

      sendInterceptorEvent
    });


  captureStarted =
    true;


  console.log(
    "[NETWORK] CAPTURE ENGINE STARTED"
  );
}


async function enableCDPBodyCapture(
  webContents
) {
  if (
    !webContents ||
    webContents.isDestroyed()
  ) {
    return;
  }


  try {
    if (
      !webContents.debugger.isAttached()
    ) {
      webContents.debugger.attach(
        "1.3"
      );
    }


    await webContents
      .debugger
      .sendCommand(
        "Network.enable",
        {
          maxTotalBufferSize:
            100 * 1024 * 1024,

          maxResourceBufferSize:
            20 * 1024 * 1024,

          maxPostDataSize:
            20 * 1024 * 1024
        }
      );


    console.log(
      "[CDP] BODY CAPTURE ATTACHED"
    );


    webContents.debugger.on(
      "message",

      async (
        _event,
        method,
        params
      ) => {
        if (
          method !==
          "Network.requestWillBeSent"
        ) {
          return;
        }


        const request =
          params?.request;


        if (!request) {
          return;
        }


        const requestMethod =
          String(
            request.method ||
            "GET"
          );


        const requestURL =
          String(
            request.url ||
            ""
          );


        let postData =
          typeof request.postData ===
          "string"
            ? request.postData
            : "";


        if (
          !postData &&
          params.requestId &&
          ![
            "GET",
            "HEAD",
            "OPTIONS"
          ].includes(
            requestMethod.toUpperCase()
          )
        ) {
          try {
            const result =
              await webContents
                .debugger
                .sendCommand(
                  "Network.getRequestPostData",
                  {
                    requestId:
                      params.requestId
                  }
                );


            postData =
              String(
                result?.postData ||
                ""
              );

          } catch {
            postData = "";
          }
        }


        if (
          postData &&
          captureController
        ) {
          captureController
            .ingestRequestBody({
              method:
                requestMethod,

              url:
                requestURL,

              body:
                postData
            });
        }
      }
    );

  } catch (error) {
    console.error(
      "[CDP] ERROR:",
      error.message
    );
  }
}


function createMainWindow() {
  mainWindow =
    new BrowserWindow({
      width:
        1500,

      height:
        900,

      minWidth:
        1000,

      minHeight:
        650,

      title:
        "ReconBrowser",

      backgroundColor:
        "#0b0f0c",

      webPreferences: {
        preload:
          path.join(
            __dirname,
            "preload.js"
          ),

        contextIsolation:
          true,

        nodeIntegration:
          false,

        webviewTag:
          true
      }
    });


  mainWindow.webContents.on(
    "did-attach-webview",

    (
      _event,
      guestWebContents
    ) => {
      console.log(
        "[WEBVIEW] GUEST ATTACHED"
      );


      enableCDPBodyCapture(
        guestWebContents
      );
    }
  );


  mainWindow.loadFile(
    "index.html"
  );


  mainWindow.webContents.on(
    "did-finish-load",

    () => {
      sendInterceptorState();
    }
  );


  mainWindow.on(
    "closed",

    () => {
      interceptorStore
        .forwardAll();


      mainWindow =
        null;
    }
  );
}


ipcMain.handle(
  "network:clear",

  () => {
    requestStore.clear();


    return {
      success:
        true
    };
  }
);


ipcMain.handle(
  "interceptor:get-state",

  () => {
    return {
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
    };
  }
);


ipcMain.handle(
  "interceptor:set-enabled",

  (_event, enabled) => {
    const state =
      interceptorStore
        .setEnabled(
          enabled
        );


    sendInterceptorState();


    return {
      success:
        true,

      enabled:
        state,

      scopeMode:
        interceptorStore
          .getScopeMode(),

      currentHost:
        interceptorStore
          .getCurrentHost(),

      queue:
        interceptorStore
          .getQueue()
    };
  }
);


ipcMain.handle(
  "interceptor:set-scope",

  (_event, mode) => {
    interceptorStore
      .setScopeMode(mode);


    sendInterceptorState();


    return {
      success:
        true,

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
    };
  }
);


ipcMain.handle(
  "interceptor:set-current-host",

  (_event, host) => {
    interceptorStore
      .setCurrentHost(host);


    sendInterceptorState();


    return {
      success:
        true,

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
    };
  }
);


ipcMain.handle(
  "interceptor:forward",

  async (
    _event,
    requestId,
    rawRequest
  ) => {
    const originalRequest =
      interceptorStore
        .getPendingRequest(
          requestId
        );


    if (!originalRequest) {
      return {
        success:
          false,

        error:
          "HELD REQUEST NOT FOUND",

        queue:
          interceptorStore
            .getQueue()
      };
    }


    let originalURL;


    try {
      originalURL =
        new URL(
          originalRequest.url
        );

    } catch {
      return {
        success:
          false,

        error:
          "INVALID ORIGINAL URL",

        queue:
          interceptorStore
            .getQueue()
      };
    }


    /*
     * Non-local targets:
     * continue original held request.
     */

    if (
      !isLocalLabHost(
        originalURL.hostname
      )
    ) {
      const success =
        interceptorStore
          .forward(requestId);


      sendInterceptorState();


      return {
        success,

        replayed:
          false,

        queue:
          interceptorStore
            .getQueue()
      };
    }


    let editedRequest;


    try {
      editedRequest =
        parseRawRequest(
          rawRequest,
          originalRequest.url
        );

    } catch (error) {
      return {
        success:
          false,

        error:
          error.message,

        queue:
          interceptorStore
            .getQueue()
      };
    }


    let editedURL;


    try {
      editedURL =
        new URL(
          editedRequest.url
        );

    } catch {
      return {
        success:
          false,

        error:
          "INVALID EDITED URL",

        queue:
          interceptorStore
            .getQueue()
      };
    }


    if (
      !isLocalLabHost(
        editedURL.hostname
      )
    ) {
      return {
        success:
          false,

        error:
          "EDITED REPLAY LIMITED TO LOCAL LAB",

        queue:
          interceptorStore
            .getQueue()
      };
    }


    console.log(
      `[REPLAY] ORIGINAL BODY: ` +
      `${originalRequest.requestBody}`
    );


    console.log(
      `[REPLAY] EDITED BODY: ` +
      `${editedRequest.body}`
    );


    const cancelled =
      interceptorStore
        .cancelForReplay(
          requestId
        );


    if (!cancelled) {
      return {
        success:
          false,

        error:
          "UNABLE TO CANCEL ORIGINAL REQUEST",

        queue:
          interceptorStore
            .getQueue()
      };
    }


    try {
      const replayResult =
        await replayLocalRequest(
          editedRequest
        );


      sendInterceptorState();


      return {
        success:
          true,

        replayed:
          true,

        statusCode:
          replayResult.statusCode,

        responseBody:
          replayResult.body,

        queue:
          interceptorStore
            .getQueue()
      };

    } catch (error) {
      sendInterceptorState();


      return {
        success:
          false,

        error:
          error.message,

        queue:
          interceptorStore
            .getQueue()
      };
    }
  }
);


ipcMain.handle(
  "interceptor:drop",

  (_event, requestId) => {
    const success =
      interceptorStore
        .drop(requestId);


    sendInterceptorState();


    return {
      success,

      queue:
        interceptorStore
          .getQueue()
    };
  }
);


ipcMain.handle(
  "interceptor:forward-all",

  () => {
    interceptorStore
      .forwardAll();


    sendInterceptorState();


    return {
      success:
        true,

      queue:
        []
    };
  }
);


app.whenReady().then(
  () => {
    startCaptureEngine();

    createMainWindow();


    app.on(
      "activate",

      () => {
        if (
          BrowserWindow
            .getAllWindows()
            .length === 0
        ) {
          createMainWindow();
        }
      }
    );
  }
);


app.on(
  "window-all-closed",

  () => {
    interceptorStore
      .forwardAll();


    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);
