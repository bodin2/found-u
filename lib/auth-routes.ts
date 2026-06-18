export const AUTH_ROUTES = {
  hub: "/auth",
  login: "/auth/login",
  register: "/auth/register",
  forgotPin: "/auth/login/forgot-pin",
  resetPassword: "/auth/login/reset-password",
  changePassword: "/auth/change-password",
  setupPin: "/auth/setup-pin",
} as const;

export const AUTH_PUBLIC_PATHS = [
  AUTH_ROUTES.hub,
  AUTH_ROUTES.login,
  AUTH_ROUTES.register,
  AUTH_ROUTES.changePassword,
  AUTH_ROUTES.setupPin,
  AUTH_ROUTES.forgotPin,
  AUTH_ROUTES.resetPassword,
] as const;

export function isAuthPublicPath(pathname: string): boolean {
  return (
    (AUTH_PUBLIC_PATHS as readonly string[]).includes(pathname) ||
    pathname.startsWith("/auth/")
  );
}

export function resolvePostLoginPath(payload: {
  mustChangePassword?: boolean;
  mustSetupPin?: boolean;
}): string {
  if (payload.mustChangePassword) return AUTH_ROUTES.changePassword;
  if (payload.mustSetupPin) return AUTH_ROUTES.setupPin;
  return "/home";
}
