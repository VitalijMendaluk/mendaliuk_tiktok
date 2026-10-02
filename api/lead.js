// Vercel Serverless Function: приймає заявку з квізу і надсилає в Telegram.
// Цей файл виконується на сервері Vercel — у браузері його не видно.
// Краще задати TG_BOT_TOKEN і TG_CHAT_ID у Vercel → Settings → Environment Variables;
// якщо їх немає, використовуються значення нижче.
// ВАЖЛИВО: репозиторій на GitHub має бути ПРИВАТНИМ, інакше токен побачать усі.
const DEFAULT_TOKEN = '8090010233:AAGucMxosOir1f7ttPIUODULMbO2DYoqTHU';
const DEFAULT_CHAT_ID = '-4934715371';
const TOKEN = process.env.TG_BOT_TOKEN || DEFAULT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID || DEFAULT_CHAT_ID;

// Conversions API (серверні події Meta). Токен: Events Manager → піксель → Налаштування →
// Conversions API → «Згенерувати маркер доступу». Краще задати в Vercel як META_CAPI_TOKEN.
const PIXEL_ID = process.env.META_PIXEL_ID || '1387966702869520';
const DEFAULT_CAPI_TOKEN = '';                       // ← або встав маркер сюди
const CAPI_TOKEN = process.env.META_CAPI_TOKEN || DEFAULT_CAPI_TOKEN;
const CAPI_TEST_CODE = process.env.META_TEST_CODE || ''; // напр. TEST12345 — тільки для перевірки

const crypto = require('crypto');
const sha = (v) => crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

async function sendCapi(b, req, phone) {
  if (!CAPI_TOKEN) return;
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;
  const user = {
    ph: [sha(phone.replace(/\D/g, ''))],
    fn: [sha(String(b.name).split(' ')[0])],
    client_ip_address: ip,
    client_user_agent: req.headers['user-agent'],
    fbp: b.fbp || undefined,
    fbc: b.fbc || undefined
  };
  const now = Math.floor(Date.now() / 1000);
  const base = { event_time: now, action_source: 'website', event_source_url: b.page, user_data: user };
  const custom = { content_name: 'tiktok_razbor', niche: b.niche, stage: b.stage, pay: b.pay };
  const body = { data: [
    { ...base, event_name: 'Lead', event_id: `${b.eventId}_Lead`, custom_data: custom },
    { ...base, event_name: 'Schedule', event_id: `${b.eventId}_Schedule`, custom_data: { content_name: 'tiktok_razbor' } }
  ] };
  if (CAPI_TEST_CODE) body.test_event_code = CAPI_TEST_CODE;
  const r = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!r.ok) console.error('CAPI error', await r.text());
}

const NICHE = { services: 'Послуги', expert: 'Експерт', teach: 'Навчання', product: 'Своє виробництво', mlm: 'Мережевий бізнес', unsure: 'Ще шукає' };
const STAGE = { start: 'Ще не почав(-ла)', lowviews: 'Мало переглядів', noclients: 'Перегляди є, клієнтів 0', unstable: 'Клієнти нестабільно' };
const PAY   = { mentor: '🚀 Якнайшвидше з наставником', parts: '💳 З наставником, частинами' };

const esc = (v) => String(v ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).slice(0, 300);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  const phone = String(b.phone || '').replace(/[^\d+]/g, '');
  if (!b.name || phone.length < 7 || !PAY[b.pay]) return res.status(400).json({ ok: false });

  const digits = phone.replace(/\D/g, '');
  const links = {
    Telegram: `https://t.me/+${digits}`,
    WhatsApp: `https://wa.me/${digits}`,
    Viber: `viber://chat?number=%2B${digits}`
  };
  const u = b.utm || {};

  const text = [
    `🔥 <b>Нова заявка на розбір</b>`,
    ``,
    `👤 <b>${esc(b.name)}</b>`,
    `📞 ${esc(phone)} · ${esc(b.messenger)}`,
    `👉 <a href="${links[b.messenger] || links.Telegram}">Написати в ${esc(b.messenger)}</a>`,
    ``,
    `📅 <b>${esc(b.day)} о ${esc(b.time)}</b> (Варшава)`,
    `🌍 Пояс клієнта: ${esc(b.userTZ)}`,
    ``,
    `💼 Ніша: ${esc(NICHE[b.niche] || b.niche)}`,
    `📊 Етап: ${esc(STAGE[b.stage] || b.stage)}`,
    `💰 ${esc(PAY[b.pay])}`,
    ``,
    `🏷 ${esc([u.utm_campaign, u.utm_content].filter(Boolean).join(' / ') || 'без UTM')}`
  ].join('\n');

  const capi = sendCapi(b, req, phone).catch((e) => console.error('CAPI error', e));

  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    if (!r.ok) throw new Error(await r.text());
    await capi;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('TG error', e);
    return res.status(500).json({ ok: false });
  }
};
