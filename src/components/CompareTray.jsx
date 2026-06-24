import React, { useEffect, useState } from "react";
import { Check, GitCompareArrows, PackageCheck, Trash2, X } from "lucide-react";
import { coffees } from "../data";

const comparisonRows = [
  ["Origin", (coffee) => `${coffee.country} · ${coffee.region}`],
  ["Producer", (coffee) => coffee.producer],
  ["Score", (coffee) => `${coffee.score} pts`],
  ["Process", (coffee) => coffee.process],
  ["Flavor", (coffee) => coffee.flavor.join(" · ")],
  ["Available", (coffee) => (coffee.bags ? `${coffee.bags} bags` : coffee.availability)],
  ["Warehouse", (coffee) => coffee.warehouse],
  ["Price", (coffee) => coffee.price],
  ["Certification", (coffee) => coffee.certification.join(" · ")],
  ["Altitude", (coffee) => coffee.altitude],
];

export default function CompareTray({ ids, onRemove, onClear, onAddSample, sampleIds }) {
  const [open, setOpen] = useState(false);
  const selected = coffees.filter((coffee) => ids.includes(coffee.id));

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("no-scroll");
    };
  }, [open]);

  if (!selected.length) return null;

  return (
    <>
      <div className="compare-tray" aria-label={`${selected.length} coffees selected for comparison`}>
        <div className="compare-tray__items">
          {selected.map((coffee) => (
            <div key={coffee.id}>
              <img src={coffee.image} alt="" loading="lazy" decoding="async" />
              <span>{coffee.name}</span>
              <button type="button" onClick={() => onRemove(coffee.id)} aria-label={`Remove ${coffee.name}`}>
                <X size={13} />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - selected.length) }).map((_, index) => (
            <div className="compare-tray__empty" key={`empty-${index}`}>
              <GitCompareArrows size={15} />
              <span>Add coffee</span>
            </div>
          ))}
        </div>
        <button className="button button--gold button--small" type="button" onClick={() => setOpen(true)}>
          Compare {selected.length} <GitCompareArrows size={16} />
        </button>
      </div>

      <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={() => setOpen(false)} />
      <section className={`compare-dialog ${open ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Compare coffees">
        <header className="compare-dialog__header">
          <div>
            <p className="eyebrow">Side-by-side</p>
            <h2>Compare coffees</h2>
          </div>
          <div>
            <button className="text-button" type="button" onClick={onClear}>
              <Trash2 size={15} /> Clear all
            </button>
            <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close comparison">
              <X size={21} />
            </button>
          </div>
        </header>
        <div className="compare-dialog__body">
          <div className="compare-coffee-headings" style={{ "--compare-count": selected.length }}>
            <div />
            {selected.map((coffee) => (
              <article key={coffee.id}>
                <img src={coffee.image} alt="" loading="lazy" decoding="async" />
                <span>{coffee.country}</span>
                <h3>{coffee.name}</h3>
                <button
                  className={`button button--small ${sampleIds.includes(coffee.id) ? "button--selected" : "button--dark"}`}
                  type="button"
                  onClick={() => onAddSample(coffee.id)}
                >
                  {sampleIds.includes(coffee.id) ? <Check size={15} /> : <PackageCheck size={15} />}
                  {sampleIds.includes(coffee.id) ? "Sample added" : "Add sample"}
                </button>
              </article>
            ))}
          </div>
          <div className="compare-rows">
            {comparisonRows.map(([label, getValue]) => (
              <div key={label} style={{ "--compare-count": selected.length }}>
                <strong>{label}</strong>
                {selected.map((coffee) => (
                  <span key={coffee.id}>{getValue(coffee)}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
