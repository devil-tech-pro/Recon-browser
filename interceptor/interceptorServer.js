function processInterceptorRequest({
  request,
  callback,
  interceptorStore,
  sendEvent
}) {

  /*
   * Main frame navigation becomes
   * current target.
   */

  if (
    request.resourceType ===
    "mainFrame"
  ) {
    try {
      const parsedURL =
        new URL(request.url);

      interceptorStore.setCurrentHost(
        parsedURL.hostname
      );

      console.log(
        `[INTERCEPT] AUTO TARGET ` +
        `${parsedURL.hostname}`
      );

    } catch (error) {

      console.error(
        "[INTERCEPT] Target detection error:",
        error.message
      );

    }
  }


  /*
   * Scope decision.
   */

  const shouldHold =
    interceptorStore.shouldIntercept(
      request.url
    );


  if (!shouldHold) {

    if (
      interceptorStore.isEnabled()
    ) {
      try {
        const requestHost =
          new URL(
            request.url
          ).hostname;

        console.log(
          `[INTERCEPT] PASS ` +
          `[${interceptorStore.getScopeMode()}] ` +
          `${requestHost}`
        );

      } catch {
        console.log(
          `[INTERCEPT] PASS ` +
          `${request.url}`
        );
      }
    }

    return false;
  }


  /*
   * Hold request.
   */

  const heldRequest =
    interceptorStore.hold(
      request,
      callback
    );


  console.log(
    `[INTERCEPT] HOLD ` +
    `[${interceptorStore.getScopeMode()}] ` +
    `${heldRequest.method} ` +
    `${heldRequest.url}`
  );


  sendEvent({
    type: "held",

    enabled:
      interceptorStore.isEnabled(),

    scopeMode:
      interceptorStore.getScopeMode(),

    currentHost:
      interceptorStore.getCurrentHost(),

    request:
      heldRequest,

    queue:
      interceptorStore.getQueue()
  });


  return true;
}


module.exports =
  processInterceptorRequest;
