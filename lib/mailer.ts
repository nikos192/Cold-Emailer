import nodemailer from 'nodemailer'

export function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.OUTLOOK_EMAIL,
      pass: process.env.OUTLOOK_APP_PASSWORD,
    },
    tls: {
      ciphers: 'SSLv3',
    },
  })
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  const transporter = createTransport()
  const fromName = process.env.OUTLOOK_FROM_NAME ?? 'Velory'
  const fromEmail = process.env.OUTLOOK_EMAIL ?? ''

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
  })
}
