const root = document.documentElement;
const body = document.body;
const homeMain = document.querySelector(".home-main");
const aboutMain = document.querySelector(".about-main");
const homeHero = document.querySelector(".home-hero");
const aboutCopy = document.querySelector(".about-copy");
const footer = document.querySelector(".site-footer");
const siteNav = document.querySelector(".site-nav");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentPage = body.classList.contains("ovg-about") ? "about" : "home";
let running = false;

navLinks.forEach((link) => {
  const resolved = new URL(link.getAttribute("href"), window.location.href);
  link.dataset.ovgPage = resolved.pathname.endsWith("/about/") ? "about" : "home";
  link.href = resolved.href;
});

const pageDetails = {
  home: {
    title: "OVG! Media - Viral, By design.",
    description: "OVG! Media - Viral, By design.",
  },
  about: {
    title: "About - OVG! Media",
    description: "OVG! Media empowers artists with opportunity and independence.",
  },
};

const targetFromLink = (link) => link.dataset.ovgPage;

const measureHomeGap = () => {
  const logo = document.querySelector(".ovg-logo");
  const tagline = document.querySelector(".tagline");
  if (!logo || !tagline || !homeHero) return;

  const logoRect = logo.getBoundingClientRect();
  const taglineRect = tagline.getBoundingClientRect();
  const heroRect = homeHero.getBoundingClientRect();
  if (!heroRect.width || !heroRect.height) return;
  const stacked = taglineRect.top >= logoRect.bottom;
  const gapX = stacked
    ? (logoRect.left + logoRect.right) / 2
    : (logoRect.right + taglineRect.left) / 2;
  const gapY = stacked
    ? (logoRect.bottom + taglineRect.top) / 2
    : (Math.max(logoRect.top, taglineRect.top) + Math.min(logoRect.bottom, taglineRect.bottom)) / 2;

  root.style.setProperty(
    "--home-gap-x",
    `${Math.min(95, Math.max(5, ((gapX - heroRect.left) / heroRect.width) * 100))}%`,
  );
  root.style.setProperty(
    "--home-gap-y",
    `${Math.min(95, Math.max(5, ((gapY - heroRect.top) / heroRect.height) * 100))}%`,
  );
};

const updateNavigation = (page) => {
  navLinks.forEach((link) => {
    const active = targetFromLink(link) === page;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
};

const updateMetadata = (page) => {
  document.title = pageDetails[page].title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", pageDetails[page].description);
};

const setStaticPage = (page) => {
  currentPage = page;
  body.classList.toggle("ovg-home", page === "home");
  body.classList.toggle("ovg-about", page === "about");
  homeMain.hidden = page !== "home";
  aboutMain.hidden = page !== "about";
  footer.hidden = page !== "about";
  updateNavigation(page);
  updateMetadata(page);
  if (page === "home") requestAnimationFrame(measureHomeGap);
};

const clearTransitionClasses = () => {
  body.classList.remove(
    "is-client-transitioning",
    "is-transition-running",
    "is-transitioning-to-home",
    "is-transitioning-to-about",
  );
  homeMain.classList.remove("transition-source", "transition-target");
  aboutMain.classList.remove("transition-source", "transition-target");
};

const runTransition = (destination, url, pushHistory = true) => {
  if (running || destination === currentPage) return;
  if (reduceMotion.matches) {
    setStaticPage(destination);
    if (pushHistory) history.pushState({ ovgPage: destination }, "", url);
    return;
  }

  running = true;
  const source = currentPage === "home" ? homeMain : aboutMain;
  const target = destination === "home" ? homeMain : aboutMain;

  homeMain.hidden = false;
  aboutMain.hidden = false;
  footer.hidden = false;
  source.classList.add("transition-source");
  target.classList.add("transition-target");
  body.classList.add(
    "is-client-transitioning",
    destination === "about"
      ? "is-transitioning-to-about"
      : "is-transitioning-to-home",
  );
  updateNavigation(destination);
  if (destination === "home") measureHomeGap();

  void target.offsetWidth;
  requestAnimationFrame(() => {
    body.classList.add("is-transition-running");
    const animatedElements = [homeHero, aboutCopy, footer];
    const animations = animatedElements.flatMap((element) =>
      element ? element.getAnimations() : [],
    );
    const finished = animations.length
      ? Promise.all(animations.map((animation) => animation.finished.catch(() => {})))
      : Promise.resolve();

    finished.then(() => {
      clearTransitionClasses();
      setStaticPage(destination);
      if (pushHistory) history.pushState({ ovgPage: destination }, "", url);
      running = false;
    });
  });
};

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const destination = targetFromLink(link);
    event.preventDefault();
    runTransition(destination, link.href);
  });
});

window.addEventListener("popstate", () => {
  const destination = window.location.pathname.endsWith("/about/")
    ? "about"
    : "home";
  if (destination !== currentPage) setStaticPage(destination);
});

const visualAssets = [];
if (document.fonts?.ready) visualAssets.push(document.fonts.ready);
const logo = document.querySelector(".ovg-logo");
if (logo?.decode) visualAssets.push(logo.decode().catch(() => {}));

Promise.all(visualAssets).then(() => {
  root.classList.add("fonts-ready", "home-ready", "navigation-ready");
  measureHomeGap();
  if (!reduceMotion.matches && siteNav) {
    siteNav.addEventListener(
      "animationend",
      () => body.classList.remove("is-initial-nav-entry"),
      { once: true },
    );
    body.classList.add("is-initial-nav-entry");
  }
  if (currentPage === "home" && !reduceMotion.matches) {
    homeHero.addEventListener(
      "animationend",
      () => body.classList.remove("is-initial-home-entry"),
      { once: true },
    );
    body.classList.add("is-initial-home-entry");
  }
});

window.addEventListener("resize", () => requestAnimationFrame(measureHomeGap));
setStaticPage(currentPage);
