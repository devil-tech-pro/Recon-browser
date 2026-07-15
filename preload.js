const {
  contextBridge,
  ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
  "reconBrowser",
  {
    getVersion: () => {
      return "1.0.0";
    },


    getPlatform: () => {
      return process.platform;
    },


    clearNetworkRequests: () => {
      return ipcRenderer.invoke(
        "network:clear"
      );
    },


    onNetworkEvent: (callback) => {
      if (
        typeof callback !== "function"
      ) {
        return;
      }

      ipcRenderer.on(
        "network:event",

        (_event, payload) => {
          callback(payload);
        }
      );
    },


    getInterceptorState: () => {
      return ipcRenderer.invoke(
        "interceptor:get-state"
      );
    },


    setInterceptorEnabled: (
      enabled
    ) => {
      return ipcRenderer.invoke(
        "interceptor:set-enabled",
        enabled
      );
    },


    setInterceptorScope: (
      mode
    ) => {
      return ipcRenderer.invoke(
        "interceptor:set-scope",
        mode
      );
    },


    setInterceptorCurrentHost: (
      host
    ) => {
      return ipcRenderer.invoke(
        "interceptor:set-current-host",
        host
      );
    },


    forwardInterceptedRequest: (
      requestId,
      rawRequest
    ) => {
      return ipcRenderer.invoke(
        "interceptor:forward",
        requestId,
        rawRequest
      );
    },


    dropInterceptedRequest: (
      requestId
    ) => {
      return ipcRenderer.invoke(
        "interceptor:drop",
        requestId
      );
    },


    forwardAllInterceptedRequests:
      () => {
        return ipcRenderer.invoke(
          "interceptor:forward-all"
        );
      },


    onInterceptorEvent: (
      callback
    ) => {
      if (
        typeof callback !== "function"
      ) {
        return;
      }

      ipcRenderer.on(
        "interceptor:event",

        (_event, payload) => {
          callback(payload);
        }
      );
    }
  }
);
