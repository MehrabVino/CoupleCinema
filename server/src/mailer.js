export async function sendEmail({ to, subject, text }) {
  if (!to) return false;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "no-reply@example.local";

  if (!host || !user || !pass) {
    // Dev fallback when SMTP is not configured.
    // eslint-disable-next-line no-console
    console.log(`[MAIL-FALLBACK] to=${to} subject="${subject}" text="${text}"`);
    return true;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    await transporter.sendMail({ from, to, subject, text });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Email send failed:", err?.message || err);
    return false;
  }
}

