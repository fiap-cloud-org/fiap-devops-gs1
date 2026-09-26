(() => {
  "use strict";

  const HISTORY = 30;
  const INTERVAL_MS = 5000;
  const samples = [];
  const counters = { ok: 0, fail: 0 };

  const $ = (id) => document.getElementById(id);
  const el = {
    pill: $("health-pill"),
    pillLabel: $("health-label"),
    latency: $("health-latency"),
    ok: $("health-ok"),
    fail: $("health-fail"),
    avg: $("health-avg"),
    max: $("health-max"),
    last: $("health-last"),
    bars: $("bars"),
    uptime: $("uptime"),
  };

  function formatUptime(total) {
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d) return `${d}d ${h}h ${m}min`;
    if (h) return `${h}h ${m}min`;
    if (m) return `${m}min ${s}s`;
    return `${s}s`;
  }

  const okTimes = () => samples.filter((x) => x.ok).map((x) => x.ms);

  // Escala = 3x a mediana (mínimo 20 ms): um pico isolado, como a primeira
  // requisição, não achata as demais barras. Valores acima da escala ficam em 100%.
  function chartScale() {
    const times = okTimes().sort((a, b) => a - b);
    const median = times.length ? times[Math.floor(times.length / 2)] : 0;
    return Math.max(20, median * 3);
  }

  function barHtml(sample, scale) {
    if (!sample) return '<span class="bar bar--empty" style="height:3px"></span>';
    if (!sample.ok) return '<span class="bar bar--fail" style="height:100%" title="falha"></span>';
    const pct = Math.min(100, Math.max(8, Math.round((sample.ms / scale) * 100)));
    return `<span class="bar" style="height:${pct}%" title="${sample.ms} ms"></span>`;
  }

  function renderBars() {
    const scale = chartScale();
    const offset = HISTORY - samples.length;
    let html = "";
    for (let i = 0; i < HISTORY; i++) html += barHtml(samples[i - offset], scale);
    el.bars.innerHTML = html;
  }

  function renderStats(sample) {
    const times = okTimes();
    if (times.length) {
      const total = times.reduce((acc, ms) => acc + ms, 0);
      el.avg.textContent = `${Math.round(total / times.length)} ms`;
      el.max.textContent = `${Math.max(...times)} ms`;
    }
    el.ok.textContent = counters.ok;
    el.fail.textContent = counters.fail;
    el.pill.dataset.state = sample.ok ? "ok" : "fail";
    el.pillLabel.textContent = sample.ok ? `saudável · ${sample.ms} ms` : "sem resposta";
    el.latency.textContent = sample.ok ? sample.ms : "--";
    const time = new Date().toLocaleTimeString("pt-BR");
    el.last.textContent = sample.ok
      ? `Última verificação às ${time}: HTTP 200, status ok.`
      : `Última verificação às ${time}: falhou.`;
  }

  function record(sample) {
    samples.push(sample);
    if (samples.length > HISTORY) samples.shift();
    counters[sample.ok ? "ok" : "fail"]++;
    renderStats(sample);
    renderBars();
  }

  async function check() {
    const start = performance.now();
    try {
      const res = await fetch("/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      record({ ok: body.status === "ok", ms: Math.max(1, Math.round(performance.now() - start)) });
    } catch {
      record({ ok: false, ms: 0 });
    }
  }

  if (el.uptime) {
    let seconds = Number.parseInt(el.uptime.dataset.seconds, 10) || 0;
    setInterval(() => {
      seconds++;
      el.uptime.textContent = formatUptime(seconds);
    }, 1000);
  }

  renderBars();
  check();
  setInterval(check, INTERVAL_MS);
})();
