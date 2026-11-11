import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Explicit server-only file; environment supplied by the host takes precedence.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.basename(directory) === "lib" ? path.resolve(directory, "../../../..") : path.resolve(directory, "../../..");
const file = path.join(root, "env", "api.env");
if (fs.existsSync(file)) process.loadEnvFile(file);
