import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const shellQuote = require('shell-quote');
const proxyAddr = require('proxy-addr');

test('shell quoting refuses line terminators after a comment token', () => {
  for (const newline of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(
      () =>
        shellQuote.quote([
          'echo',
          'ok',
          { comment: 'comment' },
          `arg${newline}command`,
        ]),
      TypeError,
    );
  }
});

test('shell quoting preserves ordinary argument boundaries', () => {
  const args = ['echo', 'two words', "single'quote", '$(literal)', '#literal'];
  assert.deepEqual(shellQuote.parse(shellQuote.quote(args)), args);
});

test('short IPv4-mapped IPv6 prefixes never trust arbitrary clients', () => {
  const trust = proxyAddr.compile('::ffff:10.0.0.0/8');
  assert.equal(trust('192.0.2.1', 0), false);
  assert.equal(trust('203.0.113.7', 0), false);
});

test('canonical and correctly mapped proxy subnets retain expected trust', () => {
  for (const subnet of ['10.0.0.0/8', '::ffff:10.0.0.0/104']) {
    const trust = proxyAddr.compile(subnet);
    assert.equal(trust('10.1.2.3', 0), true);
    assert.equal(trust('192.0.2.1', 0), false);
  }
});
