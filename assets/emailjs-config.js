// ============================================================
// Email notifications when someone submits a new entry or an
// update request. Uses EmailJS (https://www.emailjs.com) — a
// free service that sends email straight from the browser, no
// backend needed. Free tier: 200 emails/month.
//
// Setup (see README.md for full steps):
// 1. Sign up at emailjs.com, connect your email (e.g. Gmail).
// 2. Create an Email Service → copy its Service ID below.
// 3. Create an Email Template → copy its Template ID below.
// 4. Account → General → copy your Public Key below.
// 5. Set adminEmail to where you want notifications sent.
// ============================================================
export const emailNotifyConfig = {
  enabled: true,             // set to false to turn notifications off
  publicKey: "gVE8kwyzgbYgE3opV",
  serviceId: "service_3kiymqb",
  templateId: "template_v8e2xor",
  adminEmail: "zohodev2014@gmail.com","p2164baqir@gmail.com"
};
