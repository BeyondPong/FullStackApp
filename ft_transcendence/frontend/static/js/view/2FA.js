import AbstractView from './AbstractView.js';
import { postLogin2FA, postLoginCode2FA } from '../api/postAPI.js';
import { getRegistration } from '../api/getAPI.js';
import { addBlurBackground } from '../utility/blurBackGround.js';
import { words, changeLanguage } from '../state/Registry.js';
import registry from '../state/Registry.js';

export default class extends AbstractView {
  constructor(params) {
    super(params);
  }
  async getHtml() {
    const currentLang = registry.lang;
    const modalHtml = `
    <div class="dropdown" id="dropdown_2fa">
      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" aria-expanded="false" data-bs-toggle="dropdown" aria-haspopup="true">
      <i class="fa-solid fa-globe"></i>
        Language
      </button>
      <ul id="d_menu" class="dropdown-menu drmenu" aria-labelledby="dropdownMenuButton">
        <li><a id="item1" class="dropdown-item drmenu ${currentLang === 'ko' ? 'disabled' : ''
      }" href="/" data-lang="ko">ko</a></li>
        <li><a id="item2" class="dropdown-item drmenu ${currentLang === 'en' ? 'disabled' : ''
      }" href="/" data-lang="en">en</a></li>
        <li><a id="item3" class="dropdown-item drmenu ${currentLang === 'jp' ? 'disabled' : ''
      }" href="/" data-lang="jp">jp</a></li>
      </ul>
    </div>
    <div class="fa_modal">
      <div id="gdpr" style="display: none">
        <h2 id="gdpr_underline">${words[currentLang].title}</h2>
        <p>${words[currentLang].content}</p>
        <ul>
          <li><strong>${words[currentLang].items[0]}</strong></li>
          <li><strong>${words[currentLang].items[1]}</strong></li>
          <li><strong>${words[currentLang].items[2]}</strong></li>
          <li><strong>${words[currentLang].items[3]}</strong></li>
          <li><strong>${words[currentLang].items[4]}</strong></li>
          <li><strong>${words[currentLang].items[5]}</strong></li>
          <li><strong>${words[currentLang].items[6]}</strong></li>
        </ul>
        <p id="gdpr_underline">${words[currentLang].agreement}</p>
        <button id="agreeBtn">${words[currentLang].button}</button>
      </div>
      <div class="modal_header">
        <i id="lock_image" class="fa-solid fa-lock"></i>
        <h2>${words[currentLang].twofactor_title}</h2>
        <h4>${words[currentLang].twofactor_subtitle}</h4>
        <h5>${words[currentLang].twofactor_subtitle2}</h5>
        <div class="email_container_flex">
          <div><p id="user_email"></p></div>
          <div tabindex="0" id="emailSendBtnBox"><button id="emailSendBtn"><i class="fa-solid fa-paper-plane"></i><span>${words[currentLang].email_send_button}</span></button></div>
        </div>
      </div>
      <div class="fa_code_container_box">
        <div id="fa_code_container" class="fa_code_container">
          <input type="text" id="fa_code_1" maxlength="1" class="fa_code_input" required>
          <input type="text" id="fa_code_2" maxlength="1" class="fa_code_input" required>
          <input type="text" id="fa_code_3" maxlength="1" class="fa_code_input" required>
          <input type="text" id="fa_code_4" maxlength="1" class="fa_code_input" required>
          <input type="text" id="fa_code_5" maxlength="1" class="fa_code_input" required>
          <input type="text" id="fa_code_6" maxlength="1" class="fa_code_input" required>
        </div>
        <div class="timer_container"><p id="timer"></p></div>
        <div class="codeVerifyBtnDiv" tabindex="0"><button id="codeVerifyBtn">${words[currentLang].code_verify_button}</button></div>
      </div>
          <section class="friend_add_modal hidden">
      <div class="friend_add_modal_flex">
        <div><span class="friend_add_modal_message"><span></div>
        <div tabindex="0" class="close_button" tabindex="0"><button>${words[registry.lang].confirm_button
      }</button></div>
      </div>
    </section>
    </div>
    `;
    return modalHtml;
  }

  async updateGdprContent() {
    const gdpr = document.getElementById('gdpr');
    const title = gdpr.querySelector('h2');
    const content = gdpr.querySelector('p');
    const ul = gdpr.querySelector('ul');
    const agreement = gdpr.querySelectorAll('p')[1];
    const button = gdpr.querySelector('button');

    let currentLang = registry.lang;

    title.textContent = words[currentLang].title;
    content.textContent = words[currentLang].content;
    ul.innerHTML = words[currentLang].items
      .map((item) => `<li><strong>${item.split(':')[0]}:</strong> ${item.split(':')[1]}</li>`)
      .join('');
    agreement.textContent = words[currentLang].agreement;
    button.textContent = words[currentLang].button;
  }

