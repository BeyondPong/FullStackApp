import AbstractView from './AbstractView.js';
import registry from '../state/Registry.js';
import { words } from '../state/Registry.js';
import { getProfileData, getHistoryData, getFriendsData, getSearchResultData } from '../api/getAPI.js';
import { postAddFriend } from '../api/postAPI.js';
import { deleteAccount, deleteFriend } from '../api/deleteAPI.js';
import { patchStatusMessage, patchAvatar } from '../api/patchAPI.js';

export default class extends AbstractView {
  constructor(params) {
    super(params);
  }

  async getHtml() {
    return `
              <header class="main_header">
                <a href="/" id="main_link" class="nav__link" data-link>Ping? Pong!</a>
              </header>
              <nav>
              <a href="/" id="unregister" class="nav__link" data-link>${words[registry.lang].unregister}</a>
              <a href="/play" id="play_link" class="nav__link" data-link>${words[registry.lang].play}</a>
              <a href="/profile" id="profile_link" class="nav__link" data-link style="pointer-events: none; color: grey; text-decoration: none;">${
                words[registry.lang].profile
              }</a>
              </nav>
              <section class="modal_container">
                <div class="modal_content profile_modal">
                  <ul class="profile_nav">
                    <li class="profile_nav_item"><a href="#" class="information">${
                      words[registry.lang].information
                    }</a></li>
                    <li class="profile_nav_item"><a href="#" class="history">${words[registry.lang].history}</a></li>
                    <li class="profile_nav_item"><a href="#" class="friends">${words[registry.lang].friends}</a></li>
                    <li class="profile_nav_item"><a href="#" class="search">${words[registry.lang].search}</a></li>
                  </ul>
                  <div class="profile_content">
                  </div>
                </div>
              </section>
              `;
  }

