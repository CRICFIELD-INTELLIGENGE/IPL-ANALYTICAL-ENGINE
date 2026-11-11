// Preloaded by the test scripts (`tsx --import ./…/test-readonly-env.mjs --test …`): every test — and every child
// process a test spawns, which inherits the environment — opens the IPL warehouse read-only, so a test can never
// modify the production sqlite.db (DAY-05-REPORT.md). A database COPY can still be written by passing its path
// explicitly to the tools that build copies.
process.env.CRICFIELD_DB_READONLY = "1";
