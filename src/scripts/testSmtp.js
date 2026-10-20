import "dotenv/config";
import nodemailer from "nodemailer";

const to = process.argv[2]?.trim() || process.env.SMTP_USER?.trim();

function required(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
  return v;
}

if (!to) {
  console.error("Usage: npm run test:smtp -- recipient@example.com");
  console.error("       (defaults to SMTP_USER if omitted)");
  process.exit(1);
}

const host = required("SMTP_HOST");
const user = required("SMTP_USER");
const pass = required("SMTP_PASS");
const port = Number(process.env.SMTP_PORT) || 587;
const secure = process.env.SMTP_SECURE === "true" || port === 465;
const from =
  process.env.SMTP_FROM?.trim() || `"Twinklingz" <${user}>`;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

console.log(`Verifying SMTP (${host}:${port}) as ${user}…`);

try {
  await transporter.verify();
  console.log("SMTP verify OK — sending test message to", to);
} catch (err) {
  console.error("SMTP verify FAILED:", err.message);
  process.exit(1);
}

try {
  await transporter.sendMail({
    from,
    to,
    subject: "Twinklingz SMTP test",
    text: "If you received this, Gmail SMTP is configured correctly for order invoices.",
    html: "<p>If you received this, <strong>Gmail SMTP</strong> is configured correctly for order confirmations and PDF invoices.</p>",
  });
  console.log("Test email sent successfully.");
} catch (err) {
  console.error("Send FAILED:", err.message);
  process.exit(1);
}
