import { describe, expect, it } from "vitest";
import { assertPublicUrl, authorized } from "../src/security";

describe("security", () => {
  it("accepts public HTTPS URLs", () => expect(assertPublicUrl("https://example.com/a").hostname).toBe("example.com"));
  it.each(["http://127.0.0.1","http://10.0.0.1","http://192.168.1.1","http://localhost","file:///etc/passwd"])("blocks %s", (url) => expect(() => assertPublicUrl(url)).toThrow());
  it("requires bearer token or query param", () => {
    expect(authorized(new Request("https://example.com", {headers:{Authorization:"Bearer secret"}}), "secret")).toBe(true);
    expect(authorized(new Request("https://example.com?token=secret"), "secret")).toBe(true);
    expect(authorized(new Request("https://example.com?key=secret"), "secret")).toBe(true);
    expect(authorized(new Request("https://example.com"), "secret")).toBe(false);
    expect(authorized(new Request("https://example.com?token=wrong"), "secret")).toBe(false);
    expect(authorized(new Request("https://example.com"), undefined)).toBe(true);
  });
});
