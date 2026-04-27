import type { RequestContext } from "../../modules/workout/application/types/request-context.js";

export type AppAuthState = {
  email: string;
  userId: string;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AppAuthState;
      context?: RequestContext;
    }
  }
}

export {};
