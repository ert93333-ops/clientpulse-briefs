const form = document.querySelector("#brief-form");
const notesInput = document.querySelector("#raw-notes");
const output = document.querySelector("#brief-output");
const error = document.querySelector("#workflow-error");
const copyButton = document.querySelector("#copy-brief");
const waitlistForm = document.querySelector("#waitlist-form");
const waitlistStatus = document.querySelector("#waitlist-status");
const pricingSection = document.querySelector("#pricing");
const siteHeader = document.querySelector(".site-header");

let latestBrief = "";
let signupStarted = false;
let pricingViewed = false;

const ANALYTICS_KEY = "clientpulse_analytics_events";
const EXPERIMENT_ID = "clientpulse-briefs-2026-06-03";
const VARIANT = "static-mvp-v1";
const REMOTE_INTENT_BASE_URL = "https://github.com/ert93333-ops/clientpulse-briefs/issues/new";
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

const buckets = [
  {
    id: "wins",
    title: "Wins",
    keywords: ["launched", "shipped", "completed", "approved", "improved", "reduced", "won", "published"],
  },
  {
    id: "risks",
    title: "Risks and Blockers",
    keywords: ["blocked", "blocking", "risk", "delay", "waiting", "issue", "problem", "stuck"],
  },
  {
    id: "asks",
    title: "Client Asks",
    keywords: ["need", "approve", "approval", "review", "send", "decide", "confirm"],
  },
  {
    id: "next",
    title: "Next Steps",
    keywords: ["next", "tomorrow", "thursday", "friday", "launch", "publish", "prepare"],
  },
  {
    id: "progress",
    title: "Progress",
    keywords: ["mapped", "drafted", "working", "in progress", "tested", "ready", "qa"],
  },
];

function readStoredArray(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  let existing = {};

  try {
    existing = JSON.parse(window.sessionStorage.getItem("clientpulse_utm") || "{}");
  } catch {
    existing = {};
  }

  const current = {
    source: params.get("utm_source") || existing.source || "direct",
    medium: params.get("utm_medium") || existing.medium || "none",
    campaign: params.get("utm_campaign") || existing.campaign || "none",
  };

  window.sessionStorage.setItem("clientpulse_utm", JSON.stringify(current));
  return current;
}

function track(eventName, properties = {}) {
  const event = {
    event: eventName,
    timestamp: new Date().toISOString(),
    page: window.location.pathname || "/",
    referrer: document.referrer || "direct",
    experiment_id: EXPERIMENT_ID,
    variant: VARIANT,
    ...getUtmParams(),
    ...properties,
  };

  const events = readStoredArray(ANALYTICS_KEY);
  events.push(event);
  window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
  document.documentElement.dataset.analyticsEvents = String(events.length);
  document.documentElement.dataset.lastEvent = eventName;
  document.documentElement.dataset.utmSource = event.source;
  document.documentElement.dataset.utmMedium = event.medium;
  document.documentElement.dataset.utmCampaign = event.campaign;
  window.dispatchEvent(new CustomEvent("clientpulse:event", { detail: event }));
  return event;
}

function getMetrics() {
  const events = readStoredArray(ANALYTICS_KEY);
  return events.reduce((totals, item) => {
    totals[item.event] = (totals[item.event] || 0) + 1;
    return totals;
  }, {});
}

function buildRemoteIntentUrl(intent) {
  const safeBody = [
    "ClientPulse Briefs early-access request",
    "",
    "Please remove anything you do not want public before submitting this issue.",
    "Email is not included here because GitHub issues are public.",
    "",
    `Role: ${intent.role || "not provided"}`,
    `Plan interest: ${intent.plan || "not provided"}`,
    `Update frequency: ${intent.frequency || "not provided"}`,
    `Willingness to pay: ${intent.willingness || "not provided"}`,
    `Purchase intent checkbox: ${intent.purchaseIntent ? "yes" : "no"}`,
    `UTM source: ${intent.utm.source}`,
    `UTM medium: ${intent.utm.medium}`,
    `UTM campaign: ${intent.utm.campaign}`,
    "",
    "Biggest update pain, optional:",
    intent.pain || "not provided",
  ].join("\n");

  const params = new URLSearchParams({
    title: `Early access request - ${intent.plan || "ClientPulse Briefs"}`,
    body: safeBody,
  });

  return `${REMOTE_INTENT_BASE_URL}?${params.toString()}`;
}

