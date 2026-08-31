/* ==========================================================================
   render-login.js
   Menggambar layar login: pilihan Pembina / Anggota, lalu form masing-masing.
   ========================================================================== */

function renderLogin(container, data) {
  var wrap = document.createElement("div");
  wrap.className = "login-screen";
  wrap.innerHTML =
    '<div class="login-title">' +
      '<span class="icon-lg">&#129517;</span>' +
      '<h1 class="display">ABSENSI LATIHAN PRAMUKA</h1>' +
    "</div>" +
    '<p class="subtitle">Presensi, jadwal, dan perkembangan skill anggota regu</p>' +
    '<div id="login-body"></div>';
  container.appendChild(wrap);

  var body = wrap.querySelector("#login-body");
  showLoginChoice();

  function showLoginChoice() {
    body.innerHTML =
      '<div class="login-cards">' +
        '<button class="login-card" id="choose-admin" type="button">' +
          '<span class="login-card-icon">&#128737;</span>' +
          '<span class="login-card-title">Login Pembina</span>' +
          '<span class="login-card-sub">Kelola jadwal, peserta &amp; absensi</span>' +
        "</button>" +
        '<button class="login-card" id="choose-member" type="button">' +
          '<span class="login-card-icon">&#127894;</span>' +
          '<span class="login-card-title">Login Anggota</span>' +
          '<span class="login-card-sub">Masuk pakai tag code kamu</span>' +
        "</button>" +
      "</div>";
    body.querySelector("#choose-admin").addEventListener("click", showAdminForm);
    body.querySelector("#choose-member").addEventListener("click", showMemberForm);
  }

  function showAdminForm() {
    body.innerHTML =
      '<div class="login-form">' +
        "<h2>Login Pembina</h2>" +
        "<label>Kata sandi</label>" +
        '<input type="password" id="admin-password" class="input" placeholder="Kata sandi admin">' +
        '<p class="error-text" id="admin-error"></p>' +
        '<div class="form-actions">' +
          '<button class="btn btn-outline" id="admin-back" type="button">Kembali</button>' +
          '<button class="btn btn-primary" id="admin-submit" type="button">Masuk</button>' +
        "</div>" +
      "</div>";

    var input = body.querySelector("#admin-password");
    var errorEl = body.querySelector("#admin-error");
    body.querySelector("#admin-back").addEventListener("click", showLoginChoice);
    body.querySelector("#admin-submit").addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    input.focus();

    function submit() {
      if (input.value === data.adminPassword) {
        goAdmin();
      } else {
        errorEl.textContent = "Kata sandi admin salah.";
      }
    }
  }

  function showMemberForm() {
    body.innerHTML =
      '<div class="login-form">' +
        "<h2>Login Anggota</h2>" +
        "<label>Tag code</label>" +
        '<input type="text" id="member-tagcode" class="input mono" placeholder="CONTOH: 7QK3XZ" maxlength="6">' +
        '<p class="error-text" id="member-error"></p>' +
        '<div class="form-actions">' +
          '<button class="btn btn-outline" id="member-back" type="button">Kembali</button>' +
          '<button class="btn btn-primary" id="member-submit" type="button">Masuk</button>' +
        "</div>" +
      "</div>";

    var input = body.querySelector("#member-tagcode");
    var errorEl = body.querySelector("#member-error");
    body.querySelector("#member-back").addEventListener("click", showLoginChoice);
    body.querySelector("#member-submit").addEventListener("click", submit);
    input.addEventListener("input", function () { input.value = input.value.toUpperCase(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    input.focus();

    function submit() {
      var code = input.value.trim().toUpperCase();
      var found = data.members.find(function (m) { return m.tagCode === code; });
      if (found) {
        goMember(found.id);
      } else {
        errorEl.textContent = "Tag code tidak ditemukan. Cek kembali kode yang diberikan pembina.";
      }
    }
  }
}
