import { useEffect, useRef } from "react";

export default function useIdleLogout({
  currentUser,
  timeoutMs,
  onTimeout,
}) {
  const idleTimeoutRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return undefined;

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    function clearIdleTimer() {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    }

    function resetIdleTimer() {
      clearIdleTimer();
      idleTimeoutRef.current = window.setTimeout(onTimeout, timeoutMs);
    }

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, resetIdleTimer, { passive: true }),
    );
    resetIdleTimer();

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, resetIdleTimer),
      );
      clearIdleTimer();
    };
  }, [currentUser, onTimeout, timeoutMs]);

  return idleTimeoutRef;
}
