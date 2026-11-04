// Удирдлагын хэсэг: нэр дэвшигчдийн хүснэгт, зураг, санал хураалтын тохиргоо.
(function () {
  const KEY_STORE = 'shine2027-admin';
  const ROLE_LABEL = { prince: 'Ханхүү', princess: 'Гүнж' };
  const { esc, ensureShieldClip } = Shine;
  const $ = (s) => document.querySelector(s);

  let key = localStorage.getItem(KEY_STORE) || '';
  let rows = [];
  let departments = [];
  let counts = {};
  let settings = {};
  let pollTimer = null;

  const call = (url, opts = {}) => Shine.api(url, { ...opts, headers: { 'x-admin-key': key } });

  function say(el, text, isErr) {
    el.textContent = text;
    el.classList.toggle('err', !!isErr);
  }

  // ---------- нэвтрэх ----------
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    key = $('#pw').value;
    try {
      await loadAll();
      localStorage.setItem(KEY_STORE, key);
    } catch (err) {
      say($('#login-msg'), err.message, true);
    }
  });

  $('#logout').addEventListener('click', () => {
    localStorage.removeItem(KEY_STORE);
    location.reload();
  });

  async function loadAll() {
    const data = await call('/api/admin/overview');
    rows = data.candidates.map((c) => ({ ...c }));
    departments = data.departments.slice();
    applyOverview(data);
    renderRows();
    renderDepartments();
    $('#login').hidden = true;
    $('#panel').hidden = false;
    clearInterval(pollTimer);
    pollTimer = setInterval(refreshStats, 5000);
  }

  async function refreshStats() {
    try {
      applyOverview(await call('/api/admin/overview'));
    } catch { /* дараагийн удаа */ }
  }

  function applyOverview(data) {
    counts = {};
    for (const role of ['prince', 'princess']) data.results[role].list.forEach((c) => { counts[c.id] = c.votes; });
    settings = data.settings;
    $('#total').textContent = data.totalVoters;
    $('#s-open').checked = settings.votingOpen;
    $('#s-ip').checked = settings.onePerIp;
    $('#reveal').textContent = settings.revealed ? 'Тодруулгыг нуух' : 'Ханхүү, Гүнж тодруулах';
    luckyNext = data.guests.guests > 0 && data.lucky.winners === 0;
    deadline = Shine.deadlineFrom(settings.revealAt, data.now);
    if (document.activeElement !== $('#cd-min')) $('#cd-min').value = settings.countdownSeconds / 60;
    tickTimer();
    renderResults(data);
    renderRunoff(data);
    renderLucky(data.lucky);
    renderGuests(data.guests);
  }

  // ---------- азтан сугалах ----------
  // Ганц азтан: тодорсны дараа эргүүлэх товч нуугдаж, азтаны нэр харагдана
  function renderLucky(l) {
    const w = l.current;
    $('#lk-eligible').textContent = l.guests;
    $('#lk-winner').hidden = !w;
    if (w) {
      const done = Shine.deadlineFrom(w.at, l.now) <= Date.now();
      $('#lk-winner-name').textContent = done ? w.name : '…';
      $('#lk-winner-table').textContent = done ? `Азтан · Ширээ ${w.table}${w.claimed ? ' · утсаа холбосон' : ''}` : 'хүрд эргэж байна';
    }
    $('#lk-draw').hidden = !!w;
    $('#lk-draw').disabled = !l.eligible;
    $('#lk-reset').hidden = !w;
  }

  // ---------- зочдын жагсаалт ----------
  let guestsDirty = false;
  function renderGuests(g) {
    $('#g-total').textContent = g.guests;
    $('#g-tables').textContent = g.tables;
    $('#g-linked').textContent = g.linked;
    $('#g-unlink').hidden = !g.linked;
    // засаж байх үед 5 секунд тутмын шинэчлэл бичсэнийг дарж бичихгүй
    if (!guestsDirty) $('#g-paste').value = g.list.map((x) => `${x.table}\t${x.name}`).join('\n');
  }

  $('#g-paste').addEventListener('input', () => { guestsDirty = true; });

  function parseGuests(text) {
    const out = [];
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, idx) => {
      const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      const cells = line.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean);
      if (idx === 0 && /ширээ|table|нэр/i.test(cells[0] || '')) return; // гарчиг мөр
      if (cells.length < 2) return;
      out.push({ table: cells[0].replace(/^(ширээ|table)\s*№?\s*/i, ''), name: cells.slice(1).join(' ') });
    });
    return out;
  }

  $('#g-save').addEventListener('click', async () => {
    const guests = parseGuests($('#g-paste').value);
    if (!guests.length && $('#g-paste').value.trim()) {
      return say($('#g-msg'), 'Унших мөр олдсонгүй. Ширээ, нэр гэсэн хоёр баганатай эсэхийг шалгана уу.', true);
    }
    if (!guests.length && !confirm('Жагсаалт хоосон байна. Бүх зочдыг устгах уу?')) return;
    try {
      guestsDirty = false;
      applyOverview(await call('/api/admin/guests', { method: 'PUT', body: { guests } }));
      say($('#g-msg'), `Хадгаллаа — ${guests.length} зочин.`);
    } catch (err) {
      guestsDirty = true;
      say($('#g-msg'), err.message, true);
    }
  });

  $('#g-unlink').addEventListener('click', async () => {
    if (!confirm('Бүх зочны утасны холболтыг цэвэрлэх үү? Зочид ширээ, нэрээ дахин сонгох хэрэгтэй болно.')) return;
    try {
      applyOverview(await call('/api/admin/claims-clear', { method: 'POST' }));
      say($('#g-msg'), 'Утасны холболтыг цэвэрлэлээ.');
    } catch (err) {
      say($('#g-msg'), err.message, true);
    }
  });

  $('#lk-draw').addEventListener('click', async () => {
    const btn = $('#lk-draw');
    btn.disabled = true;
    try {
      const l = await call('/api/admin/lucky-draw', { method: 'POST' });
      renderLucky(l);
      say($('#lk-msg'), 'Хүрд эргэж байна — проектор дээр харагдана.');
    } catch (err) {
      say($('#lk-msg'), err.message, true);
    } finally {
      setTimeout(refreshStats, 18500); // хоёр шаттай хүрд дуусахад товч дахин идэвхжинэ
    }
  });

  $('#lk-reset').addEventListener('click', async () => {
    if (!confirm('Тодорсон азтаныг цуцлах уу? Хүрдийг дахин эргүүлж шинэ азтан сонгох боломжтой болно. Энэ үйлдлийг буцаах боломжгүй.')) return;
    try {
      renderLucky(await call('/api/admin/lucky-reset', { method: 'POST' }));
      say($('#lk-msg'), 'Азтаныг цуцаллаа. Хүрдийг дахин эргүүлж болно.');
    } catch (err) {
      say($('#lk-msg'), err.message, true);
    }
  });

  // ---------- тоолуур ----------
  let deadline = null;
  let luckyNext = false; // тоолуур дуусахад хүрд эргэнэ (шууд тодрохгүй)
  function tickTimer() {
    const running = deadline != null;
    const left = running ? Math.max(0, deadline - Date.now()) : 0;
    $('#cd-left').textContent = running ? Shine.clock(left) : '—';
    $('#cd-label').textContent = running
      ? (luckyNext ? 'үлдсэн — дуусахад санал хураалт хаагдаж, хүрд эргэнэ' : 'үлдсэн — дуусахад ялагчид автоматаар тодорно')
      : settings.revealed ? 'ялагчид тодорсон' : 'тоолуур эхлээгүй';
    $('#cd-start').hidden = running;
    $('#cd-stop').hidden = !running;
    if (running && left === 0) {
      deadline = null;
      setTimeout(refreshStats, 800);
    }
  }
  setInterval(() => { if (deadline != null) tickTimer(); }, 250);

  $('#cd-min').addEventListener('change', async (e) => {
    const seconds = Math.round(parseFloat(e.target.value) * 60);
    if (!Number.isFinite(seconds) || seconds < 10) return say($('#ctrl-msg'), 'Хугацаа хамгийн багадаа 10 секунд байна.', true);
    try {
      await call('/api/admin/settings', { method: 'POST', body: { countdownSeconds: seconds } });
      say($('#ctrl-msg'), `Тоолуурын хугацаа: ${Shine.clock(seconds * 1000)}.`);
    } catch (err) {
      say($('#ctrl-msg'), err.message, true);
    }
  });

  $('#cd-start').addEventListener('click', async () => {
    try {
      const seconds = Math.round(parseFloat($('#cd-min').value) * 60);
      if (Number.isFinite(seconds) && seconds >= 10) {
        await call('/api/admin/settings', { method: 'POST', body: { countdownSeconds: seconds } });
      }
      applyOverview(await call('/api/admin/countdown', { method: 'POST' }));
      say($('#ctrl-msg'), 'Тоолуур эхэллээ. Хугацаа дуусахад ялагчид автоматаар тодорно.');
    } catch (err) {
      say($('#ctrl-msg'), err.message, true);
    }
  });

  $('#cd-stop').addEventListener('click', async () => {
    try {
      applyOverview(await call('/api/admin/countdown-cancel', { method: 'POST' }));
      say($('#ctrl-msg'), 'Тоолуурыг зогсоолоо. Санал хураалт нээлттэй хэвээр байна.');
    } catch (err) {
      say($('#ctrl-msg'), err.message, true);
    }
  });

  function renderResults(data) {
    const html = ['prince', 'princess'].map((role) => {
      const res = data.results[role];
      const items = res.list.slice().sort((x, y) => y.votes - x.votes);
      const max = Math.max(1, ...items.map((c) => c.votes));
      const roundNote = res.round > 1 ? ` <small class="hint">${res.round}-р шат · дахин санал хураалт</small>` : '';
      const tieNote = res.tied.length
        ? `<p class="tie">Санал тэнцсэн: ${items.filter((c) => res.tied.includes(c.id)).map((c) => esc(c.firstName)).join(', ')}</p>`
        : '';
      return `<div><h2>${ROLE_LABEL[role]}${roundNote}</h2>${tieNote}${items.map((c) => `
        <div class="bar-row">
          <span class="label" title="${esc(c.department)}">${esc(c.lastName)} ${esc(c.firstName)}</span>
          <span class="bar"><i style="width:${(c.votes / max) * 100}%"></i></span>
          <b>${c.votes}</b>
        </div>`).join('') || '<p class="hint">Нэр дэвшигч алга</p>'}</div>`;
    });
    $('#results').innerHTML = html.join('');
  }

  // Санал тэнцсэн үед зөвхөн тэнцсэн нэр дэвшигчдийн дунд дахин санал хураах
  function renderRunoff(data) {
    const box = $('#runoff');
    const tied = ['prince', 'princess'].filter((r) => data.results[r].tied.length);
    const parts = [];
    if (data.round.n > 1) {
      const roles = Object.keys(data.round.roles).map((r) => ROLE_LABEL[r]).join(', ');
      parts.push(`<p>Одоо <b>${data.round.n}-р шат</b> явагдаж байна: ${roles} — зөвхөн тэнцсэн нэр дэвшигчдийн дунд дахин санал хураалт.</p>
        <button class="btn ghost" type="button" data-runoff-cancel>Энэ шатыг цуцлах</button>`);
    }
    if (tied.length && data.settings.votingOpen) {
      parts.push('<p>Санал тэнцсэн байна. Дахин санал хураахын тулд эхлээд «Санал хураалт нээлттэй»-г унтраана уу.</p>');
    } else if (tied.length) {
      parts.push(`<p>Санал тэнцсэн байна. Тэнцсэн нэр дэвшигчдийн дунд дахин санал хураах боломжтой. Бүх хүн шинэ шатанд дахин нэг удаа санал өгнө.</p>
        <div class="controls">${tied.map((r) => `<button class="btn" type="button" data-runoff="${r}">${ROLE_LABEL[r]}: дахин санал хураах</button>`).join('')}
        ${tied.length === 2 ? '<button class="btn" type="button" data-runoff="prince,princess">Хоёуланд нь дахин санал хураах</button>' : ''}</div>`);
    }
    const sig = JSON.stringify([data.round.n, data.settings.votingOpen, tied,data.results.prince.tied, data.results.princess.tied]);
    if (box.dataset.sig === sig) return; // товчнууд дарагдаж байх үед дахин зурахгүй
    box.dataset.sig = sig;
    box.hidden = !parts.length;
    box.innerHTML = parts.join('');
    box.querySelectorAll('[data-runoff]').forEach((btn) => btn.addEventListener('click', () => startRunoff(btn.dataset.runoff.split(','))));
    const cancel = box.querySelector('[data-runoff-cancel]');
    if (cancel) cancel.addEventListener('click', cancelRunoff);
  }

  async function startRunoff(roles) {
    const names = roles.map((r) => ROLE_LABEL[r]).join(', ');
    if (!confirm(`${names} — тэнцсэн нэр дэвшигчдийн дунд дахин санал хураах уу? Санал хураалт дахин нээгдэж, тодруулга нуугдана.`)) return;
    try {
      applyOverview(await call('/api/admin/runoff', { method: 'POST', body: { roles } }));
      say($('#ctrl-msg'), `Дахин санал хураалт эхэллээ (${names}).`);
    } catch (err) {
      say($('#ctrl-msg'), err.message, true);
    }
  }

  async function cancelRunoff() {
    if (!confirm('Энэ шатыг цуцлах уу? Энэ шатанд өгсөн саналууд устна.')) return;
    try {
      applyOverview(await call('/api/admin/runoff-cancel', { method: 'POST' }));
      say($('#ctrl-msg'), 'Дахин санал хураалтыг цуцаллаа.');
    } catch (err) {
      say($('#ctrl-msg'), err.message, true);
    }
  }

  // ---------- тохиргоо ----------
  async function setSetting(patch, msg) {
    try {
      const r = await call('/api/admin/settings', { method: 'POST', body: patch });
      settings = r.settings;
      say($('#ctrl-msg'), msg);
      refreshStats();
    } catch (err) {
      say($('#ctrl-msg'), err.message, true);
    }
  }

  $('#s-open').addEventListener('change', (e) =>
    setSetting({ votingOpen: e.target.checked }, e.target.checked ? 'Санал хураалт нээгдлээ.' : 'Санал хураалт хаагдлаа.'));
  $('#s-ip').addEventListener('change', (e) =>
    setSetting({ onePerIp: e.target.checked }, e.target.checked ? 'Нэг IP хаягаас нэг л санал авна.' : 'IP хаягийн хязгаарлалт унтарлаа.'));

  $('#reveal').addEventListener('click', () => {
    const on = !settings.revealed;
    const patch = on ? { revealed: true, votingOpen: false } : { revealed: false };
    setSetting(patch, on ? 'Ялагчид тодорлоо! Санал хураалт хаагдсан.' : 'Тодруулгыг нууллаа.');
  });

  $('#reset').addEventListener('click', async () => {
    if (!confirm('Бүх саналыг устгах уу? Энэ үйлдлийг буцаах боломжгүй.')) return;
    try {
      await call('/api/admin/reset-votes', { method: 'POST' });
      say($('#ctrl-msg'), 'Бүх санал устгагдлаа.');
      refreshStats();
    } catch (err) {
      say($('#ctrl-msg'), err.message, true);
    }
  });

  // ---------- нэр дэвшигчдийн хүснэгт ----------
  function renderRows() {
    ensureShieldClip();
    const tbody = $('#rows');
    tbody.innerHTML = '';
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      const initials = ((r.lastName || '').charAt(0) + (r.firstName || '').charAt(0)).toUpperCase() || '?';
      tr.innerHTML = `
        <td><select data-f="role" aria-label="Төрөл">
          <option value="prince"${r.role === 'prince' ? ' selected' : ''}>Ханхүү</option>
          <option value="princess"${r.role === 'princess' ? ' selected' : ''}>Гүнж</option></select></td>
        <td><select data-f="department" aria-label="Тэнхим">${deptOptions(r.department)}</select></td>
        <td><input type="text" data-f="lastName" value="${esc(r.lastName)}" aria-label="Овог"></td>
        <td><input type="text" data-f="firstName" value="${esc(r.firstName)}" aria-label="Нэр"></td>
        <td><div class="photo-cell">
          <span class="thumb"><span class="shield">${r.photo ? `<img src="${esc(r.photo)}" alt="">` : `<span class="initials">${esc(initials)}</span>`}</span></span>
          <label>${r.photo ? 'Солих' : 'Зураг оруулах'}<input type="file" accept="image/*"></label>
          ${r.photo ? '<button class="icon-btn" type="button" data-unphoto title="Зураг хасах" aria-label="Зураг хасах">×</button>' : ''}
        </div></td>
        <td><button class="icon-btn" type="button" data-del title="Мөр устгах" aria-label="Мөр устгах">🗑</button></td>`;
      tr.querySelectorAll('[data-f]').forEach((inp) =>
        inp.addEventListener('input', () => {
          r[inp.dataset.f] = inp.value;
          if (inp.dataset.f === 'department') renderDepartments(); // тэнхим тус бүрийн тоо шинэчлэгдэнэ
          dirty();
        }));
      tr.querySelector('input[type=file]').addEventListener('change', (e) => uploadPhoto(r, e.target.files[0]));
      tr.querySelector('[data-del]').addEventListener('click', () => {
        const votes = counts[r.id] || 0;
        if (votes && !confirm(`${r.firstName} ${votes} санал авсан байна. Устгах уу?`)) return;
        rows.splice(i, 1);
        renderRows();
        renderDepartments();
        dirty();
      });
      const un = tr.querySelector('[data-unphoto]');
      if (un) un.addEventListener('click', () => { r.photo = ''; renderRows(); dirty(); });
      tbody.appendChild(tr);
    });
  }

  function dirty() {
    say($('#save-msg'), 'Өөрчлөлтийг хадгалахын тулд «Хадгалах» дарна уу.');
  }

  // ---------- тэнхимүүд ----------
  function deptOptions(selected) {
    const list = selected && !departments.includes(selected) ? [...departments, selected] : departments;
    return `<option value="">— Тэнхим сонгох —</option>` + list.map((d) =>
      `<option value="${esc(d)}"${d === selected ? ' selected' : ''}>${esc(d)}</option>`).join('');
  }

  function renderDepartments() {
    const box = $('#dept-list');
    if (!departments.length) {
      box.innerHTML = '<p class="hint">Тэнхим алга. Доор нэрийг нь бичээд «Тэнхим нэмэх» дарна уу.</p>';
      return;
    }
    box.innerHTML = departments.map((d, i) => {
      const n = rows.filter((r) => r.department === d).length;
      return `<li class="dept-chip">
        <span>${esc(d)}</span><small>${n} нэр дэвшигч</small>
        <button class="icon-btn" type="button" data-rename="${i}" title="Нэр солих" aria-label="${esc(d)} — нэр солих">✎</button>
        <button class="icon-btn" type="button" data-remove="${i}" title="Устгах" aria-label="${esc(d)} — устгах">×</button>
      </li>`;
    }).join('');
    box.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => {
      const d = departments[+b.dataset.remove];
      const used = rows.filter((r) => r.department === d).length;
      if (used) return say($('#dept-msg'), `«${d}»-д ${used} нэр дэвшигч бүртгэлтэй тул эхлээд тэднийг өөр тэнхимд шилжүүлнэ үү.`, true);
      departments.splice(+b.dataset.remove, 1);
      renderDepartments();
      renderRows();
      dirty();
    }));
    box.querySelectorAll('[data-rename]').forEach((b) => b.addEventListener('click', () => {
      const old = departments[+b.dataset.rename];
      const name = (prompt('Тэнхимийн шинэ нэр', old) || '').trim();
      if (!name || name === old) return;
      if (departments.includes(name)) return say($('#dept-msg'), `«${name}» тэнхим аль хэдийн байна.`, true);
      departments[+b.dataset.rename] = name;
      rows.forEach((r) => { if (r.department === old) r.department = name; });
      renderDepartments();
      renderRows();
      dirty();
    }));
  }

  function addDepartment(name) {
    name = String(name || '').trim();
    if (!name || departments.includes(name)) return false;
    departments.push(name);
    return true;
  }

  $('#dept-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#dept-name').value.trim();
    if (!name) return;
    if (!addDepartment(name)) return say($('#dept-msg'), `«${name}» тэнхим аль хэдийн байна.`, true);
    $('#dept-name').value = '';
    say($('#dept-msg'), `«${name}» нэмэгдлээ.`);
    renderDepartments();
    renderRows();
    dirty();
  });

  document.querySelectorAll('[data-add]').forEach((b) =>
    b.addEventListener('click', () => {
      rows.push({ role: b.dataset.add, department: '', lastName: '', firstName: '', photo: '' });
      renderRows();
      renderDepartments();
      $('#rows').lastElementChild.querySelector('[data-f=department]').focus();
    }));

  async function save() {
    const missing = rows.filter((r) => !String(r.firstName || '').trim()).length;
    const noDept = rows.filter((x) => String(x.firstName || '').trim() && !x.department).length;
    const r = await call('/api/admin/candidates', { method: 'PUT', body: { candidates: rows, departments } });
    rows = r.candidates.map((c) => ({ ...c }));
    departments = r.departments.slice();
    applyOverview(r);
    renderRows();
    renderDepartments();
    if (noDept) {
      return say($('#save-msg'), `Хадгаллаа. ${noDept} нэр дэвшигчид тэнхим сонгоогүй байна — тэд «Бусад» хэсэгт харагдана.`, true);
    }
    say($('#save-msg'), missing
      ? `Хадгаллаа. Нэр бичээгүй ${missing} мөрийг алгаслаа.`
      : `Хадгаллаа — ${rows.length} нэр дэвшигч.`);
  }

  $('#save').addEventListener('click', () => save().catch((err) => say($('#save-msg'), err.message, true)));

  // Зургийг 5:6 харьцаагаар тайрч, жижигрүүлээд илгээнэ
  async function uploadPhoto(row, file) {
    if (!file) return;
    say($('#save-msg'), 'Зураг байршуулж байна…');
    try {
      const img = await loadImage(file);
      const W = 500, H = 600;
      const scale = Math.max(W / img.width, H / img.height);
      const sw = W / scale, sh = H / scale;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      canvas.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 3, sw, sh, 0, 0, W, H);
      const { url } = await call('/api/admin/upload', { method: 'POST', body: { dataUrl: canvas.toDataURL('image/jpeg', 0.86) } });
      row.photo = url;
      await save();
    } catch (err) {
      say($('#save-msg'), err.message || 'Зургийг уншиж чадсангүй', true);
    }
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Энэ файлыг зураг болгон уншиж чадсангүй'));
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- Excel / CSV-ээс оруулах ----------
  function parseTable(text, defaultRole) {
    const out = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    lines.forEach((line, idx) => {
      const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      let cells = line.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
      if (idx === 0 && cells.some((c) => /тэнхим|овог|^нэр$|төрөл/i.test(c))) return; // гарчиг мөр
      let role = defaultRole;
      const first = (cells[0] || '').toLowerCase();
      if (/ханх|prince|^х$/.test(first)) { role = 'prince'; cells = cells.slice(1); }
      else if (/гүнж|princess|^г$/.test(first)) { role = 'princess'; cells = cells.slice(1); }
      let department = '', lastName = '', firstName = '';
      if (cells.length >= 3) [department, lastName, firstName] = cells;
      else if (cells.length === 2) [lastName, firstName] = cells;
      else firstName = cells[0] || '';
      if (firstName) out.push({ role, department, lastName, firstName, photo: '' });
    });
    return out;
  }

  $('#csv').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (f) $('#paste').value = await f.text();
    e.target.value = '';
  });

  $('#import').addEventListener('click', () => {
    const added = parseTable($('#paste').value, $('#paste-role').value);
    if (!added.length) return say($('#import-msg'), 'Унших мөр олдсонгүй. Тэнхим, овог, нэр гэсэн баганатай эсэхийг шалгана уу.', true);
    rows = $('#paste-replace').checked ? added : rows.concat(added);
    // хүснэгтэд байсан шинэ тэнхимүүдийг жагсаалтад автоматаар нэмнэ
    const newDepts = [...new Set(added.map((r) => r.department))].filter((d) => addDepartment(d));
    renderDepartments();
    renderRows();
    $('#paste').value = '';
    say($('#import-msg'), `${added.length} мөр хүснэгтэд нэмэгдлээ${newDepts.length ? `, ${newDepts.length} шинэ тэнхим жагсаалтад орлоо` : ''}. Дээрх «Хадгалах» товчийг дарна уу.`);
    dirty();
  });

  if (key) loadAll().catch(() => { localStorage.removeItem(KEY_STORE); key = ''; });
})();
