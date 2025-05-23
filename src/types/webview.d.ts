export {};

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    handleNativeMessage?: (messageString: string) => void;
    setNativeTokens?: (accessToken: string, refreshToken?: string) => void;
  }
} 