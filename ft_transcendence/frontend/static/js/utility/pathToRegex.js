const sanitizePath = (path) => {
  return path
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/<.*?javascript:.*?>/gi, '')
    .replace(/<.*? on.*?=.*?>/gi, '');
};

const pathToRegex = (path) => {
  const sanitizedPath = sanitizePath(path);
  return new RegExp('^' + sanitizedPath.replace(/\//g, '\\/').replace(/:\w+/g, '(.+)') + '$');
};

export default pathToRegex;
