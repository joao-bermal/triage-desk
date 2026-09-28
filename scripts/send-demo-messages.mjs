// Posts sample customer messages to the n8n inbound webhook, like an email parser would.
//
//   INBOUND_WEBHOOK_SECRET=... node scripts/send-demo-messages.mjs [n8n base url]
//
// Default URL: the local n8n from docker-compose.yml.

const base = process.argv[2] ?? 'http://localhost:5678';
const secret = process.env.INBOUND_WEBHOOK_SECRET;
if (!secret) {
  console.error('Set INBOUND_WEBHOOK_SECRET (the same value as in n8n/.env).');
  process.exit(1);
}

const messages = [
  {
    brand: 'miau-atelier',
    from_email: 'olivia.park@example.com',
    from_name: 'Olivia Park',
    subject: 'Cat tower height',
    body: 'Hi! How tall is the natural modern cat tower? I have a 7 ft ceiling and a very jumpy Bengal.',
  },
  {
    brand: 'miau-atelier',
    from_email: 'emma.carter@example.com',
    from_name: 'Emma Carter',
    subject: 'Following up on MA-1042',
    body: 'Hello again, still no movement on the tracking for MA-1042. I need it by Saturday. What are my options?',
  },
  {
    brand: 'miau-atelier',
    from_email: 'daniel.ortiz@example.com',
    from_name: 'Daniel Ortiz',
    subject: 'Quiero devolver el comedero',
    body: 'Hola, compré el comedero inteligente hace una semana y no se conecta al wifi. ¿Puedo devolverlo?',
  },
];

for (const m of messages) {
  const res = await fetch(`${base}/webhook/support/inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-inbound-secret': secret },
    body: JSON.stringify({ ...m, message_id: `demo-${m.from_email}-${Date.now()}` }),
  });
  console.log(res.status, m.subject, await res.text());
}
