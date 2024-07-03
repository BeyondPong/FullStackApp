import AbstractView from './AbstractView.js';
import registry from '../state/Registry.js';
import { words, changeLanguage } from '../state/Registry.js';
export default class extends AbstractView {
  constructor(params) {
    super(params);
  }

  async getHtml() {
    const currentLang = registry.lang;
    const isLogin = localStorage.getItem('token') !== null;

    return `
      <header class="main_header">
        <a href="/" id="main_link" class="nav__link" data-link>Ping? Pong!</a>
        <div class="dropdown">
          <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" aria-expanded="false" data-bs-toggle="dropdown" aria-haspopup="true">
          <i class="fa-solid fa-globe"></i>
            Language
          </button>
          <ul id="d_menu" class="dropdown-menu drmenu" aria-labelledby="dropdownMenuButton">
            <li><a id="item1" class="dropdown-item drmenu ${
              currentLang === 'ko' ? 'disabled' : ''
            }" href="/" data-lang="ko">ko</a></li>
            <li><a id="item2" class="dropdown-item drmenu ${
              currentLang === 'en' ? 'disabled' : ''
            }" href="/" data-lang="en">en</a></li>
            <li><a id="item3" class="dropdown-item drmenu ${
              currentLang === 'jp' ? 'disabled' : ''
            }" href="/" data-lang="jp">jp</a></li>
          </ul>
        </div>
      </header>
      <nav id="nav_links">
        <a href="${isLogin ? '/logout' : '/login'}" id="${
      isLogin ? 'logout_link' : 'login_link'
    }" class="nav__link" data-link>${isLogin ? words[currentLang].logout : words[currentLang].login}</a>
        <a href="/play" id="play_link" class="nav__link" data-link>${words[currentLang].play}</a>
        <a href="/profile" id="profile_link" class="nav__link" style="${
          isLogin ? '' : 'pointer-events: none; color: grey; text-decoration: none;'
        }" data-link>${words[currentLang].profile}</a>
      </nav>
    `;
  }

  async onMounted() {
    const dropdownToggle = document.getElementById('dropdownMenuButton');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    dropdownToggle.addEventListener('click', () => {
      dropdownMenu.classList.toggle('show');
    });
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach((item) => {
      item.addEventListener('click', function (event) {
        event.preventDefault();
        const selectedLang = item.getAttribute('data-lang');
        registry.lang = selectedLang;
        dropdownMenu.classList.remove('show');
        window.dispatchEvent(new Event('popstate'));
        const newLang = event.target.dataset.lang;
        changeLanguage(newLang);
      });
    });
  }
}
