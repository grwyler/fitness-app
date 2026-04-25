type AuthBridge = {
  getToken: () => Promise<string | null>;
  handleUnauthorized: () => Promise<void>;
};

const defaultBridge: AuthBridge = {
  getToken: async () => null,
  handleUnauthorized: async () => {}
};

let authBridge: AuthBridge = defaultBridge;

export function registerAuthBridge(nextBridge: AuthBridge) {
  authBridge = nextBridge;

  return () => {
    if (authBridge === nextBridge) {
      authBridge = defaultBridge;
    }
  };
}

export async function getAuthToken() {
  return authBridge.getToken();
}

export async function handleUnauthorizedResponse() {
  await authBridge.handleUnauthorized();
}
