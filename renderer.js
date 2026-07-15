document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);


  /*
   * =========================================================
   * BROWSER UI
   * =========================================================
   */

  const browserView =
    $("browserView");

  const addressBar =
    $("addressBar");

  const backButton =
    $("backButton");

  const forwardButton =
    $("forwardButton");

  const reloadButton =
    $("reloadButton");

  const homeButton =
    $("homeButton");

  const goButton =
    $("goButton");

  const devToolsButton =
    $("devToolsButton");

  const securityIndicator =
    $("securityIndicator");

  const statusText =
    $("statusText");

  const pageStatus =
    $("pageStatus");

  const loadingBar =
    $("loadingBar");


  /*
   * =========================================================
   * NETWORK UI
   * =========================================================
   */

  const networkPanel =
    $("networkPanel");

  const networkToggleButton =
    $("networkToggleButton");

  const closeNetworkButton =
    $("closeNetworkButton");

  const networkArrow =
    $("networkArrow");

  const networkBadge =
    $("networkBadge");

  const requestRows =
    $("requestRows");

  const requestCount =
    $("requestCount");

  const detailsContent =
    $("detailsContent");

  const clearNetworkButton =
    $("clearNetworkButton");


  /*
   * =========================================================
   * INTERCEPTOR UI
   * =========================================================
   */

  const interceptorPanel =
    $("interceptorPanel");

  const interceptorToggleButton =
    $("interceptorToggleButton");

  const closeInterceptorButton =
    $("closeInterceptorButton");

  const interceptorArrow =
    $("interceptorArrow");

  const interceptorSwitch =
    $("interceptorSwitch");

  const interceptorStateText =
    $("interceptorStateText");

  const interceptorQueueCount =
    $("interceptorQueueCount");

  const interceptorBadge =
    $("interceptorBadge");

  const interceptorDot =
    $("interceptorDot");

  const heldRequestRows =
    $("heldRequestRows");

  const rawRequestEditor =
    $("rawRequestEditor");

  const forwardRequestButton =
    $("forwardRequestButton");

  const dropRequestButton =
    $("dropRequestButton");

  const forwardAllButton =
    $("forwardAllButton");

  const currentHostScopeButton =
    $("currentHostScopeButton");

  const allHostsScopeButton =
    $("allHostsScopeButton");


  /*
   * =========================================================
   * CONSTANTS
   * =========================================================
   */

  const HOME_URL =
    "https://www.google.com";


  /*
   * =========================================================
   * STATE
   * =========================================================
   */

  const requests =
    new Map();

  let selectedRequestId =
    null;

  let selectedHeldRequestId =
    null;

  let interceptorEnabled =
    false;

  let interceptorQueue =
    [];

  let interceptorScopeMode =
    "current-host";

  let interceptorCurrentHost =
    "";

  let editorDirty =
    false;


  /*
   * =========================================================
   * URL NORMALIZATION
   * =========================================================
   */

  function normalizeInput(input) {
    const value =
      String(input || "")
        .trim();

    if (!value) {
      return HOME_URL;
    }

    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      return value;
    }

    if (
      value.includes(".") &&
      !value.includes(" ")
    ) {
      return `https://${value}`;
    }

    return (
      "https://www.google.com/search?q=" +
      encodeURIComponent(value)
    );
  }


  function navigate() {
    browserView.loadURL(
      normalizeInput(
        addressBar.value
      )
    );
  }


  /*
   * =========================================================
   * PANEL MANAGEMENT
   * =========================================================
   */

  function closeAllPanels() {
    networkPanel
      .classList
      .remove("open");

    interceptorPanel
      .classList
      .remove("open");

    networkToggleButton
      .classList
      .remove("active");

    interceptorToggleButton
      .classList
      .remove("active");

    networkArrow.textContent =
      "▲";

    interceptorArrow.textContent =
      "▲";
  }


  function toggleNetworkPanel() {
    const alreadyOpen =
      networkPanel
        .classList
        .contains("open");

    closeAllPanels();

    if (!alreadyOpen) {
      networkPanel
        .classList
        .add("open");

      networkToggleButton
        .classList
        .add("active");

      networkArrow.textContent =
        "▼";
    }
  }


  function toggleInterceptorPanel() {
    const alreadyOpen =
      interceptorPanel
        .classList
        .contains("open");

    closeAllPanels();

    if (!alreadyOpen) {
      interceptorPanel
        .classList
        .add("open");

      interceptorToggleButton
        .classList
        .add("active");

      interceptorArrow.textContent =
        "▼";
    }
  }


  /*
   * =========================================================
   * BROWSER STATE
   * =========================================================
   */

  function updateSecurityIndicator(url) {
    securityIndicator.style.color =
      String(url || "")
        .startsWith("https://")
        ? "#58ff7b"
        : "#ffb454";
  }


  function updateNavigationButtons() {
    try {
      backButton.disabled =
        !browserView.canGoBack();

      forwardButton.disabled =
        !browserView.canGoForward();

    } catch {
      backButton.disabled =
        true;

      forwardButton.disabled =
        true;
    }
  }


  /*
   * =========================================================
   * HEADER HELPERS
   * =========================================================
   */

  function headersToText(
    headers = {}
  ) {
    const entries =
      Object.entries(headers);

    if (!entries.length) {
      return "(none)";
    }

    return entries
      .map(([name, value]) => {
        const output =
          Array.isArray(value)
            ? value.join(", ")
            : value;

        return `${name}: ${output}`;
      })
      .join("\n");
  }


  function getHeaderValue(
    headers = {},
    targetName = ""
  ) {
    const normalizedTarget =
      String(targetName)
        .toLowerCase();

    for (
      const [name, value]
      of Object.entries(headers)
    ) {
      if (
        String(name)
          .toLowerCase() ===
        normalizedTarget
      ) {
        return Array.isArray(value)
          ? value.join(", ")
          : String(value || "");
      }
    }

    return "";
  }


  /*
   * =========================================================
   * BODY DISPLAY FORMATTER
   * =========================================================
   */

  function formatRequestBodyForDisplay(
    body,
    headers = {}
  ) {
    const rawBody =
      String(body || "");

    if (!rawBody) {
      return "";
    }

    const contentType =
      getHeaderValue(
        headers,
        "content-type"
      )
        .toLowerCase();


    /*
     * FORM URL ENCODED
     *
     * Example:
     *
     * email=sumit%40gmail.com
     *
     * Display:
     *
     * email=sumit@gmail.com
     */

    if (
      contentType.includes(
        "application/x-www-form-urlencoded"
      )
    ) {
      try {
        const params =
          new URLSearchParams(
            rawBody
          );

        const readableValues =
          [];

        for (
          const [key, value]
          of params.entries()
        ) {
          readableValues.push(
            `${key}=${value}`
          );
        }

        return readableValues
          .join("&");

      } catch {
        try {
          return decodeURIComponent(
            rawBody.replace(
              /\+/g,
              " "
            )
          );

        } catch {
          return rawBody;
        }
      }
    }


    /*
     * JSON
     */

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      try {
        return JSON.stringify(
          JSON.parse(rawBody),
          null,
          2
        );

      } catch {
        return rawBody;
      }
    }


    /*
     * TEXT
     */

    if (
      contentType.includes(
        "text/plain"
      )
    ) {
      return rawBody;
    }


    /*
     * MULTIPART
     *
     * Keep raw.
     *
     * Boundary structure must not
     * be changed.
     */

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      return rawBody;
    }


    /*
     * UNKNOWN BODY
     */

    return rawBody;
  }


  /*
   * =========================================================
   * NETWORK REQUEST DETAILS
   * =========================================================
   */

  function renderRequestDetails(
    request
  ) {
    if (!request) {
      detailsContent.textContent =
        "Select a request";

      return;
    }

    const readableBody =
      formatRequestBodyForDisplay(
        request.requestBody,
        request.requestHeaders
      );

    detailsContent.textContent =
`GENERAL
ID: ${request.id}
URL: ${request.url}
METHOD: ${request.method}
STATUS: ${request.statusCode ?? "PENDING"}
TYPE: ${request.resourceType}
CACHE: ${request.fromCache ? "YES" : "NO"}
ERROR: ${request.error || "NONE"}

REQUEST HEADERS
${headersToText(request.requestHeaders)}

REQUEST BODY
${readableBody || "(empty)"}

RESPONSE HEADERS
${headersToText(request.responseHeaders)}`;
  }


  /*
   * =========================================================
   * NETWORK ROW
   * =========================================================
   */

  function renderRequestRow(
    request
  ) {
    const rowId =
      `request-${request.id}`;

    let row =
      document.getElementById(
        rowId
      );

    if (!row) {
      row =
        document.createElement(
          "div"
        );

      row.id =
        rowId;

      row.className =
        "request-row";


      row.addEventListener(
        "click",
        () => {
          selectedRequestId =
            request.id;

          document
            .querySelectorAll(
              ".request-row"
            )
            .forEach(
              (item) => {
                item.classList.remove(
                  "selected"
                );
              }
            );

          row.classList.add(
            "selected"
          );

          renderRequestDetails(
            requests.get(
              request.id
            )
          );
        }
      );


      /*
       * Latest request on TOP
       */

      requestRows.prepend(
        row
      );
    }


    row.innerHTML =
      "";


    const method =
      document.createElement(
        "span"
      );

    method.className =
      "column-method";

    method.textContent =
      request.method || "GET";


    const status =
      document.createElement(
        "span"
      );

    status.className =
      "column-status";

    status.textContent =
      request.error
        ? "ERR"
        : request.statusCode ?? "...";


    const type =
      document.createElement(
        "span"
      );

    type.className =
      "column-type";

    type.textContent =
      request.resourceType ||
      "other";


    const url =
      document.createElement(
        "span"
      );

    url.className =
      "column-url";

    url.textContent =
      request.url || "";

    url.title =
      request.url || "";


    row.append(
      method,
      status,
      type,
      url
    );


    if (
      selectedRequestId ===
      request.id
    ) {
      row.classList.add(
        "selected"
      );

      renderRequestDetails(
        request
      );
    }
  }


  /*
   * =========================================================
   * NETWORK EVENT
   * =========================================================
   */

  function processNetworkEvent(
    payload
  ) {
    if (
      !payload ||
      !payload.request
    ) {
      return;
    }

    const incoming =
      payload.request;

    const previous =
      requests.get(
        incoming.id
      ) || {};


    const request = {
      ...previous,
      ...incoming,

      requestHeaders: {
        ...(
          previous.requestHeaders ||
          {}
        ),

        ...(
          incoming.requestHeaders ||
          {}
        )
      },

      responseHeaders: {
        ...(
          previous.responseHeaders ||
          {}
        ),

        ...(
          incoming.responseHeaders ||
          {}
        )
      },

      requestBody:
        incoming.requestBody !==
        undefined
          ? String(
              incoming.requestBody
            )
          : String(
              previous.requestBody ||
              ""
            )
    };


    requests.set(
      request.id,
      request
    );


    renderRequestRow(
      request
    );


    requestCount.textContent =
      `${requests.size} REQUESTS`;


    networkBadge.textContent =
      requests.size > 999
        ? "999+"
        : String(
            requests.size
          );
  }


  /*
   * =========================================================
   * RAW INTERCEPT REQUEST
   * =========================================================
   */

  function rawInterceptRequest(
    request
  ) {
    if (!request) {
      return "";
    }


    let parsedURL;


    try {
      parsedURL =
        new URL(
          request.url
        );

    } catch {
      return (
        `${request.method || "GET"} ` +
        `${request.url || "/"}`
      );
    }


    const requestPath =
      `${parsedURL.pathname || "/"}` +
      `${parsedURL.search || ""}`;


    const headers = {
      ...(request.requestHeaders || {})
    };


    const hasHostHeader =
      Object.keys(headers)
        .some(
          (name) =>
            name.toLowerCase() ===
            "host"
        );


    const headerLines =
      [];


    if (!hasHostHeader) {
      headerLines.push(
        `Host: ${parsedURL.host}`
      );
    }


    for (
      const [name, value]
      of Object.entries(headers)
    ) {
      const output =
        Array.isArray(value)
          ? value.join(", ")
          : value;

      headerLines.push(
        `${name}: ${output}`
      );
    }


    let rawRequest =
`${request.method || "GET"} ${requestPath} HTTP/1.1
${headerLines.join("\n")}`;


    /*
     * READABLE BODY
     */

    const readableBody =
      formatRequestBodyForDisplay(
        request.requestBody,
        request.requestHeaders
      );


    if (readableBody) {
      rawRequest +=
        `\n\n${readableBody}`;
    }


    return rawRequest;
  }


  /*
   * =========================================================
   * INTERCEPTOR SELECTION
   * =========================================================
   */

  function getSelectedHeldRequest() {
    return interceptorQueue.find(
      (item) =>
        item.id ===
        selectedHeldRequestId
    );
  }


  function selectHeldRequest(
    id,
    forceEditorUpdate = true
  ) {
    selectedHeldRequestId =
      id;


    document
      .querySelectorAll(
        ".held-request-row"
      )
      .forEach(
        (row) => {
          row.classList.remove(
            "selected"
          );
        }
      );


    const row =
      document.getElementById(
        `held-${id}`
      );


    if (row) {
      row.classList.add(
        "selected"
      );
    }


    const request =
      getSelectedHeldRequest();


    if (
      request &&
      (
        forceEditorUpdate ||
        !editorDirty
      )
    ) {
      rawRequestEditor.value =
        rawInterceptRequest(
          request
        );

      editorDirty =
        false;
    }


    forwardRequestButton.disabled =
      !request;


    dropRequestButton.disabled =
      !request;
  }


  /*
   * =========================================================
   * INTERCEPTOR QUEUE
   * =========================================================
   */

  function renderInterceptorQueue() {
    heldRequestRows.innerHTML =
      "";


    interceptorQueue.forEach(
      (request) => {
        const row =
          document.createElement(
            "div"
          );


        row.id =
          `held-${request.id}`;


        row.className =
          "held-request-row";


        const method =
          document.createElement(
            "div"
          );


        method.className =
          "held-method";


        method.textContent =
          `${request.method || "GET"}  ` +
          `${request.resourceType || "other"}`;


        const url =
          document.createElement(
            "div"
          );


        url.className =
          "held-url";


        url.textContent =
          request.url || "";


        url.title =
          request.url || "";


        row.append(
          method,
          url
        );


        row.addEventListener(
          "click",
          () => {
            editorDirty =
              false;

            selectHeldRequest(
              request.id,
              true
            );
          }
        );


        heldRequestRows
          .appendChild(
            row
          );
      }
    );


    interceptorQueueCount.textContent =
      `${interceptorQueue.length} HELD`;


    if (interceptorEnabled) {
      interceptorBadge.textContent =
        interceptorQueue.length
          ? String(
              interceptorQueue.length
            )
          : "ON";

    } else {
      interceptorBadge.textContent =
        "OFF";
    }


    const selectedStillExists =
      interceptorQueue.some(
        (item) =>
          item.id ===
          selectedHeldRequestId
      );


    if (!selectedStillExists) {
      selectedHeldRequestId =
        interceptorQueue[0]?.id ??
        null;

      editorDirty =
        false;
    }


    if (
      selectedHeldRequestId !==
      null
    ) {
      selectHeldRequest(
        selectedHeldRequestId,
        !editorDirty
      );

    } else {
      rawRequestEditor.value =
        "";

      editorDirty =
        false;

      forwardRequestButton.disabled =
        true;

      dropRequestButton.disabled =
        true;
    }
  }


  /*
   * =========================================================
   * SCOPE STATE
   * =========================================================
   */

  function renderScopeState() {
    currentHostScopeButton
      .classList
      .toggle(
        "active",
        interceptorScopeMode ===
          "current-host"
      );


    allHostsScopeButton
      .classList
      .toggle(
        "active",
        interceptorScopeMode ===
          "all-hosts"
      );


    currentHostScopeButton.title =
      interceptorCurrentHost
        ? `Current target: ${interceptorCurrentHost}`
        : "No current host";
  }


  /*
   * =========================================================
   * INTERCEPTOR STATE
   * =========================================================
   */

  function renderInterceptorState() {
    interceptorSwitch.textContent =
      interceptorEnabled
        ? "ON"
        : "OFF";


    interceptorStateText.textContent =
      interceptorEnabled
        ? "ON"
        : "OFF";


    interceptorSwitch
      .classList
      .toggle(
        "on",
        interceptorEnabled
      );


    interceptorDot
      .classList
      .toggle(
        "on",
        interceptorEnabled
      );


    interceptorBadge
      .classList
      .toggle(
        "on",
        interceptorEnabled
      );


    interceptorStateText.className =
      interceptorEnabled
        ? "interceptor-on-text"
        : "interceptor-off-text";


    renderScopeState();

    renderInterceptorQueue();
  }


  /*
   * =========================================================
   * INTERCEPTOR EVENT
   * =========================================================
   */

  function processInterceptorEvent(
    payload
  ) {
    if (!payload) {
      return;
    }


    if (
      typeof payload.enabled ===
      "boolean"
    ) {
      interceptorEnabled =
        payload.enabled;
    }


    if (
      typeof payload.scopeMode ===
      "string"
    ) {
      interceptorScopeMode =
        payload.scopeMode;
    }


    if (
      typeof payload.currentHost ===
      "string"
    ) {
      interceptorCurrentHost =
        payload.currentHost;
    }


    if (
      Array.isArray(
        payload.queue
      )
    ) {
      interceptorQueue =
        payload.queue.map(
          (request) => ({
            ...request,

            requestHeaders: {
              ...(
                request.requestHeaders ||
                {}
              )
            },

            requestBody:
              String(
                request.requestBody ||
                ""
              )
          })
        );
    }


    renderInterceptorState();
  }


  /*
   * =========================================================
   * PANEL EVENTS
   * =========================================================
   */

  networkToggleButton
    .addEventListener(
      "click",
      toggleNetworkPanel
    );


  closeNetworkButton
    .addEventListener(
      "click",
      closeAllPanels
    );


  interceptorToggleButton
    .addEventListener(
      "click",
      toggleInterceptorPanel
    );


  closeInterceptorButton
    .addEventListener(
      "click",
      closeAllPanels
    );


  /*
   * =========================================================
   * EDITOR
   * =========================================================
   */

  rawRequestEditor
    .addEventListener(
      "input",
      () => {
        editorDirty =
          true;
      }
    );


  /*
   * =========================================================
   * INTERCEPT SWITCH
   * =========================================================
   */

  interceptorSwitch
    .addEventListener(
      "click",

      async () => {
        try {
          const result =
            await window
              .reconBrowser
              .setInterceptorEnabled(
                !interceptorEnabled
              );


          processInterceptorEvent(
            result
          );

        } catch (error) {
          statusText.textContent =
            `INTERCEPT ERROR: ${error.message}`;

          pageStatus.textContent =
            "ERROR";
        }
      }
    );


  /*
   * =========================================================
   * CURRENT HOST SCOPE
   * =========================================================
   */

  currentHostScopeButton
    .addEventListener(
      "click",

      async () => {
        try {
          const currentURL =
            browserView.getURL();


          if (currentURL) {
            const host =
              new URL(
                currentURL
              ).hostname;


            await window
              .reconBrowser
              .setInterceptorCurrentHost(
                host
              );
          }


          const result =
            await window
              .reconBrowser
              .setInterceptorScope(
                "current-host"
              );


          processInterceptorEvent(
            result
          );

        } catch (error) {
          statusText.textContent =
            `SCOPE ERROR: ${error.message}`;

          pageStatus.textContent =
            "ERROR";
        }
      }
    );


  /*
   * =========================================================
   * ALL HOST SCOPE
   * =========================================================
   */

  allHostsScopeButton
    .addEventListener(
      "click",

      async () => {
        try {
          const result =
            await window
              .reconBrowser
              .setInterceptorScope(
                "all-hosts"
              );


          processInterceptorEvent(
            result
          );

        } catch (error) {
          statusText.textContent =
            `SCOPE ERROR: ${error.message}`;

          pageStatus.textContent =
            "ERROR";
        }
      }
    );


  /*
   * =========================================================
   * FORWARD REQUEST
   * =========================================================
   */

  forwardRequestButton
    .addEventListener(
      "click",

      async () => {
        if (
          selectedHeldRequestId ===
          null
        ) {
          return;
        }


        try {
          const rawRequest =
            rawRequestEditor.value;


          const result =
            await window
              .reconBrowser
              .forwardInterceptedRequest(
                selectedHeldRequestId,
                rawRequest
              );


          if (!result.success) {
            statusText.textContent =
              result.error ||
              "FORWARD FAILED";

            pageStatus.textContent =
              "ERROR";

            return;
          }


          interceptorQueue =
            Array.isArray(
              result.queue
            )
              ? result.queue
              : [];


          selectedHeldRequestId =
            null;


          editorDirty =
            false;


          renderInterceptorQueue();


          statusText.textContent =
            result.replayed
              ? `EDITED LOCAL REQUEST SENT - HTTP ${result.statusCode}`
              : "REQUEST FORWARDED";


          pageStatus.textContent =
            "IDLE";

        } catch (error) {
          statusText.textContent =
            `FORWARD ERROR: ${error.message}`;

          pageStatus.textContent =
            "ERROR";
        }
      }
    );


  /*
   * =========================================================
   * DROP REQUEST
   * =========================================================
   */

  dropRequestButton
    .addEventListener(
      "click",

      async () => {
        if (
          selectedHeldRequestId ===
          null
        ) {
          return;
        }


        try {
          const result =
            await window
              .reconBrowser
              .dropInterceptedRequest(
                selectedHeldRequestId
              );


          interceptorQueue =
            Array.isArray(
              result.queue
            )
              ? result.queue
              : [];


          selectedHeldRequestId =
            null;


          editorDirty =
            false;


          renderInterceptorQueue();


          statusText.textContent =
            "REQUEST DROPPED";


          pageStatus.textContent =
            "IDLE";

        } catch (error) {
          statusText.textContent =
            `DROP ERROR: ${error.message}`;

          pageStatus.textContent =
            "ERROR";
        }
      }
    );


  /*
   * =========================================================
   * FORWARD ALL
   * =========================================================
   */

  forwardAllButton
    .addEventListener(
      "click",

      async () => {
        try {
          const result =
            await window
              .reconBrowser
              .forwardAllInterceptedRequests();


          interceptorQueue =
            Array.isArray(
              result.queue
            )
              ? result.queue
              : [];


          selectedHeldRequestId =
            null;


          editorDirty =
            false;


          renderInterceptorQueue();


          statusText.textContent =
            "ALL REQUESTS FORWARDED";


          pageStatus.textContent =
            "IDLE";

        } catch (error) {
          statusText.textContent =
            `FORWARD ALL ERROR: ${error.message}`;

          pageStatus.textContent =
            "ERROR";
        }
      }
    );


  /*
   * =========================================================
   * CLEAR NETWORK
   * =========================================================
   */

  clearNetworkButton
    .addEventListener(
      "click",

      async () => {
        await window
          .reconBrowser
          .clearNetworkRequests();


        requests.clear();


        selectedRequestId =
          null;


        requestRows.innerHTML =
          "";


        requestCount.textContent =
          "0 REQUESTS";


        networkBadge.textContent =
          "0";


        detailsContent.textContent =
          "Select a request";
      }
    );


  /*
   * =========================================================
   * NAVIGATION EVENTS
   * =========================================================
   */

  goButton.addEventListener(
    "click",
    navigate
  );


  addressBar.addEventListener(
    "keydown",

    (event) => {
      if (
        event.key === "Enter"
      ) {
        navigate();
      }
    }
  );


  backButton.addEventListener(
    "click",

    () => {
      if (
        browserView.canGoBack()
      ) {
        browserView.goBack();
      }
    }
  );


  forwardButton.addEventListener(
    "click",

    () => {
      if (
        browserView.canGoForward()
      ) {
        browserView.goForward();
      }
    }
  );


  reloadButton.addEventListener(
    "click",

    () => {
      browserView.reload();
    }
  );


  homeButton.addEventListener(
    "click",

    () => {
      browserView.loadURL(
        HOME_URL
      );
    }
  );


  devToolsButton.addEventListener(
    "click",

    () => {
      browserView.openDevTools();
    }
  );


  /*
   * =========================================================
   * WEBVIEW EVENTS
   * =========================================================
   */

  browserView.addEventListener(
    "did-start-loading",

    () => {
      statusText.textContent =
        "LOADING...";


      pageStatus.textContent =
        "BUSY";


      loadingBar.style.width =
        "35%";
    }
  );


  browserView.addEventListener(
    "did-stop-loading",

    () => {
      statusText.textContent =
        "READY";


      pageStatus.textContent =
        "IDLE";


      loadingBar.style.width =
        "100%";


      setTimeout(
        () => {
          loadingBar.style.width =
            "0";
        },
        300
      );


      updateNavigationButtons();
    }
  );


  browserView.addEventListener(
    "did-navigate",

    async (event) => {
      addressBar.value =
        event.url;


      updateSecurityIndicator(
        event.url
      );


      updateNavigationButtons();


      try {
        const host =
          new URL(
            event.url
          ).hostname;


        const result =
          await window
            .reconBrowser
            .setInterceptorCurrentHost(
              host
            );


        processInterceptorEvent(
          result
        );

      } catch {
        /*
         * Ignore invalid URL
         */
      }
    }
  );


  browserView.addEventListener(
    "did-navigate-in-page",

    (event) => {
      addressBar.value =
        event.url;


      updateSecurityIndicator(
        event.url
      );


      updateNavigationButtons();
    }
  );


  browserView.addEventListener(
    "did-fail-load",

    (event) => {
      if (
        event.errorCode === -3
      ) {
        return;
      }


      statusText.textContent =
        `LOAD ERROR: ${event.errorDescription}`;


      pageStatus.textContent =
        "ERROR";
    }
  );


  browserView.addEventListener(
    "page-title-updated",

    (event) => {
      document.title =
        `${event.title} - ReconBrowser`;
    }
  );


  browserView.addEventListener(
    "dom-ready",

    () => {
      const currentURL =
        browserView.getURL();


      if (currentURL) {
        addressBar.value =
          currentURL;


        updateSecurityIndicator(
          currentURL
        );
      }


      updateNavigationButtons();
    }
  );


  /*
   * =========================================================
   * IPC EVENTS
   * =========================================================
   */

  window.reconBrowser
    .onNetworkEvent(
      processNetworkEvent
    );


  window.reconBrowser
    .onInterceptorEvent(
      processInterceptorEvent
    );


  /*
   * =========================================================
   * INITIAL INTERCEPTOR STATE
   * =========================================================
   */

  window.reconBrowser
    .getInterceptorState()
    .then(
      (state) => {
        processInterceptorEvent(
          state
        );
      }
    )
    .catch(
      (error) => {
        statusText.textContent =
          `STATE ERROR: ${error.message}`;


        pageStatus.textContent =
          "ERROR";
      }
    );


  /*
   * =========================================================
   * INITIAL UI
   * =========================================================
   */

  closeAllPanels();
});
