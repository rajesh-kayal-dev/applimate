import { isValidPassword } from "./auth.validation.js";

export function isAuthenticationRequired(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function authenticateUser(inputPassword: unknown): {
  success: boolean;
  token?: string;
  error?: string;
} {
  const actualPassword = process.env.APP_PASSWORD;

  if (!actualPassword) {
    return { success: true, token: "" };
  }

  if (!isValidPassword(inputPassword, actualPassword)) {
    return { success: false, error: "invalid_password" };
  }

  return { success: true, token: actualPassword };
}