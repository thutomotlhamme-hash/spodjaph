// Spodja command centre API.
//
// Public, by link token (the client's /pay/ page):  pay_view · pay_start · pay_verify
// Owner (Supabase session of an active grad_owner_access user):
//   overview · job_save · job_from_enquiry · payment_record · ledger_delete
//   link_create · link_cancel · link_refresh
//   records (read-only view of every enquiry, booking, payment and gallery order)
//   demo_seed · demo_clear (QA data, flagged is_demo and removable in one call)
//
// Jobs are confirmed bookings from any channel (website, Grad House, WhatsApp, manual).
// Every rand received is a ledger row; outstanding = job total - ledger. A payment link
// can carry several jobs (a bundle) and writes one ledger row per job once Yoco confirms it.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });
const clean = (v: unknown, m = 300) => String(v ?? "").trim().slice(0, m);
const nul = (v: unknown, m = 300) => clean(v, m) || null;
const now = () => new Date().toISOString();
const validOrigin = (v: string) => /^https:\/\//i.test(v) || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(v);
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const cents = (v: unknown) => Math.round(Number(v));
const sastDate = (iso: string | null) => iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date(iso)) : null;
const PAID = ["succeeded", "successful", "success", "paid", "completed", "complete"];
const METHODS = ["card", "cash", "eft", "other", "refund"];
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

function code(prefix: string) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return prefix + [...b].map((x) => a[x % a.length]).join("");
}

async function insertWithRef(table: string, refCol: string, prefix: string, row: Record<string, unknown>, select = "*") {
  let err: any = null;
  for (let i = 0; i < 4; i++) {
    const { data, error } = await sb.from(table).insert({ ...row, [refCol]: code(prefix) }).select(select).single();
    if (data) return data as any;
    err = error;
    if (error?.code !== "23505") break;
  }
  throw err || new Error(`${table}_insert_failed`);
}

const log = (action: string, detail: Record<string, unknown>, o: { job?: string | null; link?: string | null; actor?: string | null } = {}) =>
  sb.from("spodja_activity_log").insert({ action, detail, job_id: o.job || null, link_id: o.link || null, actor: o.actor || null });

async function owner(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  const { data } = await sb.from("grad_owner_access").select("user_id").eq("user_id", user.id).eq("active", true).maybeSingle();
  return data ? user : null;
}

function siteOrigin(fallback: unknown) {
  const o = clean(Deno.env.get("SPODJA_SITE_URL") || fallback, 300).replace(/\/$/, "");
  return validOrigin(o) ? o : "";
}

// ------------------------------------------------------------------ payment links

const LINK_FIELDS = "id,token,link_ref,is_demo,client_name,client_phone,client_email,description,purpose,amount_cents,currency,status,attempts,provider_reference,expires_at,paid_at,created_at";

function publicView(l: any) {
  return {
    link_ref: l.link_ref,
    client_name: String(l.client_name || "").split(/\s+/)[0],
    description: l.description,
    amount_cents: l.amount_cents,
    currency: l.currency,
    status: l.status === "open" && new Date(l.expires_at).getTime() < Date.now() ? "expired" : l.status,
    expires_at: l.expires_at,
    paid_at: l.paid_at,
  };
}

// Writes one ledger row per bundled job. external_ref is unique, so this is safe to repeat.
async function settleLink(l: any, actor: string | null = null) {
  const { data: items } = await sb.from("spodja_payment_link_items").select("job_id,amount_cents").eq("link_id", l.id);
  for (const it of items || []) {
    await sb.from("spodja_ledger").upsert({
      job_id: it.job_id, amount_cents: it.amount_cents, method: "yoco_link", payment_link_id: l.id,
      external_ref: `link:${l.id}:${it.job_id}`, note: `Yoco payment link ${l.link_ref}`, paid_at: l.paid_at || now(), recorded_by: actor,
    }, { onConflict: "external_ref", ignoreDuplicates: true });
  }
}

