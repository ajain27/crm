import { useEffect } from "react";

function revealAll(elements) {
  elements.forEach((element) => element.classList.add("is-revealed"));
}

function useScrollReveal(dependencies = []) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const selector = "[data-reveal], [data-reveal-group]";
    const observedElements = new Set();

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealAll(Array.from(document.querySelectorAll(selector)));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-revealed", entry.isIntersecting);
        });
      },
      {
        threshold: 0.02,
        rootMargin: "0px 0px -4% 0px",
      },
    );

    function observeAvailableElements() {
      const elements = Array.from(document.querySelectorAll(selector));
      elements.forEach((element) => {
        if (observedElements.has(element)) return;
        observedElements.add(element);
        observer.observe(element);
      });
    }

    observeAvailableElements();

    const mutationObserver = new MutationObserver(() => {
      observeAvailableElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, dependencies);
}

export default useScrollReveal;
