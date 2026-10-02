// Vercel Serverless Function: приймає заявку з квізу і надсилає в Telegram.
// Цей файл виконується на сервері Vercel — у браузері його не видно.
// Краще задати TG_BOT_TOKEN і TG_CHAT_ID у Vercel → Settings → Environment Variables;
// якщо їх немає, використовуються значення нижче.
// ВАЖЛИВО: репозиторій на GitHub має бути ПРИВАТНИМ, інакше токен побачать усі.
const DEFAULT_TOKEN = '8090010233:AAGucMxosOir1f7ttPIUODULMbO2DYoqTHU';
const DEFAULT_CHAT_ID = '-4934715371';
const TOKEN = process.env.TG_BOT_TOKEN || DEFAULT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID || DEFAULT_CHAT_ID;

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

  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    if (!r.ok) throw new Error(await r.text());
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('TG error', e);
    return res.status(500).json({ ok: false });
  }
};
