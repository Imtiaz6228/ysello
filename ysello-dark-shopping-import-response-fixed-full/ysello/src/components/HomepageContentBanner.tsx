import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../api/client";

type Section = {
  key: string;
  title: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export function HomepageContentBanner() {
  const { pathname } = useLocation();
  const [section, setSection] = useState<Section>();
  useEffect(() => {
    if (pathname !== "/") return;
    void apiRequest<{ sections: Section[] }>("/api/marketplace/homepage")
      .then((data) =>
        setSection(data.sections.find((item) => item.key === "hero")),
      )
      .catch(() => undefined);
  }, [pathname]);
  if (pathname !== "/" || !section) return null;
  return (
    <aside className="managed-home-banner">
      <div>
        <small>{section.subtitle}</small>
        <strong>{section.title}</strong>
        <span>{section.body}</span>
      </div>
      {section.ctaLabel && section.ctaUrl ? (
        <Link to={section.ctaUrl}>
          {section.ctaLabel}
          <ArrowRight />
        </Link>
      ) : null}
    </aside>
  );
}
