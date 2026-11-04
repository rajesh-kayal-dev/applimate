import db from "./connection.js";
import { initializeSchema } from "./schema.js";

export function initializeDatabase() {
    initializeSchema();
    return db;
}

export { db };
