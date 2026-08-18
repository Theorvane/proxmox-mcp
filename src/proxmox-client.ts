import type { ProxmoxConfig } from "./config.js";
import { ProxmoxOperationError } from "./errors.js";

type Fetch = typeof fetch;
export class ProxmoxClient {
  public constructor(
    private readonly config: ProxmoxConfig,
    private readonly request: Fetch = fetch,
  ) {}
  public get<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ) {
    return this.send<T>("GET", path, query);
  }
  public post<T>(path: string, body?: Record<string, unknown>) {
    return this.send<T>("POST", path, undefined, body);
  }
  public put<T>(path: string, body?: Record<string, unknown>) {
    return this.send<T>("PUT", path, undefined, body);
  }
  public delete<T>(path: string, body?: Record<string, unknown>) {
    return this.send<T>("DELETE", path, undefined, body);
  }
  private async send<T>(
    method: string,
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(
      `/api2/json/${path.replace(/^\/?api2\/json\/?|^\//, "")}`,
      `${this.config.baseUrl}/`,
    );
    for (const [key, value] of Object.entries(query ?? {}))
      if (value !== undefined) url.searchParams.set(key, String(value));
    try {
      const encoded = new URLSearchParams();
      for (const [key, value] of Object.entries(body ?? {}))
        if (value !== undefined) encoded.set(key, String(value));
      const response = await this.request(url, {
        method,
        headers: {
          Authorization: `PVEAPIToken=${this.config.tokenId}=${this.config.tokenSecret}`,
          ...(body
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : {}),
        },
        body: body ? encoded.toString() : undefined,
      });
      if (!response.ok)
        throw new ProxmoxOperationError(method.toLowerCase(), response.status);
      const envelope: unknown = await response.json();
      if (!envelope || typeof envelope !== "object" || !("data" in envelope))
        throw new ProxmoxOperationError(method.toLowerCase());
      return (envelope as { data: T }).data;
    } catch (error) {
      if (error instanceof ProxmoxOperationError) throw error;
      throw new ProxmoxOperationError(method.toLowerCase());
    }
  }
}
