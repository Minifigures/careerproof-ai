import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "../lib/safe-redirect.ts";

const ORIGIN = "https://careerproof.example";

const rejected: Array<[string, string | null]> = [
  ["missing", null],
  ["empty", ""],
  ["userinfo trick from the review", "@evil.example"],
  ["protocol-relative", "//evil.example"],
  ["protocol-relative with path", "//evil.example/app"],
  ["slash backslash", "/\\evil.example"],
  ["backslash anywhere", "/app\\..\\evil"],
  ["leading backslashes", "\\\\evil.example"],
  ["absolute https", "https://evil.example"],
  ["absolute same origin", `${ORIGIN}/app`],
  ["javascript scheme", "javascript:alert(1)"],
  ["data scheme", "data:text/html,hi"],
  ["encoded slashes without leading slash", "%2F%2Fevil.example"],
  ["encoded userinfo trick", "%40evil.example"],
  ["tab between slashes", "/\t/evil.example"],
  ["newline between slashes", "/\n/evil.example"],
  ["carriage return", "/\r/evil.example"],
  ["null byte", "/app\u0000"],
  ["DEL", "/app\u007f"],
  ["leading space", " /app"],
  ["relative path", "app"],
];

for (const [name, next] of rejected) {
  test(`rejects ${name}`, () => {
    assert.equal(safeRedirectPath(next, ORIGIN), "/app");
  });
}

const accepted: Array<[string, string]> = [
  ["plain path", "/app"],
  ["path with query", "/app?x=1"],
  ["nested path with query and hash", "/history?page=2#top"],
  ["profile", "/profile"],
  ["percent-encoded slashes stay a path", "/%2F%2Fevil.example"],
  ["percent-encoded backslash stays a path", "/%5Cevil.example"],
  ["percent-encoded tab stays a path", "/%09/evil.example"],
  ["at sign after the slash", "/@evil.example"],
];

for (const [name, next] of accepted) {
  test(`accepts ${name}`, () => {
    assert.equal(safeRedirectPath(next, ORIGIN), next);
  });
}

test("every result stays on the same origin when appended to it", () => {
  for (const [, next] of [...rejected, ...accepted]) {
    const target = new URL(`${ORIGIN}${safeRedirectPath(next, ORIGIN)}`);
    assert.equal(target.origin, ORIGIN, `next=${JSON.stringify(next)}`);
  }
});

test("uses the caller's fallback", () => {
  assert.equal(safeRedirectPath("//evil.example", ORIGIN, "/profile"), "/profile");
});
