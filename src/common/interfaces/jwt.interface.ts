export interface JwtPayload {
  sub: string; // JWT standard: subject (userId)
  userId: string;
  email: string;
  name: string;
  tokenVersion: number;
}

// Normalized Google user data passed from OAuth strategy to auth service
export interface GoogleUserData {
  google_id: string;
  email: string;
  name: string;
  picture?: string | null;
}

// Raw Google OAuth profile from Passport
export interface PassportGoogleProfile {
  id: string;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

// Authenticated user from JWT validation or @CurrentUser() decorator
export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  tokenVersion?: number;
}
