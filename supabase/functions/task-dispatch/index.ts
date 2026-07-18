// Supabase Edge Function — receives a Database Webhook POST from
// `workforce.tasks` (INSERT/UPDATE) and, when the row represents a real
// status transition into work-needing territory, triggers a GitHub Actions
// `repository_dispatch` run so apps/runner reacts within seconds instead of
// waiting for the next 15-minute cron tick.
//
// Wiring (see plan doc / README): Database Webhook (Dashboard > Database >
// Webhooks) on `workforce.tasks` INSERT+UPDATE -> this function's URL.
// Secrets (`supabase secrets set`):
//   GH_DISPATCH_TOKEN   fine-grained PAT, repo damarmustikoaji/olive,
//                        permission "Actions: Read and write" — deliberately
//                        NOT the existing GH_RELEASE_READ_TOKEN, which is
//                        read-only and lives in GitHub Actions' own secret
//                        store, not Supabase's.
//   DISPATCH_WEBHOOK_SECRET  shared secret checked against the
//                        `x-webhook-secret` header the Database Webhook is
//                        configured to send, so this function can't be
//                        triggered by an arbitrary internet request.

const GITHUB_REPO = "damarmustikoaji/olive";
const GITHUB_EVENT_TYPE = "task-changed";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function isRealStatusChange(payload: WebhookPayload): boolean {
  if (payload.table !== "tasks") return false;

  if (payload.type === "INSERT") {
    return payload.record?.status === "backlog";
  }

  if (payload.type === "UPDATE") {
    const newStatus = payload.record?.status;
    const oldStatus = payload.old_record?.status;
    return typeof newStatus === "string" && newStatus !== oldStatus;
  }

  return false;
}

async function hasRunInProgress(token: string): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/runs?status=in_progress&per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!res.ok) {
    // Fail open: if the check itself fails, still attempt the dispatch —
    // worst case is one redundant run, not a silently dropped one.
    console.error("failed to check in-progress runs", res.status, await res.text());
    return false;
  }
  const body = (await res.json()) as { total_count: number };
  return body.total_count > 0;
}

async function dispatch(token: string): Promise<Response> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: GITHUB_EVENT_TYPE }),
  });
  return res;
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get("DISPATCH_WEBHOOK_SECRET");
  if (expectedSecret && req.headers.get("x-webhook-secret") !== expectedSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (!isRealStatusChange(payload)) {
    return new Response(JSON.stringify({ dispatched: false, reason: "not a status transition" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = Deno.env.get("GH_DISPATCH_TOKEN");
  if (!token) {
    console.error("GH_DISPATCH_TOKEN is not set");
    return new Response("server misconfigured", { status: 500 });
  }

  if (await hasRunInProgress(token)) {
    return new Response(JSON.stringify({ dispatched: false, reason: "run already in progress" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ghRes = await dispatch(token);
  if (!ghRes.ok) {
    const body = await ghRes.text();
    console.error("repository_dispatch failed", ghRes.status, body);
    return new Response(JSON.stringify({ dispatched: false, error: body }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ dispatched: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
