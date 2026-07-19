function nowIso() {
  return new Date().toISOString();
}

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDateTime(iso) {
  if (!iso) return '未完成';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

module.exports = {
  nowIso,
  formatDateTime
};
