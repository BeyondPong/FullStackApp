import { getMultipleLogin } from '../api/getAPI.js';

export const checkMultipleLogin = async () => {
  const data = await getMultipleLogin();
  return data.is_multiple;
};
