export const addBlurBackground = async () => {
  const style = document.createElement('style');
  style.id = 'blur-background-style';
  document.head.appendChild(style);
  style.sheet.insertRule(
    `
      body::before {
    content: "";
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
        position: fixed;
        background: inherit;
        filter: blur(5px);
        z-index: -1;
      }
    `,
  );
};

export const removeBlurBackground = async () => {
  const style = document.getElementById('blur-background-style');
  if (style) {
    document.head.removeChild(style);
  }
};
