import type { Request, Response, Router } from "express";

/** Exercise the real Express router without a listening socket. Body parsing and
 * authentication are controlled explicitly by each test, just as with a test app. */
export async function routerRequest(
  router: Router,
  method: string,
  target: string,
  body?: unknown,
) {
  const url = new URL(target, "http://test.local");
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = {
      method,
      url: url.pathname + url.search,
      originalUrl: target,
      path: url.pathname,
      baseUrl: "",
      headers: { "content-type": "application/json" },
      query: Object.fromEntries(url.searchParams),
      params: {},
      body: body ?? {},
      get(name: string) {
        return this.headers[name.toLowerCase() as "content-type"];
      },
    } as unknown as Request;
    const res = {
      statusCode: 200,
      headersSent: false,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(value: unknown) {
        this.headersSent = true;
        resolve({
          status: this.statusCode,
          body: JSON.parse(JSON.stringify(value)),
        });
        return this;
      },
      setHeader() {
        return this;
      },
      end(value?: string) {
        this.headersSent = true;
        resolve({
          status: this.statusCode,
          body: value ? JSON.parse(value) : null,
        });
      },
    } as unknown as Response;
    router(req, res, (error?: unknown) =>
      error
        ? reject(error)
        : resolve({ status: 404, body: { error: "not_found" } }),
    );
  });
}
