(() => {
  'use strict';

  /* ================= helpers ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
  const todayKey = () => key(new Date());
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };
  const weekStart = k => { const d = parse(k); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return key(d); };
  const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60 ? (m % 60) + ' мин' : ''}`.trim() : `${m} мин`;

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const MGEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const MSHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const WD = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const WDS = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const fmtDay = k => { const d = parse(k); return `${d.getDate()} ${MGEN[d.getMonth()]}`; };
  const inDays = n => n === 0 ? 'сегодня' : n === 1 ? 'завтра' : n === 2 ? 'послезавтра' : n > 0 ? `через ${n} ${plural(n, 'день', 'дня', 'дней')}` : `${-n} ${plural(-n, 'день', 'дня', 'дней')} назад`;

  /* ================= state ================= */
  const seed = () => {
    const t = todayKey();
    const S = [
      { id: 'math', name: 'Математика', color: '#7d6a9c' },
      { id: 'rus', name: 'Русский язык', color: '#b07a8a' },
      { id: 'eng', name: 'Английский', color: '#6f8fa8' },
      { id: 'hist', name: 'История', color: '#a8875d' },
      { id: 'phys', name: 'Физика', color: '#6c9a8b' }
    ];
    return {
      v: 2,
      subjects: S,
      schedule: [
        { id: uid(), date: t, time: '09:00', end: '10:30', title: 'Лекция', subj: 'math' },
        { id: uid(), date: t, time: '10:45', end: '12:15', title: 'Семинар', subj: 'eng' },
        { id: uid(), date: t, time: '13:00', end: '14:30', title: 'Практика', subj: 'phys' },
        { id: uid(), date: addDays(t, 1), time: '09:00', end: '10:30', title: 'Лекция', subj: 'hist' }
      ],
      plans: [
        { id: uid(), date: t, text: 'Решить 10 задач по производным', done: true },
        { id: uid(), date: t, text: 'Выучить 20 слов по английскому', done: false },
        { id: uid(), date: t, text: 'Прочитать параграф 12 по истории', done: false }
      ],
      todos: [
        { id: uid(), text: 'Сдать книгу в библиотеку', done: false },
        { id: uid(), text: 'Распечатать методичку по физике', done: false },
        { id: uid(), text: 'Записаться к врачу', done: false }
      ],
      exams: [
        { id: uid(), subj: 'math', kind: 'Контрольная', date: addDays(t, 2), time: '09:00', topic: 'Производные и пределы', imp: true, grade: '',
          prep: [{ id: uid(), text: 'Таблица производных', done: true }, { id: uid(), text: 'Задачи 1–20 из сборника', done: false }, { id: uid(), text: 'Пределы: замечательные', done: false }] },
        { id: uid(), subj: 'eng', kind: 'Тест', date: addDays(t, 5), time: '10:45', topic: 'Present Perfect vs Past Simple', imp: false, grade: '',
          prep: [{ id: uid(), text: 'Правила и исключения', done: false }, { id: uid(), text: 'Упражнения 4–9', done: false }] },
        { id: uid(), subj: 'hist', kind: 'Зачёт', date: addDays(t, 12), time: '', topic: 'XIX век: реформы', imp: false, grade: '', prep: [] }
      ],
      workouts: [
        { id: uid(), date: t, time: '18:30', type: 'Зал', dur: 60, note: 'Ноги + пресс', done: false },
        { id: uid(), date: addDays(t, 2), time: '08:00', type: 'Бег', dur: 30, note: '5 км', done: false },
        { id: uid(), date: addDays(t, 4), time: '19:00', type: 'Йога', dur: 45, note: '', done: false }
      ],
      study: [
        { id: uid(), date: t, subj: 'math', min: 50, at: Date.now() - 3 * 36e5 },
        { id: uid(), date: t, subj: 'eng', min: 25, at: Date.now() - 2 * 36e5 },
        { id: uid(), date: addDays(t, -1), subj: 'hist', min: 40, at: Date.now() - 26 * 36e5 },
        { id: uid(), date: addDays(t, -1), subj: 'math', min: 30, at: Date.now() - 27 * 36e5 }
      ],
      reviews: {},
      settings: { focus: 25, short: 5, long: 15, every: 4, sound: true }
    };
  };

  const reT = /^\d{2}:\d{2}$/, reD = /^\d{4}-\d{2}-\d{2}$/, reC = /^#[0-9a-f]{6}$/i, reId = /^[A-Za-z0-9_-]{1,40}$/;
  const sT = v => (typeof v === 'string' && reT.test(v)) ? v : '';
  const sN = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(10000, Math.round(n))) : d; };
  const sId = v => (typeof v === 'string' && reId.test(v)) ? v : uid();
  const sS = v => typeof v === 'string' ? v.slice(0, 500) : '';
  const arr = v => Array.isArray(v) ? v : [];
  function sanitize(d) {
    const ok = x => x && typeof x === 'object';
    const out = seed();
    out.subjects = arr(d.subjects).filter(ok).map(s => ({ id: sId(s.id), name: sS(s.name) || 'Предмет', color: reC.test(s.color || '') ? s.color : '#8a7a9c' }));
    if (!out.subjects.length) out.subjects = seed().subjects;
    const dt = v => (typeof v === 'string' && reD.test(v)) ? v : null;
    out.schedule = arr(d.schedule).filter(ok).filter(x => dt(x.date)).map(x => ({ id: sId(x.id), date: x.date, time: sT(x.time), end: sT(x.end), title: sS(x.title), subj: typeof x.subj === 'string' && reId.test(x.subj) ? x.subj : '' }));
    out.plans = arr(d.plans).filter(ok).filter(x => dt(x.date)).map(x => ({ id: sId(x.id), date: x.date, text: sS(x.text), done: !!x.done }));
    out.todos = arr(d.todos).filter(ok).map(x => ({ id: sId(x.id), text: sS(x.text), done: !!x.done }));
    out.exams = arr(d.exams).filter(ok).filter(x => dt(x.date)).map(x => ({ id: sId(x.id), subj: typeof x.subj === 'string' && reId.test(x.subj) ? x.subj : '', kind: sS(x.kind) || 'Контрольная', date: x.date, time: sT(x.time), topic: sS(x.topic), imp: !!x.imp, grade: sS(x.grade).slice(0, 10), prep: arr(x.prep).filter(ok).map(p => ({ id: sId(p.id), text: sS(p.text), done: !!p.done })) }));
    out.workouts = arr(d.workouts).filter(ok).filter(x => dt(x.date)).map(x => ({ id: sId(x.id), date: x.date, time: sT(x.time), type: sS(x.type) || 'Другое', dur: sN(x.dur, 60), note: sS(x.note), done: !!x.done }));
    out.study = arr(d.study).filter(ok).filter(x => dt(x.date)).map(x => ({ id: sId(x.id), date: x.date, subj: typeof x.subj === 'string' && reId.test(x.subj) ? x.subj : '', min: sN(x.min, 0), at: sN(x.at, Date.now()) && Number(x.at) || Date.now() }));
    out.reviews = {};
    if (ok(d.reviews)) for (const [k, r] of Object.entries(d.reviews)) if (reD.test(k) && ok(r)) out.reviews[k] = { mood: sN(r.mood, 0), wins: sS(r.wins), improve: sS(r.improve), tomorrow: sS(r.tomorrow) };
    const st = ok(d.settings) ? d.settings : {};
    out.settings = { focus: Math.min(180, Math.max(1, sN(st.focus, 25))), short: Math.min(60, Math.max(1, sN(st.short, 5))), long: Math.min(90, Math.max(1, sN(st.long, 15))), every: Math.min(8, Math.max(2, sN(st.every, 4))), sound: st.sound !== false };
    return out;
  }

  const emptyState = () => ({
    v: 2,
    subjects: [], schedule: [], plans: [], todos: [], exams: [], workouts: [], study: [], reviews: {},
    settings: { focus: 25, short: 5, long: 15, every: 4, sound: true }
  });

  let S = emptyState();
  const ui = { view: 'today', day: todayKey(), cal: new Date(new Date().getFullYear(), new Date().getMonth(), 1), calSel: todayKey(), gymWeek: weekStart(todayKey()), examTab: 'up', statR: 'day', sumDay: todayKey() };

  const subj = id => S.subjects.find(s => s.id === id) || { id: '', name: 'Без предмета', color: '#a698a9' };

  /* ================= API и сохранение ================= */
  let stateRev = 0, saveT = null, saving = false, pendingSave = false, offline = false;
  const setSave = (txt, warn) => { const el = $('#saveState'); if (!el) return; el.textContent = txt; el.classList.toggle('warn', !!warn); };

  function sessionExpired() {
    try { localStorage.setItem('bf.pending', JSON.stringify({ rev: stateRev, data: S })); } catch (_) {}
    location.href = '/login.html?next=' + encodeURIComponent('/');
  }

  async function load() {
    const me = await fetch('/api.php/me', { credentials: 'same-origin' });
    if (me.status === 401) { location.href = '/login.html'; return false; }
    if (!me.ok) throw new Error('me failed');
    const m = await me.json();
    stateRev = m.rev || 0;
    const r = await fetch('/api.php/state', { credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/login.html'; return false; }
    if (!r.ok) throw new Error('state failed');
    offline = r.headers.get('X-Offline') === '1';
    const j = await r.json();
    stateRev = j.rev;
    S = sanitize(j.data && j.data.v === 2 ? j.data : emptyState());
    const uname = (m.user && m.user.username) || '';
    const displayName = String((m.user && m.user.name) || '').trim() || uname;
    if ($('#userName')) $('#userName').textContent = displayName;
    if ($('#userLogin')) $('#userLogin').textContent = uname ? '@' + uname : '';
    if ($('#accountName')) $('#accountName').textContent = uname
      ? (displayName === uname ? '@' + uname : displayName + ' · @' + uname)
      : '—';
    return true;
  }

  async function saveNow(keepalive) {
    clearTimeout(saveT); saveT = null;
    if (saving) { pendingSave = true; return; }
    pendingSave = false; saving = true;
    setSave('Сохраняем…');
    try {
      let r = await fetch('/api.php/state', {
        method: 'PUT', credentials: 'same-origin', keepalive: !!keepalive,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rev: stateRev, data: S })
      });
      if (r.status === 401) { sessionExpired(); return; }
      if (r.status === 409) {
        const j = await r.json().catch(() => ({}));
        const overwrite = confirm('Данные изменены на другом устройстве. Сохранить мои изменения поверх? (Отмена — загрузить актуальные)');
        if (overwrite) {
          stateRev = j.rev || stateRev;
          r = await fetch('/api.php/state', {
            method: 'PUT', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rev: stateRev, data: S })
          });
        } else {
          const g = await fetch('/api.php/state', { credentials: 'same-origin' });
          if (g.ok) { const gj = await g.json(); stateRev = gj.rev; S = sanitize(gj.data); render(); setSave('Загружены актуальные данные'); return; }
        }
      }
      if (r.ok) {
        const j = await r.json(); stateRev = j.rev;
        offline = false; setSave('Сохранено');
        try { localStorage.removeItem('bf.pending'); } catch (_) {}
      } else { setSave('Не удалось сохранить — попробуем ещё', true); }
    } catch (_) {
      offline = true; setSave('Нет сети — изменения сохранены на устройстве', true);
      try { localStorage.setItem('bf.pending', JSON.stringify({ rev: stateRev, data: S })); } catch (_) {}
    } finally {
      saving = false;
      if (pendingSave) saveNow();
    }
  }

  function save(now) {
    pendingSave = true;
    clearTimeout(saveT);
    setSave(offline ? 'Нет сети — изменения сохранены на устройстве' : 'Сохраняем…');
    saveT = setTimeout(() => saveNow(false), now ? 0 : 500);
  }

  const commit = () => { save(); render(); };

  const toast = msg => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2300); };

  /* ================= navigation ================= */
  function show(v) {
    ui.view = v;
    $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
    $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    render(); window.scrollTo({ top: 0 });
  }
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-view]'); if (v) return show(v.dataset.view);
    const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go);
  });

  const subjOptions = (sel, withNone) => (withNone ? '<option value="">Без предмета</option>' : '') + S.subjects.map(s => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${esc(s.name)}</option>`).join('');

  /* ================= exam helpers ================= */
  const upcomingExams = () => S.exams.filter(e => diffDays(todayKey(), e.date) >= 0).sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
  const prepPct = e => e.prep.length ? Math.round(e.prep.filter(p => p.done).length / e.prep.length * 100) : 0;

  /* ================= TODAY ================= */
  function renderToday() {
    const k = ui.day, d = parse(k), isT = k === todayKey();
    $('#tWeekday').textContent = (isT ? 'Сегодня · ' : '') + WD[d.getDay()];
    $('#tTitle').textContent = fmtDay(k);
    const exToday = S.exams.filter(e => e.date === k);
    const gymToday = S.workouts.filter(w => w.date === k);
    const sched = S.schedule.filter(s => s.date === k);
    $('#tSub').textContent = exToday.length ? `Сегодня ${exToday[0].kind.toLowerCase()}: ${subj(exToday[0].subj).name}. Удачи` :
      sched.length ? `${sched.length} ${plural(sched.length, 'пункт', 'пункта', 'пунктов')} в расписании${gymToday.length ? ' и тренировка' : ''}` : 'Свободный день — можно спокойно поучиться';

    // exam strip
    const up = upcomingExams().slice(0, 6);
    $('#examStrip').innerHTML = up.map(e => {
      const n = diffDays(todayKey(), e.date), s = subj(e.subj);
      return `<button class="ex-chip${e.imp ? ' imp' : ''}${n > 7 ? ' soft' : ''}" data-go="exams"><div class="ex-days">${n === 0 ? '!' : n}<small>${n === 0 ? 'сегодня' : plural(n, 'день', 'дня', 'дней')}</small></div><div><b>${esc(e.kind)} · ${esc(s.name)}</b><span>${fmtDay(e.date)}${e.time ? ', ' + e.time : ''} · готово ${prepPct(e)}%</span></div></button>`;
    }).join('');

    // timeline
    const items = [
      ...sched.map(s => ({ t: s.time, end: s.end, kind: 'sched', id: s.id, title: s.title, sub: subj(s.subj).name, c: subj(s.subj).color })),
      ...exToday.map(e => ({ t: e.time || '', kind: 'exam', id: e.id, title: `${e.kind}: ${subj(e.subj).name}`, sub: e.topic || 'Контрольная', c: '' })),
      ...gymToday.map(w => ({ t: w.time || '', kind: 'gym', id: w.id, title: `Тренировка · ${w.type}`, sub: `${fmtMin(w.dur)}${w.note ? ' · ' + w.note : ''}`, c: 'var(--rose)' }))
    ].sort((a, b) => (a.t || '99').localeCompare(b.t || '99'));
    const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    const toM = s => { if (!s) return -1; const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    $('#schedCount').textContent = items.length ? `${items.length} ${plural(items.length, 'пункт', 'пункта', 'пунктов')}` : '';
    $('#schedList').innerHTML = items.length ? items.map(i => {
      const isNow = isT && i.t && nm >= toM(i.t) && nm < (i.end ? toM(i.end) : toM(i.t) + 60);
      return `<li class="tl ${i.kind}${isNow ? ' now' : ''}" style="${i.c ? `--c:${i.c}` : ''}">
        <div class="tl-time">${i.t || '—'}${i.end ? `<small>${i.end}</small>` : ''}</div><i class="tl-dot"></i>
        <div class="tl-body"><b>${esc(i.title)}</b><span>${esc(i.sub)}${isNow ? ' · сейчас' : ''}</span></div>
        ${i.kind === 'sched' ? `<button class="tl-del" data-del-sched="${i.id}" aria-label="Удалить"><svg><use href="#i-del"/></svg></button>` : '<span></span>'}</li>`;
    }).join('') : '<li class="empty"><b>Расписание пустое</b>Добавьте пары, уроки или встречи — они выстроятся по времени</li>';
    $('#sSubj').innerHTML = subjOptions($('#sSubj').value, true);

    // stacks
    const plans = S.plans.filter(p => p.date === k);
    $('#plansCount').textContent = plans.length ? `${plans.filter(p => p.done).length}/${plans.length}` : '';
    $('#plansList').innerHTML = plans.length ? plans.map(p => ckRow(p, 'plans')).join('') : '<li class="stack-empty">Что важно успеть именно сегодня?</li>';
    const todos = S.todos.slice().sort((a, b) => a.done - b.done);
    $('#todosCount').textContent = todos.length ? `${todos.filter(p => !p.done).length} открыто` : '';
    $('#todosList').innerHTML = todos.length ? todos.map(p => ckRow(p, 'todos')).join('') : '<li class="stack-empty">Список дел пуст — красота</li>';

    // side
    const st = S.study.filter(s => s.date === k);
    const tot = st.reduce((a, s) => a + s.min, 0);
    $('#tStudy').textContent = tot;
    const by = groupStudy(st);
    const max = Math.max(1, ...by.map(b => b.min));
    $('#tStudyBars').innerHTML = by.slice(0, 4).map(b => `<div class="mb"><span>${esc(b.s.name)}</span><span>${b.min} мин</span><i style="--w:${b.min / max * 100}%"></i></div>`).join('') || '<div class="mb"><span>Пока без учёбы</span></div>';
    $('#tGym').innerHTML = gymToday.length ? gymToday.map(w => `<div class="gym-item${w.done ? ' done' : ''}"><div class="gym-ico"><svg><use href="#i-gym"/></svg></div><div><b>${esc(w.type)}${w.time ? ' · ' + w.time : ''}</b><span>${fmtMin(w.dur)}${w.note ? ' · ' + esc(w.note) : ''}</span></div><button class="ck-box" data-gym-toggle="${w.id}" aria-label="Отметить"><svg><use href="#i-check"/></svg></button></div>`).join('')
      : '<p class="muted-sm">В этот день тренировки нет. <button class="link" data-go="gym">Запланировать</button></p>';
  }
  const ckRow = (p, list) => `<li class="ck${p.done ? ' done' : ''}"><button class="ck-box" data-ck="${list}:${p.id}" aria-label="Отметить"><svg><use href="#i-check"/></svg></button><span class="ck-text">${esc(p.text)}</span><button class="ck-del" data-ckdel="${list}:${p.id}" aria-label="Удалить"><svg><use href="#i-del"/></svg></button></li>`;
  const groupStudy = arr => {
    const m = {}; arr.forEach(s => { m[s.subj] = (m[s.subj] || 0) + s.min; });
    return Object.entries(m).map(([id, min]) => ({ s: subj(id), min })).sort((a, b) => b.min - a.min);
  };

  $('#tPrev').onclick = () => { ui.day = addDays(ui.day, -1); render(); };
  $('#tNext').onclick = () => { ui.day = addDays(ui.day, 1); render(); };
  $('#tToday').onclick = () => { ui.day = todayKey(); render(); };
  $('#schedForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#sTitle').value.trim(); if (!title) return;
    S.schedule.push({ id: uid(), date: ui.day, time: $('#sTime').value, end: $('#sEnd').value, title, subj: $('#sSubj').value });
    $('#sTitle').value = ''; $('#sTime').value = ''; $('#sEnd').value = '';
    commit(); $('#sTime').focus();
  });
  $$('.line-form[data-list]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const inp = f.querySelector('input'); const text = inp.value.trim(); if (!text) return;
    if (f.dataset.list === 'plans') S.plans.push({ id: uid(), date: ui.day, text, done: false });
    else S.todos.unshift({ id: uid(), text, done: false });
    inp.value = ''; commit(); inp.focus();
  }));
  document.addEventListener('click', e => {
    const ck = e.target.closest('[data-ck]');
    if (ck) { const [l, id] = ck.dataset.ck.split(':'); const it = S[l].find(x => x.id === id); if (it) { it.done = !it.done; commit(); } return; }
    const cd = e.target.closest('[data-ckdel]');
    if (cd) { const [l, id] = cd.dataset.ckdel.split(':'); S[l] = S[l].filter(x => x.id !== id); commit(); return; }
    const sd = e.target.closest('[data-del-sched]');
    if (sd) { S.schedule = S.schedule.filter(x => x.id !== sd.dataset.delSched); commit(); return; }
    const gt = e.target.closest('[data-gym-toggle]');
    if (gt) { e.stopPropagation(); const w = S.workouts.find(x => x.id === gt.dataset.gymToggle); if (w) { w.done = !w.done; if (w.done) toast('Тренировка выполнена'); commit(); } }
  });

  /* ================= EXAMS ================= */
  function renderExams() {
    $('#eSubj').innerHTML = subjOptions($('#eSubj').value || S.subjects[0]?.id);
    if (!$('#eDate').value) $('#eDate').value = addDays(todayKey(), 3);
    const t = todayKey();
    const list = ui.examTab === 'up' ? upcomingExams() : S.exams.filter(e => diffDays(t, e.date) < 0).sort((a, b) => b.date.localeCompare(a.date));
    $$('#examTabs .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.examTab));
    $('#examList').innerHTML = list.length ? list.map(e => {
      const s = subj(e.subj), n = diffDays(t, e.date), d = parse(e.date), pct = prepPct(e), past = n < 0;
      return `<article class="exam${e.imp ? ' imp' : ''}${past ? ' past' : ''}">
        <div class="exam-date"><span>${WDS[d.getDay()]}</span><b>${d.getDate()}</b><span>${MSHORT[d.getMonth()]}</span><em>${inDays(n)}</em></div>
        <div class="exam-body">
          <div class="exam-top"><div><span class="subj-tag" style="--c:${s.color}">${esc(s.name)}</span><h3>${esc(e.kind)}${e.time ? ' · ' + e.time : ''}</h3>${e.topic ? `<p>${esc(e.topic)}</p>` : ''}</div>
            <div class="exam-acts"><button class="ex-act${e.imp ? ' on' : ''}" data-ex-imp="${e.id}" aria-label="Выделить как важную" title="Важная"><svg><use href="#i-star"/></svg></button><button class="ex-act" data-ex-del="${e.id}" aria-label="Удалить" title="Удалить"><svg><use href="#i-del"/></svg></button></div></div>
          ${e.prep.length ? `<div><div class="prog-lbl"><span>Подготовка</span><span>${pct}%</span></div><div class="prog"><i style="width:${pct}%"></i></div></div>` : ''}
          <ul class="prep">${e.prep.map(p => `<li class="ck${p.done ? ' done' : ''}"><button class="ck-box" data-prep="${e.id}:${p.id}" aria-label="Отметить"><svg><use href="#i-check"/></svg></button><span class="ck-text">${esc(p.text)}</span><button class="ck-del" data-prepdel="${e.id}:${p.id}" aria-label="Удалить пункт"><svg><use href="#i-del"/></svg></button></li>`).join('')}</ul>
          <form class="prep-add" data-prep-add="${e.id}"><input class="in grow" placeholder="Добавить, что повторить" maxlength="100" required><button class="btn" aria-label="Добавить"><svg><use href="#i-plus"/></svg></button></form>
          ${past || n === 0 ? `<label class="grade">Оценка<input class="in" data-grade="${e.id}" value="${esc(e.grade)}" maxlength="10" placeholder="5, зачёт…"></label>` : ''}
        </div></article>`;
    }).join('') : `<div class="card empty"><b>${ui.examTab === 'up' ? 'Нет предстоящих контрольных' : 'Здесь появятся прошедшие'}</b>${ui.examTab === 'up' ? 'Добавьте первую в форме — она появится в календаре и на главной' : ''}</div>`;
  }
  $('#examForm').addEventListener('submit', e => {
    e.preventDefault();
    const prep = $('#ePrep').value.split('\n').map(x => x.trim()).filter(Boolean).map(text => ({ id: uid(), text, done: false }));
    S.exams.push({ id: uid(), subj: $('#eSubj').value, kind: $('#eKind').value, date: $('#eDate').value, time: $('#eTime').value, topic: $('#eTopic').value.trim(), imp: $('#eImp').checked, grade: '', prep });
    ['#eTopic', '#ePrep', '#eTime'].forEach(s => $(s).value = ''); $('#eImp').checked = false;
    ui.examTab = 'up'; toast('Контрольная добавлена'); commit();
  });
  $('#examTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { ui.examTab = b.dataset.tab; renderExams(); } });
  $('#examList').addEventListener('click', e => {
    const f = id => S.exams.find(x => x.id === id);
    const imp = e.target.closest('[data-ex-imp]'); if (imp) { const x = f(imp.dataset.exImp); x.imp = !x.imp; return commit(); }
    const del = e.target.closest('[data-ex-del]'); if (del) { if (confirm('Удалить контрольную?')) { S.exams = S.exams.filter(x => x.id !== del.dataset.exDel); commit(); } return; }
    const p = e.target.closest('[data-prep]'); if (p) { const [eid, pid] = p.dataset.prep.split(':'); const it = f(eid).prep.find(x => x.id === pid); it.done = !it.done; return commit(); }
    const pd = e.target.closest('[data-prepdel]'); if (pd) { const [eid, pid] = pd.dataset.prepdel.split(':'); const x = f(eid); x.prep = x.prep.filter(q => q.id !== pid); return commit(); }
  });
  $('#examList').addEventListener('submit', e => {
    const form = e.target.closest('[data-prep-add]'); if (!form) return; e.preventDefault();
    const inp = form.querySelector('input'); const text = inp.value.trim(); if (!text) return;
    S.exams.find(x => x.id === form.dataset.prepAdd).prep.push({ id: uid(), text, done: false });
    commit(); const again = $(`[data-prep-add="${form.dataset.prepAdd}"] input`); again && again.focus();
  });
  $('#examList').addEventListener('change', e => { const g = e.target.closest('[data-grade]'); if (g) { S.exams.find(x => x.id === g.dataset.grade).grade = g.value.trim(); save(); toast('Оценка сохранена'); } });

  /* ================= CALENDAR ================= */
  function renderCal() {
    const m = ui.cal;
    $('#cYear').textContent = m.getFullYear(); $('#cTitle').textContent = MONTHS[m.getMonth()];
    const first = new Date(m.getFullYear(), m.getMonth(), 1), off = (first.getDay() + 6) % 7;
    const start = new Date(first); start.setDate(1 - off);
    const cells = Math.ceil((off + new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()) / 7) * 7;
    const tk = todayKey(); let html = '';
    for (let i = 0; i < cells; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = key(d);
      const ex = S.exams.filter(e => e.date === k), gy = S.workouts.filter(w => w.date === k), sc = S.schedule.filter(s => s.date === k), pl = S.plans.filter(p => p.date === k);
      const evs = [...ex.map(e => `<span class="ev exam${e.imp ? ' imp' : ''}" title="${esc(e.kind)}">${esc(subj(e.subj).name)}</span>`), ...gy.map(w => `<span class="ev gym${w.done ? '' : ''}">${esc(w.type)}${w.time ? ' ' + w.time : ''}</span>`), ...(sc.length ? [`<span class="ev sched">${sc.length} в расписании</span>`] : [])];
      const dots = [...ex.map(() => 'var(--exam)'), ...gy.map(() => 'var(--rose)'), ...(sc.length ? ['#9fb3c8'] : []), ...(pl.length ? ['var(--faint)'] : [])];
      const cls = ['cell']; if (d.getMonth() !== m.getMonth()) cls.push('out'); if (k === tk) cls.push('today'); if (k === ui.calSel) cls.push('sel'); if (ex.length) cls.push('has-exam');
      html += `<button class="${cls.join(' ')}" data-k="${k}" aria-label="${fmtDay(k)}"><span class="cell-num">${d.getDate()}</span>${evs.slice(0, 3).join('')}${evs.length > 3 ? `<span class="ev-more">ещё ${evs.length - 3}</span>` : ''}<span class="cell-dots">${dots.slice(0, 4).map(c => `<i style="background:${c}"></i>`).join('')}</span></button>`;
    }
    $('#calGrid').innerHTML = html;
    const k = ui.calSel, sd = parse(k);
    $('#cSelWd').textContent = (k === tk ? 'Сегодня · ' : '') + WD[sd.getDay()];
    $('#cSelTitle').textContent = fmtDay(k);
    const ex = S.exams.filter(e => e.date === k), gy = S.workouts.filter(w => w.date === k), sc = S.schedule.filter(s => s.date === k).sort((a, b) => a.time.localeCompare(b.time)), pl = S.plans.filter(p => p.date === k);
    let o = '';
    if (ex.length) o += '<p class="cs-group">Контрольные</p>' + ex.map(e => `<div class="cs-item exam"><b>${e.time || '—'}</b><span>${esc(e.kind)}: ${esc(subj(e.subj).name)}${e.topic ? ' — ' + esc(e.topic) : ''}</span></div>`).join('');
    if (sc.length) o += '<p class="cs-group">Расписание</p>' + sc.map(s => `<div class="cs-item"><b>${s.time}</b><span>${esc(s.title)}${s.subj ? ' · ' + esc(subj(s.subj).name) : ''}</span></div>`).join('');
    if (gy.length) o += '<p class="cs-group">Тренировки</p>' + gy.map(w => `<div class="cs-item gym${w.done ? ' done' : ''}"><b>${w.time || '—'}</b><span>${esc(w.type)} · ${fmtMin(w.dur)}</span></div>`).join('');
    if (pl.length) o += '<p class="cs-group">Планы</p>' + pl.map(p => `<div class="cs-item${p.done ? ' done' : ''}"><b>·</b><span>${esc(p.text)}</span></div>`).join('');
    $('#cSelList').innerHTML = o || '<p class="muted-sm">На этот день ничего не запланировано</p>';
  }
  $('#calGrid').addEventListener('click', e => { const c = e.target.closest('.cell'); if (!c) return; ui.calSel = c.dataset.k; const d = parse(ui.calSel); if (d.getMonth() !== ui.cal.getMonth()) ui.cal = new Date(d.getFullYear(), d.getMonth(), 1); renderCal(); });
  $('#calGrid').addEventListener('dblclick', e => { const c = e.target.closest('.cell'); if (c) { ui.day = c.dataset.k; show('today'); } });
  $('#cPrev').onclick = () => { ui.cal = new Date(ui.cal.getFullYear(), ui.cal.getMonth() - 1, 1); renderCal(); };
  $('#cNext').onclick = () => { ui.cal = new Date(ui.cal.getFullYear(), ui.cal.getMonth() + 1, 1); renderCal(); };
  $('#cToday').onclick = () => { const d = new Date(); ui.cal = new Date(d.getFullYear(), d.getMonth(), 1); ui.calSel = todayKey(); renderCal(); };
  $('#cOpenDay').onclick = () => { ui.day = ui.calSel; show('today'); };

  /* ================= GYM ================= */
  function renderGym() {
    const ws = ui.gymWeek, we = addDays(ws, 6), tk = todayKey();
    const a = parse(ws), b = parse(we);
    $('#gRange').textContent = a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MGEN[b.getMonth()]}` : `${a.getDate()} ${MGEN[a.getMonth()]} – ${b.getDate()} ${MGEN[b.getMonth()]}`;
    const wk = S.workouts.filter(w => w.date >= ws && w.date <= we);
    $('#gCount').textContent = wk.length;
    $('#gMin').textContent = wk.reduce((s, w) => s + w.dur, 0);
    $('#gDone').textContent = wk.length ? Math.round(wk.filter(w => w.done).length / wk.length * 100) : 0;
    let h = '';
    for (let i = 0; i < 7; i++) {
      const k = addDays(ws, i), d = parse(k);
      const its = wk.filter(w => w.date === k).sort((x, y) => (x.time || '99').localeCompare(y.time || '99'));
      h += `<div class="wd${k === tk ? ' today' : ''}"><div class="wd-head"><span>${WDS[d.getDay()]}</span><b>${d.getDate()}</b></div>
        ${its.map(w => `<div class="wo${w.done ? ' done' : ''}" role="button" tabindex="0" data-gym-toggle="${w.id}" title="Нажмите, чтобы отметить"><b>${esc(w.type)}</b><span>${w.time ? w.time + ' · ' : ''}${fmtMin(w.dur)}</span>${w.note ? `<span>${esc(w.note)}</span>` : ''}<button class="wo-del" data-gym-del="${w.id}" aria-label="Удалить"><svg><use href="#i-del"/></svg></button></div>`).join('')}
        ${its.length ? '' : '<p class="wd-empty">отдых</p>'}</div>`;
    }
    $('#gWeek').innerHTML = h;
    if (!$('#gDate').value) $('#gDate').value = tk;
  }
  $('#gWeek').addEventListener('click', e => { const d = e.target.closest('[data-gym-del]'); if (d) { e.stopPropagation(); S.workouts = S.workouts.filter(w => w.id !== d.dataset.gymDel); commit(); } }, true);
  $('#gPrev').onclick = () => { ui.gymWeek = addDays(ui.gymWeek, -7); renderGym(); };
  $('#gNext').onclick = () => { ui.gymWeek = addDays(ui.gymWeek, 7); renderGym(); };
  $('#gNow').onclick = () => { ui.gymWeek = weekStart(todayKey()); renderGym(); };
  $('#gymForm').addEventListener('submit', e => {
    e.preventDefault();
    const date = $('#gDate').value; if (!date) return;
    S.workouts.push({ id: uid(), date, time: $('#gTime').value, type: $('#gType').value, dur: +$('#gDur').value, note: $('#gNote').value.trim(), done: false });
    $('#gNote').value = ''; ui.gymWeek = weekStart(date); toast('Тренировка добавлена'); commit();
  });

  /* ================= STUDY / TIMER ================= */
  const CIRC = 829.4;
  const T = { mode: 'focus', running: false, endAt: 0, remaining: 1500, total: 1500, cycle: 0, subj: 'math', tick: null };
  const fmt = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  const durOf = m => S.settings[m] * 60;
  function setMode(m) { T.mode = m; T.running = false; clearInterval(T.tick); T.total = T.remaining = durOf(m); renderTimer(); }
  function start() { if (T.running) return; T.running = true; T.endAt = Date.now() + T.remaining * 1000; unlock(); clearInterval(T.tick); T.tick = setInterval(step, 250); renderTimer(); }
  function pause() { T.running = false; clearInterval(T.tick); T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1000)); renderTimer(); }
  function step() { const l = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000)); if (l !== T.remaining) { T.remaining = l; renderTimer(); } if (l <= 0) finish(true); }
  function finish(done) {
    clearInterval(T.tick); T.running = false;
    if (T.mode === 'focus') {
      const spent = done ? S.settings.focus : Math.floor((T.total - T.remaining) / 60);
      if (spent >= 1) { S.study.push({ id: uid(), date: todayKey(), subj: T.subj, min: spent, at: Date.now() }); toast(`+${spent} мин: ${subj(T.subj).name}`); }
      if (done) { T.cycle++; beep(); }
      setMode(done && T.cycle % S.settings.every === 0 ? 'long' : 'short');
    } else { if (done) { beep(); toast('Перерыв окончен'); } setMode('focus'); }
    commit();
  }
  function renderTimer() {
    const rest = T.mode !== 'focus', s = subj(T.subj);
    $('#timerCard').classList.toggle('rest', rest);
    $('#timerCard').style.setProperty('--c', s.color);
    $$('#modes .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === T.mode));
    $('#dialTime').textContent = fmt(T.remaining);
    $('#dialBar').style.strokeDashoffset = CIRC * (1 - T.remaining / T.total);
    $('#dialSub').textContent = rest ? (T.running ? 'Отдохните, разомнитесь' : 'Время перерыва') : (T.running ? s.name : T.remaining < T.total ? 'На паузе' : s.name);
    $('#startBtn').textContent = T.running ? 'Пауза' : T.remaining < T.total ? 'Продолжить' : 'Старт';
    $('#cycleDots').innerHTML = Array.from({ length: S.settings.every }, (_, i) => `<i class="${i < T.cycle % S.settings.every ? 'on' : ''}"></i>`).join('');
    const active = T.running || T.remaining < T.total;
    $('#miniTimer').hidden = !active; $('#miniTimer').classList.toggle('rest', rest);
    $('#miniTime').textContent = fmt(T.remaining); $('#miniLabel').textContent = rest ? 'Перерыв' : s.name;
    document.title = T.running ? `${fmt(T.remaining)} · ${rest ? 'Перерыв' : s.name}` : 'Butterfly — учебный планер';
  }
  function renderStudy() {
    if (!S.subjects.find(x => x.id === T.subj)) T.subj = S.subjects[0]?.id || '';
    $('#subjPick').innerHTML = S.subjects.map(s => `<button class="sp${s.id === T.subj ? ' active' : ''}" style="--c:${s.color}" data-sp="${s.id}" role="radio" aria-checked="${s.id === T.subj}">${esc(s.name)}</button>`).join('');
    const tk = todayKey(), ws = weekStart(tk);
    const arr = ui.statR === 'day' ? S.study.filter(s => s.date === tk) : ui.statR === 'week' ? S.study.filter(s => s.date >= ws) : S.study;
    $$('#statRange .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.r === ui.statR));
    $('#subjStats').innerHTML = statBars(arr);
    $('#mSubj').innerHTML = subjOptions($('#mSubj').value || T.subj);
    $('#subjList').innerHTML = S.subjects.map(s => `<li><input type="color" value="${s.color}" data-color="${s.id}" aria-label="Цвет: ${esc(s.name)}"><span>${esc(s.name)}</span><button class="ck-del" style="opacity:.7" data-subj-del="${s.id}" aria-label="Удалить предмет"><svg><use href="#i-del"/></svg></button></li>`).join('');
    ['focus', 'short', 'long', 'every'].forEach(k => { const el = $('#set' + k[0].toUpperCase() + k.slice(1)); if (document.activeElement !== el) el.value = S.settings[k]; });
    $('#setSound').checked = S.settings.sound;
    renderTimer();
  }
  const statBars = arr => {
    const by = groupStudy(arr); if (!by.length) return '<p class="muted-sm">Пока нет учебных минут за этот период</p>';
    const max = Math.max(...by.map(b => b.min)), tot = by.reduce((a, b) => a + b.min, 0);
    return by.map(b => `<div class="ss" style="--c:${b.s.color}"><span>${esc(b.s.name)}</span><span>${fmtMin(b.min)}</span><i style="--w:${b.min / max * 100}%"></i></div>`).join('') + `<div class="ss-total"><span>Всего</span><span>${fmtMin(tot)}</span></div>`;
  };
  $('#subjPick').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (!b) return; if (T.running && T.mode === 'focus') { toast('Сначала остановите таймер'); return; } T.subj = b.dataset.sp; renderStudy(); });
  $('#startBtn').onclick = () => T.running ? pause() : start();
  $('#resetBtn').onclick = () => setMode(T.mode);
  $('#skipBtn').onclick = () => { if (T.running) pause(); finish(false); };
  $('#modes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; if (T.mode === 'focus' && T.remaining < T.total) finish(false); setMode(b.dataset.mode); });
  $('#miniTimer').onclick = () => show('study');
  $('#statRange').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { ui.statR = b.dataset.r; renderStudy(); } });
  $('#setBtn').onclick = e => { const p = $('#setPanel'); p.hidden = !p.hidden; e.currentTarget.setAttribute('aria-expanded', String(!p.hidden)); };
  const bindNum = (id, k, mn, mx) => $(id).addEventListener('change', e => { let v = Math.round(+e.target.value) || S.settings[k]; v = Math.min(mx, Math.max(mn, v)); e.target.value = v; S.settings[k] = v; save(); if (!T.running && T.remaining === T.total) setMode(T.mode); else renderTimer(); });
  bindNum('#setFocus', 'focus', 1, 180); bindNum('#setShort', 'short', 1, 60); bindNum('#setLong', 'long', 1, 90); bindNum('#setEvery', 'every', 2, 8);
  $('#setSound').onchange = e => { S.settings.sound = e.target.checked; save(); };
  $('#manualForm').addEventListener('submit', e => { e.preventDefault(); const m = Math.round(+$('#mMin').value); if (!m || m < 1) return; S.study.push({ id: uid(), date: todayKey(), subj: $('#mSubj').value, min: Math.min(600, m), at: Date.now() }); $('#mMin').value = ''; toast(`+${m} мин: ${subj($('#mSubj').value).name}`); commit(); });
  const PALETTE = ['#7d6a9c', '#b07a8a', '#6f8fa8', '#a8875d', '#6c9a8b', '#9a6fa8', '#8a9a6c', '#c08a6a', '#5f7f9a'];
  $('#subjForm').addEventListener('submit', e => { e.preventDefault(); const n = $('#subjName').value.trim(); if (!n) return; S.subjects.push({ id: uid(), name: n, color: PALETTE[S.subjects.length % PALETTE.length] }); $('#subjName').value = ''; commit(); });
  $('#subjList').addEventListener('input', e => { const c = e.target.closest('[data-color]'); if (c) { S.subjects.find(s => s.id === c.dataset.color).color = c.value; save(); renderTimer(); } });
  $('#subjList').addEventListener('change', () => render());
  $('#subjList').addEventListener('click', e => { const d = e.target.closest('[data-subj-del]'); if (!d) return; if (S.subjects.length <= 1) return toast('Нужен хотя бы один предмет'); if (confirm('Удалить предмет? Записанные минуты останутся в статистике как «Без предмета».')) { S.subjects = S.subjects.filter(s => s.id !== d.dataset.subjDel); commit(); } });
  document.addEventListener('keydown', e => { if (ui.view !== 'study' || e.code !== 'Space' || /INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) return; e.preventDefault(); T.running ? pause() : start(); });

  let actx = null;
  function unlock() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (_) {} }
  function beep() {
    if (!S.settings.sound || !actx) return;
    [0, .3, .6].forEach((d, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = [660, 784, 988][i]; g.gain.setValueAtTime(.0001, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(.22, actx.currentTime + d + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d + .35); o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + .4); });
  }

  /* ================= SUMMARY ================= */
  const MOODS = [{ t: 'Тяжело', c: '#9aa0b5' }, { t: 'Так себе', c: '#b7a9c4' }, { t: 'Норм', c: '#c9b4cf' }, { t: 'Хорошо', c: '#d4a3b4' }, { t: 'Отлично', c: '#b88894' }];
  function renderSum() {
    const k = ui.sumDay, d = parse(k), isT = k === todayKey();
    $('#sumWd').textContent = (isT ? 'Сегодня · ' : '') + WD[d.getDay()] + ', ' + fmtDay(k);
    const plans = S.plans.filter(p => p.date === k), st = S.study.filter(s => s.date === k), gy = S.workouts.filter(w => w.date === k), sc = S.schedule.filter(s => s.date === k);
    const studyMin = st.reduce((a, s) => a + s.min, 0);
    const pDone = plans.filter(p => p.done).length;
    const next = upcomingExams().find(e => e.date > k || (e.date === k));
    const prevDays = Array.from({ length: 7 }, (_, i) => addDays(k, -i)).map(x => S.study.filter(s => s.date === x).reduce((a, s) => a + s.min, 0));
    const avg = Math.round(prevDays.slice(1).reduce((a, b) => a + b, 0) / 6);
    const kpis = [
      { p: 'Учёба', b: fmtMin(studyMin), s: avg ? (studyMin >= avg ? `выше среднего (${avg} мин)` : `среднее ${avg} мин`) : 'за день', v: true },
      { p: 'Планы', b: `${pDone}/${plans.length}`, s: plans.length ? `${Math.round(pDone / plans.length * 100)}% выполнено` : 'не было планов' },
      { p: 'Расписание', b: sc.length, s: plural(sc.length, 'пункт', 'пункта', 'пунктов') },
      { p: 'Тренировка', b: gy.length ? (gy.every(w => w.done) ? 'Да' : gy.some(w => w.done) ? 'Частично' : 'Нет') : '—', s: gy.length ? gy.map(w => w.type).join(', ') : 'день отдыха' },
      { p: 'Ближайшая', b: next ? (diffDays(k, next.date) === 0 ? 'Сегодня' : diffDays(k, next.date) + ' дн.') : '—', s: next ? `${next.kind}: ${subj(next.subj).name}` : 'контрольных нет' }
    ];
    $('#sumKpis').innerHTML = kpis.map(x => `<div class="kpi${x.v ? ' violet' : ''}"><p>${x.p}</p><b>${esc(x.b)}</b><span>${esc(x.s)}</span></div>`).join('');
    const li = (ok, t) => `<div class="sum-li${ok ? '' : ' no'}"><svg><use href="${ok ? '#i-check' : '#i-right'}"/></svg><span>${esc(t)}</span></div>`;
    let o = '';
    if (plans.length) o += '<p class="sum-sec">Планы</p>' + plans.map(p => li(p.done, p.text)).join('');
    if (gy.length) o += '<p class="sum-sec">Тренировки</p>' + gy.map(w => li(w.done, `${w.type} · ${fmtMin(w.dur)}`)).join('');
    const doneTodos = S.todos.filter(t => t.done);
    if (doneTodos.length) o += '<p class="sum-sec">Закрытые дела</p>' + doneTodos.slice(0, 6).map(t => li(true, t.text)).join('');
    const prepDone = S.exams.flatMap(e => e.prep.filter(p => p.done).map(p => `${subj(e.subj).name}: ${p.text}`));
    if (prepDone.length && isT) o += '<p class="sum-sec">Подготовка</p>' + prepDone.slice(0, 5).map(t => li(true, t)).join('');
    $('#sumDone').innerHTML = o || '<p class="muted-sm">За этот день пока ничего не отмечено</p>';
    $('#sumStudy').innerHTML = statBars(st);
    const r = S.reviews[k] || {};
    $('#moods').innerHTML = MOODS.map((m, i) => `<button class="mood${r.mood === i + 1 ? ' active' : ''}" style="--mc:${m.c}" data-mood="${i + 1}" role="radio" aria-checked="${r.mood === i + 1}"><i></i>${m.t}</button>`).join('');
    [['#rWins', 'wins'], ['#rImprove', 'improve'], ['#rTomorrow', 'tomorrow']].forEach(([s, f]) => { if (document.activeElement !== $(s)) $(s).value = r[f] || ''; });
  }
  const rev = () => (S.reviews[ui.sumDay] = S.reviews[ui.sumDay] || {});
  $('#moods').addEventListener('click', e => { const b = e.target.closest('[data-mood]'); if (b) { rev().mood = +b.dataset.mood; commit(); } });
  [['#rWins', 'wins'], ['#rImprove', 'improve'], ['#rTomorrow', 'tomorrow']].forEach(([s, f]) => $(s).addEventListener('input', e => { rev()[f] = e.target.value; save(); }));
  $('#sumPrev').onclick = () => { ui.sumDay = addDays(ui.sumDay, -1); renderSum(); };
  $('#sumNext').onclick = () => { ui.sumDay = addDays(ui.sumDay, 1); renderSum(); };
  $('#sumToday').onclick = () => { ui.sumDay = todayKey(); renderSum(); };
  $('#moveUnfinished').onclick = () => {
    const open = S.plans.filter(p => p.date === ui.sumDay && !p.done);
    if (!open.length) return toast('Все планы выполнены — переносить нечего');
    const tm = addDays(ui.sumDay, 1); open.forEach(p => p.date = tm);
    toast(`Перенесено на ${fmtDay(tm)}: ${open.length}`); commit();
  };

  /* ================= настройки, профиль, экспорт ================= */
  function openModal(id) {
    const m = $('#' + id); if (!m) return;
    m.hidden = false; document.body.classList.add('modal-open');
    const f = m.querySelector('input, button, select, textarea'); if (f) setTimeout(() => f.focus(), 60);
  }
  function closeModal(id) {
    const m = $('#' + id); if (m) m.hidden = true;
    if (![...document.querySelectorAll('.modal')].some(x => !x.hidden)) document.body.classList.remove('modal-open');
  }
  document.addEventListener('click', e => { const c = e.target.closest('[data-close]'); if (c) closeModal(c.dataset.close); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach(m => closeModal(m.id));
  });

  function wireSettings() {
    const userBtn = $('#userBtn'); if (userBtn) userBtn.onclick = () => openModal('settingsModal');
    const exp = $('#exportBtn');
    if (exp) exp.onclick = () => { toast('Готовим файл…'); location.href = '/api.php/export'; };
    const doLogout = async () => {
      try { await fetch('/api.php/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch (_) {}
      try { localStorage.removeItem('bf.pending'); localStorage.removeItem('bf.timer'); localStorage.removeItem('bf.timer'); } catch (_) {}
      try { if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch (_) {}
      location.href = '/login.html';
    };
    const logout = $('#logoutBtn');
    if (logout) logout.onclick = doLogout;
    const logoutTop = $('#logoutTop');
    if (logoutTop) logoutTop.onclick = doLogout;
    const delBtn = $('#deleteBtn');
    if (delBtn) delBtn.onclick = () => { closeModal('settingsModal'); openModal('deleteModal'); };
    const delForm = $('#delForm');
    if (delForm) delForm.addEventListener('submit', async e => {
      e.preventDefault();
      const password = $('#delPw').value;
      const r = await fetch('/api.php/account/delete', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }).catch(() => null);
      if (r && r.ok) { try { localStorage.clear(); } catch (_) {} ; location.href = '/login.html?deleted=1'; return; }
      toast('Не удалось удалить — проверь пароль');
    });
    const pwForm = $('#pwForm');
    if (pwForm) pwForm.addEventListener('submit', async e => {
      e.preventDefault();
      const current = $('#pwCur').value, next = $('#pwNew').value;
      const r = await fetch('/api.php/password', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current, new: next }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { pwForm.reset(); toast('Пароль изменён'); } else toast(j.message || 'Не удалось сменить пароль');
    });
  }

  /* ================= онбординг и офлайн ================= */
  const isPristine = () => !S.subjects.length && !S.schedule.length && !S.plans.length && !S.todos.length && !S.exams.length && !S.workouts.length && !S.study.length && !Object.keys(S.reviews).length;
  function renderOnboarding() {
    const el = $('#onboarding'); if (!el) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem('bf.onboard.dismissed') === '1'; } catch (_) {}
    el.hidden = !(isPristine() && !dismissed);
  }
  function wireOnboarding() {
    const seedBtn = $('#seedBtn');
    if (seedBtn) seedBtn.onclick = () => {
      S = sanitize(seed());
      try { localStorage.removeItem('bf.onboard.dismissed'); } catch (_) {}
      saveNow(false); render(); toast('Примеры добавлены — их можно удалить');
    };
    const close = $('#onboardClose');
    if (close) close.onclick = () => {
      try { localStorage.setItem('bf.onboard.dismissed', '1'); } catch (_) {}
      renderOnboarding();
    };
  }
  function setOnlineBanners() {
    const bar = $('#offlineBar');
    if (bar) bar.hidden = !(navigator.onLine === false || offline);
    window.addEventListener('online', () => { offline = false; if (bar) bar.hidden = true; setSave('Сохранено'); });
    window.addEventListener('offline', () => { if (bar) bar.hidden = false; });
  }
  function restorePendingDraft() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem('bf.pending') || 'null'); } catch (_) {}
    if (!p || !p.data) return;
    try { localStorage.removeItem('bf.pending'); } catch (_) {}
    if (confirm('Есть несохранённые изменения с прошлой сессии. Восстановить их?')) {
      S = sanitize(p.data); stateRev = p.rev || stateRev; saveNow(true); render(); toast('Изменения восстановлены');
    }
  }

  /* ================= таймер: сохранение состояния ================= */
  function saveTimerState() {
    try { localStorage.setItem('bf.timer', JSON.stringify({ mode: T.mode, running: T.running, endAt: T.endAt, remaining: T.remaining, total: T.total, cycle: T.cycle, subj: T.subj })); } catch (_) {}
  }
  function restoreTimer() {
    let j = null;
    try { j = JSON.parse(localStorage.getItem('bf.timer') || 'null'); } catch (_) {}
    if (!j) return;
    if (!S.subjects.find(s => s.id === j.subj)) j.subj = (S.subjects[0] && S.subjects[0].id) || '';
    T.mode = ['focus', 'short', 'long'].includes(j.mode) ? j.mode : 'focus';
    T.cycle = Number(j.cycle) || 0; T.subj = j.subj || '';
    T.total = durOf(T.mode);
    if (j.running && Number(j.endAt) > Date.now()) {
      T.remaining = Math.max(1, Math.ceil((Number(j.endAt) - Date.now()) / 1000));
      start();
    } else {
      T.remaining = Math.min(T.total, Math.max(0, Number(j.remaining) || T.total));
      T.running = false;
      renderTimer();
    }
  }
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { saveTimerState(); if (pendingSave) saveNow(true); }
  });
  window.addEventListener('pagehide', () => { if (pendingSave) saveNow(true); });

  /* ================= отладка ================= */
  function renderDebug() {
    // Одно окно свободного текста; данные формы отправляются кнопкой.
  }

  function wireDebug() {
    const text = $('#debugText');
    const btn = $('#debugSend');
    const msg = $('#debugMsg');
    if (btn) btn.onclick = async () => {
      const body = (text?.value || '').trim();
      if (body.length < 3) {
        if (msg) msg.textContent = 'Опишите запрос — минимум 3 символа.';
        return;
      }
      btn.disabled = true;
      if (msg) msg.textContent = 'Отправляем…';
      try {
        const r = await fetch('/api.php/debug', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: body })
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) {
          if (text) text.value = '';
          if (msg) msg.textContent = 'Запрос отправлен.';
        } else if (r.status === 429) {
          if (msg) msg.textContent = j.message || 'Слишком много запросов. Попробуйте позже.';
        } else {
          if (msg) msg.textContent = j.message || 'Не удалось отправить запрос.';
        }
      } catch (_) {
        if (msg) msg.textContent = 'Нет сети — запрос не отправлен.';
      } finally {
        btn.disabled = false;
      }
    };
  }

  /* ================= render ================= */
  function render() {
    const up = upcomingExams().filter(e => diffDays(todayKey(), e.date) <= 7).length;
    $('#examBadge').hidden = !up; $('#examBadge').textContent = up;
    ({ today: renderToday, exams: renderExams, cal: renderCal, gym: renderGym, study: renderStudy, sum: renderSum, debug: renderDebug })[ui.view]();
    renderOnboarding();
    renderTimer();
  }
  setInterval(() => { if (ui.view === 'today') renderToday(); }, 60000);

  async function boot() {
    try {
      const ok = await load();
      if (!ok) return;
    } catch (_) {
      setSave('Сервер недоступен — обнови страницу', true);
      return;
    }
    setSave('Сохранено');
    setMode('focus');
    render();
    restorePendingDraft();
    restoreTimer();
    setOnlineBanners();
    wireSettings();
    wireDebug();
    wireOnboarding();
    setInterval(saveTimerState, 3000);
  }
  boot();
})();
