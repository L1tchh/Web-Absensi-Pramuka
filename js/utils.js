
function uid(prefix) {
  prefix = prefix || "id";
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function genTagCode(existingCodes) {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code;
  do {
    code = "";
    for (var i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (existingCodes.indexOf(code) !== -1);
  return code;
}


function fmtDate(dateStr) {
  if (!dateStr) return "-";
  try {
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}


function todayStr() {
  return new Date().toISOString().slice(0, 10);
}


function daysUntil(dateStr) {
  var today = new Date(todayStr() + "T00:00:00");
  var target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}


function getNextSchedule(schedules) {
  var today = todayStr();
  var upcoming = schedules.filter(function (s) { return s.date >= today; });
  upcoming.sort(function (a, b) { return a.date > b.date ? 1 : -1; });
  return upcoming.length ? upcoming[0] : null;
}


function reminderText(days) {
  if (days === 0) return "Hari ini!";
  if (days === 1) return "Besok";
  if (days < 0) return "Terlewat";
  return days + " hari lagi";
}


function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str === null || str === undefined ? "" : String(str);
  return div.innerHTML;
}