  updateTimer(timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = `${words[registry.lang].remain_time} ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  async onMounted() {
    const sendBtn = document.getElementById('emailSendBtnBox');
    const faCodeBox = document.querySelector('.fa_code_container_box');
    const dropdownToggle = document.getElementById('dropdownMenuButton');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const timerDiv = document.getElementById('timer');
    faCodeBox.style.display = 'none';
    const span = sendBtn.querySelector('span');
    let timer;
    sendBtn.addEventListener('click', async (e) => {
      if (span.innerText === `${words[registry.lang].email_send_button}`) {
        span.innerText = `${words[registry.lang].email_resend_button}`;
        faCodeBox.style.display = 'block';
      }
      if (timer) {
        clearInterval(timer);
      }
      let timeLeft = 180;
      this.updateTimer(timeLeft);
      timer = setInterval(() => {
        timeLeft -= 1;
        this.updateTimer(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          timerDiv.textContent = `${words[registry.lang].remain_time_over}`;
        }
      }, 1000);
      const response = await postLogin2FA();
    });

    sendBtn.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });

    dropdownToggle.addEventListener('click', () => {
      dropdownMenu.classList.toggle('show');
    });
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach((item) => {
      item.addEventListener('click', async (event) => {
        event.preventDefault();
        const selectedLang = item.getAttribute('data-lang');
        registry.lang = selectedLang;
        dropdownMenu.classList.remove('show');
        window.dispatchEvent(new Event('popstate'));
        const newLang = event.target.dataset.lang;
        changeLanguage(newLang);
        await this.updateGdprContent();
        if (timer) {
          clearInterval(timer);
        }
      });
    });
  }

  async checkCode() {
    const checkBtn = document.querySelector('.codeVerifyBtnDiv');
    const errorModal = document.querySelector('.friend_add_modal');
    const errorModalButton = document.querySelector('.close_button');

    errorModalButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        errorModalButton.click();
      }
    })
    errorModalButton.addEventListener('click', () => {
      errorModal.classList.add('hidden')
    })

    checkBtn.addEventListener('keydown', async (e) => {
      const faCodeInputs = document.querySelectorAll('.fa_code_input');
      const faCode = Array.from(faCodeInputs)
        .map((input) => input.value)
        .join('');
      if (e.key === 'Enter' && (faCode.length !== undefined && faCode.length >= 6)) {
        checkBtn.click();
      }
    })
    checkBtn.addEventListener('click', async (e) => {
      const faCodeInputs = document.querySelectorAll('.fa_code_input');
      const faCode = Array.from(faCodeInputs)
        .map((input) => input.value)
        .join('');
      if (faCode.length < 6 || faCode.length === undefined || faCode === undefined) {
        errorModal.classList.remove('hidden');
        errorModal.querySelector('span').textContent = words[registry.lang].twofactor_error_code;
        return;
      }
      const response = await postLoginCode2FA(faCode);
      if (response) {
        if (response.token) {
          window.localStorage.setItem('2FA', response.token);
          window.location.href = '/';
        } else {
          errorModal.classList.remove('hidden');
          errorModal.querySelector('span').textContent = words[registry.lang].twofactor_error_code;
          return;
        }
      }
    });
  }

  async addEvent() {
    addBlurBackground();
    this.onMounted();
    const gdpr = document.getElementById('gdpr');
    const faCodeInputs = document.querySelectorAll('.fa_code_input');
    const user_email_p = document.getElementById('user_email');
    const errorModal = document.querySelector('.friend_add_modal');
    const errorModalButton = document.querySelector('.close_button');
    const registration = await getRegistration();
    const checkBtn = document.querySelector('.codeVerifyBtnDiv');
    errorModalButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        errorModalButton.click();
      }
    })
    errorModalButton.addEventListener('click', () => {
      errorModal.classList.add('hidden');
    })

    let user_email = registration.email;
    if (user_email === null) {
      localStorage.clear();
      errorModal.classList.remove('hidden');
      errorModal.querySelector('span').textContent = words[registry.lang].twofactor_error_email;
      window.location.href = '/';
    }
    user_email_p.textContent = `${words[registry.lang].your_email} ${user_email}`;
    if (registration.status === 'new_user') {
      gdpr.style.display = 'grid';
    }
    const agreeBtn = document.getElementById('agreeBtn');
    agreeBtn.addEventListener('click', (e) => {
      gdpr.style.display = 'none';
    });
    agreeBtn.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        agreeBtn.click();
      }
    });

    faCodeInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (input.value.length >= 1 && index < faCodeInputs.length - 1) {
          faCodeInputs[index + 1].focus();
        }
      });
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').slice(0, 6);
        faCodeInputs.forEach((input, idx) => {
          input.value = pasteData[idx] || '';
        });
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          checkBtn.click();
        }
        if (e.key === 'Backspace' && input.value.length === 1) {
          input.value = '';
        } else if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
          faCodeInputs[index - 1].focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
          faCodeInputs[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < faCodeInputs.length - 1) {
          faCodeInputs[index + 1].focus();
        }
      });
    });
    this.checkCode();
  }
}
