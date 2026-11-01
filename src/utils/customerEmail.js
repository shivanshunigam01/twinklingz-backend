const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "localhost",
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "fakeinbox.com",
  "trashmail.com",
]);

export function isAllowedCustomerEmail(raw) {
  const email = String(raw || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split("@")[1];
  if (!domain || BLOCKED_DOMAINS.has(domain)) return false;
  if (domain.endsWith(".test") || domain.startsWith("test.")) return false;
  if (email.includes("+test") || email.startsWith("test@")) return false;
  return true;
}
