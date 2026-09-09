import argon2 from "argon2";

const MIN_PASSWORD_LENGTH = 12;

export function getPasswordIssues(password: string, context: string[] = []) {
  const issues: string[] = [];
  const lowerPassword = password.toLowerCase();

  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(password)) {
    issues.push("Add a lowercase letter.");
  }
  if (!/[A-Z]/.test(password)) {
    issues.push("Add an uppercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    issues.push("Add a number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push("Add a symbol.");
  }

  for (const item of context.filter(Boolean)) {
    if (item.length >= 3 && lowerPassword.includes(item.toLowerCase())) {
      issues.push("Avoid using your name, email, or username in the password.");
      break;
    }
  }

  return issues;
}

export function assertStrongPassword(password: string, context: string[] = []) {
  const issues = getPasswordIssues(password, context);

  if (issues.length > 0) {
    return issues;
  }

  return [];
}

export function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 3,
    parallelism: 1,
  });
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
