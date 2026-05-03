import { redactForObservability } from "@fitness/shared";
import { getCurrentRouteName } from "../navigation/navigation-bridge";

const isDevEnvironment = typeof __DEV__ !== "undefined" && __DEV__;

type InitResult = {
  enabled: boolean;
};

let didInit = false;
let enabled = false;
let sentryModule: typeof import("@sentry/react-native") | null = null;
let sentryImportPromise: Promise<typeof import("@sentry/react-native") | null> | null = null;

async function loadSentryModule() {
  if (sentryModule) {
    return sentryModule;
  }

  if (!sentryImportPromise) {
    sentryImportPromise = import("@sentry/react-native")
      .then((module) => {
        sentryModule = module;
        return module;
      })
      .catch(() => null);
  }

  return sentryImportPromise;
}

function computeEnabled() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const explicit = process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED;

  if (explicit === "true") {
    return Boolean(dsn);
  }

  if (explicit === "false") {
    return false;
  }

  return !isDevEnvironment && Boolean(dsn);
}

function safeTag(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function initMobileObservability(): InitResult {
  if (didInit) {
    return { enabled };
  }

  didInit = true;
  enabled = computeEnabled();
  if (!enabled) {
    return { enabled: false };
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT;
  const release = process.env.EXPO_PUBLIC_SENTRY_RELEASE;

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      enabled = false;
      return;
    }

    try {
      Sentry.init({
        dsn,
        enabled: true,
        environment: environment || undefined,
        release: release || undefined,
        tracesSampleRate: 0,
        beforeSend(event) {
          if (event.extra) {
            event.extra = redactForObservability(event.extra as any) as any;
          }

          if (event.request) {
            delete (event.request as any).cookies;
            delete (event.request as any).headers;
            delete (event.request as any).data;
          }

          if (event.user && typeof event.user === "object") {
            event.user = { id: (event.user as any).id } as any;
          }

          return event;
        }
      });
    } catch {
      // Best effort: observability must never crash app startup (especially on web bundles).
      enabled = false;
      return;
    }

    void import("expo-constants")
      .then((module) => {
        const Constants = (module as any).default ?? module;
        const appVersion =
          (Constants.expoConfig as any)?.version ??
          (Constants as any)?.manifest?.version ??
          (Constants as any)?.manifest2?.version;

        if (typeof appVersion === "string" && appVersion.length > 0) {
          Sentry.setTag("appVersion", appVersion);
        }
      })
      .catch(() => {
        // Optional: ignore app version failures (tests/Node runtime).
      });
  });

  return { enabled: true };
}

export function setObservabilityUser(user: { id: string } | null) {
  if (!enabled) {
    return;
  }

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    if (!user) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({ id: user.id });
  });
}

export function captureMobileException(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (!enabled) {
    return;
  }

  const route = getCurrentRouteName();

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.withScope((scope) => {
      const safeContext = context ? redactForObservability(context) : undefined;

      if (safeContext) {
        scope.setExtras(safeContext);
      }

      const routeTag = safeTag(route);
      if (routeTag) {
        scope.setTag("screen", routeTag);
      }

      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

export function captureApiFailure(input: {
  path: string;
  method: string;
  status?: number;
  code?: string;
}) {
  if (!enabled) {
    return;
  }

  const route = getCurrentRouteName();

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setTag("kind", "api_failure");
      scope.setTag("path", input.path);
      scope.setTag("method", input.method);
      if (typeof input.status === "number") {
        scope.setTag("statusCode", String(input.status));
      }
      if (input.code) {
        scope.setTag("code", input.code);
      }
      const routeTag = safeTag(route);
      if (routeTag) {
        scope.setTag("screen", routeTag);
      }

      Sentry.captureMessage("Mobile API call failed", "error");
    });
  });
}
