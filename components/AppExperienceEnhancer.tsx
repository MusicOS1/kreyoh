"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PAGE_SIZE = 15;

const styles = `
html{scroll-behavior:smooth}
body{overscroll-behavior-y:none}
.kreyoh-app-shell,.control-room{scroll-behavior:smooth}

.fx-page-enter{animation:fxPageEnter .48s cubic-bezier(.2,.75,.25,1) both}
.fx-reveal{opacity:0;transform:translate3d(0,18px,0);transition:opacity .58s cubic-bezier(.2,.75,.25,1),transform .58s cubic-bezier(.2,.75,.25,1)}
.fx-reveal.fx-visible{opacity:1;transform:none}
.fx-lift{transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
@media (hover:hover) and (pointer:fine){.fx-lift:hover{transform:translateY(-3px)}}
.fx-press:active{transform:scale(.985)}
@keyframes fxPageEnter{from{opacity:.65;transform:translate3d(0,8px,0)}to{opacity:1;transform:none}}

/* FACKTS Music catalogue search + pagination */
.fm-catalog-tools{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  margin:18px 0 16px;
}
.fm-catalog-search{
  position:relative;
  display:flex;
  align-items:center;
  flex:1 1 560px;
  min-width:0;
  max-width:760px;
  height:52px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:16px;
  background:linear-gradient(180deg,rgba(255,255,255,.052),rgba(255,255,255,.026));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 12px 32px rgba(0,0,0,.18);
  overflow:hidden;
  transition:border-color .18s ease,box-shadow .18s ease,background .18s ease;
}
.fm-catalog-search:focus-within{
  border-color:rgba(249,115,22,.46);
  background:rgba(255,255,255,.06);
  box-shadow:0 0 0 4px rgba(249,115,22,.065),0 16px 36px rgba(0,0,0,.23);
}
.fm-catalog-search-icon{
  flex:0 0 auto;
  width:18px;
  height:18px;
  margin-left:17px;
  color:rgba(255,255,255,.42);
}
.fm-catalog-search:focus-within .fm-catalog-search-icon{color:#ff9a46}
.fm-catalog-search input{
  flex:1 1 auto;
  min-width:0;
  height:100%;
  padding:0 14px 0 12px;
  border:0!important;
  outline:0!important;
  background:transparent!important;
  color:#fff!important;
  box-shadow:none!important;
  font-size:13px!important;
}
.fm-catalog-search input::placeholder{color:rgba(255,255,255,.34)}
.fm-catalog-search button{
  flex:0 0 auto;
  align-self:stretch;
  min-width:92px;
  border:0;
  border-left:1px solid rgba(249,115,22,.18);
  background:rgba(249,115,22,.095);
  color:#ffad63;
  font-size:10px;
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
  cursor:pointer;
}
.fm-catalog-meta{
  flex:0 0 auto;
  color:rgba(255,255,255,.42);
  font-size:10px;
  font-weight:800;
  letter-spacing:.055em;
  white-space:nowrap;
}
.fm-catalog-pagination{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:9px;
  margin:20px 0 6px;
}
.fm-catalog-pagination button,
.fackts-beats-page .pagination a{
  display:inline-flex;
  min-height:42px;
  align-items:center;
  justify-content:center;
  padding:0 14px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:11px;
  background:rgba(255,255,255,.035);
  color:rgba(255,255,255,.78);
  font-size:10px;
  font-weight:850;
  text-decoration:none;
  cursor:pointer;
  transition:border-color .16s ease,background .16s ease,color .16s ease,transform .16s ease;
}
.fm-catalog-pagination button:hover,
.fackts-beats-page .pagination a:hover{
  border-color:rgba(249,115,22,.34);
  background:rgba(249,115,22,.08);
  color:#ffad63;
  transform:translateY(-1px);
}
.fm-catalog-pagination button:disabled,
.fackts-beats-page .pagination a[aria-disabled="true"]{
  pointer-events:none;
  opacity:.34;
}
.fm-catalog-pagination span,
.fackts-beats-page .pagination span{
  min-width:105px;
  text-align:center;
  color:rgba(255,255,255,.43);
  font-size:10px;
  font-weight:800;
}
.fackts-beats-page .pagination{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:9px;
  margin:22px 0 4px;
}
.fm-catalog-empty{
  margin:8px 0 18px;
  padding:20px;
  border:1px dashed rgba(255,255,255,.11);
  border-radius:14px;
  color:rgba(255,255,255,.48);
  text-align:center;
  font-size:12px;
}

@media(max-width:680px){
  .fm-catalog-tools{align-items:stretch;flex-direction:column}
  .fm-catalog-search{width:100%;max-width:none;flex-basis:auto;height:50px}
  .fm-catalog-search button{min-width:74px}
  .fm-catalog-meta{padding-left:2px}
  .fm-catalog-pagination{gap:6px}
  .fm-catalog-pagination button,.fackts-beats-page .pagination a{min-height:40px;padding:0 11px}
  .fm-catalog-pagination span,.fackts-beats-page .pagination span{min-width:88px}
}

@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto!important}
  .fx-page-enter{animation:none!important}
  .fx-reveal{opacity:1!important;transform:none!important;transition:none!important}
  .fx-lift{transition:none!important}
  .fm-catalog-search,.fm-catalog-pagination button,.fackts-beats-page .pagination a{transition:none!important}
}
`;

