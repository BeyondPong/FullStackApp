export const check2FAStatus = () => {
  const twoFAStatus = localStorage.getItem('2FA');
  if (twoFAStatus === null) {
    return false;
  }
  return true;
};
