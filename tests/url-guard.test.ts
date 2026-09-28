import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isBlockedHostname,
  isBlockedIp,
  isIpLiteral,
  isSafeUrl,
} from "../lib/url-guard.ts";

const blockedIps = [
  // IPv4 loopback, unspecified, private, link-local, CGNAT
  "127.0.0.1",
  "127.255.255.254",
  "0.0.0.0",
  "0.1.2.3",
  "10.0.0.1",
  "10.255.255.255",
  "172.16.0.1",
  "172.31.255.255",
  "192.168.1.1",
  "169.254.0.1",
  "100.64.0.1",
  "100.127.255.255",
  // cloud metadata
  "169.254.169.254",
  "169.254.170.2",
  "100.100.100.200",
  "fd00:ec2::254",
  // IPv6 loopback, unspecified, link-local, unique-local
  "::1",
  "::",
  "0:0:0:0:0:0:0:1",
  "fe80::1",
  "fe80::1%eth0",
  "febf::1",
  "fc00::1",
  "fd12:3456:789a::1",
  // IPv4-mapped and IPv4-compatible IPv6, dotted and hex forms
  "::ffff:127.0.0.1",
  "::ffff:7f00:1",
  "::ffff:10.0.0.1",
  "::ffff:169.254.169.254",
  "::ffff:8.8.8.8",
  "0:0:0:0:0:ffff:c0a8:101",
  "::127.0.0.1",
  // NAT64 to a private IPv4
  "64:ff9b::a00:1",
  "64:ff9b::10.0.0.1",
  // bracketed, as URL.hostname returns IPv6
  "[::1]",
  // not an IP at all: fail closed
  "not-an-ip",
  "",
];

for (const ip of blockedIps) {
  test(`blocks address ${JSON.stringify(ip)}`, () => {
    assert.equal(isBlockedIp(ip), true);
  });
}

const publicIps = [
  "8.8.8.8",
  "1.1.1.1",
  "93.184.216.34",
  "172.15.255.255",
  "172.32.0.1",
  "100.63.255.255",
  "100.128.0.1",
  "169.253.1.1",
  "192.169.0.1",
  "2606:4700:4700::1111",
  "2001:4860:4860::8888",
  "2a00::1",
  "64:ff9b::808:808",
];

for (const ip of publicIps) {
  test(`allows public address ${ip}`, () => {
    assert.equal(isBlockedIp(ip), false);
  });
}

test("recognizes IP literals and not hostnames", () => {
  assert.equal(isIpLiteral("127.0.0.1"), true);
  assert.equal(isIpLiteral("[::1]"), true);
  assert.equal(isIpLiteral("::ffff:127.0.0.1"), true);
  assert.equal(isIpLiteral("example.com"), false);
  assert.equal(isIpLiteral("1.2.3"), false);
  assert.equal(isIpLiteral("1.2.3.256"), false);
  assert.equal(isIpLiteral("1::2::3"), false);
});

const blockedHosts = [
  "localhost",
  "LOCALHOST",
  "localhost.",
  "app.localhost",
  "printer.local",
  "db.internal",
  "metadata.google.internal",
  "metadata",
  "0.0.0.0",
  "[::1]",
  "[::ffff:7f00:1]",
];

for (const host of blockedHosts) {
  test(`blocks hostname ${host}`, () => {
    assert.equal(isBlockedHostname(host), true);
  });
}

for (const host of ["example.com", "jobs.lever.co", "boards.greenhouse.io", "8.8.8.8"]) {
  test(`allows hostname ${host}`, () => {
    assert.equal(isBlockedHostname(host), false);
  });
}

const unsafeUrls = [
  "http://localhost:3000/",
  "http://127.0.0.1/",
  "http://2130706433/", // decimal 127.0.0.1, normalized by the URL parser
  "http://0x7f.1/", // hex shorthand for 127.0.0.1
  "http://017700000001/", // octal 127.0.0.1
  "http://[::1]/",
  "http://[::ffff:127.0.0.1]/",
  "http://[fe80::1]/",
  "http://[fd00:ec2::254]/latest/meta-data/",
  "http://169.254.169.254/latest/meta-data/",
  "http://100.100.100.200/",
  "http://localhost./",
  "https://intranet.internal/",
  "ftp://example.com/",
  "file:///etc/passwd",
  "javascript:alert(1)",
  "not a url",
];

for (const url of unsafeUrls) {
  test(`rejects URL ${url}`, () => {
    assert.equal(isSafeUrl(url), false);
  });
}

for (const url of [
  "https://example.com/jobs/123",
  "https://jobs.lever.co/acme/abc",
  "http://8.8.8.8/",
  "https://[2606:4700:4700::1111]/",
]) {
  test(`accepts URL ${url}`, () => {
    assert.equal(isSafeUrl(url), true);
  });
}
