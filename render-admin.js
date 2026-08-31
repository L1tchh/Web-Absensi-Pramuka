/* ==========================================================================
   render-admin.js
   Semua tampilan & logika panel Pembina (admin), dipecah per tab:
   Ringkasan, Peserta, Jenis Latihan, Jadwal, Ambil Absensi, Pengaturan.
   ========================================================================== */

var adminActiveTab = "dashboard";
var ADMIN_TABS = [
  { id: "dashboard", label: "Ringkasan" },
  { id: "peserta", label: "Peserta" },
  { id: "latihan", label: "Jenis Latihan" },
  { id: "jadwal", label: "Jadwal" },
  { id: "absensi", label: "Ambil Absensi" },
  { id: "pengaturan", label: "Pengaturan" }
];

function renderAdmin(container, data) {
  var wrap = document.createElement("div");
  wrap.className = "admin-app";
  wrap.innerHTML =
    '<header class="app-header">' +
      '<div class="app-header-title"><span class="icon-md">&#128737;</span><span class="display">PANEL PEMBINA</span></div>' +
      '<button class="btn btn-ghost" id="admin-logout" type="button">&#8617; Keluar</button>' +
    "</header>" +
    '<nav class="tab-nav" id="admin-nav"></nav>' +
    '<div class="tab-content" id="admin-content"></div>';
  container.appendChild(wrap);

  wrap.querySelector("#admin-logout").addEventListener("click", function () {
    if (confirm("Yakin ingin keluar dari panel pembina?")) goLogin();
  });

  var nav = wrap.querySelector("#admin-nav");
  ADMIN_TABS.forEach(function (t) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-btn" + (adminActiveTab === t.id ? " active" : "");
    btn.textContent = t.label;
    btn.addEventListener("click", function () {
      adminActiveTab = t.id;
      render();
    });
    nav.appendChild(btn);
  });

  var content = wrap.querySelector("#admin-content");
  if (adminActiveTab === "dashboard") renderAdminDashboard(content, data);
  else if (adminActiveTab === "peserta") renderAdminPeserta(content, data);
  else if (adminActiveTab === "latihan") renderAdminLatihan(content, data);
  else if (adminActiveTab === "jadwal") renderAdminJadwal(content, data);
  else if (adminActiveTab === "absensi") renderAdminAbsensi(content, data);
  else if (adminActiveTab === "pengaturan") renderAdminPengaturan(content, data);
}

/* -------------------------- Ringkasan / Dashboard -------------------------- */

function renderAdminDashboard(content, data) {
  var totalMembers = data.members.length;
  var totalSchedules = data.schedules.length;
  var totalRecords = data.attendance.length;
  var hadirCount = data.attendance.filter(function (a) { return a.status === STATUS.HADIR; }).length;
  var overallPct = totalRecords ? Math.round((hadirCount / totalRecords) * 100) : 0;

  content.innerHTML =
    reminderCardHtml(data) +
    '<div class="stat-cards">' +
      statCardHtml("Total Anggota", totalMembers) +
      statCardHtml("Total Jadwal", totalSchedules) +
      statCardHtml("Jenis Latihan", data.trainingTypes.length) +
    "</div>" +
    '<div class="overview-card">' +
      '<div class="badge-ring-wrap">' +
        badgeRingHtml(overallPct, 100) +
        '<p class="badge-label">Kehadiran Keseluruhan</p>' +
        '<p class="badge-sub">' + hadirCount + "/" + totalRecords + " sesi tercatat</p>" +
      "</div>" +
      '<div class="overview-actions">' +
        '<button class="btn btn-primary" id="export-excel" type="button">&#11015; Unduh Laporan Excel</button>' +
        '<button class="btn btn-outline" id="print-report" type="button">&#128424; Cetak / Simpan PDF</button>' +
      "</div>" +
    "</div>" +
    (totalMembers === 0 ? '<p class="empty-text">Belum ada peserta. Tambahkan anggota di tab <b>Peserta</b> untuk mulai mencatat absensi.</p>' : "");

  content.querySelector("#export-excel").addEventListener("click", function () { exportAllToExcel(data); });
  content.querySelector("#print-report").addEventListener("click", function () { printAllReport(data); });
}

function statCardHtml(label, value) {
  return '<div class="stat-card"><p class="stat-value mono">' + value + '</p><p class="stat-label">' + escapeHtml(label) + "</p></div>";
}