function renderWaitlistSuccess(intent) {
  const remoteIntentUrl = buildRemoteIntentUrl(intent);
  const remoteLink = document.createElement("a");
  remoteLink.id = "remote-intent-link";
  remoteLink.className = "remote-intent-link";
  remoteLink.href = remoteIntentUrl;
  remoteLink.target = "_blank";
  remoteLink.rel = "noopener noreferrer";
  remoteLink.textContent = "Send request to launch team";
  remoteLink.addEventListener("click", () => {
    track("remote_intent_clicked", {
      target: "github_issue",
      plan: intent.plan,
      purchase_intent: intent.purchaseIntent,
    });
  });

  waitlistStatus.replaceChildren(
    document.createTextNode("You are on the early access list. Your plan interest was recorded."),
    document.createElement("br"),
    document.createTextNode("To send the request to the launch team, open a prefilled public GitHub issue and remove anything you do not want public."),
    remoteLink,
  );

  track("remote_intent_ready", {
    target: "github_issue",
    plan: intent.plan,
    purchase_intent: intent.purchaseIntent,
  });
}

function restartAnimation(element, className) {
  if (!element || prefersReducedMotion) {
    return;
  }

  element.classList.remove(className);
  window.requestAnimationFrame(() => {
    element.classList.add(className);
  });
}

function initScrollMotion() {
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    return;
  }

  document.documentElement.classList.add("motion-ready");

  const revealTargets = [
    ".section-band > .section-inner",
    ".offer-section",
    ".pricing-band .section-heading",
    ".feature-card",
    ".price-card",
    ".waitlist-section",
    ".waitlist-shell",
    ".faq-layout",
    ".faq-list details",
    ".resource-section",
    ".resource-links a",
    ".seo-hero",
    ".seo-content section",
  ];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
  );

  document.querySelectorAll(revealTargets.join(",")).forEach((element, index) => {
    element.classList.add("reveal-on-scroll");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
    observer.observe(element);
  });
}

function initHeaderMotion() {
  if (!siteHeader) {
    return;
  }

  const syncHeader = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
}

window.clientPulseAnalytics = {
  track,
  getEvents: () => readStoredArray(ANALYTICS_KEY),
  getMetrics,
};

function normalizeNotes(value) {
  return value
    .split(/\n|\. /)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function classifyNotes(lines) {
  const result = {
    wins: [],
    progress: [],
    risks: [],
    next: [],
    asks: [],
  };

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    const bucket = buckets.find((group) => group.keywords.some((keyword) => lower.includes(keyword)));
    const id = bucket ? bucket.id : "progress";
    result[id].push(line.replace(/\.$/, ""));
  });

  if (result.progress.length === 0 && lines.length > 0) {
    result.progress.push(lines[0].replace(/\.$/, ""));
  }

  return result;
}

function listOrFallback(items, fallback) {
  const visible = items.slice(0, 3);
  if (visible.length === 0) {
    return `<li>${fallback}</li>`;
  }
  return visible.map((item) => `<li>${escapeHtml(item)}.</li>`).join("");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildBrief(groups) {
  const winsText = groups.wins[0] || groups.progress[0] || "Progress continued on the highest-priority work";
  const riskText = groups.risks[0] || "No major delivery risks are currently visible";
  const askText = groups.asks[0] || "No client decision is required right now";

  latestBrief = [
    "Subject: Weekly update - progress, risks, and next steps",
    "",
    "Hi there,",
    "",
    `Here is the latest client update. The main highlight this week is: ${winsText}.`,
    "",
    "Wins:",
    ...groups.wins.slice(0, 3).map((item) => `- ${item}.`),
    "",
    "Progress:",
    ...groups.progress.slice(0, 3).map((item) => `- ${item}.`),
    "",
    "Risks and blockers:",
    `- ${riskText}.`,
    "",
    "Next steps:",
    ...groups.next.slice(0, 3).map((item) => `- ${item}.`),
    "",
    "Client asks:",
    `- ${askText}.`,
    "",
    "Thanks,",
    "Your team",
  ].join("\n");

  return `
    <h2>Subject: Weekly update - progress, risks, and next steps</h2>
    <p>Hi there,</p>
    <p>Here is the latest client update. The main highlight this week is: ${escapeHtml(winsText)}.</p>
    <h3>Wins</h3>
    <ul>${listOrFallback(groups.wins, "Progress continued on the highest-priority work.")}</ul>
    <h3>Progress</h3>
    <ul>${listOrFallback(groups.progress, "The team is moving the core work forward.")}</ul>
    <h3>Risks and blockers</h3>
    <ul>${listOrFallback(groups.risks, "No major delivery risks are currently visible.")}</ul>
    <h3>Next steps</h3>
    <ul>${listOrFallback(groups.next, "Confirm the next delivery milestone and keep the client updated.")}</ul>
    <h3>Client asks</h3>
    <ul>${listOrFallback(groups.asks, "No client decision is required right now.")}</ul>
    <p>Thanks,<br>Your team</p>
  `;
}

if (form && notesInput && output && error && copyButton) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    track("core_action_started", { workflow: "brief_generator" });
    const notes = notesInput.value.trim();

    if (notes.length < 20) {
      error.textContent = "Add a few rough notes before generating the client brief.";
      output.innerHTML = '<p class="empty-output">The generated brief will appear here.</p>';
      copyButton.disabled = true;
      latestBrief = "";
      return;
    }

    error.textContent = "";
    const lines = normalizeNotes(notes);
    const groups = classifyNotes(lines);
    output.innerHTML = buildBrief(groups);
    copyButton.disabled = false;
    restartAnimation(output, "is-refreshing");
    track("core_action_completed", {
      workflow: "brief_generator",
      note_count: lines.length,
    });
  });

  copyButton.addEventListener("click", async () => {
    if (!latestBrief) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestBrief);
      track("cta_clicked", { label: "copy_brief", target: "clipboard" });
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy brief";
      }, 1800);
    } catch {
      error.textContent = "Copy failed. Select the generated text and copy it manually.";
    }
  });
}

