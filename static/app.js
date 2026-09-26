(function () {
  "use strict";

  var HISTORY = 30;
  var INTERVAL_MS = 5000;
  var samples = [];
  var ok = 0;
  var fail = 0;

  var pill = document.getElementById("health-pill");
  var pillLabel = document.getElementById("health-label");
  var latencyEl = document.getElementById("health-latency");
  var okEl = document.getElementById("health-ok");
  var failEl = document.getElementById("health-fail");
  var lastEl = document.getElementById("health-last");
  var barsEl = document.getElementById("bars");
  var uptimeEl = document.getElementById("uptime");

  function formatUptime(total) {
    var d = Math.floor(total / 86400);
    var h = Math.floor((total % 86400) / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    if (d) return d + "d " + h + "h " + m + "min";
    if (h) return h + "h " + m + "min";
    if (m) return m + "min " + s + "s";
    return s + "s";
  }

  function renderBars() {
    var max = 1;
    samples.forEach(function (x) { if (x.ok && x.ms > max) max = x.ms; });
    var html = "";
    for (var i = 0; i < HISTORY; i++) {
      var sample = samples[i - (HISTORY - samples.length)];
      if (!sample) {
        html += '<span class="bar bar--empty" style="height:3px"></span>';
      } else if (!sample.ok) {
        html += '<span class="bar bar--fail" style="height:100%" title="falha"></span>';
      } else {
        var pct = Math.max(8, Math.round((sample.ms / max) * 100));
        html += '<span class="bar" style="height:' + pct + '%" title="' + sample.ms + ' ms"></span>';
      }
    }
    barsEl.innerHTML = html;
  }

  function record(sample) {
    samples.push(sample);
    if (samples.length > HISTORY) samples.shift();
    if (sample.ok) ok++; else fail++;
    okEl.textContent = ok;
    failEl.textContent = fail;
    pill.dataset.state = sample.ok ? "ok" : "fail";
    pillLabel.textContent = sample.ok ? "saudável · " + sample.ms + " ms" : "sem resposta";
    latencyEl.textContent = sample.ok ? sample.ms : "--";
    var time = new Date().toLocaleTimeString("pt-BR");
    lastEl.textContent = sample.ok
      ? "Última verificação às " + time + ": HTTP 200, status ok."
      : "Última verificação às " + time + ": falhou.";
    renderBars();
  }

  function check() {
    var start = performance.now();
    fetch("/health", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (body) {
        record({ ok: body.status === "ok", ms: Math.max(1, Math.round(performance.now() - start)) });
      })
      .catch(function () {
        record({ ok: false, ms: 0 });
      });
  }

  if (uptimeEl) {
    var seconds = parseInt(uptimeEl.dataset.seconds, 10) || 0;
    setInterval(function () {
      seconds++;
      uptimeEl.textContent = formatUptime(seconds);
    }, 1000);
  }

  renderBars();
  check();
  setInterval(check, INTERVAL_MS);
})();
