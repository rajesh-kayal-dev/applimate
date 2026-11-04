import app from "./app.js";
import { initializeDatabase } from "./database/index.js";

const PORT = Number(process.env.PORT) || 3001;

initializeDatabase();

app.listen(PORT, () => {
  console.log(`Applimate API running on port ${PORT}`);
});
