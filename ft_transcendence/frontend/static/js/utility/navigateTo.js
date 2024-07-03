const navigateTo = (url) => {
  history.pushState(null, null, url);
};

export default navigateTo;
