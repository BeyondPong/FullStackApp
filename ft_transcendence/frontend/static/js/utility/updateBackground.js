const updateBackground = (type) => {
  const hasNormal = document.body.classList.contains("normal-background");
  const hasError = document.body.classList.contains("error-background");

  if (type === "normal" && hasError) {
    document.body.classList.replace("error-background", "normal-background");
  } else if (type === "error" && hasNormal) {
    document.body.classList.replace("normal-background", "error-background");
  } else if (!hasNormal && !hasError) {
    document.body.classList.add(`${type}-background`);
  }
};

export default updateBackground;