// Ask Yoco about every checkout opened for this link; mark it paid if one succeeded.
async function verifyLink(l: any, actor: string | null = null): Promise<{ paid: boolean; link: any; error?: string }> {
  if (l.status === "paid") { await settleLink(l, actor); return { paid: true, link: l }; }
  const attempts: any[] = Array.isArray(l.attempts) ? l.attempts : [];
  if (!attempts.length) return { paid: false, link: l };
  const secret = Deno.env.get("YOCO_SECRET_KEY");
  if (!secret) return { paid: false, link: l, error: "yoco_not_configured" };
  for (const a of [...attempts].reverse()) {
    const r = await fetch(`https://payments.yoco.com/api/checkouts/${encodeURIComponent(a.id)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const raw = await r.json().catch(() => ({}));
    if (!r.ok) continue;
    const st = [raw.status, raw.paymentStatus, raw.payment_status, raw?.payment?.status].filter(Boolean).map((x: any) => String(x).toLowerCase());
    if (!st.some((s: string) => PAID.includes(s))) continue;
    if (raw.amount != null && Number(raw.amount) !== Number(l.amount_cents)) return { paid: false, link: l, error: "payment_amount_mismatch" };
    const paidAt = now();
    const { data: updated } = await sb.from("spodja_payment_links")
      .update({ status: "paid", paid_at: paidAt, provider_reference: String(a.id), raw_event: raw, updated_at: paidAt })
      .eq("id", l.id).neq("status", "paid").select(LINK_FIELDS).maybeSingle();
    const link = updated || { ...l, status: "paid", paid_at: paidAt };
    await settleLink(link, actor);
    if (updated) await log("link_paid", { link_ref: l.link_ref, amount_cents: l.amount_cents, checkout: a.id }, { link: l.id, actor });
    return { paid: true, link };
  }
  return { paid: false, link: l };
}

async function startCheckout(l: any, origin: string) {
  const secret = Deno.env.get("YOCO_SECRET_KEY");
  if (!secret) return json({ error: "yoco_not_configured" }, 503);
  const attempts: any[] = Array.isArray(l.attempts) ? l.attempts : [];
  const last = attempts[attempts.length - 1];
  // Reuse a fresh checkout so a double tap never opens two.
  if (last?.redirect_url && Date.now() - new Date(last.created_at).getTime() < 20 * 60 * 1000) return json({ redirect_url: last.redirect_url, reused: true });
  const back = `${origin}/pay/?l=${encodeURIComponent(l.token)}`;
  const r = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", "Idempotency-Key": `spodja-link-${l.id}-${attempts.length}` },
    body: JSON.stringify({
      amount: Number(l.amount_cents),
      currency: "ZAR",
      successUrl: `${back}&result=success`,
      cancelUrl: `${back}&result=cancelled`,
      failureUrl: `${back}&result=failed`,
      metadata: { billNote: `Spodja PH · ${l.link_ref}`, transactionId: l.link_ref, paymentLinkId: l.id },
      lineItems: [{ displayName: `Spodja PH · ${l.description}`.slice(0, 120), quantity: 1, pricingDetails: { price: Number(l.amount_cents) } }],
    }),
  });
  const raw = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: "yoco_checkout_failed", provider_status: r.status }, 502);
  const id = raw.id || raw.checkoutId, url = raw.redirectUrl || raw.redirect_url || raw.url;
  if (!id || !url) return json({ error: "yoco_checkout_response_invalid" }, 502);
  const next = [...attempts, { id: String(id), redirect_url: url, created_at: now() }].slice(-10);
  await sb.from("spodja_payment_links").update({ attempts: next, provider_reference: String(id), updated_at: now() }).eq("id", l.id);
  return json({ redirect_url: url });
}

// ------------------------------------------------------------------ sync website + Grad House into jobs

async function sync() {
  // Website bookings paid through the on-site Yoco checkout.
  const { data: orders } = await sb.from("spodja_checkout_orders").select("id,enquiry_id,amount_cents,provider,paid_at,payment_plan").eq("status", "paid");
  for (const o of orders || []) {
    const job = await jobForEnquiry(o.enquiry_id, null);
    if (!job) continue;
    const { data: added } = await sb.from("spodja_ledger").upsert({
      job_id: job.id, amount_cents: o.amount_cents, method: "yoco_checkout", external_ref: `order:${o.id}`,
      note: `Website ${o.payment_plan === "deposit" ? "deposit" : "payment"} (${o.provider})`, paid_at: o.paid_at || now(),
    }, { onConflict: "external_ref", ignoreDuplicates: true }).select("id");
    if (added?.length) await log("payment_received", { method: "yoco_checkout", amount_cents: o.amount_cents, source: "website" }, { job: job.id });
  }
  // Grad House bookings paid in full through Yoco.
  const { data: grads } = await sb.from("grad_bookings")
    .select("id,booking_reference,customer_id,package_slug,total_amount_cents,scheduled_starts_at,requested_starts_at,requested_location_name,workflow_status,updated_at")
    .eq("payment_status", "paid").neq("workflow_status", "cancelled");
  for (const g of grads || []) {
    let { data: job } = await sb.from("spodja_jobs").select("id").eq("grad_booking_id", g.id).maybeSingle();
    if (!job) {
      const { data: c } = await sb.from("grad_customers").select("full_name,email,phone").eq("id", g.customer_id).maybeSingle();
      const starts = g.scheduled_starts_at || g.requested_starts_at;
      job = await insertWithRef("spodja_jobs", "job_ref", "SJ-", {
        source: "grad", grad_booking_id: g.id, client_name: c?.full_name || "Grad client", client_phone: c?.phone || null, client_email: c?.email || null,
        service_type: "graduation", title: `Grad House · ${g.package_slug || "session"}`, shoot_date: sastDate(starts), starts_at: starts,
        venue: g.requested_location_name || null, total_cents: Number(g.total_amount_cents || 0), notes: g.booking_reference ? `Grad ref ${g.booking_reference}` : null,
      }, "id");
      await log("job_created", { source: "grad", booking_reference: g.booking_reference }, { job: job.id });
    }
    await sb.from("spodja_ledger").upsert({
      job_id: job.id, amount_cents: Number(g.total_amount_cents || 0), method: "yoco_checkout", external_ref: `grad:${g.id}`,
      note: "Grad House online payment", paid_at: g.updated_at || now(),
    }, { onConflict: "external_ref", ignoreDuplicates: true });
  }
}

async function jobForEnquiry(enquiryId: string, actor: string | null) {
  const { data: existing } = await sb.from("spodja_jobs").select("*").eq("enquiry_id", enquiryId).maybeSingle();
  if (existing) return existing;
  const { data: e } = await sb.from("spodja_enquiries")
    .select("id,enquiry_ref,service_type,client_type,contact_name,contact_phone,contact_email,shoot_date,preferred_starts_at,venue,city,offer_key,estimated_value_cents,budget_range")
    .eq("id", enquiryId).maybeSingle();
  if (!e) return null;
  const { data: offer } = e.offer_key ? await sb.from("spodja_offers").select("name").eq("offer_key", e.offer_key).maybeSingle() : { data: null };
  const job = await insertWithRef("spodja_jobs", "job_ref", "SJ-", {
    source: "website", enquiry_id: e.id, client_name: e.contact_name, client_phone: e.contact_phone, client_email: e.contact_email,
    service_type: e.service_type, title: offer?.name || e.budget_range || `${e.service_type} booking`, shoot_date: e.shoot_date,
    starts_at: e.preferred_starts_at, venue: e.venue || e.city, total_cents: Number(e.estimated_value_cents || 0),
    notes: `Website enquiry ${e.enquiry_ref}`, created_by: actor,
  });
  await log("job_created", { source: "website", enquiry_ref: e.enquiry_ref }, { job: job.id, actor });
  return job;
}

async function overview() {
  await sync();
  const [{ data: jobs }, { data: links }, { data: items }, { data: ledger }, { data: activity }, { data: enq }] = await Promise.all([
    sb.from("spodja_job_balances_v2").select("*").neq("status", "cancelled").order("shoot_date", { ascending: true, nullsFirst: false }).limit(500),
    sb.from("spodja_payment_links").select(LINK_FIELDS).order("created_at", { ascending: false }).limit(100),
    sb.from("spodja_payment_link_items").select("link_id,job_id,amount_cents"),
    sb.from("spodja_ledger").select("id,job_id,amount_cents,method,note,paid_at,payment_link_id,external_ref").order("paid_at", { ascending: false }).limit(500),
    sb.from("spodja_activity_log").select("id,job_id,link_id,action,detail,created_at").order("created_at", { ascending: false }).limit(80),
    sb.from("spodja_enquiries").select("id,enquiry_ref,service_type,contact_name,contact_phone,shoot_date,venue,city,estimated_value_cents,budget_range,status,created_at,is_demo").order("created_at", { ascending: false }).limit(60),
  ]);
  const { data: linked } = await sb.from("spodja_jobs").select("enquiry_id").not("enquiry_id", "is", null);
  const taken = new Set((linked || []).map((x: any) => x.enquiry_id));
  return {
    jobs: jobs || [],
    links: (links || []).map((l: any) => ({ ...l, items: (items || []).filter((i: any) => i.link_id === l.id) })),
    ledger: ledger || [],
    activity: activity || [],
    enquiries: (enq || []).filter((e: any) => !taken.has(e.id)),
  };
}

// ------------------------------------------------------------------ records: read everything

async function records() {
  const [enq, grads, orders, gpay, links, gorders, galleries, jobs] = await Promise.all([
    sb.from("spodja_enquiries").select("id,enquiry_ref,service_type,client_type,contact_name,contact_phone,contact_email,shoot_date,venue,city,offer_key,estimated_value_cents,budget_range,status,source,created_at,is_demo").order("created_at", { ascending: false }).limit(300),
    sb.from("grad_bookings").select("id,booking_reference,customer_id,package_slug,total_amount_cents,payment_status,workflow_status,requested_starts_at,scheduled_starts_at,requested_location_name,expires_at,created_at").order("created_at", { ascending: false }).limit(300),
    sb.from("spodja_checkout_orders").select("id,enquiry_id,offer_key,payment_plan,amount_cents,provider,status,created_at,paid_at").order("created_at", { ascending: false }).limit(300),
    sb.from("grad_payments").select("id,booking_id,provider,amount_cents,status,created_at,paid_at").order("created_at", { ascending: false }).limit(300),
    sb.from("spodja_payment_links").select(LINK_FIELDS).order("created_at", { ascending: false }).limit(300),
    sb.from("spodja_gallery_orders").select("id,order_ref,gallery_id,status,total_cents,discount_cents,payment_provider,created_at").order("created_at", { ascending: false }).limit(300),
    sb.from("spodja_galleries").select("id,slug,title,client_name,service_type,status,payment_status,total_amount_cents,paid_amount_cents,balance_due_cents,event_date,expires_at,created_at").order("created_at", { ascending: false }).limit(300),
    sb.from("spodja_jobs").select("id,job_ref,enquiry_id,grad_booking_id"),
  ]);
  const custIds = [...new Set((grads.data || []).map((g: any) => g.customer_id).filter(Boolean))];
  const { data: customers } = custIds.length ? await sb.from("grad_customers").select("id,full_name,phone,email,university").in("id", custIds) : { data: [] as any[] };
  const enqRef = new Map((enq.data || []).map((e: any) => [e.id, e.enquiry_ref]));
  const jobByEnq = new Map((jobs.data || []).filter((j: any) => j.enquiry_id).map((j: any) => [j.enquiry_id, j.job_ref]));
  const jobByGrad = new Map((jobs.data || []).filter((j: any) => j.grad_booking_id).map((j: any) => [j.grad_booking_id, j.job_ref]));
  const gradRef = new Map((grads.data || []).map((g: any) => [g.id, g.booking_reference]));
  const galTitle = new Map((galleries.data || []).map((g: any) => [g.id, g.title]));
  return {
    enquiries: (enq.data || []).map((e: any) => ({ ...e, job_ref: jobByEnq.get(e.id) || null })),
    grad_bookings: (grads.data || []).map((g: any) => ({ ...g, customer: (customers || []).find((c: any) => c.id === g.customer_id) || null, job_ref: jobByGrad.get(g.id) || null })),
    website_payments: (orders.data || []).map((o: any) => ({ ...o, enquiry_ref: enqRef.get(o.enquiry_id) || null })),
    grad_payments: (gpay.data || []).map((p: any) => ({ ...p, booking_reference: gradRef.get(p.booking_id) || null })),
    payment_links: links.data || [],
    gallery_orders: (gorders.data || []).map((o: any) => ({ ...o, gallery_title: galTitle.get(o.gallery_id) || null })),
    galleries: galleries.data || [],
  };
}

// ------------------------------------------------------------------ demo data (clearly flagged, removable)

const day = (n: number) => sastDate(new Date(Date.now() + n * 864e5).toISOString())!;
const at = (n: number, hhmm: string) => `${day(n)}T${hhmm}:00+02:00`;

async function demoClear() {
  const { data: jobs } = await sb.from("spodja_jobs").select("id").eq("is_demo", true);
  const { data: links } = await sb.from("spodja_payment_links").select("id").eq("is_demo", true);
  const jobIds = (jobs || []).map((j: any) => j.id), linkIds = (links || []).map((l: any) => l.id);
  if (jobIds.length) await sb.from("spodja_activity_log").delete().in("job_id", jobIds);
  if (linkIds.length) await sb.from("spodja_activity_log").delete().in("link_id", linkIds);
  if (linkIds.length) await sb.from("spodja_payment_links").delete().in("id", linkIds);
  if (jobIds.length) await sb.from("spodja_jobs").delete().in("id", jobIds);
  const { data: enq } = await sb.from("spodja_enquiries").delete().eq("is_demo", true).select("id");
  return { jobs: jobIds.length, links: linkIds.length, enquiries: (enq || []).length };
}

async function demoSeed(actor: string) {
  await demoClear();
  const J = async (key: string, row: Record<string, unknown>) => {
    const job = await insertWithRef("spodja_jobs", "job_ref", `SJ-DEMO-${key}-`, { source: "whatsapp", status: "confirmed", is_demo: true, created_by: actor, ...row });
    await log("job_created", { source: job.source, title: job.title, total_cents: job.total_cents, demo: true }, { job: job.id, actor });
    return job;
  };
  const pay = async (job: any, amount: number, method: string, note: string, daysAgo = 3) => {
    await sb.from("spodja_ledger").insert({ job_id: job.id, amount_cents: method === "refund" ? -amount : amount, method, note: `[DEMO] ${note}`, paid_at: new Date(Date.now() - daysAgo * 864e5).toISOString(), recorded_by: actor });
    await log("payment_recorded", { method, amount_cents: method === "refund" ? -amount : amount, note, demo: true }, { job: job.id, actor });
  };
  const link = async (jobsAmounts: [any, number][], description: string, purpose: string, extra: Record<string, unknown> = {}) => {
    const first = jobsAmounts[0][0];
    const l = await insertWithRef("spodja_payment_links", "link_ref", "PL-DEMO", {
      client_name: first.client_name, client_phone: first.client_phone, client_email: first.client_email, description, purpose,
      amount_cents: jobsAmounts.reduce((n, [, c]) => n + c, 0), created_by: actor, is_demo: true,
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), ...extra,
    }, LINK_FIELDS);
    await sb.from("spodja_payment_link_items").insert(jobsAmounts.map(([j, c]) => ({ link_id: l.id, job_id: j.id, amount_cents: c })));
    for (const [j, c] of jobsAmounts) await log("link_created", { link_ref: l.link_ref, amount_cents: c, bundle: jobsAmounts.length > 1, demo: true }, { job: j.id, link: l.id, actor });
    return l;
  };
  const who = (name: string, phone: string) => ({ client_name: `${name} (DEMO)`, client_phone: phone, client_email: `${name.split(" ")[0].toLowerCase()}.demo@example.com` });

  // Scenario jobs
  const d1 = await J("WED", { ...who("Lerato Dlamini", "0820000101"), service_type: "weddings", title: "Traditional / Lobola · 4h", shoot_date: day(9), starts_at: at(9, "10:00"), venue: "Pretoria", total_cents: 500000, notes: "[DEMO] Confirmed on WhatsApp. Nothing paid yet: send the 50% deposit link." });
  const d2 = await J("LOB", { ...who("Kagiso Molefe", "0710000202"), service_type: "events", title: "Lobola · Event Story", shoot_date: day(4), starts_at: at(4, "11:00"), venue: "Mahikeng", total_cents: 380000, notes: "[DEMO] 50% paid in cash. Balance link expired: create a new balance link." });
  await pay(d2, 190000, "cash", "Deposit paid in cash", 10);
  const d3 = await J("POR", { ...who("Thabo Nkosi", "0720000303"), service_type: "portraits", title: "Portrait · Gold", shoot_date: day(-6), starts_at: at(-6, "15:30"), venue: "Johannesburg", total_cents: 380000, status: "delivered", notes: "[DEMO] Paid in full by EFT. Should show Cleared." });
  await pay(d3, 380000, "eft", "Paid in full by EFT", 12);
  const d4 = await J("BRD", { ...who("Amahle Creative Studio", "0110000404"), service_type: "brands", title: "Brand content day · quote pending", shoot_date: day(21), venue: "Sandton", total_cents: 0, status: "tentative", notes: "[DEMO] Quote not set yet (total R0). Set a total, then send a deposit link." });
  const d5 = await J("BDY", { ...who("Naledi Mokoena", "0820000505"), service_type: "events", title: "Birthday · Essential", shoot_date: day(12), starts_at: at(12, "14:00"), venue: "Centurion", total_cents: 220000, notes: "[DEMO] Same client as the baby shower: clear both with ONE bundled link." });
  const d6 = await J("BSH", { ...who("Naledi Mokoena", "0820000505"), service_type: "events", title: "Baby shower · Story", shoot_date: day(26), starts_at: at(26, "12:00"), venue: "Centurion", total_cents: 380000, notes: "[DEMO] Bundle with the birthday booking." });
  const d7 = await J("GRD", { ...who("Palesa Mahlangu", "0730000707"), service_type: "graduation", title: "Grad House · Signature (manual)", shoot_date: day(2), starts_at: at(2, "08:30"), venue: "University of Pretoria", total_cents: 170000, notes: "[DEMO] Card payment then partial refund: balance should reappear." });
  await pay(d7, 170000, "card", "Card on the day", 5);
  await pay(d7, 30000, "refund", "Partial refund: 3 photos dropped", 1);
  const d8 = await J("TEN", { ...who("Sipho Ndlovu", "0740000808"), service_type: "portraits", title: "Couples portrait · Silver", shoot_date: day(15), starts_at: at(15, "17:00"), venue: "Melville Koppies", total_cents: 240000, status: "tentative", notes: "[DEMO] Tentative hold on the calendar. Confirm or cancel." });
  await J("CAN", { ...who("Zanele Khumalo", "0750000909"), service_type: "events", title: "Matric dance · Essential", shoot_date: day(7), venue: "Soweto", total_cents: 220000, status: "cancelled", notes: "[DEMO] Cancelled: must NOT appear on the calendar or outstanding list." });
  const d10 = await J("OVD", { ...who("Boitumelo Sithole", "0760001010"), service_type: "weddings", title: "The Vow", shoot_date: day(-14), starts_at: at(-14, "09:00"), venue: "Muldersdrift", total_cents: 650000, status: "shot", notes: "[DEMO] Already shot, deposit paid by Yoco link, balance overdue." });
  const d11 = await J("TOD", { ...who("Mpho Radebe", "0770001111"), service_type: "events", title: "Short Event · Essential", shoot_date: day(0), starts_at: at(0, "18:00"), venue: "Midrand", total_cents: 220000, notes: "[DEMO] Shoot is TODAY: client will pay the balance in cash on the day." });
  await pay(d11, 110000, "card", "Deposit by card", 6);

  // Payment links in every state
  await link([[d1, 250000]], "Deposit · Traditional / Lobola · 4h", "deposit");
  await link([[d2, 190000]], "Balance · Lobola · Event Story", "balance", { expires_at: new Date(Date.now() - 864e5).toISOString() });
  await link([[d5, 220000], [d6, 380000]], "Balance · Birthday + Baby shower", "balance", { status: "cancelled" });
  const paid = await link([[d10, 325000]], "Deposit · The Vow", "deposit", { status: "paid", paid_at: new Date(Date.now() - 30 * 864e5).toISOString() });
  await sb.from("spodja_ledger").insert({ job_id: d10.id, amount_cents: 325000, method: "yoco_link", payment_link_id: paid.id, external_ref: `link:${paid.id}:${d10.id}`, note: `[DEMO] Yoco payment link ${paid.link_ref}`, paid_at: paid.paid_at, recorded_by: actor });
  await log("link_paid", { link_ref: paid.link_ref, amount_cents: 325000, demo: true }, { link: paid.id, actor });

  // Website enquiries waiting to be confirmed
  await sb.from("spodja_enquiries").insert([
    { is_demo: true, service_type: "events", client_type: "birthday", contact_name: "Ayanda Zulu (DEMO)", contact_phone: "0780001212", contact_email: "ayanda.demo@example.com", shoot_date: day(18), venue: "Pretoria East", offer_key: "event-birthday-story", estimated_value_cents: 380000, budget_range: "Birthday Story · R3,800", source: "demo", brief: "[DEMO] Website enquiry: confirm as booking from the command centre." },
    { is_demo: true, service_type: "brands", client_type: "corporate", contact_name: "Kopano Group (DEMO)", contact_phone: "0110001313", contact_email: "kopano.demo@example.com", shoot_date: day(30), city: "Johannesburg", budget_range: "Quote to brief", source: "demo", brief: "[DEMO] Quote-first brand enquiry: no price until scoped." },
  ]);
  return { ok: true };
}

// ------------------------------------------------------------------ server

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action, 40);

    // ---------------- public: the client opens their payment link
    if (action.startsWith("pay_")) {
      const token = clean(body.token, 80);
      if (!isUuid(token)) return json({ error: "link_not_found" }, 404);
      const { data: l } = await sb.from("spodja_payment_links").select(LINK_FIELDS).eq("token", token).maybeSingle();
      if (!l) return json({ error: "link_not_found" }, 404);
      if (action === "pay_view") return json({ link: publicView(l) });
      if (action === "pay_verify") {
        const v = await verifyLink(l);
        if (v.error) return json({ error: v.error, link: publicView(l) }, v.error === "yoco_not_configured" ? 503 : 409);
        return json({ paid: v.paid, link: publicView(v.link) }, v.paid ? 200 : 202);
      }
      if (action === "pay_start") {
        const view = publicView(l);
        if (view.status === "paid") return json({ already_paid: true, link: view });
        if (view.status !== "open") return json({ error: `link_${view.status}` }, 409);
        const v = await verifyLink(l); // a checkout may have completed without the client returning
        if (v.paid) return json({ already_paid: true, link: publicView(v.link) });
        const origin = siteOrigin(body.return_origin);
        if (!origin) return json({ error: "invalid_return_origin" }, 400);
        return await startCheckout(l, origin);
      }
      return json({ error: "unknown_action" }, 400);
    }

    // ---------------- owner
    const user = await owner(req);
    if (!user) return json({ error: "owner_required" }, 403);
    const actor = user.id;

    if (action === "overview") return json(await overview());
    if (action === "records") return json(await records());
    if (action === "demo_seed") return json(await demoSeed(actor));
    if (action === "demo_clear") return json({ ok: true, removed: await demoClear() });

    if (action === "job_from_enquiry") {
      const job = await jobForEnquiry(clean(body.enquiry_id, 80), actor);
      if (!job) return json({ error: "enquiry_not_found" }, 404);
      await sb.from("spodja_enquiries").update({ status: "qualified", updated_at: now() }).eq("id", job.enquiry_id).eq("status", "new");
      return json({ job });
    }

    if (action === "job_save") {
      const j = body.job || {};
      const fields: Record<string, unknown> = {
        client_name: clean(j.client_name, 120), client_phone: nul(j.client_phone, 40), client_email: nul(j.client_email, 180),
        service_type: clean(j.service_type, 40) || "other", title: clean(j.title, 160), shoot_date: nul(j.shoot_date, 10),
        starts_at: nul(j.starts_at, 40), venue: nul(j.venue, 240), notes: nul(j.notes, 2000),
        total_cents: Math.max(0, cents(j.total_cents) || 0), updated_at: now(),
      };
      if (j.status && ["tentative", "confirmed", "shot", "delivered", "cancelled"].includes(j.status)) fields.status = j.status;
      if (!fields.client_name || !fields.title) return json({ error: "client_and_title_required" }, 400);
      if (fields.shoot_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(fields.shoot_date))) return json({ error: "invalid_date" }, 400);
      if (j.id) {
        const { data, error } = await sb.from("spodja_jobs").update(fields).eq("id", clean(j.id, 80)).select("*").single();
        if (error || !data) return json({ error: "job_not_found" }, 404);
        await log("job_updated", { title: data.title, status: data.status, total_cents: data.total_cents }, { job: data.id, actor });
        return json({ job: data });
      }
      const job = await insertWithRef("spodja_jobs", "job_ref", "SJ-", { ...fields, source: ["whatsapp", "manual"].includes(j.source) ? j.source : "whatsapp", created_by: actor });
      await log("job_created", { source: job.source, title: job.title, total_cents: job.total_cents }, { job: job.id, actor });
      return json({ job }, 201);
    }

    // One payment can be split across jobs (e.g. cash that clears two bookings).
    if (action === "payment_record") {
      const method = clean(body.method, 20);
      if (!METHODS.includes(method)) return json({ error: "invalid_method" }, 400);
      const allocations = (Array.isArray(body.allocations) ? body.allocations : []).slice(0, 10)
        .map((a: any) => ({ job_id: clean(a.job_id, 80), amount_cents: cents(a.amount_cents) }))
        .filter((a: any) => isUuid(a.job_id) && Number.isFinite(a.amount_cents) && a.amount_cents > 0);
      if (!allocations.length) return json({ error: "allocation_required" }, 400);
      const paidAt = body.paid_at && !Number.isNaN(new Date(body.paid_at).getTime()) ? new Date(body.paid_at).toISOString() : now();
      const rows = allocations.map((a: any) => ({
        job_id: a.job_id, amount_cents: method === "refund" ? -a.amount_cents : a.amount_cents, method,
        note: nul(body.note, 500), paid_at: paidAt, recorded_by: actor,
      }));
      const { data, error } = await sb.from("spodja_ledger").insert(rows).select("id,job_id,amount_cents");
      if (error) return json({ error: "payment_record_failed" }, 400);
      for (const r of data || []) await log("payment_recorded", { method, amount_cents: r.amount_cents, note: nul(body.note, 500) }, { job: r.job_id, actor });
      return json({ ledger: data }, 201);
    }

    if (action === "ledger_delete") {
      const { data: row } = await sb.from("spodja_ledger").select("id,job_id,amount_cents,method,external_ref").eq("id", clean(body.ledger_id, 80)).maybeSingle();
      if (!row) return json({ error: "not_found" }, 404);
      if (row.external_ref) return json({ error: "online_payments_cannot_be_removed" }, 409);
      await sb.from("spodja_ledger").delete().eq("id", row.id);
      await log("payment_removed", { method: row.method, amount_cents: row.amount_cents }, { job: row.job_id, actor });
      return json({ ok: true });
    }

    if (action === "link_create") {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 10)
        .map((a: any) => ({ job_id: clean(a.job_id, 80), amount_cents: cents(a.amount_cents) }))
        .filter((a: any) => isUuid(a.job_id) && Number.isFinite(a.amount_cents) && a.amount_cents > 0);
      if (!items.length) return json({ error: "choose_at_least_one_booking" }, 400);
      const { data: jobs } = await sb.from("spodja_jobs").select("id,client_name,client_phone,client_email,title").in("id", items.map((i: any) => i.job_id));
      if ((jobs || []).length !== items.length) return json({ error: "job_not_found" }, 404);
      const amount = items.reduce((n: number, i: any) => n + i.amount_cents, 0);
      if (amount < 200 || amount > 10000000) return json({ error: "invalid_amount" }, 400);
      const first = jobs![0];
      const purpose = ["deposit", "balance", "full", "custom"].includes(body.purpose) ? body.purpose : "custom";
      const description = clean(body.description, 200) || (items.length > 1 ? `${items.length} bookings` : first.title);
      const days = Math.min(60, Math.max(1, Number(body.expires_in_days) || 7));
      const link = await insertWithRef("spodja_payment_links", "link_ref", "PL-", {
        client_name: clean(body.client_name, 120) || first.client_name, client_phone: nul(body.client_phone, 40) || first.client_phone,
        client_email: nul(body.client_email, 180) || first.client_email, description, purpose, amount_cents: amount,
        created_by: actor, expires_at: new Date(Date.now() + days * 864e5).toISOString(),
      }, LINK_FIELDS);
      await sb.from("spodja_payment_link_items").insert(items.map((i: any) => ({ link_id: link.id, ...i })));
      for (const i of items) await log("link_created", { link_ref: link.link_ref, amount_cents: i.amount_cents, bundle: items.length > 1 }, { job: i.job_id, link: link.id, actor });
      const origin = siteOrigin(body.site_origin);
      return json({ link: { ...link, items }, url: origin ? `${origin}/pay/?l=${link.token}` : null }, 201);
    }

    if (action === "link_cancel" || action === "link_refresh") {
      const { data: l } = await sb.from("spodja_payment_links").select(LINK_FIELDS).eq("id", clean(body.link_id, 80)).maybeSingle();
      if (!l) return json({ error: "link_not_found" }, 404);
      const v = await verifyLink(l, actor);
      if (action === "link_refresh") return json({ paid: v.paid, link: v.link, error: v.error || null });
      if (v.paid) return json({ error: "link_already_paid", link: v.link }, 409);
      const { data } = await sb.from("spodja_payment_links").update({ status: "cancelled", updated_at: now() }).eq("id", l.id).select(LINK_FIELDS).single();
      await log("link_cancelled", { link_ref: l.link_ref }, { link: l.id, actor });
      return json({ link: data });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "command_centre_failed" }, 500);
  }
});
