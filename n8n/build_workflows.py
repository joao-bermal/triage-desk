"""Generate the n8n workflow JSON files in n8n/workflows/.

The workflows are code-reviewed here and imported into n8n with `n8n import:workflow`
(see n8n/README.md). Keeping them generated keeps the Supabase headers, retries and the
error workflow wiring identical everywhere.

    python n8n/build_workflows.py
"""

import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "workflows"
ERROR_WORKFLOW_ID = "tdErrorHandler01"

SUPABASE_HEADERS = [
    {"name": "apikey", "value": "={{ $env.SUPABASE_SERVICE_ROLE_KEY }}"},
    {"name": "Authorization", "value": "=Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}"},
    {"name": "Content-Type", "value": "application/json"},
]


def nid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"triage-desk/{name}"))


def node(name, type_, version, params, pos, **extra):
    n = {"parameters": params, "id": nid(name), "name": name, "type": type_, "typeVersion": version, "position": pos}
    n.update(extra)
    return n


def webhook(name, path, pos, response_mode="responseNode", raw_body=False):
    opts = {"rawBody": True} if raw_body else {}
    return node(name, "n8n-nodes-base.webhook", 2, {"httpMethod": "POST", "path": path, "responseMode": response_mode, "options": opts}, pos, webhookId=nid(name + "-hook"))


def code(name, js, pos):
    return node(name, "n8n-nodes-base.code", 2, {"jsCode": js}, pos)


def http(name, method, url, pos, body=None, headers=None, retry=True, timeout=30000, response_format=None):
    options = {"timeout": timeout}
    if response_format:
        options["response"] = {"response": {"responseFormat": response_format}}
    params = {
        "method": method,
        "url": url,
        "sendHeaders": True,
        "headerParameters": {"parameters": headers if headers is not None else SUPABASE_HEADERS},
        "options": options,
    }
    if body is not None:
        params.update({"sendBody": True, "specifyBody": "json", "jsonBody": body})
    extra = {"retryOnFail": True, "maxTries": 3, "waitBetweenTries": 5000} if retry else {}
    return node(name, "n8n-nodes-base.httpRequest", 4.2, params, pos, **extra)


