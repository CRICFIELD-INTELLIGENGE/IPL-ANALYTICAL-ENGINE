import version from "../../../api-server/data/retention/model-version.json";
export const RETENTION_INDEX_VERSION = version.indexVersion;
export function requireCurrentRetention<T extends {indexVersion: string}>(response: T): T {
 if (response.indexVersion !== RETENTION_INDEX_VERSION) {
  throw new Error(`Retention service update required: received ${response.indexVersion || "unknown"}, expected ${RETENTION_INDEX_VERSION}. Restart the CricField API server, then refresh this page.`);
 }
 return response;
}
