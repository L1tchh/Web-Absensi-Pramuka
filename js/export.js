
function exportAllToExcel(data) {
  if (typeof XLSX === "undefined") {
    alert("Fitur export Excel butuh koneksi internet untuk memuat pustaka SheetJS. Periksa koneksi lalu coba lagi.");
    return;
  }

  var wb = XLSX.utils.book_new();

  var pesertaSheet = data.members.map(function (m) {
    var s = buildMemberSummary(data, m);
    return {
      Nama: m.name,
      "Tag Code": m.tagCode,
      Hadir: s.hadir,
      Izin: s.izin,
      Alpa: s.alpa,
      "Total Sesi": s.total,
      "Persentase Kehadiran (%)": s.overallPct
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pesertaSheet), "Ringkasan Peserta");

  var jadwalSheet = data.schedules
    .slice()
    .sort(function (a, b) { return a.date > b.date ? 1 : -1; })
    .map(function (s) {
      var tt = data.trainingTypes.find(function (t) { return t.id === s.trainingTypeId; });
      return { Tanggal: fmtDate(s.date), "Jenis Latihan": tt ? tt.name : "-", Catatan: s.note || "" };
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jadwalSheet), "Jadwal");

  var absensiSheet = data.attendance
    .map(function (a) {
      var m = data.members.find(function (x) { return x.id === a.memberId; });
      var s = data.schedules.find(function (x) { return x.id === a.scheduleId; });
      if (!m || !s) return null;
      var tt = data.trainingTypes.find(function (t) { return t.id === s.trainingTypeId; });
      return {
        Tanggal: fmtDate(s.date),
        "Jenis Latihan": tt ? tt.name : "-",
        Nama: m.name,
        Status: a.status,
        "Skor Skill": a.skillScore === null || a.skillScore === undefined ? "" : a.skillScore
      };
    })
    .filter(function (row) { return row; });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(absensiSheet), "Detail Absensi");

  XLSX.writeFile(wb, "laporan-absensi-pramuka-" + todayStr() + ".xlsx");
}

function exportMemberToExcel(data, member) {
  if (typeof XLSX === "undefined") {
    alert("Fitur export Excel butuh koneksi internet untuk memuat pustaka SheetJS. Periksa koneksi lalu coba lagi.");
    return;
  }

  var s = buildMemberSummary(data, member);
  var wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
    Nama: member.name,
    "Tag Code": member.tagCode,
    Hadir: s.hadir,
    Izin: s.izin,
    Alpa: s.alpa,
    "Total Sesi": s.total,
    "Persentase Kehadiran (%)": s.overallPct
  }]), "Ringkasan");

  var riwayat = s.records.map(function (r) {
    var tt = data.trainingTypes.find(function (t) { return t.id === r.schedule.trainingTypeId; });
    return {
      Tanggal: fmtDate(r.schedule.date),
      "Jenis Latihan": tt ? tt.name : "-",
      Status: r.status,
      "Skor Skill": r.skillScore === null || r.skillScore === undefined ? "" : r.skillScore
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riwayat), "Riwayat");

  XLSX.writeFile(wb, "laporan-" + member.name.replace(/\s+/g, "-") + "-" + todayStr() + ".xlsx");
}

function printHtmlReport(title, bodyHtml) {
  var win = window.open("", "_blank");
  if (!win) {
    alert("Popup diblokir browser. Izinkan popup untuk halaman ini lalu coba lagi.");
    return;
  }
  win.document.write(
    "<html><head><title>" + title + "</title><style>" +
    "body{font-family:Segoe UI, Arial, sans-serif;color:#24301F;padding:24px;}" +
    "h1{font-size:20px;margin-bottom:4px;}" +
    "p.sub{color:#666;margin-top:0;margin-bottom:20px;font-size:12px;}" +
    "table{width:100%;border-collapse:collapse;margin-bottom:24px;}" +
    "th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left;}" +
    "th{background:#EEE7D3;}" +
    "h2{font-size:14px;margin-top:28px;border-bottom:2px solid #C89A3B;padding-bottom:4px;}" +
    "</style></head><body>" +
    "<h1>" + title + "</h1><p class=\"sub\">Dicetak pada " + fmtDate(todayStr()) + "</p>" +
    bodyHtml +
    "<script>window.onload = function () { setTimeout(function () { window.print(); }, 200); };<" + "/script>" +
    "</body></html>"
  );
  win.document.close();
}

function printAllReport(data) {
  var rows = data.members.map(function (m) {
    var s = buildMemberSummary(data, m);
    return "<tr><td>" + escapeHtml(m.name) + "</td><td>" + s.hadir + "</td><td>" + s.izin + "</td><td>" + s.alpa + "</td><td>" + s.total + "</td><td>" + s.overallPct + "%</td></tr>";
  }).join("");

  var body =
    "<h2>Ringkasan Kehadiran Seluruh Anggota</h2>" +
    "<table><tr><th>Nama</th><th>Hadir</th><th>Izin</th><th>Alpa</th><th>Total Sesi</th><th>% Kehadiran</th></tr>" +
    (rows || "<tr><td colspan=\"6\">Belum ada data.</td></tr>") +
    "</table>";

  printHtmlReport("Laporan Absensi Latihan Pramuka", body);
}

function printMemberReport(data, member) {
  var s = buildMemberSummary(data, member);
  var rows = s.records.map(function (r) {
    var tt = data.trainingTypes.find(function (t) { return t.id === r.schedule.trainingTypeId; });
    return "<tr><td>" + fmtDate(r.schedule.date) + "</td><td>" + (tt ? escapeHtml(tt.name) : "-") + "</td><td>" + r.status + "</td><td>" + (r.skillScore === null || r.skillScore === undefined ? "-" : r.skillScore) + "</td></tr>";
  }).join("");

  var body =
    "<h2>Ringkasan</h2>" +
    "<table><tr><th>Hadir</th><th>Izin</th><th>Alpa</th><th>Total Sesi</th><th>% Kehadiran</th></tr>" +
    "<tr><td>" + s.hadir + "</td><td>" + s.izin + "</td><td>" + s.alpa + "</td><td>" + s.total + "</td><td>" + s.overallPct + "%</td></tr></table>" +
    "<h2>Riwayat Latihan</h2>" +
    "<table><tr><th>Tanggal</th><th>Latihan</th><th>Status</th><th>Skor</th></tr>" +
    (rows || "<tr><td colspan=\"4\">Belum ada riwayat.</td></tr>") +
    "</table>";

  printHtmlReport("Laporan Latihan \u2014 " + member.name, body);
}