function reminderCardHtml(data) {
  var next = getNextSchedule(data.schedules);
  if (!next) return "";
  var tt = data.trainingTypes.find(function (t) { return t.id === next.trainingTypeId; });
  var days = daysUntil(next.date);
  var urgent = days <= 1;
  return (
    '<div class="reminder-card' + (urgent ? " urgent" : "") + '">' +
      '<span class="reminder-icon">&#128276;</span>' +
      '<div class="reminder-body">' +
        '<p class="reminder-label">Latihan berikutnya</p>' +
        '<p class="reminder-text">' + (tt ? escapeHtml(tt.name) : "Latihan") + " &mdash; " + fmtDate(next.date) +
        (next.note ? " &middot; " + escapeHtml(next.note) : "") + "</p>" +
      "</div>" +
      '<span class="reminder-badge">' + reminderText(days) + "</span>" +
    "</div>"
  );
}

function badgeRingHtml(pct, size) {
  size = size || 88;
  var clamped = Math.max(0, Math.min(100, Math.round(pct)));
  var deg = clamped * 3.6;
  var inner = size - 16;
  return (
    '<div class="badge-ring" style="width:' + size + "px;height:" + size + "px;background:conic-gradient(var(--gold) " + deg + "deg, rgba(0,0,0,0.08) 0deg);\">" +
      '<div class="badge-ring-inner" style="width:' + inner + "px;height:" + inner + 'px;">' +
        '<span class="mono badge-ring-text">' + clamped + "%</span>" +
      "</div>" +
    "</div>"
  );
}

/* -------------------------------- Peserta -------------------------------- */

function renderAdminPeserta(content, data) {
  content.innerHTML =
    '<div class="form-row">' +
      '<div class="form-field grow">' +
        "<label>Nama peserta baru</label>" +
        '<input type="text" id="new-member-name" class="input" placeholder="cth. Ahmad Fauzan">' +
      "</div>" +
      '<button class="btn btn-primary" id="add-member" type="button">+ Tambah &amp; Buat Tag Code</button>' +
    "</div>" +
    '<div class="table-card">' +
      '<table class="data-table">' +
        "<thead><tr><th>Nama</th><th>Tag Code</th><th></th></tr></thead>" +
        '<tbody id="member-rows"></tbody>' +
      "</table>" +
    "</div>";

  var nameInput = content.querySelector("#new-member-name");
  content.querySelector("#add-member").addEventListener("click", addMember);
  nameInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addMember(); });

  function addMember() {
    var name = nameInput.value.trim();
    if (!name) return;
    var tagCode = genTagCode(data.members.map(function (m) { return m.tagCode; }));
    var newMember = { id: uid("mbr"), name: name, tagCode: tagCode };
    persist(Object.assign({}, data, { members: data.members.concat([newMember]) }));
    render();
  }

  var rows = content.querySelector("#member-rows");
  if (data.members.length === 0) {
    rows.innerHTML = '<tr><td colspan="3" class="empty-cell">Belum ada peserta.</td></tr>';
    return;
  }

  data.members.forEach(function (m) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td class="cell-strong">' + escapeHtml(m.name) + "</td>" +
      '<td><span class="tagcode-pill mono">' + m.tagCode + "</span></td>" +
      '<td class="row-actions">' +
        '<button class="icon-btn" data-action="edit" type="button" title="Ubah nama">&#9998;</button>' +
        '<button class="icon-btn" data-action="regen" type="button" title="Buat ulang tag code">&#128273;</button>' +
        '<button class="icon-btn danger" data-action="delete" type="button" title="Hapus">&#128465;</button>' +
      "</td>";

    tr.querySelector('[data-action="edit"]').addEventListener("click", function () {
      var newName = prompt("Ubah nama peserta:", m.name);
      if (newName === null) return;
      newName = newName.trim();
      if (!newName) return;
      var updated = data.members.map(function (x) { return x.id === m.id ? Object.assign({}, x, { name: newName }) : x; });
      persist(Object.assign({}, data, { members: updated }));
      render();
    });

    tr.querySelector('[data-action="regen"]').addEventListener("click", function () {
      var tagCode = genTagCode(data.members.map(function (x) { return x.tagCode; }));
      var updated = data.members.map(function (x) { return x.id === m.id ? Object.assign({}, x, { tagCode: tagCode }) : x; });
      persist(Object.assign({}, data, { members: updated }));
      render();
    });

    tr.querySelector('[data-action="delete"]').addEventListener("click", function () {
      if (!confirm('Hapus peserta "' + m.name + '"? Semua data absensinya juga akan terhapus.')) return;
      var updatedMembers = data.members.filter(function (x) { return x.id !== m.id; });
      var updatedAttendance = data.attendance.filter(function (a) { return a.memberId !== m.id; });
      persist(Object.assign({}, data, { members: updatedMembers, attendance: updatedAttendance }));
      render();
    });

    rows.appendChild(tr);
  });
}

