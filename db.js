// Armazenamento: Postgres quando DATABASE_URL existe (Railway); arquivo JSON local para testes.
const fs = require('fs');
const path = require('path');

let pool = null;
const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
let mem = { entries: [], tasks: [], settings: {}, seq: 1 };

function saveFile() { fs.writeFileSync(FILE, JSON.stringify(mem, null, 1)); }

async function init() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = require('pg');
    const noSsl = /railway\.internal|localhost|127\.0\.0\.1/.test(url) || process.env.PGSSL === 'false';
    pool = new Pool({ connectionString: url, ssl: noSsl ? false : { rejectUnauthorized: false } });
    await pool.query(`
      create table if not exists entries (
        area text not null, day date not null, data jsonb not null default '{}',
        author text, updated_at timestamptz not null default now(), primary key (area, day));
      create table if not exists tasks (
        id serial primary key, area text not null, titulo text not null, prazo date, dono text,
        feito boolean not null default false, feito_por text, feito_em timestamptz,
        created_at timestamptz not null default now());
      create table if not exists settings (key text primary key, value jsonb not null);`);
    return 'postgres';
  }
  if (fs.existsSync(FILE)) mem = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return 'arquivo ' + FILE;
}

const ENTRY_COLS = `area, to_char(day,'YYYY-MM-DD') as day, data, author, updated_at`;
const TASK_COLS = `id, area, titulo, to_char(prazo,'YYYY-MM-DD') as prazo, dono, feito, feito_por, feito_em`;

async function listEntries() {
  if (pool) return (await pool.query(`select ${ENTRY_COLS} from entries order by day, area`)).rows;
  return [...mem.entries].sort((a, b) => a.day.localeCompare(b.day));
}

async function upsertEntry(area, day, data, author) {
  if (pool) {
    const r = await pool.query(
      `insert into entries(area, day, data, author, updated_at) values ($1,$2,$3,$4,now())
       on conflict (area, day) do update set data = excluded.data, author = excluded.author, updated_at = now()
       returning ${ENTRY_COLS}`, [area, day, data, author]);
    return r.rows[0];
  }
  const row = { area, day, data, author, updated_at: new Date().toISOString() };
  const i = mem.entries.findIndex(e => e.area === area && e.day === day);
  if (i >= 0) mem.entries[i] = row; else mem.entries.push(row);
  saveFile();
  return row;
}

async function deleteEntry(area, day) {
  if (pool) { await pool.query('delete from entries where area=$1 and day=$2', [area, day]); return; }
  mem.entries = mem.entries.filter(e => !(e.area === area && e.day === day)); saveFile();
}

async function listTasks() {
  if (pool) return (await pool.query(`select ${TASK_COLS} from tasks order by prazo nulls last, id`)).rows;
  return [...mem.tasks].sort((a, b) => (a.prazo || '9').localeCompare(b.prazo || '9') || a.id - b.id);
}

async function addTask(t) {
  if (pool) {
    const r = await pool.query(`insert into tasks(area, titulo, prazo, dono) values ($1,$2,$3,$4) returning ${TASK_COLS}`,
      [t.area, t.titulo, t.prazo || null, t.dono || null]);
    return r.rows[0];
  }
  const row = { id: mem.seq++, area: t.area, titulo: t.titulo, prazo: t.prazo || null, dono: t.dono || null, feito: false, feito_por: null, feito_em: null };
  mem.tasks.push(row); saveFile();
  return row;
}

async function updateTask(id, patch) {
  const allowed = ['titulo', 'prazo', 'dono', 'feito', 'feito_por', 'area'];
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if ('feito' in patch) { keys.push('feito_em'); patch.feito_em = patch.feito ? new Date().toISOString() : null; }
  if (pool) {
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const r = await pool.query(`update tasks set ${sets} where id = $1 returning ${TASK_COLS}`, [id, ...keys.map(k => patch[k] === '' ? null : patch[k])]);
    return r.rows[0];
  }
  const t = mem.tasks.find(x => x.id === Number(id));
  if (!t) return null;
  keys.forEach(k => { t[k] = patch[k] === '' ? null : patch[k]; });
  saveFile();
  return t;
}

async function deleteTask(id) {
  if (pool) { await pool.query('delete from tasks where id=$1', [id]); return; }
  mem.tasks = mem.tasks.filter(t => t.id !== Number(id)); saveFile();
}

async function getSetting(key) {
  if (pool) { const r = await pool.query('select value from settings where key=$1', [key]); return r.rows[0] ? r.rows[0].value : null; }
  return key in mem.settings ? mem.settings[key] : null;
}

async function setSetting(key, value) {
  if (pool) { await pool.query('insert into settings(key, value) values ($1,$2) on conflict (key) do update set value = excluded.value', [key, JSON.stringify(value)]); return; }
  mem.settings[key] = value; saveFile();
}

module.exports = { init, listEntries, upsertEntry, deleteEntry, listTasks, addTask, updateTask, deleteTask, getSetting, setSetting };
