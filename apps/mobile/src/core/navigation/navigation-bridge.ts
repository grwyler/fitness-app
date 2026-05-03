type NavigationBridge = {
  isReady: () => boolean;
  getCurrentRouteName: () => string | null;
  resetToSignIn: () => void;
};

const defaultBridge: NavigationBridge = {
  isReady: () => false,
  getCurrentRouteName: () => null,
  resetToSignIn: () => {}
};

let navigationBridge: NavigationBridge = defaultBridge;

export function registerNavigationBridge(nextBridge: NavigationBridge) {
  navigationBridge = nextBridge;

  return () => {
    if (navigationBridge === nextBridge) {
      navigationBridge = defaultBridge;
    }
  };
}

export function getCurrentRouteName() {
  return navigationBridge.getCurrentRouteName();
}

export function resetToSignInIfNeeded() {
  if (!navigationBridge.isReady()) {
    return;
  }

  const currentRouteName = navigationBridge.getCurrentRouteName();
  if (currentRouteName === "SignIn") {
    return;
  }

  navigationBridge.resetToSignIn();
}

