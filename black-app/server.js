// Painel de Resultados da Black 2026 · Contador do Trader
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const CONFIG = require('./shared/config');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('cdt-black-' + PASSWORD).digest('hex');
const AREA_IDS = CONFIG.AREAS.map(a => a.id);

const app = express();
app.use(express.json({ limit: '200kb' }));

// ---------- acesso por senha única ----------
const token = () => crypto.createHmac('sha256', SECRET).update('acesso:' + PASSWORD).digest('hex');
function readCookie(req, name) {
  const m = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
function authed(req) {
  if (!PASSWORD) return true;
  const c = readCookie(req, 'cdt_black');
  return !!c && c.length === token().length && crypto.timingSafeEqual(Buffer.from(c), Buffer.from(token()));
}

app.post('/api/login', (req, res) => {
  const { senha } = req.body || {};
  if (PASSWORD && senha !== PASSWORD) return res.status(401).json({ erro: 'Senha incorreta' });
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `cdt_black=${token()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 60}${secure}`);
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'cdt_black=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => res.json({ autenticado: authed(req), senhaAtiva: !!PASSWORD }));
app.get('/health', (req, res) => res.send('ok'));

app.use('/api', (req, res, next) => (authed(req) ? next() : res.status(401).json({ erro: 'Faça login' })));

// ---------- dados ----------
const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ erro: 'Erro no servidor' }); });

app.get('/api/estado', wrap(async (req, res) => {
  const [entries, tasks, metas] = await Promise.all([db.listEntries(), db.listTasks(), db.getSetting('metas')]);
  res.json({ entries, tasks, metas: metas || {} });
}));

app.put('/api/entries/:area/:day', wrap(async (req, res) => {
  const { area, day } = req.params;
  if (!AREA_IDS.includes(area) || !isDay(day)) return res.status(400).json({ erro: 'Área ou data inválida' });
  const data = {};
  for (const [k, v] of Object.entries((req.body && req.body.data) || {})) {
    if (!/^[a-z0-9_]{1,60}$/.test(k)) continue;
    if (k === 'obs') { data.obs = String(v).slice(0, 2000); continue; }
    const n = Number(v);
    if (v !== '' && v !== null && Number.isFinite(n) && n >= 0) data[k] = n;
  }
  const author = String((req.body && req.body.autor) || '').slice(0, 80) || null;
  res.json(await db.upsertEntry(area, day, data, author));
}));

app.delete('/api/entries/:area/:day', wrap(async (req, res) => {
  await db.deleteEntry(req.params.area, req.params.day);
  res.json({ ok: true });
}));

app.post('/api/tasks', wrap(async (req, res) => {
  const t = req.body || {};
  if (!t.titulo || !['geral', ...AREA_IDS].includes(t.area)) return res.status(400).json({ erro: 'Tarefa inválida' });
  if (t.prazo && !isDay(t.prazo)) return res.status(400).json({ erro: 'Prazo inválido' });
  res.json(await db.addTask({ area: t.area, titulo: String(t.titulo).slice(0, 200), prazo: t.prazo, dono: String(t.dono || '').slice(0, 80) }));
}));

app.patch('/api/tasks/:id', wrap(async (req, res) => {
  const p = req.body || {};
  if (p.prazo && !isDay(p.prazo)) return res.status(400).json({ erro: 'Prazo inválido' });
  const t = await db.updateTask(req.params.id, p);
  return t ? res.json(t) : res.status(404).json({ erro: 'Tarefa não encontrada' });
}));

app.delete('/api/tasks/:id', wrap(async (req, res) => {
  await db.deleteTask(req.params.id);
  res.json({ ok: true });
}));

app.put('/api/metas', wrap(async (req, res) => {
  const metas = {};
  for (const m of CONFIG.METAS) {
    const v = Number((req.body || {})[m.id]);
    if (Number.isFinite(v) && v >= 0) metas[m.id] = v;
  }
  await db.setSetting('metas', metas);
  res.json(metas);
}));

app.get('/api/export.csv', wrap(async (req, res) => {
  const entries = await db.listEntries();
  const keys = [...new Set(entries.flatMap(e => Object.keys(e.data || {})).filter(k => k !== 'obs'))].sort();
  const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [['data', 'area', 'lancado_por', ...keys, 'observacao'].join(';')];
  for (const e of entries) lines.push([e.day, e.area, esc(e.author), ...keys.map(k => (e.data[k] ?? '')), esc(e.data.obs)].join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="black-2026-lancamentos.csv"');
  res.send('﻿' + lines.join('\n'));
}));

// ---------- front ----------
app.get('/config.js', (req, res) => res.sendFile(path.join(__dirname, 'shared', 'config.js')));
app.use(express.static(path.join(__dirname, 'public')));

(async () => {
  const where = await db.init();
  if ((await db.getSetting('seeded')) !== true) {
    for (const t of CONFIG.TAREFAS) await db.addTask(t);
    await db.setSetting('seeded', true);
    console.log(`Tarefas iniciais cadastradas: ${CONFIG.TAREFAS.length}`);
  }
  app.listen(PORT, () => console.log(`Painel Black 2026 na porta ${PORT} · dados em ${where}${PASSWORD ? '' : ' · ATENÇÃO: sem APP_PASSWORD, acesso aberto'}`));
})();
