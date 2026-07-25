import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loginSchema,
  registerSchema,
} from '../../src/validations/auth.validation.js';

test('register accepts a valid demo account', () => {
  const { error, value } = registerSchema.validate({
    name: 'Demo User',
    email: 'DEMO@SECUREINBOX.TEST',
    password: 'DemoPass1!',
  });

  assert.equal(error, undefined);
  assert.equal(value.email, 'demo@secureinbox.test');
});

test('register rejects a weak password', () => {
  const { error } = registerSchema.validate({
    name: 'Demo User',
    email: 'demo@secureinbox.test',
    password: 'password',
  });

  assert.ok(error);
});

test('login requires both email and password', () => {
  const { error } = loginSchema.validate({ email: 'demo@secureinbox.test' });
  assert.ok(error);
});
