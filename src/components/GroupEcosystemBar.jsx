import { ArrowUpRight } from "lucide-react";

const ecosystemLinks = [
  {
    id: "worldwide",
    name: "Makendi Worldwide",
    focus: { en: "Food Ingredients & Commodities", tr: "Gıda Bileşenleri ve Hammaddeler" },
    url: "https://makendi.com.tr",
  },
  {
    id: "coffendi",
    name: "Coffendi",
    focus: { en: "Origin Green Coffee Platform", tr: "Nitelikli Yeşil Kahve Platformu" },
    url: "https://coffendi.com",
  },
  {
    id: "coffee",
    name: "Makendi Coffee",
    focus: { en: "Soluble Coffee & Solutions", tr: "Çözünebilir ve Hazır Kahve" },
    url: "https://mckendi.com",
  },
];

export default function GroupEcosystemBar({ language = "en", currentId = "coffendi" }) {
  const isTr = language === "tr";

  return (
    <section className="group-ecosystem-bar" aria-label={isTr ? "Makendi Grup Ekosistemi" : "Makendi Group Ecosystem"}>
      <div className="group-ecosystem-inner">
        <div className="group-ecosystem-header">
          <span className="group-ecosystem-dot" aria-hidden="true" />
          <span className="group-ecosystem-title">
            {isTr ? "Makendi Grup Ekosistemi" : "Makendi Group Ecosystem"}
          </span>
          <span className="group-ecosystem-hint">
            {isTr ? "Birbirine bağlı kurumsal platformlar" : "Connected corporate platforms"}
          </span>
        </div>
        <div className="group-ecosystem-items">
          {ecosystemLinks.map((item) => {
            const isCurrent = item.id === currentId;
            const focusText = item.focus[language] || item.focus.en;

            if (isCurrent) {
              return (
                <div key={item.id} className="group-ecosystem-item is-current" aria-current="page">
                  <span className="group-ecosystem-badge">{isTr ? "Mevcut Site" : "Current Site"}</span>
                  <div className="group-ecosystem-link-title">
                    <strong>{item.name}</strong>
                  </div>
                  <small>{focusText}</small>
                </div>
              );
            }

            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group-ecosystem-item"
                title={`${item.name} — ${focusText}`}
              >
                <div className="group-ecosystem-link-title">
                  <strong>{item.name}</strong>
                  <ArrowUpRight size={13} aria-hidden="true" />
                </div>
                <small>{focusText}</small>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