def if_true(name, expression, pos):
    return node(name, "n8n-nodes-base.if", 2.2, {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "conditions": [{"id": nid(name + "-cond"), "leftValue": expression, "rightValue": "", "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
            "combinator": "and",
        },
        "options": {},
    }, pos)


def respond(name, code_, body, pos):
    return node(name, "n8n-nodes-base.respondToWebhook", 1.1, {"respondWith": "json", "responseBody": body, "options": {"responseCode": code_}}, pos)


def link(*pairs):
    """pairs: (from, to) or (from, to, output_index)."""
    c = {}
    for p in pairs:
        src, dst, out = (p[0], p[1], p[2] if len(p) > 2 else 0)
        outs = c.setdefault(src, {"main": []})["main"]
        while len(outs) <= out:
            outs.append([])
        outs[out].append({"node": dst, "type": "main", "index": 0})
    return c


def workflow(wid, name, nodes, connections, error_workflow=True):
    settings = {"executionOrder": "v1", "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"}
    if error_workflow:
        settings["errorWorkflow"] = ERROR_WORKFLOW_ID
    return {"id": wid, "name": name, "active": False, "nodes": nodes, "connections": connections, "settings": settings, "pinData": {}, "meta": {"templateCredsSetupCompleted": True}}


# ---------------------------------------------------------------------------
# 1. Inbound message: webhook -> validate -> store (idempotent) -> 202 -> triage agent
# ---------------------------------------------------------------------------
VALIDATE_INBOUND = r"""
// Accepts a normalized message from an email parser, a contact form or the demo script.
// Rejects callers without the shared secret and messages missing the basics.
const req = $input.first().json;
const secret = req.headers['x-inbound-secret'] ?? '';
const b = req.body ?? {};
const errors = [];
if (!$env.INBOUND_WEBHOOK_SECRET || secret !== $env.INBOUND_WEBHOOK_SECRET) errors.push('bad secret');
for (const field of ['brand', 'from_email', 'body']) if (!b[field]) errors.push(`missing ${field}`);
const email = String(b.from_email ?? '').trim().toLowerCase();
if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('invalid from_email');

return [{ json: {
  ok: errors.length === 0,
  errors,
  unauthorized: errors.includes('bad secret'),
  p_brand_slug: String(b.brand ?? '').trim(),
  p_channel: b.channel ?? 'email',
  // Idempotency key: the email Message-ID when there is one, otherwise a hash of sender + subject + body.
  p_external_ref: b.message_id ?? `${email}:${String(b.subject ?? '').slice(0, 80)}:${String(b.body ?? '').length}`,
  p_customer_email: email,
  p_customer_name: b.from_name ?? null,
  p_subject: String(b.subject ?? '').slice(0, 300),
  p_body: String(b.body ?? '').slice(0, 20000),
} }];
""".strip()

inbound_nodes = [
    webhook("Inbound message", "support/inbound", [0, 300]),
    code("Validate and normalize", VALIDATE_INBOUND, [220, 300]),
    if_true("Valid?", "={{ $json.ok }}", [440, 300]),
    if_true("Bad secret?", "={{ $json.unauthorized }}", [660, 460]),
    respond("Unauthorized", 401, "={{ { error: 'unauthorized' } }}", [880, 400]),
    respond("Reject", 400, "={{ { error: 'invalid message', details: $json.errors } }}", [880, 540]),
    http("Store ticket", "POST", "={{ $env.SUPABASE_URL }}/rest/v1/rpc/ingest_ticket", [660, 220],
         body="={{ JSON.stringify({ p_brand_slug: $json.p_brand_slug, p_channel: $json.p_channel, p_external_ref: $json.p_external_ref, p_customer_email: $json.p_customer_email, p_customer_name: $json.p_customer_name, p_subject: $json.p_subject, p_body: $json.p_body }) }}"),
    respond("Accepted", 202, "={{ { ticket_id: $json.ticket_id, duplicate: !$json.created } }}", [880, 220]),
    if_true("New ticket?", "={{ $('Store ticket').item.json.created }}", [1100, 220]),
    http("Run triage agent", "POST", "={{ $env.SUPABASE_URL }}/functions/v1/triage", [1320, 140],
         body="={{ JSON.stringify({ ticket_id: $('Store ticket').item.json.ticket_id }) }}",
         headers=[{"name": "x-triage-secret", "value": "={{ $env.TRIAGE_WEBHOOK_SECRET }}"}, {"name": "Content-Type", "value": "application/json"}],
         timeout=150000),
]
inbound = workflow("tdInboundMsg0001", "Triage Desk · 1 Inbound message", inbound_nodes, link(
    ("Inbound message", "Validate and normalize"),
    ("Validate and normalize", "Valid?"),
    ("Valid?", "Store ticket", 0),
    ("Valid?", "Bad secret?", 1),
    ("Bad secret?", "Unauthorized", 0),
    ("Bad secret?", "Reject", 1),
    ("Store ticket", "Accepted"),
    ("Accepted", "New ticket?"),
    ("New ticket?", "Run triage agent", 0),
))

# ---------------------------------------------------------------------------
# 2. Approved reply: database webhook -> load ticket + brand -> send email -> mark sent
# ---------------------------------------------------------------------------
CHECK_APPROVED = r"""
const req = $input.first().json;
if (!$env.N8N_WEBHOOK_SECRET || req.headers['x-webhook-secret'] !== $env.N8N_WEBHOOK_SECRET) {
  throw new Error('approved-reply webhook called without the shared secret');
}
return [{ json: { ticket_id: req.body.ticket_id } }];
""".strip()

BUILD_EMAIL = r"""
const [ticket] = $('Load ticket').all().map((i) => i.json);
if (!ticket || ticket.status !== 'approved') {
  // Already sent or changed since the webhook fired: nothing to do.
  return [];
}
const brand = ticket.brands;
return [{ json: {
  ticket_id: ticket.id,
  brand_id: ticket.brand_id,
  to: ticket.customer_email,
  from: `${brand.name} <${brand.support_email}>`,
  subject: ticket.subject?.toLowerCase().startsWith('re:') ? ticket.subject : `Re: ${ticket.subject || 'your message'}`,
  text: ticket.final_reply,
} }];
""".strip()

approved_nodes = [
    webhook("Reply approved", "support/approved", [0, 300], response_mode="onReceived"),
    code("Check secret", CHECK_APPROVED, [220, 300]),
    http("Load ticket", "GET", "={{ $env.SUPABASE_URL }}/rest/v1/tickets?id=eq.{{ $json.ticket_id }}&select=id,brand_id,status,subject,customer_email,final_reply,brands(name,support_email)", [440, 300]),
    code("Build email", BUILD_EMAIL, [660, 300]),
    node("Send email", "n8n-nodes-base.emailSend", 2.1, {
        "fromEmail": "={{ $json.from }}",
        "toEmail": "={{ $json.to }}",
        "subject": "={{ $json.subject }}",
        "emailFormat": "text",
        "text": "={{ $json.text }}",
        "options": {"appendAttribution": False},
    }, [880, 300], credentials={"smtp": {"id": "tdSmtpCredential", "name": "Support SMTP"}}, retryOnFail=True, maxTries=3, waitBetweenTries=10000),
    http("Mark sent", "PATCH", "={{ $env.SUPABASE_URL }}/rest/v1/tickets?id=eq.{{ $('Build email').item.json.ticket_id }}&status=eq.approved", [1100, 300],
         body="={{ JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }) }}"),
    http("Log event", "POST", "={{ $env.SUPABASE_URL }}/rest/v1/ticket_events", [1320, 300],
         body="={{ JSON.stringify({ ticket_id: $('Build email').item.json.ticket_id, brand_id: $('Build email').item.json.brand_id, actor: 'n8n', type: 'sent', payload: { to: $('Build email').item.json.to } }) }}"),
]
approved = workflow("tdApprovedRep01", "Triage Desk · 2 Send approved reply", approved_nodes, link(
    ("Reply approved", "Check secret"),
    ("Check secret", "Load ticket"),
    ("Load ticket", "Build email"),
    ("Build email", "Send email"),
    ("Send email", "Mark sent"),
    ("Mark sent", "Log event"),
))

# ---------------------------------------------------------------------------
# 3. Shopify order sync: orders/create + orders/updated webhooks, HMAC verified
# ---------------------------------------------------------------------------
VERIFY_SHOPIFY = r"""
// Shopify signs the raw body with the app's webhook secret (x-shopify-hmac-sha256, base64).
// Needs NODE_FUNCTION_ALLOW_BUILTIN=crypto on the n8n instance.
const crypto = require('crypto');
const item = $input.first();
const raw = await this.helpers.getBinaryDataBuffer(0, 'data');
const expected = crypto.createHmac('sha256', $env.SHOPIFY_WEBHOOK_SECRET).update(raw).digest('base64');
const received = String(item.json.headers['x-shopify-hmac-sha256'] ?? '');
const a = Buffer.from(expected);
const b = Buffer.from(received);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return [{ json: { valid: false } }];

const o = JSON.parse(raw.toString('utf8'));
const fulfillment = (o.fulfillments ?? [])[0];
let status = 'unfulfilled';
if (o.cancelled_at) status = 'cancelled';
else if (o.financial_status === 'refunded') status = 'refunded';
else if (o.fulfillment_status === 'fulfilled') status = fulfillment?.shipment_status === 'delivered' ? 'delivered' : 'in_transit';

return [{ json: {
  valid: true,
  p_shop_domain: item.json.headers['x-shopify-shop-domain'],
  p_order: {
    order_number: String(o.name ?? o.order_number).replace(/^#/, ''),
    customer_email: o.email ?? o.customer?.email ?? '',
    status,
    items: (o.line_items ?? []).map((l) => ({ title: l.title, qty: l.quantity })),
    total_usd: o.total_price,
    placed_at: o.created_at,
    shipped_at: fulfillment?.created_at ?? null,
    tracking_url: fulfillment?.tracking_url ?? null,
    external_id: String(o.id),
  },
} }];
""".strip()

shopify_nodes = [
    webhook("Shopify order webhook", "shopify/orders", [0, 300], raw_body=True),
    code("Verify HMAC and map", VERIFY_SHOPIFY, [220, 300]),
    if_true("Signed?", "={{ $json.valid }}", [440, 300]),
    # sync_order returns a bare uuid, which is not a JSON object, so read the response as text.
    http("Upsert order", "POST", "={{ $env.SUPABASE_URL }}/rest/v1/rpc/sync_order", [660, 220],
         body="={{ JSON.stringify({ p_shop_domain: $json.p_shop_domain, p_order: $json.p_order }) }}",
         response_format="text"),
    respond("OK", 200, "={{ { ok: true } }}", [880, 220]),
    respond("Unauthorized", 401, "={{ { error: 'invalid signature' } }}", [660, 400]),
    # Fail the execution after answering, so the error workflow records the forged call.
    node("Record forged call", "n8n-nodes-base.stopAndError", 1, {"errorMessage": "invalid Shopify HMAC"}, [880, 400]),
]
shopify = workflow("tdShopifySync01", "Triage Desk · 3 Shopify order sync", shopify_nodes, link(
    ("Shopify order webhook", "Verify HMAC and map"),
    ("Verify HMAC and map", "Signed?"),
    ("Signed?", "Upsert order", 0),
    ("Signed?", "Unauthorized", 1),
    ("Upsert order", "OK"),
    ("Unauthorized", "Record forged call"),
))

# ---------------------------------------------------------------------------
# 4. Backlog sweep: every 5 minutes, re-run triage for tickets stuck in "new"
# ---------------------------------------------------------------------------
backlog_nodes = [
    node("Every 5 minutes", "n8n-nodes-base.scheduleTrigger", 1.2, {"rule": {"interval": [{"field": "minutes", "minutesInterval": 5}]}}, [0, 300]),
    http("Find stuck tickets", "GET",
         "={{ $env.SUPABASE_URL }}/rest/v1/tickets?status=eq.new&received_at=lt.{{ new Date(Date.now() - 2 * 60 * 1000).toISOString() }}&select=id&order=received_at&limit=20",
         [220, 300]),
    node("One at a time", "n8n-nodes-base.splitInBatches", 3, {"batchSize": 1, "options": {}}, [440, 300]),
    http("Retry triage", "POST", "={{ $env.SUPABASE_URL }}/functions/v1/triage", [660, 380],
         body="={{ JSON.stringify({ ticket_id: $json.id }) }}",
         headers=[{"name": "x-triage-secret", "value": "={{ $env.TRIAGE_WEBHOOK_SECRET }}"}, {"name": "Content-Type", "value": "application/json"}],
         timeout=150000),
]
backlog = workflow("tdBacklogSweep1", "Triage Desk · 4 Backlog sweep", backlog_nodes, link(
    ("Every 5 minutes", "Find stuck tickets"),
    ("Find stuck tickets", "One at a time"),
    ("One at a time", "Retry triage", 1),
    ("Retry triage", "One at a time"),
))

# ---------------------------------------------------------------------------
# 5. Error handler: any failed execution above lands in automation_errors
# ---------------------------------------------------------------------------
error_nodes = [
    node("On workflow error", "n8n-nodes-base.errorTrigger", 1, {}, [0, 300]),
    http("Record error", "POST", "={{ $env.SUPABASE_URL }}/rest/v1/automation_errors", [220, 300],
         body="={{ JSON.stringify({ workflow: $json.workflow.name, node: $json.execution?.lastNodeExecuted ?? null, message: $json.execution?.error?.message ?? 'unknown error', execution_url: $json.execution?.url ?? null, payload: { mode: $json.execution?.mode ?? null } }) }}"),
]
errors = workflow(ERROR_WORKFLOW_ID, "Triage Desk · 5 Error handler", error_nodes, link(("On workflow error", "Record error")), error_workflow=False)

OUT.mkdir(parents=True, exist_ok=True)
for file_name, wf in [
    ("1-inbound-message.json", inbound),
    ("2-send-approved-reply.json", approved),
    ("3-shopify-order-sync.json", shopify),
    ("4-backlog-sweep.json", backlog),
    ("5-error-handler.json", errors),
]:
    (OUT / file_name).write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", file_name)
