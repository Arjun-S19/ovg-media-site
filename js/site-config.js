// Replace this single value when the final OVG! Media inbox is confirmed.
const OVG_MEDIA_EMAIL = "contact@ovgmedia.com";

document.querySelectorAll("[data-ovg-email]").forEach((link) => {
  link.href = `mailto:${OVG_MEDIA_EMAIL}`;
});

const revealAboutCopy = () => {
  document.documentElement.classList.add("fonts-ready");
};

if (document.fonts?.ready) {
  document.fonts.ready.then(revealAboutCopy);
} else {
  revealAboutCopy();
}
