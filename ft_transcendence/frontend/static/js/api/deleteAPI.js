export const deleteAccount = async () => {
  try {
    const token = encodeURIComponent(localStorage.getItem('2FA'));
    const response = await fetch('http://localhost:8000/profile/withdrawal/', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to delete account: ', error);
  }
};

export const deleteFriend = async (userId) => {
  try {
    const encodedUserId = encodeURIComponent(userId);
    const token = encodeURIComponent(localStorage.getItem('2FA'));
    const response = await fetch(`http://localhost:8000/profile/friends/${encodedUserId}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Failed to delete friend: ', error);
  }
};
