export interface LoginRequest {
  password?: string;
}

export function isValidPassword(
  inputPassword: unknown,
  actualPassword: string
): boolean {
  return inputPassword === actualPassword;
}