/* ----------------------------- Jenis Latihan ------------------------------ */

function renderAdminLatihan(content, data) {
  content.innerHTML =
    '<div class="form-row">' +
      '<div class="form-field grow">' +
        "<label>Nama jenis latihan / skill</label>" +
        '<input type="text" id="new-training-name" class="input" placeholder="cth. Navigasi Darat">' +
      "</div>" +
      '<button class="btn btn-primary" id="add-training" type="button">+ Tambah</button>' +
    "</div>" +
    '<div class="training-type-grid" id="training-type-grid"></div>';

  var input = content.querySelector("#new-training-name");
  content.querySelector("#add-training").addEventListener("click", addTraining);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") addTraining(); });

  function addTraining() {
    var name = input.value.trim();
    if (!name) return;
    persist(Object.assign({}, data, { trainingTypes: data.trainingTypes.concat([{ id: uid("tt"), name: name }]) }));
    render();
  }

  var grid = content.querySelector("#training-type-grid");
  if (data.trainingTypes.length === 0) {
    grid.innerHTML = '<p class="empty-text">Belum ada jenis latihan.</p>';
    return;
  }

  data.trainingTypes.forEach(function (t) {
    var card = document.createElement("div");
    card.className = "training-type-card";
    card.innerHTML =
      '<span class="training-type-name">&#127894; ' + escapeHtml(t.name) + "</span>" +
      '<div class="row-actions">' +
        '<button class="icon-btn" data-action="edit" type="button" title="Ubah">&#9998;</button>' +
        '<button class="icon-btn danger" data-action="delete" type="button" title="Hapus">&#128465;</button>' +
      "</div>";

    card.querySelector('[data-action="edit"]').addEventListener("click", function () {
      var newName = prompt("Ubah nama jenis latihan:", t.name);
      if (newName === null) return;
      newName = newName.trim();
      if (!newName) return;
      var updated = data.trainingTypes.map(function (x) { return x.id === t.id ? Object.assign({}, x, { name: newName }) : x; });
      persist(Object.assign({}, data, { trainingTypes: updated }));
      render();
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", function () {
      if (!confirm('Hapus jenis latihan "' + t.name + '"? Jadwal yang memakainya juga akan terhapus.')) return;
      var updatedTypes = data.trainingTypes.filter(function (x) { return x.id !== t.id; });
      var updatedSchedules = data.schedules.filter(function (s) { return s.trainingTypeId !== t.id; });
      persist(Object.assign({}, data, { trainingTypes: updatedTypes, schedules: updatedSchedules }));
      render();
    });

    grid.appendChild(card);
  });
}

/* --------------------------------- Jadwal --------------------------------- */

