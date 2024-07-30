import { Router } from './router/router.js';
import navigateTo from './utility/navigateTo.js';

window.DJANGO_API_URL = "https://beyondpong:3000/api";
window.DAPHNE_URL = "wss://beyondpong:3000/ws";

const router = new Router();
window.addEventListener('popstate', () => router.route());

document.addEventListener('DOMContentLoaded', () => {
  router.route();
  document.body.addEventListener('click', (e) => {
    if (e.target.matches('[data-link]')) {
      e.preventDefault();
      navigateTo(e.target.href);
      router.route();
    }
  });
});
