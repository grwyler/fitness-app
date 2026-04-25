import type { Request } from "express";
import type { RequestContext } from "../../modules/workout/application/types/request-context.js";

export type ClerkUserLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{
    id: string;
    emailAddress: string;
  }>;
};

export type ClerkClientLike = {
  users: {
    getUser: (userId: string) => Promise<ClerkUserLike>;
  };
};

export type ClerkAuthState = {
  userId: string | null;
  isAuthenticated?: boolean;
};

export type ClerkAuthGetter = (
  request: Request,
  options?: any
) => ClerkAuthState;

declare global {
  namespace Express {
    interface Request {
      clerkUserId?: string;
      context?: RequestContext;
    }
  }
}

export {};
