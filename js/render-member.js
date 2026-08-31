
function renderMember(container, data, memberId) {
  var member = data.members.find(function (m) { return m.id === memberId; });
  if (!member) {
    container.innerHTML = '<div class="member-app"><p class="empty-text">Data anggota tidak ditemukan.</p></div>';
    return;
  }

  var summary = buildMemberSummary(data, member);
  var breakdown = buildTrainingBreakdown(data, member);

  var wrap = document.createElement("div");
  wrap.className = "member-app";

  var trainingCardsHtml = breakdown.map(function (pt) {
    if (!pt.hasData) {
      return (
        '<div class="training-card">' +
          '<div class="training-card-title">&#127894; ' + escapeHtml(pt.training.name) + "</div>" +
          '<p class="empty-text small">Belum ada catatan untuk latihan ini.</p>' +
        "</div>"
      );
    }
    return (
      '<div class="training-card">' +
        '<div class="training-card-title">&#127894; ' + escapeHtml(pt.training.name) + "</div>" +
        '<div class="training-card-row">' +
          badgeRingHtml(pt.attendancePct, 64) +
          '<div class="training-card-meta">' +
            '<p class="small-label">Kehadiran latihan ini</p>' +
            '<p class="small-label">' + pt.totalT + " sesi tercatat</p>" +
          "</div>" +
        "</div>" +
        '<div class="training-card-divider">' +
          "<div>" +
            '<p class="small-label">Skor skill rata-rata</p>' +
            '<p class="mono score-big">' + (pt.avgScore === null ? "-" : pt.avgScore) + "</p>" +
          "</div>" +
          '<div class="align-right">' +
            '<p class="small-label">Peningkatan</p>' +
            improvementTagHtml(pt.improvement) +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }).join("");

  var historyRowsHtml = summary.records.slice().reverse().map(function (r) {
    var tt = data.trainingTypes.find(function (t) { return t.id === r.schedule.trainingTypeId; });
    return (
      "<tr><td class=\"mono\">" + fmtDate(r.schedule.date) + "</td>" +
      "<td>" + (tt ? escapeHtml(tt.name) : "-") + "</td>" +
      "<td>" + statusPillHtml(r.status) + "</td>" +
      "<td class=\"mono\">" + (r.status === STATUS.HADIR ? (r.skillScore === null || r.skillScore === undefined ? "-" : r.skillScore) : "-") + "</td></tr>"
    );
  }).join("");

  wrap.innerHTML =
    '<header class="app-header">' +
      '<div class="app-header-title member-title">' +
        '<span class="icon-md">&#127894;</span>' +
        "<div>" +
          '<p class="display leading-tight">' + escapeHtml(member.name) + "</p>" +
          '<p class="mono member-tag">Tag: ' + member.tagCode + "</p>" +
        "</div>" +
      "</div>" +
      '<button class="btn btn-ghost" id="member-logout" type="button">&#8617; Keluar</button>' +
    "</header>" +
    '<div class="tab-content">' +
      reminderCardHtml(data) +
      '<div class="overview-card">' +
        '<div class="badge-ring-wrap">' +
          badgeRingHtml(summary.overallPct, 110) +
          '<p class="badge-label">Kehadiran Keseluruhan</p>' +
          '<p class="badge-sub">' + summary.hadir + "/" + summary.total + " sesi</p>" +
        "</div>" +
        '<div class="mini-stats">' +
          miniStatHtml("Hadir", summary.hadir, "green") +
          miniStatHtml("Izin", summary.izin, "gold") +
          miniStatHtml("Alpa", summary.alpa, "red") +
        "</div>" +
        '<div class="overview-actions">' +
          '<button class="btn btn-primary" id="member-export-excel" type="button">&#11015; Unduh Laporan Excel</button>' +
          '<button class="btn btn-outline" id="member-print" type="button">&#128424; Cetak / Simpan PDF</button>' +
        "</div>" +
      "</div>" +
      "<div>" +
        '<h3 class="display section-title">PERKEMBANGAN PER SKILL LATIHAN</h3>' +
        '<div class="training-grid">' + (trainingCardsHtml || '<p class="empty-text">Belum ada jenis latihan.</p>') + "</div>" +
      "</div>" +
      "<div>" +
        '<h3 class="display section-title">RIWAYAT LATIHAN</h3>' +
        '<div class="table-card">' +
          '<table class="data-table">' +
            "<thead><tr><th>Tanggal</th><th>Latihan</th><th>Status</th><th>Skor</th></tr></thead>" +
            "<tbody>" + (historyRowsHtml || '<tr><td colspan="4" class="empty-cell">Belum ada riwayat latihan.</td></tr>') + "</tbody>" +
          "</table>" +
        "</div>" +
      "</div>" +
    "</div>";

  container.appendChild(wrap);

  wrap.querySelector("#member-logout").addEventListener("click", function () {
    if (confirm("Yakin ingin keluar?")) goLogin();
  });
  wrap.querySelector("#member-export-excel").addEventListener("click", function () { exportMemberToExcel(data, member); });
  wrap.querySelector("#member-print").addEventListener("click", function () { printMemberReport(data, member); });
}

function miniStatHtml(label, value, colorClass) {
  return (
    '<div class="mini-stat mini-stat-' + colorClass + '">' +
      '<span class="mini-stat-value mono">' + value + "</span>" +
      '<span class="mini-stat-label">' + label + "</span>" +
    "</div>"
  );
}

function statusPillHtml(status) {
  var map = {
    hadir: { label: "Hadir", cls: "pill-green" },
    izin: { label: "Izin", cls: "pill-gold" },
    alpa: { label: "Alpa", cls: "pill-red" }
  };
  var m = map[status] || map.alpa;
  return '<span class="status-pill ' + m.cls + '">' + m.label + "</span>";
}

function improvementTagHtml(value) {
  if (value === null || value === undefined) {
    return '<span class="improvement-none">Belum cukup data</span>';
  }
  if (value === 0) {
    return '<span class="improvement-flat">&#8213; Stabil</span>';
  }
  var up = value > 0;
  return (
    '<span class="' + (up ? "improvement-up" : "improvement-down") + '">' +
      (up ? "&#8593; +" : "&#8595; ") + value + " poin" +
    "</span>"
  );
}