function renderAdminJadwal(content, data) {
  var sorted = data.schedules.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });

  content.innerHTML =
    '<div class="form-row wrap">' +
      '<div class="form-field">' +
        "<label>Tanggal</label>" +
        '<input type="date" id="new-schedule-date" class="input">' +
      "</div>" +
      '<div class="form-field">' +
        "<label>Jenis latihan</label>" +
        '<select id="new-schedule-training" class="input">' +
          (data.trainingTypes.length
            ? data.trainingTypes.map(function (t) { return '<option value="' + t.id + '">' + escapeHtml(t.name) + "</option>"; }).join("")
            : '<option value="">(belum ada jenis latihan)</option>') +
        "</select>" +
      "</div>" +
      '<div class="form-field grow">' +
        "<label>Catatan (opsional)</label>" +
        '<input type="text" id="new-schedule-note" class="input" placeholder="cth. Lapangan utama, bawa tongkat">' +
      "</div>" +
      '<button class="btn btn-primary" id="add-schedule" type="button"' + (data.trainingTypes.length === 0 ? " disabled" : "") + ">+ Tambah Jadwal</button>" +
    "</div>" +
    (data.trainingTypes.length === 0 ? '<p class="hint-text">Buat jenis latihan dulu di tab "Jenis Latihan".</p>' : "") +
    '<div class="schedule-list" id="schedule-list"></div>';

  content.querySelector("#add-schedule").addEventListener("click", function () {
    var date = content.querySelector("#new-schedule-date").value;
    var trainingTypeId = content.querySelector("#new-schedule-training").value;
    var note = content.querySelector("#new-schedule-note").value.trim();
    if (!date || !trainingTypeId) return;
    var sched = { id: uid("sch"), date: date, trainingTypeId: trainingTypeId, note: note };
    persist(Object.assign({}, data, { schedules: data.schedules.concat([sched]) }));
    render();
  });

  var list = content.querySelector("#schedule-list");
  if (sorted.length === 0) {
    list.innerHTML = '<p class="empty-text">Belum ada jadwal latihan.</p>';
    return;
  }

  sorted.forEach(function (s) {
    var tt = data.trainingTypes.find(function (t) { return t.id === s.trainingTypeId; });
    var row = document.createElement("div");
    row.className = "schedule-row";
    row.innerHTML =
      '<div class="schedule-info">' +
        '<span class="schedule-date mono">' + fmtDate(s.date) + "</span>" +
        "<div>" +
          '<p class="schedule-training">' + (tt ? escapeHtml(tt.name) : "(dihapus)") + "</p>" +
          (s.note ? '<p class="schedule-note">' + escapeHtml(s.note) + "</p>" : "") +
        "</div>" +
      "</div>" +
      '<div class="row-actions">' +
        '<button class="icon-btn" data-action="edit" type="button" title="Ubah">&#9998;</button>' +
        '<button class="icon-btn danger" data-action="delete" type="button" title="Hapus">&#128465;</button>' +
      "</div>";

    row.querySelector('[data-action="edit"]').addEventListener("click", function () {
      var newDate = prompt("Ubah tanggal (format YYYY-MM-DD):", s.date);
      if (newDate === null) return;
      var newNote = prompt("Ubah catatan:", s.note || "");
      if (newNote === null) newNote = s.note;
      var updated = data.schedules.map(function (x) { return x.id === s.id ? Object.assign({}, x, { date: newDate || x.date, note: newNote }) : x; });
      persist(Object.assign({}, data, { schedules: updated }));
      render();
    });

    row.querySelector('[data-action="delete"]').addEventListener("click", function () {
      if (!confirm("Hapus jadwal ini? Data absensi yang terkait juga akan terhapus.")) return;
      var updatedSchedules = data.schedules.filter(function (x) { return x.id !== s.id; });
      var updatedAttendance = data.attendance.filter(function (a) { return a.scheduleId !== s.id; });
      persist(Object.assign({}, data, { schedules: updatedSchedules, attendance: updatedAttendance }));
      render();
    });

    list.appendChild(row);
  });
}

/* ------------------------------ Ambil Absensi ------------------------------ */

// State sementara (belum disimpan) untuk form absensi yang sedang diisi
var absensiSelectedSchedule = null;
var absensiRows = null;

function renderAdminAbsensi(content, data) {
  if (data.schedules.length === 0) {
    content.innerHTML = '<p class="empty-text">Buat jadwal dulu di tab "Jadwal" sebelum mengambil absensi.</p>';
    return;
  }
  if (data.members.length === 0) {
    content.innerHTML = '<p class="empty-text">Tambahkan peserta dulu di tab "Peserta" sebelum mengambil absensi.</p>';
    return;
  }

  var sorted = data.schedules.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  if (!absensiSelectedSchedule || !data.schedules.some(function (s) { return s.id === absensiSelectedSchedule; })) {
    absensiSelectedSchedule = sorted[0].id;
    absensiRows = null;
  }
  ensureAbsensiRows(data);

  var schedule = data.schedules.find(function (s) { return s.id === absensiSelectedSchedule; });
  var tt = data.trainingTypes.find(function (t) { return t.id === schedule.trainingTypeId; });

  content.innerHTML =
    '<div class="form-row wrap justify-between">' +
      '<div class="form-field">' +
        "<label>Pilih jadwal</label>" +
        '<select id="absensi-schedule-select" class="input">' +
          sorted.map(function (s) {
            var t2 = data.trainingTypes.find(function (t3) { return t3.id === s.trainingTypeId; });
            return '<option value="' + s.id + '"' + (s.id === absensiSelectedSchedule ? " selected" : "") + ">" + fmtDate(s.date) + " &mdash; " + (t2 ? escapeHtml(t2.name) : "-") + "</option>";
          }).join("") +
        "</select>" +
      "</div>" +
      '<div class="hint-text">Skill yang dilatih: <b>' + (tt ? escapeHtml(tt.name) : "-") + "</b></div>" +
      '<button class="btn btn-primary" id="save-absensi" type="button">&#128190; Simpan Absensi</button>' +
    "</div>" +
    '<div class="table-card">' +
      '<table class="data-table">' +
        "<thead><tr><th>Nama</th><th>Status</th><th>Skor Skill (jika hadir)</th></tr></thead>" +
        '<tbody id="absensi-rows"></tbody>' +
      "</table>" +
    "</div>";

  content.querySelector("#absensi-schedule-select").addEventListener("change", function (e) {
    absensiSelectedSchedule = e.target.value;
    absensiRows = null;
    render();
  });

  content.querySelector("#save-absensi").addEventListener("click", function () {
    var others = data.attendance.filter(function (a) { return a.scheduleId !== absensiSelectedSchedule; });
    var newRecords = data.members.map(function (m) {
      var row = absensiRows[m.id] || { status: STATUS.HADIR, skillScore: 70 };
      return {
        id: uid("att"),
        scheduleId: absensiSelectedSchedule,
        memberId: m.id,
        status: row.status,
        skillScore: row.status === STATUS.HADIR ? Number(row.skillScore) : null
      };
    });
    persist(Object.assign({}, data, { attendance: others.concat(newRecords) }));
    alert("Absensi tersimpan.");
    render();
  });

  var tbody = content.querySelector("#absensi-rows");
  data.members.forEach(function (m) {
    var row = absensiRows[m.id];
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td class="cell-strong">' + escapeHtml(m.name) + "</td>" +
      '<td class="status-buttons">' +
        statusButtonHtml(STATUS.HADIR, "Hadir", row.status) +
        statusButtonHtml(STATUS.IZIN, "Izin", row.status) +
        statusButtonHtml(STATUS.ALPA, "Alpa", row.status) +
      "</td>" +
      "<td>" +
        (row.status === STATUS.HADIR
          ? '<input type="range" min="0" max="100" value="' + row.skillScore + '" class="score-slider">' +
            ' <span class="mono score-value">' + row.skillScore + "</span>"
          : '<span class="dash">&mdash;</span>') +
      "</td>";

    tr.querySelectorAll("[data-status-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        absensiRows[m.id].status = btn.getAttribute("data-status-btn");
        render();
      });
    });

    var slider = tr.querySelector(".score-slider");
    if (slider) {
      slider.addEventListener("input", function () {
        absensiRows[m.id].skillScore = Number(slider.value);
        tr.querySelector(".score-value").textContent = slider.value;
      });
    }

    tbody.appendChild(tr);
  });
}

