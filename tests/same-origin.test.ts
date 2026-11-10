import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginRequest } from "../lib/auth/same-origin";

function req(origin: string | null, host: string, opts: {
  requestUrl?: string;
  protocol?: string;
  fetchSite?: string;
} = {}) {
  return new Request(opts.requestUrl ?? "http://localhost:3000/api/team-selection", {
    method: "POST",
    headers: {
      host,
      ...(origin ? { origin } : {}),
      ...(opts.protocol ? { "x-forwarded-proto": opts.protocol } : {}),
      ...(opts.fetchSite ? { "sec-fetch-site": opts.fetchSite } : {})
    }
  });
}

test("valid same-origin request survives Next localhost URL normalization", () => {
  assert.equal(isSameOriginRequest(req("http://127.0.0.1:3000", "127.0.0.1:3000")), true);
});

test("Vercel HTTPS host and forwarded protocol are matched", () => {
  assert.equal(isSameOriginRequest(req("https://app.example.com", "app.example.com", {
    requestUrl: "http://localhost:3000/api/team-selection",
    protocol: "https",
    fetchSite: "same-origin"
  })), true);
});

test("malicious origins and malformed headers are rejected", () => {
  assert.equal(isSameOriginRequest(req("https://attacker.invalid", "app.example.com", { protocol: "https" })), false);
  assert.equal(isSameOriginRequest(req("http://app.example.com", "app.example.com", { protocol: "https" })), false);
  assert.equal(isSameOriginRequest(req(null, "app.example.com")), false);
  assert.equal(isSameOriginRequest(req("null", "app.example.com")), false);
  assert.equal(isSameOriginRequest(req("https://app.example.com/path", "app.example.com", { protocol: "https" })), false);
  assert.equal(isSameOriginRequest(req("http://127.0.0.1:3000", "127.0.0.1:3000", { fetchSite: "cross-site" })), false);
});