if (waitlistForm && waitlistStatus) {
  waitlistForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!waitlistForm.reportValidity()) {
      return;
    }

    const formData = new FormData(waitlistForm);
    const intent = {
      type: "checkout_intent",
      createdAt: new Date().toISOString(),
      email: String(formData.get("email") || "").trim(),
      role: String(formData.get("role") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      frequency: String(formData.get("frequency") || ""),
      plan: String(formData.get("plan") || ""),
      willingness: String(formData.get("willingness") || ""),
      pain: String(formData.get("pain") || "").trim(),
      purchaseIntent: formData.get("intent") === "yes",
      utm: getUtmParams(),
    };

    const intents = readStoredArray("clientpulse_purchase_intents");
    intents.push(intent);
    window.localStorage.setItem("clientpulse_purchase_intents", JSON.stringify(intents));
    track("waitlist_submitted", {
      persona: intent.role || "unknown",
      plan: intent.plan,
      purchase_intent: intent.purchaseIntent,
    });
    track("checkout_intent", {
      persona: intent.role || "unknown",
      plan: intent.plan,
      willingness: intent.willingness,
    });

    if (intent.purchaseIntent) {
      track("checkout_started", {
        persona: intent.role || "unknown",
        plan: intent.plan,
        mode: "intent_only",
      });
    }

    if (intent.pain) {
      track("feedback_submitted", {
        persona: intent.role || "unknown",
        topic: "biggest_update_pain",
      });
    }

    waitlistStatus.className = "form-note success intent-note";
    renderWaitlistSuccess(intent);
    restartAnimation(waitlistStatus, "success");
    waitlistForm.reset();
  });

  waitlistForm.addEventListener(
    "focusin",
    () => {
      if (!signupStarted) {
        signupStarted = true;
        track("signup_started", { form: "waitlist" });
      }
    },
    { once: true }
  );
}

document.querySelectorAll('a[href*="#waitlist"], a[href*="#preview"], .plan-button, [data-track-cta]').forEach((element) => {
  element.addEventListener("click", () => {
    track("cta_clicked", {
      label: element.textContent.trim(),
      target: element.getAttribute("href") || "button",
    });
  });
});

function observePricing() {
  if (!pricingSection) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    track("pricing_viewed", { method: "fallback" });
    pricingViewed = true;
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !pricingViewed) {
          pricingViewed = true;
          track("pricing_viewed", { method: "intersection_observer" });
          observer.disconnect();
        }
      });
    },
    { threshold: 0.35 }
  );
  observer.observe(pricingSection);
}

track("landing_viewed");
if (document.body?.dataset?.seoPage) {
  track("seo_page_viewed", {
    seo_page: document.body.dataset.seoPage,
    target_keyword: document.body.dataset.targetKeyword || "unknown",
  });
}
observePricing();
initHeaderMotion();
initScrollMotion();