function parseMetric(text: string) {
  const normalized = text.replace(/,/g, "").trim();
  const match = normalized.match(/^([^0-9-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  return {
    prefix: match[1],
    value,
    suffix: match[3],
    decimals: (match[2].split(".")[1] || "").length,
  };
}

function searchIcon() {
  return `
    <svg class="fm-catalog-search-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m20 20-3.6-3.6"></path>
    </svg>
  `;
}

function installTrackCatalogueControls() {
  const list = document.querySelector(".fackts-tracks-page .track-operations-list");
  if (!(list instanceof HTMLElement)) return () => {};

  const cards = Array.from(
    list.querySelectorAll(".track-development-card"),
  ).filter((node): node is HTMLElement => node instanceof HTMLElement);

  if (!cards.length) return () => {};

  /* The playlist above is intentionally not selected or modified here. */
  const tools = document.createElement("div");
  tools.className = "fm-catalog-tools";
  tools.dataset.catalogEnhancer = "tracks";

  const searchWrap = document.createElement("div");
  searchWrap.className = "fm-catalog-search";
  searchWrap.innerHTML = searchIcon();

  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Search tracks, artists, producers or track codes...";
  input.setAttribute("aria-label", "Search tracks");
  input.autocomplete = "off";

  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "Clear";

  searchWrap.append(input, clear);

  const meta = document.createElement("span");
  meta.className = "fm-catalog-meta";

  tools.append(searchWrap, meta);
  list.parentElement?.insertBefore(tools, list);

  const pager = document.createElement("nav");
  pager.className = "fm-catalog-pagination";
  pager.setAttribute("aria-label", "Track catalogue pages");

  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "Previous";

  const label = document.createElement("span");

  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "Next";

  pager.append(previous, label, next);
  list.insertAdjacentElement("afterend", pager);

  const empty = document.createElement("div");
  empty.className = "fm-catalog-empty";
  empty.textContent = "No tracks match that search.";
  empty.hidden = true;
  list.insertAdjacentElement("afterend", empty);

  let page = 1;
  let query = "";

  const filtered = () => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((card) =>
      (card.textContent || "").toLowerCase().includes(needle),
    );
  };

  const render = (scroll = false) => {
    const matches = filtered();
    const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), pages);

    const visible = new Set(
      matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    );

    cards.forEach((card) => {
      card.hidden = !visible.has(card);
    });

    empty.hidden = matches.length > 0;
    label.textContent = `Page ${page} of ${pages}`;
    meta.textContent = `${matches.length} track${matches.length === 1 ? "" : "s"} · ${PAGE_SIZE} per page`;
    previous.disabled = page <= 1;
    next.disabled = page >= pages;

    if (scroll) {
      tools.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  input.addEventListener("input", () => {
    query = input.value;
    page = 1;
    render(false);
  });

  clear.addEventListener("click", () => {
    input.value = "";
    query = "";
    page = 1;
    input.focus();
    render(false);
  });

  previous.addEventListener("click", () => {
    page -= 1;
    render(true);
  });

  next.addEventListener("click", () => {
    page += 1;
    render(true);
  });

  render(false);

  return () => {
    cards.forEach((card) => {
      card.hidden = false;
    });
    tools.remove();
    pager.remove();
    empty.remove();
  };
}

function installBeatsSearchAndFallbackPagination() {
  const pageRoot = document.querySelector(".fackts-beats-page");
  const grid = document.querySelector(".fackts-beats-page .beats-grid-cards");

  if (!(pageRoot instanceof HTMLElement) || !(grid instanceof HTMLElement)) {
    return () => {};
  }

  const cards = Array.from(
    grid.querySelectorAll(".fackts-beat-card"),
  ).filter((node): node is HTMLElement => node instanceof HTMLElement);

  const tools = document.createElement("div");
  tools.className = "fm-catalog-tools";
  tools.dataset.catalogEnhancer = "beats";

  const form = document.createElement("form");
  form.className = "fm-catalog-search";
  form.method = "get";
  form.action = "/beats";
  form.innerHTML = searchIcon();

  const input = document.createElement("input");
  input.type = "search";
  input.name = "q";
  input.placeholder = "Search beats, producers or beat codes...";
  input.setAttribute("aria-label", "Search beats");
  input.autocomplete = "off";

  const current = new URLSearchParams(window.location.search).get("q") || "";
  input.value = current;

  const hiddenPage = document.createElement("input");
  hiddenPage.type = "hidden";
  hiddenPage.name = "page";
  hiddenPage.value = "1";

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = current ? "Search" : "Find";

  form.append(input, hiddenPage, button);

  const meta = document.createElement("span");
  meta.className = "fm-catalog-meta";
  meta.textContent = cards.length
    ? `${cards.length} beat${cards.length === 1 ? "" : "s"} on this page`
    : "Beat catalogue";

  tools.append(form, meta);
  grid.parentElement?.insertBefore(tools, grid);

  /*
   * Current BeatsPage already has backend pagination at 15 per page.
   * If an older local build has no server paginator and renders >15 cards,
   * this fallback paginates those cards client-side too.
   */
  const existingServerPager = pageRoot.querySelector(".pagination");
  let fallbackPager: HTMLElement | null = null;

  if (!existingServerPager && cards.length > PAGE_SIZE) {
    fallbackPager = document.createElement("nav");
    fallbackPager.className = "fm-catalog-pagination";
    fallbackPager.setAttribute("aria-label", "Beat pages");

    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "Previous";

    const label = document.createElement("span");

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next";

    fallbackPager.append(previous, label, next);
    grid.insertAdjacentElement("afterend", fallbackPager);

    let page = 1;
    const pages = Math.ceil(cards.length / PAGE_SIZE);

    const render = (scroll = false) => {
      page = Math.min(Math.max(page, 1), pages);
      cards.forEach((card, index) => {
        card.hidden =
          index < (page - 1) * PAGE_SIZE ||
          index >= page * PAGE_SIZE;
      });
      label.textContent = `Page ${page} of ${pages}`;
      previous.disabled = page <= 1;
      next.disabled = page >= pages;
      if (scroll) {
        tools.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    previous.addEventListener("click", () => {
      page -= 1;
      render(true);
    });
    next.addEventListener("click", () => {
      page += 1;
      render(true);
    });
    render(false);
  }

  return () => {
    cards.forEach((card) => {
      card.hidden = false;
    });
    tools.remove();
    fallbackPager?.remove();
  };
}

export default function AppExperienceEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const pageRoot =
      document.querySelector(".control-content") ||
      document.querySelector(".content") ||
      document.querySelector(".platform-home-page");

    if (pageRoot instanceof HTMLElement && !reduced) {
      pageRoot.classList.remove("fx-page-enter");
      void pageRoot.offsetWidth;
      pageRoot.classList.add("fx-page-enter");
    }

    const revealSelectors = [
      ".panel",
      ".platform-home-section",
      ".attention-card",
      ".home-project-card",
      ".creator-directory-card",
      ".project-operating-card",
      ".control-panel",
      ".control-project-card",
      ".control-user-card",
      ".control-metrics article",
      ".finance-metrics article",
      ".stat-card",
      ".metric-card",
    ];

    const revealNodes = Array.from(
      document.querySelectorAll(revealSelectors.join(",")),
    ).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement,
    );

    revealNodes.forEach((node, index) => {
      node.classList.add("fx-lift");
      if (!reduced) {
        node.classList.add("fx-reveal");
        node.style.transitionDelay = `${Math.min(
          index % 6,
          5,
        ) * 45}ms`;
      }
    });

    let observer: IntersectionObserver | null = null;

    if (!reduced && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add(
                "fx-visible",
              );
              observer?.unobserve(entry.target);
            }
          }
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -4% 0px",
        },
      );

      revealNodes.forEach((node) => observer?.observe(node));
    } else {
      revealNodes.forEach((node) =>
        node.classList.add("fx-visible"),
      );
    }

    const buttons = document.querySelectorAll(
      "button, a.secondary-button-inline, a.login-submit-btn, .control-content a",
    );
    buttons.forEach((node) =>
      node.classList.add("fx-press"),
    );

    const metricSelectors = [
      ".control-metrics strong",
      ".finance-metrics strong",
      ".metric-card strong",
      ".stat-card strong",
      ".attention-card strong",
    ];

    const metricNodes = Array.from(
      document.querySelectorAll(metricSelectors.join(",")),
    ).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement,
    );

    const animated = new WeakSet<HTMLElement>();

    const animateMetric = (node: HTMLElement) => {
      if (animated.has(node)) return;

      const parsed = parseMetric(node.textContent || "");

      if (
        !parsed ||
        reduced ||
        Math.abs(parsed.value) > 1_000_000_000
      ) {
        return;
      }

      animated.add(node);

      const finalText = node.textContent || "";
      const start = performance.now();
      const duration = 750;

      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = parsed.value * eased;

        const formatted = current.toLocaleString("en-KE", {
          minimumFractionDigits: parsed.decimals,
          maximumFractionDigits: parsed.decimals,
        });

        node.textContent = `${parsed.prefix}${formatted}${parsed.suffix}`;

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          node.textContent = finalText;
        }
      };

      requestAnimationFrame(frame);
    };

    let metricObserver: IntersectionObserver | null = null;

    if (!reduced && "IntersectionObserver" in window) {
      metricObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateMetric(entry.target as HTMLElement);
              metricObserver?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.35 },
      );

      metricNodes.forEach((node) =>
        metricObserver?.observe(node),
      );
    }

    let removeCatalogueControls = () => {};

    if (pathname.startsWith("/tracks")) {
      removeCatalogueControls =
        installTrackCatalogueControls();
    } else if (pathname.startsWith("/beats")) {
      removeCatalogueControls =
        installBeatsSearchAndFallbackPagination();
    }

    return () => {
      observer?.disconnect();
      metricObserver?.disconnect();
      removeCatalogueControls();

      revealNodes.forEach((node) => {
        node.classList.remove(
          "fx-reveal",
          "fx-visible",
          "fx-lift",
        );
        node.style.transitionDelay = "";
      });
    };
  }, [pathname]);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: styles,
      }}
    />
  );
}
