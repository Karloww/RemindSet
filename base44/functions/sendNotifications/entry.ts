import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';

// Creates Notification records for a batch of recipients AND, for recipients who
// opted into email notifications, sends an email with the link, posted time, and
// deadline. Called from the app (activity/lesson assignment, activity submission) with:
// { notifications: [{ user_id, title, message, assignment_id?, classroom_id?, activity_id?, scheduled_date?, type?, deadline?, link? }] }
const VALID_TYPES = ["admin", "activity", "lesson", "comment", "deadline", "activity_done", "lesson_done"];

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function buildEmailBody(n, postedAt) {
  const deadlineLine = n.deadline
    ? `<p style="margin:0 0 6px;"><strong>Deadline:</strong> ${escapeHtml(fmtDate(n.deadline))}</p>`
    : "";
  const linkLine = n.link
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(n.link)}" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;">Open in RemindSet</a></p>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#333;">
<h2 style="margin:0 0 8px;">${escapeHtml(n.title)}</h2>
<p style="margin:0 0 12px;color:#555;line-height:1.5;">${escapeHtml(n.message)}</p>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
<p style="margin:0 0 6px;"><strong>Posted:</strong> ${escapeHtml(fmtDate(postedAt))}</p>
${deadlineLine}
${linkLine}
<p style="margin-top:24px;font-size:12px;color:#999;">You received this email because email notifications are enabled in your RemindSet settings.</p>
</div>`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const notifications = Array.isArray(body?.notifications) ? body.notifications : [];
    if (notifications.length === 0) return Response.json({ created: 0 });

    const postedAt = new Date().toISOString();
    const capped = notifications.slice(0, 500);

    const batch = capped.map((n) => ({
      user_id: n.user_id,
      title: String(n.title || "").slice(0, 200),
      message: String(n.message || "").slice(0, 2000),
      read: false,
      assignment_id: n.assignment_id || "",
      classroom_id: n.classroom_id || "",
      activity_id: n.activity_id || "",
      scheduled_date: n.scheduled_date || "",
      type: VALID_TYPES.includes(n.type) ? n.type : "admin",
    }));

    const created = await base44.asServiceRole.entities.Notification.bulkCreate(batch);

    // Best-effort email delivery for recipients who opted into email notifications.
    // Runs after the response so the request stays fast.
    waitUntil((async () => {
      try {
        const userIds = [...new Set(capped.map((n) => n.user_id).filter(Boolean))];
        if (userIds.length === 0) return;
        const [profiles, users] = await Promise.all([
          base44.asServiceRole.entities.Profile.filter({ created_by_id: { $in: userIds } }, "created_date", 500),
          base44.asServiceRole.entities.User.filter({ id: { $in: userIds } }, "created_date", 500),
        ]);
        const emailByUser = new Map((users || []).filter((u) => u.email).map((u) => [u.id, u.email]));
        const wantsEmail = new Set((profiles || []).filter((p) => p.email_notifications).map((p) => p.created_by_id));

        let sent = 0;
        for (const n of capped) {
          if (sent >= 200) break;
          if (!n.user_id || !wantsEmail.has(n.user_id)) continue;
          const email = emailByUser.get(n.user_id);
          if (!email) continue;
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              subject: String(n.title || "RemindSet notification").slice(0, 200),
              body: buildEmailBody(n, postedAt),
            });
            sent++;
          } catch (e) { /* best-effort, continue to next recipient */ }
        }
      } catch (e) { /* best-effort email delivery */ }
    })());

    return Response.json({ created: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}