  async addEvent() {
    const unregisterLink = document.getElementById('unregister');
    unregisterLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await deleteAccount();
      localStorage.removeItem('token');
      localStorage.removeItem('2FA');
      window.location.href = '/';
    });
    unregisterLink.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await deleteAccount();
        localStorage.removeItem('token');
        localStorage.removeItem('2FA');
        window.location.href = '/';
      }
    });
  }

  async showHistoryResult() {
    const tableBody = document.querySelector('.table_tbody');
    tableBody.innerHTML = '';

    const data = await getHistoryData();
    if (data) {
      data.histories.forEach((item) => {
        const tr = document.createElement('tr');
        tr.classList.add('table_content');
        const historyHTML = `
          <td class="table_date">${item.date}</td>
          <td class="table_opponent">${item.opponent}</td>
          <td class="table_match_score">${item.match_score}</td>
          <td class="table_result">${item.result}</td>
        `;
        tr.innerHTML = historyHTML;
        tableBody.appendChild(tr);
      });
    }
  }

  async showFriendsResult() {
    const friendResultBox = document.querySelector('.friends_result_box');
    friendResultBox.innerHTML = '';
    const data = await getFriendsData();
    if (data) {
      if (data.length === 0) {
        const friendHTML = `
        <div class="no_friend_title">${words[registry.lang].no_friend_title}</div>
        <div class="no_friend_subtitle">${words[registry.lang].no_friend_subtitle}</div>
      `;
        const friendDiv = document.createElement('div');
        friendDiv.classList.add('no_friend');
        friendDiv.innerHTML = friendHTML;
        friendResultBox.appendChild(friendDiv);
      }
      data.forEach((friend) => {
        const friendDiv = document.createElement('div');
        friendDiv.classList.add('friend');
        if (friend.status_msg === null) {
          friend.status_msg = `안녕하세요 ${friend.nickname}입니다.`;
        }
        const friendHTML = `
            <div class="friend_state ${friend.is_connected ? 'friend_online' : '#'}"></div>
            <div class="friend_image" style="background-image: url(/static/assets/${friend.profile_img}.png);"></div>
            <div class="friend_name">${friend.nickname}</div>
            <div class="friend_message">${friend.status_msg}</div>
            <div tabindex="0" class="friend_button"><button class="delete_button friendButton" data-user-id=${
              friend.id
            }>${words[registry.lang].friend_delete_button}</button></div>
        `;
        friendDiv.innerHTML = friendHTML;
        friendResultBox.appendChild(friendDiv);
      });

      const deleteButtonsTab = Array.from(document.getElementsByClassName('friend_button'));
      deleteButtonsTab.forEach((deleteButtons) => {
        deleteButtons.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const button = e.target.querySelector('button');
            if (button) {
              const userId = button.getAttribute('data-user-id');
              deleteFriend(userId).then(() => {
                button.classList.add('disabled_button');
                button.disabled = true;
                const parent = button.parentElement;
                parent.classList.add('disabled_button');
                button.disabled = true;
              });
            }
          }
        });
      });

      const deleteButtons = Array.from(document.getElementsByClassName('delete_button'));
      deleteButtons.forEach((button) => {
        button.addEventListener('click', function (e) {
          const userId = e.target.getAttribute('data-user-id');
          deleteFriend(userId).then(() => {
            e.target.classList.add('disabled_button');
            e.target.disabled = true;
            const parent = e.target.parentElement;
            parent.classList.add('disabled_button');
            e.target.disabled = true;
          });
        });
        button.addEventListener('keypress', function (e) {
          if (e.key === 'Enter') {
            const userId = e.target.getAttribute('data-user-id');
            deleteFriend(userId).then(() => {
              e.target.classList.add('disabled_button');
              e.target.disabled = true;
              const parent = e.target.parentElement;
              parent.classList.add('disabled_button');
              e.target.disabled = true;
            });
          }
        });
      });
    }
  }

  async showSearchResult() {
    const searchAndDisplayResults = async () => {
      const friendModal = document.getElementsByClassName('friend_add_modal')[0];
      const friendModalButton = document.querySelector('#friend_modal_button');
      friendModalButton.addEventListener('click', () => {
        friendModal.classList.add('hidden');
      });
      friendModalButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          friendModal.classList.add('hidden');
        }
      });
      const query = document.getElementById('search_input').value;
      if (query === '') {
        friendModal.classList.remove('hidden');
        friendModal.querySelector('span').textContent = `${words[registry.lang].friend_search_error_noinput}`;
        return;
      }
      friendModal.classList.add('hidden');
      const matchFriends = await getSearchResultData(query);
      if (!matchFriends || matchFriends.users.length === 0) {
        friendModal.classList.remove('hidden');
        friendModal.querySelector('span').textContent = `${words[registry.lang].friend_search_error_nomatch}`;
        return;
      }
      const searchResultBox = document.querySelector('.search_result_box');
      searchResultBox.innerHTML = '';

      matchFriends.users.forEach((user) => {
        const friendElement = document.createElement('div');
        friendElement.classList.add('friend');
        if (user.status_msg === null) {
          user.status_msg = `안녕하세요 ${user.nickname}입니다.`;
        }
        let resultHTML = `
          <div class="friend_image" style="background-image: url(/static/assets/${user.profile_img}.png);"></div>
          <div class="friend_name">${user.nickname}</div>
          <div class="friend_message">${user.status_msg}</div>
        `;
        if (user.is_friend) {
          resultHTML += `<div class="disabled_friend_button friend_add_button"><button class="add_button friendButton disabled_button" disabled data-user-id="${
            user.id
          }">${words[registry.lang].friend_add_button}</button></div>`;
        } else {
          resultHTML += `<div tabindex="0" class="friend_add_button"><button tabindex="0" class="add_button friendButton" data-user-id="${
            user.id
          }">${words[registry.lang].friend_add_button}</button></div>`;
        }
        friendElement.innerHTML = resultHTML;
        searchResultBox.appendChild(friendElement);
      });

      const addButtonsTab = Array.from(document.getElementsByClassName('friend_add_button'));
      addButtonsTab.forEach((buttonTab) => {
        buttonTab.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const button = e.target.querySelector('button');
            if (button) {
              const userId = button.getAttribute('data-user-id');
              const user = matchFriends.users.find((u) => u.id === parseInt(userId));
              if (user && user.is_friend === false) {
                postAddFriend(userId).then(() => {
                  friendModal.classList.remove('hidden');
                  friendModal.querySelector('span').textContent = `${words[registry.lang].friend_message_success}`;
                  button.style.cursor = 'not-allowed';
                  button.style.backgroundColor = 'grey';
                  button.disabled = true;
                  button.parentNode.classList.add('disabled_friend_button');
                });
              }
            }
          }
        });
      });

      const buttons = Array.from(document.getElementsByClassName('add_button'));
      buttons.forEach((button) => {
        button.addEventListener('click', (e) => {
          const userId = e.target.getAttribute('data-user-id');
          const user = matchFriends.users.find((u) => u.id === parseInt(userId));
          if (user && user.is_friend === false) {
            postAddFriend(userId).then(() => {
              friendModal.classList.remove('hidden');
              friendModal.querySelector('span').textContent = `${words[registry.lang].friend_message_success}`;
              e.target.style.cursor = 'not-allowed';
              e.target.style.backgroundColor = 'grey';
              e.target.disabled = true;
              e.target.parentNode.classList.add('disabled_friend_button');
            });
          }
        });
        button.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const userId = e.target.getAttribute('data-user-id');
            const user = matchFriends.users.find((u) => u.id === parseInt(userId));
            if (user && user.is_friend === false) {
              postAddFriend(userId).then(() => {
                friendModal.classList.remove('hidden');
                friendModal.querySelector('span').textContent = `${words[registry.lang].friend_message_success}`;
                e.target.style.cursor = 'not-allowed';
                e.target.style.backgroundColor = 'grey';
                e.target.disabled = true;
                e.target.parentNode.classList.add('disabled_friend_button');
              });
            }
          }
        });
      });
    };

    document.querySelector('.search_button_container').addEventListener('click', async (e) => {
      await searchAndDisplayResults();
    });
    document.querySelector('.search_button_container').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await searchAndDisplayResults();
      }
    });
    document.getElementById('search_input').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await searchAndDisplayResults();
      }
    });
  }

  async moveTabs(tabText) {
    const profileContent = document.querySelector('.profile_content');
    profileContent.innerHTML = '';
    if (tabText === words[registry.lang].information) {
      const data = await getProfileData();
      if (data) {
        if (data.status_msg === null) {
          data.status_msg = `안녕하세요 ${data.nickname}입니다.`;
        }
        const container = document.createElement('div');
        container.classList.add('profile_container');
        const profileHTML = `
        <div class="profile_content_elements">
            <div class="profile_img_container">
              <div class="profile_img" style="background-image: url(/static/assets/${data.profile_img}.png);">
                <button tabindex="0" class="pencil-profile" id="avatar_edit"><i tabindex="0" class="fa-solid fa-pencil"></i></button>
              </div>
            </div>
            <div class="profile_name_container">
              <span class="profile_name">${data.nickname}</span>
              <div class="profile_lang_container"><span class="profile_lang">${data.language}</span></div>
            </div>
            <div class="profile_status_container">
              <div class="profile_status">
                <div class="status__msg"><span id="status_msg">${data.status_msg}</span></div>
                <div class="status__input">
                  <input type="text" id="status_input" class="hidden" />
                  <div id="status_input_length" class="hidden"><span id="length"></span><span>/20</span></div>
                </div>
              </div>
              <div>
              <div tabindex="0" class="profile_img_edit" id="status_edit"><button><i class="fa-solid fa-pencil"></i></button></div>
              <div tabindex="0" class="profile_status_save hidden" id="status_save"><button><i class="fa-solid fa-check"></i></button></div>
              </div>
            </div>
            <span class="profile_count">${data.win_cnt}${words[registry.lang].win} ${data.lose_cnt}${
          words[registry.lang].lose
        } </span>
          <section class="profile_img_modal hidden">
            <div class="profile_img_modal_flex">
              <div class="profile_img_set">
                <div tabindex="0" class="profile_img_select" data-img-id="1" style="background-image: url(/static/assets/1.png);"></div>
                <div tabindex="0" class="profile_img_select" data-img-id="2" style="background-image: url(/static/assets/2.png);"></div>
                <div tabindex="0" class="profile_img_select" data-img-id="3" style="background-image: url(/static/assets/3.png);"></div>
                <div tabindex="0" class="profile_img_select" data-img-id="4" style="background-image: url(/static/assets/4.png);"></div>
              </div>
              <div class="profile_img_buttons">
                <div class="img_save_button" tabindex="0"><button class="save_button">${
                  words[registry.lang].avatar_save_button
                }</button></div>
                <div class="img_close_button" tabindex="0"><button class="close_button">${
                  words[registry.lang].avatar_close_button
                }</button></div>
              </div>
            </div>
          </section>
        </div>
    `;
        container.innerHTML = profileHTML;
        profileContent.replaceChildren(container);
        const avatarEditButton = document.getElementById('avatar_edit');
        const avatarModal = document.getElementsByClassName('profile_img_modal')[0];
        const imgSaveButton = document.getElementsByClassName('img_save_button')[0];
        const imgCloseButton = document.getElementsByClassName('img_close_button')[0];
        const avatarList = Array.from(document.getElementsByClassName('profile_img_select'));
        const profileImage = document.getElementsByClassName('profile_img')[0];
        let imgId;
        let currentAvatarId = data.profile_img;

        imgCloseButton.addEventListener('click', () => {
          avatarModal.classList.add('hidden');
        });
        imgCloseButton.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            avatarModal.classList.add('hidden');
          }
        });

        imgSaveButton.addEventListener('click', async () => {
          if (imgId === undefined) {
            profileImage.style.backgroundImage = `url(/static/assets/${currentAvatarId}.png)`;
            imgId = currentAvatarId;
          } else if (currentAvatarId === imgId) {
            profileImage.style.backgroundImage = `url(/static/assets/${imgId}.png)`;
            currentAvatarId = imgId;
          } else {
            await patchAvatar(imgId);
            profileImage.style.backgroundImage = `url(/static/assets/${imgId}.png)`;
            currentAvatarId = imgId;
          }
          if (imgId === undefined) {
            profileImage.style.backgroundImage = `url(/static/assets/${currentAvatarId}.png)`;
            imgId = currentAvatarId;
          } else if (currentAvatarId === imgId) {
            profileImage.style.backgroundImage = `url(/static/assets/${imgId}.png)`;
            currentAvatarId = imgId;
          } else {
            await patchAvatar(imgId);
            profileImage.style.backgroundImage = `url(/static/assets/${imgId}.png)`;
            currentAvatarId = imgId;
          }
          avatarModal.classList.add('hidden');
        });

        imgSaveButton.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            if (imgId === undefined) {
              profileImage.style.backgroundImage = `url(/static/assets/${currentAvatarId}.png)`;
              imgId = currentAvatarId;
            } else if (currentAvatarId === imgId) {
              profileImage.style.backgroundImage = `url(/static/assets/${imgId}.png)`;
              currentAvatarId = imgId;
            } else {
              await patchAvatar(imgId);
              profileImage.style.backgroundImage = `url(/static/assets/${imgId}.png)`;
              currentAvatarId = imgId;
            }
            avatarModal.classList.add('hidden');
          }
        });

        avatarEditButton.addEventListener('click', () => {
          avatarModal.classList.remove('hidden');
          avatarList.forEach((img) => {
            img.style.border = '2px solid #fff';

            if (img.getAttribute('data-img-id') === currentAvatarId.toString()) {
              img.style.border = '4px solid var(--profile-background)';
            }
            img.addEventListener('click', () => {
              avatarList.forEach((img) => {
                img.style.border = '2px solid #fff';
              });
              img.style.border = '4px solid var(--profile-background)';
              imgId = img.getAttribute('data-img-id');
            });
            img.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                avatarList.forEach((img) => {
                  img.style.border = '2px solid #fff';
                });
                img.style.border = '4px solid var(--profile-background)';
                imgId = img.getAttribute('data-img-id');
              }
            });
            img.addEventListener('mouseenter', () => {
              img.style.transform = 'scale(1.1)';
            });
            img.addEventListener('mouseleave', () => {
              img.style.transform = 'none';
            });
          });
        });

        const input = document.getElementById('status_input');
        const message = document.getElementById('status_msg');
        const editButton = document.getElementById('status_edit');
        const saveButton = document.getElementById('status_save');
        const lengthContainer = document.getElementById('status_input_length');
        const length = document.getElementById('length');

        editButton.addEventListener('click', () => {
          editButton.classList.toggle('hidden');
          saveButton.classList.toggle('hidden');
          message.classList.toggle('hidden');
          lengthContainer.classList.toggle('hidden');
          input.classList.toggle('hidden');
          input.value = message.textContent;
          length.textContent = message.textContent.length;
          input.addEventListener('input', () => {
            length.textContent = input.value.length;
            if (input.value === '' || input.value.length > 20) {
              input.style.borderBottomColor = 'var(--disabled-button-background-color)';
              saveButton.querySelector('button').style.cursor = 'not-allowed';
              saveButton.querySelector('button').style.color = 'var(--disabled-button-background-color)';
              saveButton.querySelector('button').disabled = true;
            } else {
              input.style.borderBottomColor = 'var(--profile-background)';
              saveButton.querySelector('button').style.cursor = 'pointer';
              saveButton.querySelector('button').style.color = 'var(--profile-background)';
              saveButton.querySelector('button').disabled = false;
            }
          });
        });

        editButton.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            editButton.classList.toggle('hidden');
            saveButton.classList.toggle('hidden');
            message.classList.toggle('hidden');
            lengthContainer.classList.toggle('hidden');
            input.classList.toggle('hidden');
            input.value = message.textContent;
            length.textContent = message.textContent.length;
            input.addEventListener('input', () => {
              length.textContent = input.value.length;
              if (input.value === '' || input.value.length > 20) {
                input.style.borderBottomColor = 'var(--disabled-button-background-color)';
                saveButton.querySelector('button').style.cursor = 'not-allowed';
                saveButton.querySelector('button').style.color = 'var(--disabled-button-background-color)';
                saveButton.querySelector('button').disabled = true;
              } else {
                input.style.borderBottomColor = 'var(--profile-background)';
                saveButton.querySelector('button').style.cursor = 'pointer';
                saveButton.querySelector('button').style.color = 'var(--profile-background)';
                saveButton.querySelector('button').disabled = false;
              }
            });
          }
        });

        saveButton.addEventListener('click', async () => {
          if (input.value !== message.textContent) {
            const data = await patchStatusMessage(input.value);
          }
          message.textContent = input.value;
          editButton.classList.toggle('hidden');
          saveButton.classList.toggle('hidden');
          input.classList.toggle('hidden');
          message.classList.toggle('hidden');
          lengthContainer.classList.toggle('hidden');
        });
        saveButton.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            if (input.value !== message.textContent) {
              const data = await patchStatusMessage(input.value);
            }
            message.textContent = input.value;
            editButton.classList.toggle('hidden');
            saveButton.classList.toggle('hidden');
            input.classList.toggle('hidden');
            message.classList.toggle('hidden');
            lengthContainer.classList.toggle('hidden');
          }
        });
      }
    } else if (tabText === words[registry.lang].history) {
      const container = document.createElement('div');
      container.classList.add('history_container');
      const historyHTML = `
        <div class="table_box">
          <table class="table_container">
            <thead>
              <tr>
                <th>${words[registry.lang].table_date}</th>
                <th>${words[registry.lang].table_opponent}</th>
                <th>${words[registry.lang].table_score}</th>
                <th>${words[registry.lang].table_result}</th>
              </tr>
            </thead>
            <tbody class="table_tbody">
\            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = historyHTML;
      profileContent.replaceChildren(container);
      this.showHistoryResult();
    } else if (tabText === words[registry.lang].friends) {
      const container = document.createElement('div');
      container.classList.add('friends_container');
      const friendsHTML = `
        <div class="friends_result_container">
          <div class="friends_result_box">
          </div>
        </div>
      `;
      container.innerHTML = friendsHTML;
      profileContent.replaceChildren(container);
      this.showFriendsResult();
    } else {
      const container = document.createElement('div');
      container.classList.add('search_container');
      const searchHTML = `
        <div class="form_container">
          <form action="#" class="form_box">
            <div class="input_container">
              <input type="search" id="search_input" placeholder='${
                words[registry.lang].friend_search_placeholder
              }' required>
            </div>
            <div tabindex="0" class="search_button_container"><button type="button" class="search_button"><i class="fa-solid fa-magnifying-glass"></i></button></div>
          </form>
          <section class="friend_add_modal hidden" id="friend_add_modal">
            <div class="friend_add_modal_flex">
              <div><span class="friend_add_modal_message"><span></div>
              <div class="save_button" id="friend_modal_button" tabindex="0"><button>${
                words[registry.lang].confirm_button
              }</button></div>
            </div>
          </section>
        </div>
        <div class="search_result_container">
          <div class="search_result_box"></div>
        </div>
      `;
      container.innerHTML = searchHTML;
      profileContent.replaceChildren(container);
      const inputBox = document.getElementById('search_input');
      inputBox.focus();
      this.showSearchResult();
    }
  }

  defaultTabs() {
    this.moveTabs(words[registry.lang].information);
    document.querySelector('.information').classList.add('active_tab');
  }
}
