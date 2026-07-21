import { useId, useLayoutEffect, useRef, useState } from "react";

export default function InquiryProgress({ formRef, language }) {
  const statusId = useId();
  const progressRef = useRef(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  useLayoutEffect(() => {
    const form = formRef.current || progressRef.current?.closest("form");
    if (!form) return undefined;
    let resetFrame = 0;

    const requiredControls = Array.from(form.elements).filter((control) => (
      control instanceof HTMLElement
      && control.matches("input[required], select[required], textarea[required]")
      && !control.disabled
    ));
    const updateProgress = () => {
      const completed = requiredControls.filter((control) => control.checkValidity()).length;
      setProgress((current) => (
        current.completed === completed && current.total === requiredControls.length
          ? current
          : { completed, total: requiredControls.length }
      ));
    };
    const updateAfterReset = () => {
      if (resetFrame) window.cancelAnimationFrame(resetFrame);
      resetFrame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    form.addEventListener("input", updateProgress);
    form.addEventListener("change", updateProgress);
    form.addEventListener("reset", updateAfterReset);

    return () => {
      if (resetFrame) window.cancelAnimationFrame(resetFrame);
      form.removeEventListener("input", updateProgress);
      form.removeEventListener("change", updateProgress);
      form.removeEventListener("reset", updateAfterReset);
    };
  }, [formRef]);

  const remaining = Math.max(0, progress.total - progress.completed);
  const percentage = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const ready = progress.total > 0 && remaining === 0;
  const status = language === "tr"
    ? ready ? "Zorunlu bilgiler tamamlandı." : `${remaining} zorunlu alan kaldı.`
    : ready ? "Required details complete." : `${remaining} required ${remaining === 1 ? "field" : "fields"} remaining.`;

  return (
    <div ref={progressRef} className={`inquiry-progress ${ready ? "is-ready" : ""}`}>
      <div className="inquiry-progress__heading">
        <span>{language === "tr" ? "Talep özeti hazırlığı" : "Brief readiness"}</span>
        <strong>{progress.completed} / {progress.total}</strong>
      </div>
      <div
        className="inquiry-progress__meter"
        role="progressbar"
        aria-label={language === "tr" ? "Zorunlu alan tamamlama durumu" : "Required field completion"}
        aria-describedby={statusId}
        aria-valuemin="0"
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
        aria-valuetext={status}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      <p id={statusId} aria-live="polite">{status}</p>
    </div>
  );
}
