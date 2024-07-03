const getToken = (key) => encodeURIComponent(localStorage.getItem(key));

export const postGameResult = async (gameMode, userInfo) => {
  try {
    const user1 = encodeURIComponent(userInfo.player1.name);
    const user2 = encodeURIComponent(userInfo.player2.name);
    const user1_score = encodeURIComponent(userInfo.player1.score);
    const user2_score = encodeURIComponent(userInfo.player2.score);
    const response = await fetch('http://localhost:8000/play/result/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken('2FA')}`,
      },
      body: JSON.stringify({
        game_type: gameMode,
        user1: user1,
        user2: user2,
        user1_score: user1_score,
        user2_score: user2_score,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to post game result: ', error);
  }
};

export const postLoginCode2FA = async (code) => {
  try {
    const response = await fetch('http://localhost:8000/login/two_fa/verify/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verification_code: code }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to verify 2FA code: ', error);
  }
};

export const postLogin2FA = async () => {
  try {
    const response = await fetch('http://localhost:8000/login/two_fa/request/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken('token')}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert('Failed to get 2FA code: ', error);
    window.location.href = '/';
  }
};

export const postTournamentNickName = async (nickName, realName, roomName) => {
  try {
    const response = await fetch('http://localhost:8000/play/nickname/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken('2FA')}`,
      },
      body: JSON.stringify({ nickname: nickName, realname: realName, room_name: roomName }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to post nickname: ', error);
  }
};

export const postAddFriend = async (userId) => {
  try {
    const encodedUserId = encodeURIComponent(userId);
    const response = await fetch(`http://localhost:8000/profile/search/${encodedUserId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken('2FA')}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to add friend: ', error);
  }
};

export const postLoginCode = async (code) => {
  try {
    const response = await fetch('http://localhost:8000/login/oauth/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken('2FA')}`,
      },
      body: JSON.stringify({ code: code }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to post login code: ', error);
  }
};
