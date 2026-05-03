type AuthBridge = {
  getToken: () => Promise<string | null>;
  handleUnauthorized: () => Promise<void>;
};

const defaultBridge: AuthBridge = {
  getToken: async () => null,
  handleUnauthorized: async () => {}
};

let authBridge: AuthBridge = defaultBridge;
let lastKnownToken: string | null = null;
let lastKnownTokenSource: string | null = null;
let unauthorizedInFlight: Promise<void> | null = null;

export function registerAuthBridge(nextBridge: AuthBridge) {
  authBridge = nextBridge;

  return () => {
    if (authBridge === nextBridge) {
      authBridge = defaultBridge;
    }
  };
}

export async function getAuthToken() {
  const token = await authBridge.getToken();
  return token ?? lastKnownToken;
}

export async function handleUnauthorizedResponse() {
  if (!unauthorizedInFlight) {
    unauthorizedInFlight = (async () => {
      try {
        await authBridge.handleUnauthorized();
      } finally {
        unauthorizedInFlight = null;
      }
    })();
  }

  await unauthorizedInFlight;
}

export function setLastKnownAuthToken(token: string | null, source: string) {
  lastKnownToken = token;
  lastKnownTokenSource = token ? source : null;
}

export function getLastKnownAuthTokenSource() {
  return lastKnownTokenSource;
}

export function hasLastKnownAuthToken() {
  return Boolean(lastKnownToken);
}
