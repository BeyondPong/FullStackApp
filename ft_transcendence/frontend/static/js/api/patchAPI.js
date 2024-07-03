const getToken = (key) => encodeURIComponent(localStorage.getItem(key));

export const patchStatusMessage = async (message) => {
  try {
    const response = await fetch('http://localhost:8000/profile/information/message/', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken('2FA')}`,
      },
      body: JSON.stringify({ status_msg: message }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to patch status message: ', error);
  }
};

export const patchAvatar = async (imgId) => {
  try {
    const response = await fetch('http://localhost:8000/profile/information/photo/', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${getToken('2FA')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile_img: encodeURIComponent(imgId) }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to patch avatar: ', error);
  }
};

export const patchLanguage = async (lang) => {
  try {
    const response = await fetch('http://localhost:8000/profile/language/', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${getToken('2FA')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language: encodeURIComponent(lang) }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to patch language: ', error);
  }
};
