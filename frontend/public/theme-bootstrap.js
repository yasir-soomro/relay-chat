(() => {
  let preference = "system";
  try {
    const savedTheme = window.localStorage.getItem("relay-theme");
    preference =
      savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
        ? savedTheme
        : "system";
  } catch {
    preference = "system";
  }

  const theme =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = theme;
})();
