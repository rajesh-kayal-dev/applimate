import db, { checkDatabaseConnection } from "./connection.js";
import { initializeSchema } from "./schema.js";

export function initializeDatabase() {
  initializeSchema();
  return db;
}

export function isDatabaseConnected(): boolean {
  return checkDatabaseConnection();
}

export { db };