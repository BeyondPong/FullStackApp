const getToken = (key) => encodeURIComponent(localStorage.getItem(key));

export const getLoginURI = async () => {
  try {
    const response = await fetch(`${window.DJANGO_API_URL}/login/oauth/`, {
      method: "GET",
      "Content-Type": "application/json",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to get login URI: ", error);
  }
};

export const getMultipleLogin = async () => {
  try {
    const response = await fetch(`${window.DJANGO_API_URL}/login/multiple/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken("token")}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to get multiple login: ", error);
  }
};

export const getRegistration = async () => {
  try {
    const response = await fetch(
      `${window.DJANGO_API_URL}/login/registration/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken("token")}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to get registration: ", error);
  }
};

export const getRoomName = async (mode) => {
  try {
    const encodedMode = encodeURIComponent(mode);
    const response = await fetch(
      `${window.DJANGO_API_URL}/play/room/?mode=${encodedMode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken("2FA")}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to get room name: ", error);
  }
};

export const getProfileData = async () => {
  try {
    const response = await fetch(
      `${window.DJANGO_API_URL}/profile/information/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken("2FA")}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert("Failed to load profile data: ", error);
  }
};

export const getHistoryData = async () => {
  try {
    const response = await fetch(`${window.DJANGO_API_URL}/profile/history/`, {
      headers: {
        Authorization: `Bearer ${getToken("2FA")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to load history data: ", error);
  }
};

export const getFriendsData = async () => {
  try {
    const response = await fetch(`${window.DJANGO_API_URL}/profile/friends/`, {
      headers: {
        Authorization: `Bearer ${getToken("2FA")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to load friends data: ", error);
  }
};

export const getSearchResultData = async (userId) => {
  try {
    const encodedUserId = encodeURIComponent(userId);
    const response = await fetch(
      `${window.DJANGO_API_URL}/profile/search/?nickname=${encodedUserId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken("2FA")}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to load search result data: ", error);
  }
};
