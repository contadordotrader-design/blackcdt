// Painel de Resultados da Black 2026 · front-end (sem dependências)
(function () {
  const C = window.CDT;
  const $app = document.getElementById('app');
  const AREA = Object.fromEntries(C.AREAS.map(a => [a.id, a]));
  const ABAS = [{ id: 'geral', nome: 'Visão geral' }, ...C.AREAS.map(a => ({ id: a.id, nome: a.nome }))];

  const S = {
    entries: [], tasks: [], metas: {},
    aba: lerLocal('aba') || 'geral',
    periodo: lerLocal('periodo') || 'tudo',
    dia: {},           // data escolhida no formulário de cada área
    autor: lerLocal('autor') || '',
    editarMetas: false,
  };

  // ---------- utilitários ----------
  function lerLocal(k) { try { return localStorage.getItem('cdt_' + k); } catch (e) { return null; } }
  function gravarLocal(k, v) { try { localStorage.setItem('cdt_' + k, v); } catch (e) { /* sem storage */ } }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const horaSP = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()));
  const addDias = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const entre = (d, a, b) => d >= a && d <= b;
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
  const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const dataBR = d => d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—';
  const dataSem = d => `${SEM[new Date(d + 'T12:00:00Z').getUTCDay()]} ${dataBR(d)}`;
  const nf = new Intl.NumberFormat('pt-BR');
  const num = n => nf.format(Math.round(n || 0));
  const real = n => 'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n || 0);
  const pct = (a, b) => (b > 0 ? (a / b) * 100 : null);
  const fmtPct = v => (v == null ? '—' : nf.format(Math.round(v)) + '%');
  const fmt = (v, tipo) => (tipo === 'r' ? real(v) : tipo === '%' ? fmtPct(v) : num(v));

  function toast(msg, erro) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'on' + (erro ? ' erro' : '');
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.className = ''; }, 2600);
  }

  async function api(method, url, body) {
    const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    if (r.status === 401 && url !== '/api/login') { telaLogin(); throw new Error('login'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || 'Erro');
    return j;
  }

  // ---------- período e somas ----------
  function periodo() {
    const p = C.PERIODOS.find(x => x.id === S.periodo) || C.PERIODOS[0];
    if (p.dinamico) { const h = hoje(); return { inicio: addDias(h, -(p.dinamico - 1)), fim: h, nome: p.nome }; }
    return p;
  }
  function soma(area, campo, ini, fim) {
    let t = 0;
    for (const e of S.entries) if (e.area === area && (!ini || entre(e.day, ini, fim))) t += Number(e.data[campo] || 0);
    return t;
  }
  const somaP = (area, campo) => { const p = periodo(); return soma(area, campo, p.inicio, p.fim); };
  const somaTudo = (area, campo) => soma(area, campo);
  const PF = 'comercial_pf', PJ = 'comercial_pj', MK = 'marketing', OP = 'operacional';
  const pfCampo = (frente, col) => `${frente}_${col}`;
  const vendasPF = (ini, fim) => C.FRENTES_PF.reduce((t, f) => t + soma(PF, pfCampo(f.id, 'vendas'), ini, fim), 0);
  const valorPF = (ini, fim) => C.FRENTES_PF.reduce((t, f) => t + soma(PF, pfCampo(f.id, 'valor'), ini, fim), 0);
  const valorPJ = (ini, fim) => soma(PJ, 'valor_mensal', ini, fim) + soma(PJ, 'valor_unico', ini, fim);
  const leadsCanal = ['lead_organico', 'lead_trafego', 'lead_parceiros', 'lead_grupos', 'lead_email'];

  function faseAtual() {
    const h = hoje();
    if (h < C.INICIO) return { nome: 'Pré-campanha', texto: 'A Black começa em 17/10' };
    if (h > C.FIM) return { nome: 'Black encerrada', texto: 'Hora do balanço' };
    return C.FASES.find(f => entre(h, f.inicio, f.fim)) || C.FASES[0];
  }

  // ---------- metas: realizado, meta e ritmo ----------
  // janela = período da meta, usado para calcular o ritmo esperado até hoje
  const REGRAS = {
    vip_contatos: { real: () => somaTudo(PF, 'vip_contatos'), janela: ['2026-10-22', '2026-10-28'] },
    vip_vendas: { real: () => somaTudo(PF, 'vip_vendas'), janela: ['2026-10-22', '2026-10-31'] },
    esquenta_conv: { real: () => pct(somaTudo(PF, 'esquenta_vendas'), somaTudo(MK, 'inscritos')), base: () => somaTudo(MK, 'inscritos') },
    november_vendas: { real: () => somaTudo(PF, 'november_vendas'), janela: ['2026-11-01', '2026-11-30'] },
    indicacao_conv: { real: () => pct(somaTudo(PF, 'indicacao_vendas'), somaTudo(PF, 'indicacao_contatos')), base: () => somaTudo(PF, 'indicacao_contatos') },
    resposta_1h: { real: () => pct(somaTudo(PF, 'leads_1h'), somaTudo(PF, 'leads_recebidos')), base: () => somaTudo(PF, 'leads_recebidos') },
    faturamento: { real: () => valorPF(), janela: [C.INICIO, C.FIM] },
    inscritos: { real: () => somaTudo(MK, 'inscritos'), janela: ['2026-10-20', '2026-10-31'] },
    depoimentos: { real: () => somaTudo(MK, 'depoimentos'), janela: ['2026-10-27', '2026-11-30'] },
    cpl: { real: () => { const l = somaTudo(MK, 'lead_trafego'); return l > 0 ? somaTudo(MK, 'investimento') / l : null; }, menor: true, base: () => somaTudo(MK, 'lead_trafego') },
    onboarding_7d: { real: () => pct(somaTudo(OP, 'onboarding_7d'), somaTudo(OP, 'onboarding_7d') + somaTudo(OP, 'onboarding_atrasado')), base: () => somaTudo(OP, 'onboarding_7d') + somaTudo(OP, 'onboarding_atrasado') },
    entregas_prazo: { real: () => pct(somaTudo(OP, 'entregas_prazo'), somaTudo(OP, 'entregas_prazo') + somaTudo(OP, 'entregas_atraso')), base: () => somaTudo(OP, 'entregas_prazo') + somaTudo(OP, 'entregas_atraso') },
    cashback_prazo: { real: () => pct(somaTudo(OP, 'cashback_prazo'), somaTudo(OP, 'cashback_liberado')), base: () => somaTudo(OP, 'cashback_liberado') },
    convidados: { real: () => somaTudo(OP, 'convidados'), janela: ['2026-11-03', '2026-11-07'] },
    pj_conv: { real: () => pct(somaTudo(PJ, 'contratos_online') + somaTudo(PJ, 'contratos_reuniao'), somaTudo(PJ, 'devolutivas')), base: () => somaTudo(PJ, 'devolutivas') },
    pj_vagas: { real: () => somaTudo(PJ, 'inscricoes'), janela: ['2026-10-24', '2026-11-30'] },
    pj_24h: { real: () => pct(somaTudo(PJ, 'contato_24h'), somaTudo(PJ, 'inscricoes')), base: () => somaTudo(PJ, 'inscricoes') },
  };

  function avaliar(m) {
    const regra = REGRAS[m.id] || { real: () => 0 };
    const meta = S.metas[m.id] != null ? S.metas[m.id] : m.valor;
    const real = regra.real();
    const out = { meta, real, tipo: m.tipo, barra: 0, status: 'neutro', texto: '' };
    if (!meta) { out.texto = 'Meta a definir'; return out; }
    if (real == null || (regra.base && !regra.base())) { out.texto = 'Sem dados ainda'; return out; }
    if (m.tipo === '%' || regra.menor) {
      const ok = regra.menor ? real <= meta : real >= meta;
      const perto = regra.menor ? real <= meta * 1.25 : real >= meta * 0.8;
      out.barra = regra.menor ? Math.min(100, (meta / real) * 100) : Math.min(100, (real / meta) * 100);
      out.status = ok ? 'ok' : perto ? 'atencao' : 'ruim';
      out.texto = ok ? 'Dentro da meta' : perto ? 'Perto da meta' : 'Abaixo da meta';
      return out;
    }
    out.barra = Math.min(100, (real / meta) * 100);
    if (real >= meta) { out.status = 'ok'; out.texto = 'Meta batida'; return out; }
    const [ini, fim] = regra.janela || [C.INICIO, C.FIM];
    const h = hoje();
    if (h < ini) { out.texto = 'Começa em ' + dataBR(ini); return out; }
    const frac = Math.min(1, (diasEntre(ini, h) + 1) / (diasEntre(ini, fim) + 1));
    const esperado = meta * frac;
    const ritmo = esperado > 0 ? real / esperado : 0;
    out.status = ritmo >= 0.95 ? 'ok' : ritmo >= 0.7 ? 'atencao' : 'ruim';
    out.texto = h > fim ? 'Prazo encerrado' : `Esperado até hoje: ${fmt(esperado, m.tipo)}`;
    return out;
  }

  function kpiHTML(m) {
    const a = avaliar(m);
    const metaTxt = a.meta ? `Meta ${m.tipo === '%' ? (REGRAS[m.id] && REGRAS[m.id].menor ? 'até ' : '') + fmtPct(a.meta) : fmt(a.meta, m.tipo)}` : '';
    return `<div class="card kpi ${a.status}">
      <div class="nome">${esc(m.nome.replace(' (0 = definir)', ''))}</div>
      <div class="val">${a.real == null ? '—' : fmt(a.real, m.tipo)}</div>
      <div class="meta">${esc(metaTxt)}${metaTxt ? ' · ' : ''}${esc(a.texto)}</div>
      <div class="barra"><i style="width:${a.barra.toFixed(0)}%"></i></div>
    </div>`;
  }

  // ---------- alertas ----------
  function tarefasAtrasadas(area) {
    const h = hoje();
    return S.tasks.filter(t => !t.feito && t.prazo && t.prazo < h && (!area || t.area === area));
  }
  function lancouEm(area, dia) { return S.entries.find(e => e.area === area && e.day === dia); }

  function frentesSemTracao() {
    // Regra combinada: 10 dias sem tração, a ação é cortada.
    const h = hoje();
    const out = [];
    for (const f of C.FRENTES_PF) {
      const ini = f.inicio, fim = f.fim;
      if (h < ini || diasEntre(ini, h) < 9) continue;
      const desde = addDias(h, -9);
      const vendas = soma(PF, pfCampo(f.id, 'vendas'), desde, h);
      if (vendas === 0 && h <= addDias(fim, 1)) out.push(f.nome);
    }
    return out;
  }

  function alertasHTML() {
    const h = hoje(), ontem = addDias(h, -1);
    const itens = [];
    const atras = tarefasAtrasadas();
    if (atras.length) itens.push(['ruim', `<b>${atras.length} tarefa${atras.length > 1 ? 's' : ''} atrasada${atras.length > 1 ? 's' : ''}</b>: ${atras.slice(0, 4).map(t => esc(t.titulo) + ' (' + esc(t.dono || nomeArea(t.area)) + ')').join(' · ')}${atras.length > 4 ? ' …' : ''}`]);
    if (entre(ontem, C.INICIO, C.FIM)) {
      const sem = C.AREAS.filter(a => !lancouEm(a.id, ontem)).map(a => a.nome);
      if (sem.length) itens.push(['atencao', `<b>Sem números de ontem (${dataBR(ontem)})</b>: ${esc(sem.join(', '))}`]);
    }
    if (horaSP() >= 18 && entre(h, C.INICIO, C.FIM)) {
      const sem = C.AREAS.filter(a => !lancouEm(a.id, h)).map(a => a.nome);
      if (sem.length) itens.push(['atencao', `<b>Já passou das 18h</b> e ainda faltam os números de hoje: ${esc(sem.join(', '))}`]);
    }
    const st = frentesSemTracao();
    if (st.length) itens.push(['ruim', `<b>10 dias sem venda</b> em ${esc(st.join(', '))}. Pela regra, a ação é revista ou cortada e o esforço vai para o que funciona.`]);
    if (!itens.length) return '';
    return `<div class="alertas">${itens.map(([c, t]) => `<div class="alerta ${c === 'atencao' ? 'atencao' : ''}">${t}</div>`).join('')}</div>`;
  }

  const nomeArea = id => (id === 'geral' ? 'Todas as áreas' : (AREA[id] ? AREA[id].nome : id));

  // ---------- gráfico de barras por dia ----------
  function graficoHTML(series, ini, fim, tipo) {
    // series: [{nome, cor, valor: dia => número}]
    const dias = [];
    for (let d = ini; d <= fim; d = addDias(d, 1)) dias.push(d);
    if (!dias.length) return '<p class="vazio">Sem dias no período.</p>';
    const W = 640, H = 200, pad = { l: 44, r: 8, t: 10, b: 26 };
    const vals = dias.map(d => series.map(s => s.valor(d)));
    const max = Math.max(1, ...vals.map(v => v.reduce((a, b) => a + b, 0)));
    const bw = (W - pad.l - pad.r) / dias.length;
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / max);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico por dia">`;
    for (let i = 0; i <= 3; i++) {
      const v = (max * i) / 3, yy = y(v);
      svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="#36322A" stroke-width="1"/>`;
      svg += `<text x="${pad.l - 6}" y="${yy + 4}" fill="#8F8775" font-size="10" text-anchor="end">${tipo === 'r' ? (v >= 1000 ? nf.format(Math.round(v / 1000)) + 'k' : num(v)) : num(v)}</text>`;
    }
    const passo = Math.ceil(dias.length / 10);
    dias.forEach((d, i) => {
      let acc = 0;
      const x = pad.l + i * bw + bw * 0.15, w = Math.max(1, bw * 0.7);
      series.forEach((s, k) => {
        const v = vals[i][k];
        if (v > 0) { svg += `<rect x="${x.toFixed(1)}" y="${y(acc + v).toFixed(1)}" width="${w.toFixed(1)}" height="${(y(acc) - y(acc + v)).toFixed(1)}" fill="${s.cor}" rx="2"><title>${dataBR(d)} · ${esc(s.nome)}: ${fmt(v, tipo)}</title></rect>`; acc += v; }
      });
      if (i % passo === 0) svg += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" fill="#8F8775" font-size="10" text-anchor="middle">${dataBR(d)}</text>`;
      if (d === hoje()) svg += `<line x1="${(x + w / 2).toFixed(1)}" x2="${(x + w / 2).toFixed(1)}" y1="${pad.t}" y2="${H - pad.b}" stroke="#F5B700" stroke-dasharray="3 3" stroke-width="1"/>`;
    });
    svg += '</svg>';
    const leg = series.length > 1 ? `<div class="leg">${series.map(s => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join('')}</div>` : '';
    return `<div class="grafico">${svg}${leg}</div>`;
  }

  // ---------- funil ----------
  function funilHTML(etapas) {
    const max = Math.max(1, ...etapas.map(e => e[1]));
    return `<div class="funil">${etapas.map((e, i) => {
      const conv = i > 0 && etapas[i - 1][1] > 0 ? `${fmtPct(pct(e[1], etapas[i - 1][1]))} da etapa anterior` : '';
      return `<div class="linha"><span>${esc(e[0])}</span><div class="trilho"><i style="width:${((e[1] / max) * 100).toFixed(1)}%"></i></div><span class="num">${num(e[1])}</span>${conv ? `<span class="conv">${conv}</span>` : ''}</div>`;
    }).join('')}</div>`;
  }

  // ---------- tarefas ----------
  function tarefasHTML(filtro, titulo, comForm, areaPadrao) {
    const h = hoje();
    let lista = S.tasks.filter(filtro);
    lista = lista.sort((a, b) => (a.feito - b.feito) || (a.prazo || '9').localeCompare(b.prazo || '9'));
    const linhas = lista.map(t => {
      const atras = !t.feito && t.prazo && t.prazo < h;
      const ehHoje = t.prazo === h;
      const flag = t.feito ? `<span class="flag ok">Feito</span>` : atras ? `<span class="flag ruim">Atrasada</span>` : ehHoje ? `<span class="flag atencao">Hoje</span>` : '';
      const quem = t.feito && t.feito_por ? ` · feito por ${esc(t.feito_por)}` : '';
      return `<div class="tarefa ${t.feito ? 'feita' : ''}">
        <input type="checkbox" data-tarefa="${t.id}" ${t.feito ? 'checked' : ''} aria-label="Marcar tarefa">
        <div><div class="t">${esc(t.titulo)}</div><div class="d">${t.prazo ? dataSem(t.prazo) : 'sem prazo'} · ${esc(t.dono || nomeArea(t.area))}${filtro.todas ? ' · ' + esc(nomeArea(t.area)) : ''}${quem}</div></div>
        <div>${flag} <button class="x" data-apagar="${t.id}" title="Apagar tarefa" aria-label="Apagar tarefa">×</button></div>
      </div>`;
    }).join('');
    const form = comForm ? `<form class="nova-tarefa" data-nova-tarefa>
        <input type="text" name="titulo" placeholder="Nova tarefa" required maxlength="200">
        <input type="text" name="dono" placeholder="Quem faz" maxlength="80">
        <input type="date" name="prazo" value="${h}">
        <select name="area">${['geral', ...C.AREAS.map(a => a.id)].map(a => `<option value="${a}" ${a === areaPadrao ? 'selected' : ''}>${esc(nomeArea(a))}</option>`).join('')}</select>
        <button class="btn">Adicionar</button></form>` : '';
    return `<div class="card"><h3>${esc(titulo)}</h3>${linhas || '<p class="vazio">Nenhuma tarefa aqui.</p>'}${form}</div>`;
  }

  // ---------- topo ----------
  function topoHTML() {
    const f = faseAtual();
    const badge = id => {
      const n = id === 'geral' ? tarefasAtrasadas().length : tarefasAtrasadas(id).length;
      return n ? `<span class="badge" title="Tarefas atrasadas">${n}</span>` : '';
    };
    return `<header class="topo"><div class="topo-in">
      <div class="marca">
        <h1>Black 2026 <span>· Painel de resultados</span></h1>
        <div class="fase"><span class="pill">${dataSem(hoje())}</span><b>${esc(f.nome)}</b><span>${esc(f.texto)}</span></div>
      </div>
      <nav class="abas" role="tablist">${ABAS.map(a => `<button role="tab" data-aba="${a.id}" class="${S.aba === a.id ? 'on' : ''}">${esc(a.nome)}${badge(a.id)}</button>`).join('')}</nav>
    </div></header>`;
  }

  function seletorPeriodo() {
    return `<select data-periodo aria-label="Período">${C.PERIODOS.map(p => `<option value="${p.id}" ${p.id === S.periodo ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>`;
  }

  // ---------- visão geral ----------
  function geralHTML() {
    const p = periodo();
    const h = hoje();
    const vPF = valorPF(p.inicio, p.fim), vPJ = valorPJ(p.inicio, p.fim);
    const vendas = vendasPF(p.inicio, p.fim);
    const contratos = soma(PJ, 'contratos_online', p.inicio, p.fim) + soma(PJ, 'contratos_reuniao', p.inicio, p.fim);
    const leads = leadsCanal.reduce((t, c) => t + soma(MK, c, p.inicio, p.fim), 0);
    const invest = soma(MK, 'investimento', p.inicio, p.fim);
    const ticket = vendas > 0 ? vPF / vendas : null;

    const resumo = [
      ['Faturamento PF', real(vPF), `${num(vendas)} vendas · ticket ${ticket ? real(ticket) : '—'}`],
      ['Black PJ', real(vPJ), `${num(contratos)} contratos`],
      ['Leads (todos os canais)', num(leads), `${num(soma(MK, 'inscritos', p.inicio, p.fim))} inscritos no Esquenta`],
      ['Investimento em tráfego', real(invest), vendas > 0 ? `${real(invest / vendas)} por venda PF` : 'Sem venda no período'],
    ].map(([n, v, m]) => `<div class="card kpi"><div class="nome">${n}</div><div class="val">${v}</div><div class="meta">${m}</div></div>`).join('');

    const linhasFrente = C.FRENTES_PF.map(f => {
      const g = c => soma(PF, pfCampo(f.id, c), p.inicio, p.fim);
      const ct = g('contatos'), rs = g('respostas'), pr = g('propostas'), vd = g('vendas'), vl = g('valor');
      const ativa = entre(h, f.inicio, f.fim), antes = h < f.inicio;
      const st = frentesSemTracao().includes(f.nome) ? '<span class="flag ruim">10 dias sem venda</span>' : antes ? `<span class="flag neutro">Começa ${dataBR(f.inicio)}</span>` : ativa ? '<span class="flag ok">No ar</span>' : '<span class="flag neutro">Encerrada</span>';
      return `<tr><td><b>${esc(f.nome)}</b><div class="d" style="color:var(--muted);font-size:12px">${dataBR(f.inicio)} a ${dataBR(f.fim)}</div></td>
        <td class="n">${num(ct)}</td><td class="n">${num(rs)}</td><td class="n">${num(pr)}</td><td class="n">${num(vd)}</td>
        <td class="n">${fmtPct(pct(vd, ct))}</td><td class="n">${real(vl)}</td><td>${st}</td></tr>`;
    }).join('');

    const statusDia = C.AREAS.map(a => {
      const e = lancouEm(a.id, h);
      const hr = e ? new Date(e.updated_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="s">${e ? '<span class="flag ok">Lançado</span>' : '<span class="flag ruim">Falta</span>'} <b>${esc(a.nome)}</b> <span class="quem">${e ? `${esc(e.author || 'sem nome')} · ${hr}` : 'dono: ' + esc(a.dono)}</span></div>`;
    }).join('');

    const metasCard = S.editarMetas ? metasEditorHTML() : `<div class="grid kpis">${C.METAS.map(kpiHTML).join('')}</div>`;

    const filtroHoje = t => !t.feito && t.prazo && t.prazo <= addDias(h, 2);
    filtroHoje.todas = true;

    return `${alertasHTML()}
    <div class="cab"><div><h2>Visão geral</h2><p>${esc(p.nome)}${p.inicio ? ` · ${dataBR(p.inicio)} a ${dataBR(p.fim)}` : ''}</p></div>
      <div class="acoes">${seletorPeriodo()} <a class="btn sec" href="/api/export.csv">Exportar CSV</a></div></div>
    <div class="grid kpis">${resumo}</div>
    <div class="duas">
      <div class="col">
        <div class="card"><h3>Vendas PF por frente</h3><div class="rolar"><table class="tabela">
          <thead><tr><th>Frente</th><th class="n">Contatos</th><th class="n">Respostas</th><th class="n">Propostas</th><th class="n">Vendas</th><th class="n">Conversão</th><th class="n">Valor</th><th>Status</th></tr></thead>
          <tbody>${linhasFrente}</tbody></table></div></div>
        <div class="card"><h3>Faturamento por dia</h3>${graficoHTML([
          { nome: 'Comercial PF', cor: '#F5B700', valor: d => valorPF(d, d) },
          { nome: 'Comercial PJ', cor: '#5BC48A', valor: d => valorPJ(d, d) },
        ], p.inicio, p.fim, 'r')}</div>
        <div class="card"><h3>Funil PF no período</h3>${funilHTML([
          ['Contatos', C.FRENTES_PF.reduce((t, f) => t + soma(PF, pfCampo(f.id, 'contatos'), p.inicio, p.fim), 0)],
          ['Respostas', C.FRENTES_PF.reduce((t, f) => t + soma(PF, pfCampo(f.id, 'respostas'), p.inicio, p.fim), 0)],
          ['Propostas', C.FRENTES_PF.reduce((t, f) => t + soma(PF, pfCampo(f.id, 'propostas'), p.inicio, p.fim), 0)],
          ['Vendas', vendas],
        ])}</div>
      </div>
      <div class="col">
        <div class="card"><h3>Números de hoje (até 18h)</h3><div class="status-dia">${statusDia}</div></div>
        ${tarefasHTML(filtroHoje, 'Pendências até ' + dataBR(addDias(h, 2)), false)}
        <div class="card"><h3>Calendário</h3><div class="status-dia">${C.FASES.map(f => `<div class="s">${entre(h, f.inicio, f.fim) ? '<span class="flag atencao">Agora</span>' : h > f.fim ? '<span class="flag ok">Feito</span>' : '<span class="flag neutro">Depois</span>'} <span><b>${esc(f.nome)}</b><br><span style="color:var(--muted);font-size:12px">${esc(f.texto)}</span></span><span class="quem">${dataBR(f.inicio)} a ${dataBR(f.fim)}</span></div>`).join('')}</div></div>
      </div>
    </div>
    <div class="cab" style="margin-top:26px"><div><h2>Metas</h2><p>Campanha toda. Verde no ritmo, laranja um pouco abaixo, vermelho longe da meta.</p></div>
      <div class="acoes"><button class="btn sec" data-editar-metas>${S.editarMetas ? 'Cancelar' : 'Editar metas'}</button></div></div>
    ${metasCard}`;
  }

  function metasEditorHTML() {
    return `<form class="card" data-form-metas><h3>Editar metas</h3><div class="campos">${C.METAS.map(m => {
      const v = S.metas[m.id] != null ? S.metas[m.id] : m.valor;
      return `<label class="campo"><span>${esc(m.nome.replace(' (0 = definir)', ''))}${m.tipo === '%' ? ' (%)' : m.tipo === 'r' ? ' (R$)' : ''}</span><input type="number" min="0" step="any" name="${m.id}" value="${v}"></label>`;
    }).join('')}</div><p class="aviso">Deixe 0 para “meta a definir”.</p><div class="form-fim"><button class="btn">Salvar metas</button></div></form>`;
  }

  // ---------- abas por área ----------
  function campoInput(id, nome, tipo, valor) {
    return `<label class="campo"><span>${esc(nome)}${tipo === 'r' ? ' (R$)' : ''}</span><input type="number" min="0" step="${tipo === 'r' ? '0.01' : '1'}" inputmode="${tipo === 'r' ? 'decimal' : 'numeric'}" name="${id}" value="${valor == null ? '' : valor}"></label>`;
  }

  function formHTML(area) {
    const dia = S.dia[area.id] || hoje();
    const e = lancouEm(area.id, dia);
    const d = e ? e.data : {};
    const secoes = area.secoes.map(s => {
      if (s.matriz) {
        const cab = `<tr><th></th>${s.matriz.colunas.map(c => `<th>${esc(c.nome)}${c.tipo === 'r' ? ' (R$)' : ''}</th>`).join('')}</tr>`;
        const linhas = s.matriz.linhas.map(l => `<tr><td>${esc(l.nome)}</td>${s.matriz.colunas.map(c => {
          const id = `${l.id}_${c.id}`;
          return `<td><input type="number" min="0" step="${c.tipo === 'r' ? '0.01' : '1'}" name="${id}" value="${d[id] == null ? '' : d[id]}" aria-label="${esc(l.nome + ' · ' + c.nome)}"></td>`;
        }).join('')}</tr>`).join('');
        return `<fieldset><legend>${esc(s.nome)}</legend><div class="rolar"><table class="matriz">${cab}${linhas}</table></div></fieldset>`;
      }
      return `<fieldset><legend>${esc(s.nome)}</legend><div class="campos">${s.campos.map(c => campoInput(c.id, c.nome, c.tipo, d[c.id])).join('')}</div></fieldset>`;
    }).join('');
    const ja = e ? `<p class="aviso ja">Já lançado por ${esc(e.author || 'sem nome')} em ${new Date(e.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}. Salvar de novo substitui os números deste dia.</p>`
      : `<p class="aviso">Lance os números do dia até as 18h. Campo vazio conta como zero.</p>`;
    return `<form class="card" data-form-area="${area.id}">
      <h3>Lançamento do dia</h3>
      <div class="form-topo"><label>Dia <input type="date" name="dia" value="${dia}" min="${C.INICIO}" max="${addDias(C.FIM, 31)}" data-dia="${area.id}"></label>
        <label>Quem lança <input type="text" name="autor" value="${esc(S.autor)}" placeholder="Seu nome" maxlength="80" required></label></div>
      ${ja}${secoes}
      <fieldset><legend>Observação do dia</legend><textarea name="obs" maxlength="2000" placeholder="O que travou, o que funcionou, o que precisa de ajuda">${esc(d.obs || '')}</textarea></fieldset>
      <div class="form-fim"><button class="btn">Salvar números</button>${e ? `<button type="button" class="link" data-limpar="${area.id}">Apagar este dia</button>` : ''}</div>
    </form>`;
  }

  function historicoHTML(area) {
    const campos = area.secoes.flatMap(s => s.matriz ? [] : s.campos).slice(0, 5);
    const extra = area.id === PF ? [{ id: '_vendas', nome: 'Vendas' }, { id: '_valor', nome: 'Valor', tipo: 'r' }] : [];
    const cols = area.id === PF ? [...extra, ...campos.slice(0, 3)] : campos;
    const lin = S.entries.filter(e => e.area === area.id).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14);
    if (!lin.length) return `<div class="card"><h3>Últimos lançamentos</h3><p class="vazio">Nenhum lançamento ainda.</p></div>`;
    const val = (e, c) => {
      if (c.id === '_vendas') return C.FRENTES_PF.reduce((t, f) => t + Number(e.data[pfCampo(f.id, 'vendas')] || 0), 0);
      if (c.id === '_valor') return C.FRENTES_PF.reduce((t, f) => t + Number(e.data[pfCampo(f.id, 'valor')] || 0), 0);
      return Number(e.data[c.id] || 0);
    };
    return `<div class="card"><h3>Últimos lançamentos</h3><div class="rolar"><table class="tabela">
      <thead><tr><th>Dia</th>${cols.map(c => `<th class="n">${esc(c.nome)}</th>`).join('')}<th>Quem</th><th>Obs.</th></tr></thead>
      <tbody>${lin.map(e => `<tr><td><button class="link" data-ir-dia="${area.id}|${e.day}">${dataSem(e.day)}</button></td>${cols.map(c => `<td class="n">${fmt(val(e, c), c.tipo)}</td>`).join('')}<td>${esc(e.author || '')}</td><td style="max-width:260px;color:var(--soft);font-size:13px">${esc((e.data.obs || '').slice(0, 140))}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function extrasArea(area) {
    const p = periodo();
    const g = c => soma(area.id, c, p.inicio, p.fim);
    if (area.id === PF) {
      const pac = area.secoes.find(s => s.nome === 'Vendas por pacote').campos.map(c => [c.nome, g(c.id)]);
      const tot = pac.reduce((t, x) => t + x[1], 0);
      return `<div class="card"><h3>Funil por frente</h3>${C.FRENTES_PF.map(f => `<p style="margin:10px 0 6px;color:var(--soft)"><b>${esc(f.nome)}</b></p>${funilHTML([
          ['Contatos', g(pfCampo(f.id, 'contatos'))], ['Respostas', g(pfCampo(f.id, 'respostas'))], ['Propostas', g(pfCampo(f.id, 'propostas'))], ['Vendas', g(pfCampo(f.id, 'vendas'))]])}`).join('')}</div>
        <div class="card"><h3>Vendas por pacote</h3>${tot ? funilHTML(pac).replace(/<span class="conv">.*?<\/span>/g, '') : '<p class="vazio">Sem vendas por pacote no período.</p>'}
          <p class="aviso" style="margin-top:12px">Respondidos em até 1h útil: <b>${fmtPct(pct(g('leads_1h'), g('leads_recebidos')))}</b> de ${num(g('leads_recebidos'))} leads · Upgrades: <b>${num(g('upgrades'))}</b> · Vendas de outros produtos: <b>${num(g('cruzadas'))}</b></p></div>`;
    }
    if (area.id === MK) {
      const canais = leadsCanal.map(c => [area.secoes[1].campos.find(x => x.id === c).nome, g(c)]);
      const lt = g('lead_trafego'), inv = g('investimento');
      return `<div class="card"><h3>Leads por canal</h3>${funilHTML(canais).replace(/<span class="conv">.*?<\/span>/g, '')}
        <p class="aviso" style="margin-top:12px">Custo por lead do tráfego: <b>${lt ? real(inv / lt) : '—'}</b> · Taxa de abertura dos e-mails: <b>${fmtPct(pct(g('email_aberturas'), g('email_enviados')))}</b> · Saldo do grupo: <b>${num(g('grupo_entradas') - g('grupo_saidas'))}</b></p></div>`;
    }
    if (area.id === PJ) {
      const on = g('diag_online'), re = g('diag_reuniao'), co = g('contratos_online'), cr = g('contratos_reuniao');
      const vence = on + re < 6 ? 'Ainda poucos diagnósticos para comparar (mínimo sugerido: 3 de cada).' : pct(co, on) > pct(cr, re) ? 'Diagnóstico online está convertendo mais.' : pct(cr, re) > pct(co, on) ? 'Diagnóstico em reunião está convertendo mais.' : 'Empate até agora.';
      return `<div class="card"><h3>Teste de outubro: online x reunião</h3><div class="rolar"><table class="tabela"><thead><tr><th>Caminho</th><th class="n">Diagnósticos</th><th class="n">Contratos</th><th class="n">Conversão</th></tr></thead>
        <tbody><tr><td>Diagnóstico online</td><td class="n">${num(on)}</td><td class="n">${num(co)}</td><td class="n">${fmtPct(pct(co, on))}</td></tr>
        <tr><td>Diagnóstico em reunião</td><td class="n">${num(re)}</td><td class="n">${num(cr)}</td><td class="n">${fmtPct(pct(cr, re))}</td></tr></tbody></table></div>
        <p class="aviso" style="margin-top:12px">${esc(vence)} A escolha para novembro é feita em 31/10.</p></div>
        <div class="card"><h3>Funil Black PJ</h3>${funilHTML([['Inscrições', g('inscricoes')], ['Diagnósticos', on + re], ['Devolutivas', g('devolutivas')], ['Propostas', g('propostas')], ['Contratos', co + cr]])}</div>`;
    }
    if (area.id === OP) {
      const sla = [
        ['Venda recebida no mesmo dia', g('recebidas_mesmo_dia'), g('vendas_recebidas')],
        ['Boas-vindas em até 24h', g('boas_vindas_24h'), g('vendas_recebidas')],
        ['Onboarding em até 7 dias', g('onboarding_7d'), g('onboarding_7d') + g('onboarding_atrasado')],
        ['Primeira apuração no prazo', g('entregas_prazo'), g('entregas_prazo') + g('entregas_atraso')],
        ['Notas 9 ou 10', g('notas_9_10'), g('pesquisas')],
        ['Cashback em até 7 dias', g('cashback_prazo'), g('cashback_liberado')],
      ];
      return `<div class="card"><h3>Prazos combinados</h3><div class="rolar"><table class="tabela"><thead><tr><th>Prazo</th><th class="n">Cumprido</th><th class="n">Base</th><th class="n">%</th></tr></thead><tbody>${sla.map(([n, a, b]) => {
        const v = pct(a, b); const c = v == null ? 'neutro' : v >= 90 ? 'ok' : v >= 75 ? 'atencao' : 'ruim';
        return `<tr><td>${esc(n)}</td><td class="n">${num(a)}</td><td class="n">${num(b)}</td><td class="n"><span class="flag ${c}">${fmtPct(v)}</span></td></tr>`;
      }).join('')}</tbody></table></div></div>`;
    }
    return '';
  }

  function areaHTML(area) {
    const p = periodo();
    const metas = C.METAS.filter(m => m.area === area.id);
    const f = t => t.area === area.id || (t.area === 'geral' && (t.dono || '').toLowerCase().includes(area.nome.split(' ')[0].toLowerCase()));
    const serie = area.id === PF
      ? C.FRENTES_PF.map((fr, i) => ({ nome: fr.nome, cor: ['#F5B700', '#F0A010', '#FFE58A', '#5BC48A'][i], valor: d => soma(PF, pfCampo(fr.id, 'vendas'), d, d) }))
      : [{ nome: area.grafico.nome, cor: '#F5B700', valor: d => soma(area.id, area.grafico.campo, d, d) }];
    return `${tarefasAtrasadas(area.id).length ? `<div class="alertas"><div class="alerta"><b>${tarefasAtrasadas(area.id).length} tarefa(s) atrasada(s)</b> nesta área.</div></div>` : ''}
    <div class="cab"><div><h2>${esc(area.nome)}</h2><p>${esc(area.descricao)} Dono: <b>${esc(area.dono)}</b>.</p></div>
      <div class="acoes">${seletorPeriodo()}</div></div>
    ${metas.length ? `<div class="grid kpis">${metas.map(kpiHTML).join('')}</div>` : ''}
    <div class="duas">
      <div class="col">${formHTML(area)}${historicoHTML(area)}</div>
      <div class="col">
        <div class="card"><h3>${esc(area.id === PF ? 'Vendas por dia e por frente' : area.grafico.nome)}</h3>${graficoHTML(serie, p.inicio, p.fim)}</div>
        ${extrasArea(area)}
        ${tarefasHTML(f, 'Tarefas da área', true, area.id)}
      </div>
    </div>`;
  }

  // ---------- render ----------
  function render() {
    const ativo = document.activeElement;
    const keep = ativo && ativo.name && ativo.closest('form') ? ativo.name : null;
    const corpo = S.aba === 'geral' ? geralHTML() : areaHTML(AREA[S.aba] || C.AREAS[0]);
    $app.innerHTML = topoHTML() + `<main>${corpo}</main>`;
    if (keep) { const el = $app.querySelector(`[name="${keep}"]`); if (el && el.type !== 'date') el.focus(); }
  }

  async function carregar() {
    const j = await api('GET', '/api/estado');
    S.entries = j.entries.map(e => ({ ...e, data: e.data || {} }));
    S.tasks = j.tasks; S.metas = j.metas || {};
    render();
  }

  // ---------- eventos ----------
  $app.addEventListener('click', async ev => {
    const t = ev.target.closest('button, a') || ev.target;
    if (t.dataset.aba) { S.aba = t.dataset.aba; gravarLocal('aba', S.aba); render(); window.scrollTo(0, 0); return; }
    if (t.dataset.apagar) {
      if (!confirm('Apagar esta tarefa?')) return;
      await api('DELETE', '/api/tasks/' + t.dataset.apagar);
      S.tasks = S.tasks.filter(x => String(x.id) !== t.dataset.apagar); render(); toast('Tarefa apagada'); return;
    }
    if (t.dataset.limpar) {
      const area = t.dataset.limpar, dia = S.dia[area] || hoje();
      if (!confirm(`Apagar os números de ${dataBR(dia)} em ${nomeArea(area)}?`)) return;
      await api('DELETE', `/api/entries/${area}/${dia}`);
      S.entries = S.entries.filter(e => !(e.area === area && e.day === dia)); render(); toast('Dia apagado'); return;
    }
    if (t.dataset.irDia) { const [a, d] = t.dataset.irDia.split('|'); S.dia[a] = d; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (t.hasAttribute && t.hasAttribute('data-editar-metas')) { S.editarMetas = !S.editarMetas; render(); return; }
    if (t.dataset && t.dataset.sair !== undefined) { await api('POST', '/api/logout'); location.reload(); }
  });

  $app.addEventListener('change', async ev => {
    const t = ev.target;
    if (t.dataset.periodo !== undefined) { S.periodo = t.value; gravarLocal('periodo', S.periodo); render(); return; }
    if (t.dataset.dia) { S.dia[t.dataset.dia] = t.value || hoje(); render(); return; }
    if (t.dataset.tarefa) {
      const feito = t.checked;
      let quem = S.autor;
      if (feito && !quem) { quem = (prompt('Seu nome (fica registrado quem concluiu):') || '').trim(); if (quem) { S.autor = quem; gravarLocal('autor', quem); } }
      try {
        const row = await api('PATCH', '/api/tasks/' + t.dataset.tarefa, { feito, feito_por: feito ? quem : null });
        S.tasks = S.tasks.map(x => (x.id === row.id ? row : x)); render();
      } catch (e) { if (e.message !== 'login') toast(e.message, true); }
    }
  });

  $app.addEventListener('submit', async ev => {
    ev.preventDefault();
    const f = ev.target;
    try {
      if (f.dataset.formArea) {
        const area = f.dataset.formArea;
        const fd = new FormData(f);
        const dia = fd.get('dia'), autor = String(fd.get('autor') || '').trim();
        if (!autor) { toast('Coloque seu nome', true); return; }
        S.autor = autor; gravarLocal('autor', autor);
        const data = {};
        for (const [k, v] of fd.entries()) if (!['dia', 'autor'].includes(k) && v !== '') data[k] = k === 'obs' ? v : Number(String(v).replace(',', '.'));
        const row = await api('PUT', `/api/entries/${area}/${dia}`, { data, autor });
        S.entries = S.entries.filter(e => !(e.area === area && e.day === dia)).concat([{ ...row, data: row.data || {} }]);
        render(); toast(`Números de ${dataBR(dia)} salvos`);
      } else if (f.hasAttribute('data-nova-tarefa')) {
        const fd = new FormData(f);
        const row = await api('POST', '/api/tasks', { titulo: fd.get('titulo'), dono: fd.get('dono'), prazo: fd.get('prazo'), area: fd.get('area') });
        S.tasks.push(row); render(); toast('Tarefa criada');
      } else if (f.hasAttribute('data-form-metas')) {
        const fd = new FormData(f); const body = {};
        for (const [k, v] of fd.entries()) body[k] = Number(v);
        S.metas = await api('PUT', '/api/metas', body); S.editarMetas = false; render(); toast('Metas salvas');
      }
    } catch (e) { if (e.message !== 'login') toast(e.message, true); }
  });

  // ---------- login ----------
  function telaLogin() {
    $app.innerHTML = `<div class="login"><form data-login>
      <h1>Black 2026<br><span>Painel de resultados</span></h1>
      <p>Contador do Trader · Grupo CDT</p>
      <label>Senha da equipe<input type="password" name="senha" autocomplete="current-password" required autofocus></label>
      <div class="erro" id="erro"></div>
      <button class="btn">Entrar</button></form></div>`;
    $app.querySelector('[data-login]').addEventListener('submit', async ev => {
      ev.preventDefault(); ev.stopPropagation();
      try { await api('POST', '/api/login', { senha: new FormData(ev.target).get('senha') }); await carregar(); }
      catch (e) { document.getElementById('erro').textContent = e.message; }
    }, { once: false });
  }

  (async () => {
    try {
      const me = await api('GET', '/api/me');
      if (!me.autenticado) return telaLogin();
      await carregar();
      setInterval(() => { if (!document.querySelector('form[data-form-area] input:focus, form textarea:focus, .nova-tarefa input:focus')) carregar().catch(() => {}); }, 120000);
    } catch (e) { if (e.message !== 'login') $app.innerHTML = '<p class="carregando">Não foi possível carregar o painel. Atualize a página.</p>'; }
  })();
})();