function ensureAbsensiRows(data) {
  if (absensiRows && Object.keys(absensiRows).length === data.members.length) return;
  var existing = data.attendance.filter(function (a) { return a.scheduleId === absensiSelectedSchedule; });
  var map = {};
  data.members.forEach(function (m) {
    var rec = existing.find(function (a) { return a.memberId === m.id; });
    map[m.id] = rec
      ? { status: rec.status, skillScore: rec.skillScore === null || rec.skillScore === undefined ? 70 : rec.skillScore }
      : { status: STATUS.HADIR, skillScore: 70 };
  });
  absensiRows = map;
}

function statusButtonHtml(status, label, current) {
  var cls = "status-btn status-" + status + (current === status ? " active" : "");
  return '<button class="' + cls + '" type="button" data-status-btn="' + status + '">' + label + "</button>";
}

/* ------------------------------- Pengaturan ------------------------------- */

function renderAdminPengaturan(content, data) {
  content.innerHTML =
    '<div class="settings-card">' +
      "<h3>&#128274; Ubah Kata Sandi Admin</h3>" +
      "<label>Kata sandi saat ini</label>" +
      '<input type="password" id="current-password" class="input">' +
      "<label>Kata sandi baru</label>" +
      '<input type="password" id="new-password" class="input">' +
      "<label>Konfirmasi kata sandi baru</label>" +
      '<input type="password" id="confirm-password" class="input">' +
      '<p id="settings-msg"></p>' +
      '<button class="btn btn-primary" id="save-password" type="button">Simpan Kata Sandi</button>' +
    "</div>";

  var msg = content.querySelector("#settings-msg");
  content.querySelector("#save-password").addEventListener("click", function () {
    var current = content.querySelector("#current-password").value;
    var next = content.querySelector("#new-password").value;
    var confirmVal = content.querySelector("#confirm-password").value;

    if (current !== data.adminPassword) {
      msg.className = "error-text";
      msg.textContent = "Kata sandi saat ini salah.";
      return;
    }
    if (next.length < 4) {
      msg.className = "error-text";
      msg.textContent = "Kata sandi baru minimal 4 karakter.";
      return;
    }
    if (next !== confirmVal) {
      msg.className = "error-text";
      msg.textContent = "Konfirmasi kata sandi tidak cocok.";
      return;
    }

    persist(Object.assign({}, data, { adminPassword: next }));
    msg.className = "success-text";
    msg.textContent = "Kata sandi berhasil diubah.";
    content.querySelector("#current-password").value = "";
    content.querySelector("#new-password").value = "";
    content.querySelector("#confirm-password").value = "";
  });
}
