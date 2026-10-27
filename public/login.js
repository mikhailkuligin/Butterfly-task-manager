/* Butterfly — только вход. Регистрация закрыта; аккаунты создаёт администратор. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const form = $('#authForm');
  const errorBox = $('#authError');
  const offlineNote = $('#offlineNote');
  const submitBtn = $('#submitBtn');
  const loginInput = $('#loginInput');
  const passInput = $('#passInput');
  const rememberInput = $('#rememberInput');
  const passToggle = $('#passToggle');

  const nextUrl = (() => {
    const p = new URLSearchParams(location.search).get('next');
    return p && p.startsWith('/') && !p.startsWith('//') ? p : '/';
  })();

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
    const first = form.querySelector('.in[aria-invalid="true"]');
    if (first) first.focus();
  }
  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('show');
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  }
  function fieldError(el, msg) {
    el.setAttribute('aria-invalid', 'true');
    showError(msg);
  }

  passToggle.addEventListener('click', () => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    passToggle.textContent = show ? 'Скрыть' : 'Показ';
    passToggle.setAttribute('aria-pressed', String(show));
    passToggle.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    passInput.focus();
  });

  function validate() {
    clearError();
    const login = loginInput.value.trim();
    const pass = passInput.value;
    if (!/^[\p{L}\p{N}_.-]{3,24}$/u.test(login)) {
      fieldError(loginInput, 'Логин: 3–24 символа — буквы, цифры, _ . -');
      return false;
    }
    if (!pass) {
      fieldError(passInput, 'Введи пароль');
      return false;
    }
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    clearError();
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = 'Входим…';
    try {
      const body = {
        username: loginInput.value.trim(),
        password: passInput.value,
        remember: !!rememberInput.checked
      };
      const r = await fetch('/api.php/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (r.ok) { location.href = nextUrl; return; }
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) showError(j.message || 'Слишком много попыток. Подожди немного и попробуй снова.');
      else if (r.status === 401) showError('Неверный логин или пароль');
      else if (r.status === 400) showError(j.message || 'Проверь логин и пароль');
      else showError('Что-то пошло не так. Попробуй ещё раз.');
      offlineNote.classList.toggle('show', false);
    } catch (_) {
      showError('Нет сети — проверь подключение и попробуй ещё раз.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  }

  form.addEventListener('submit', submit);

  // если уже вошли — сразу в приложение
  fetch('/api.php/me', { credentials: 'same-origin' }).then((r) => {
    if (r.ok) location.replace('/');
  }).catch(() => {});

  if (new URLSearchParams(location.search).get('deleted') === '1') {
    showError('Аккаунт и данные удалены.');
    errorBox.style.background = '#eef4ee';
    errorBox.style.color = '#3f6b4f';
  }

  loginInput.focus();
})();
