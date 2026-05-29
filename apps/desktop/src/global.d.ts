import type { HubApi } from "../electron/preload";

declare global {
  interface Window {
    hub: HubApi;
  }

  // Electron <webview> runtime methods (goBack/reload/etc.) aren't in lib.dom;
  // React already provides the JSX element + attributes. We only need the
  // method surface for the refs we hold.
  type WebviewEl = HTMLElement & {
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    loadURL: (url: string) => void;
    getURL: () => string;
    executeJavaScript: (code: string) => Promise<unknown>;
    getZoomLevel: () => number;
    setZoomLevel: (level: number) => void;
  };
}

export {};
