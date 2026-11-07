import { bg } from "../config/images";

/** Photographic banner used at the top of key pages. */
export default function Hero({ image, title, subtitle, children }) {
  return (
    <section className="hero" style={bg(image)}>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children && <div className="d-flex flex-wrap gap-2 mt-3">{children}</div>}
    </section>
  );
}
