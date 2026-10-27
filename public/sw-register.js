/* Butterfly pilot — регистрация service worker и уведомление об обновлении */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      reg.update().catch(() => {});

      const notify = () => {
        if (document.querySelector('.update-banner')) return;
        const banner = document.createElement('div');
        banner.className = 'update-banner';
        const text = document.createElement('span');
        text.textContent = 'Доступно обновление приложения';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.textContent = 'Обновить';
        btn.addEventListener('click', () => location.reload());
        banner.append(text, btn);
        document.body.appendChild(banner);
      };

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) notify();
        });
      });
    } catch (_) { /* офлайн/приватный режим — приложение всё равно работает */ }
  });
})();
