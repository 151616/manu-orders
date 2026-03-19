const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL?.trim() ?? "";

type SlackBlock =
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "divider" }
  | { type: "context"; elements: { type: "mrkdwn"; text: string }[] };

/**
 * Send a message to the configured Slack channel via incoming webhook.
 * Fails silently — Slack notifications should never break the app.
 */
async function send(text: string, blocks?: SlackBlock[]) {
  if (!WEBHOOK_URL) return;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, ...(blocks ? { blocks } : {}) }),
    });
  } catch (error) {
    console.error("[slack] webhook failed:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Notification helpers                                               */
/* ------------------------------------------------------------------ */

export async function notifyNewOrderRequest(fields: {
  title: string;
  submittedBy: string;
  category: string;
  vendor: string | null;
  quantity: number | null;
}) {
  const details = [
    `*Category:* ${fields.category}`,
    fields.vendor ? `*Vendor:* ${fields.vendor}` : null,
    fields.quantity ? `*Qty:* ${fields.quantity}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  await send(`New order request: ${fields.title}`, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📦 *New Order Request*\n*${fields.title}*`,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Submitted by *${fields.submittedBy}*` },
      ],
    },
    ...(details
      ? [
          {
            type: "section" as const,
            text: { type: "mrkdwn" as const, text: details },
          },
        ]
      : []),
  ]);
}

export async function notifyNewTrackingRequest(fields: {
  title: string;
  submittedBy: string;
  type: string;
}) {
  await send(`New tracking request: ${fields.title}`, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔧 *New Tracking Request*\n*${fields.title}*`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Submitted by *${fields.submittedBy}*  ·  Type: *${fields.type}*`,
        },
      ],
    },
  ]);
}

export async function notifyRequestApproved(fields: {
  kind: "order" | "tracking";
  title: string;
  approvedBy: string;
}) {
  const icon = fields.kind === "order" ? "📦" : "🔧";
  const label = fields.kind === "order" ? "Order" : "Tracking";

  await send(`${label} request approved: ${fields.title}`, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *${label} Request Approved*\n*${fields.title}*`,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Approved by *${fields.approvedBy}*` },
      ],
    },
  ]);
}

export async function notifyRequestRejected(fields: {
  kind: "order" | "tracking";
  title: string;
  rejectedBy: string;
  reason: string | null;
}) {
  const label = fields.kind === "order" ? "Order" : "Tracking";

  await send(`${label} request rejected: ${fields.title}`, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `❌ *${label} Request Rejected*\n*${fields.title}*`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Rejected by *${fields.rejectedBy}*${fields.reason ? `\nReason: _${fields.reason}_` : ""}`,
        },
      ],
    },
  ]);
}
