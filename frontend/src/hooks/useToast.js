import { useCallback, useEffect, useRef, useState } from "react";

/** State toast sederhana: const [toast, showToast] = useToast(); <Toast toast={toast} /> */
export default function useToast(duration = 3600) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((msg, kind = "ok") => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, kind });
    timer.current = setTimeout(() => setToast(null), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [toast, show];
}
