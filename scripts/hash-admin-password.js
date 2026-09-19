#!/usr/bin/env node
// Generates the bcrypt hash for ADMIN_PASSWORD_HASH. The plaintext password
// is never stored anywhere — only this hash goes in the env.
// Usage: npm run hash-password -- <password>
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
