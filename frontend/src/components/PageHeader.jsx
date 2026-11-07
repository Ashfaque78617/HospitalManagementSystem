import { Link } from "react-router-dom";

/** crumbs: [{ label, to? }] */
export default function PageHeader({ title, subtitle, crumbs = [], children }) {
  return (
    <div className="page-header">
      <div>
        {crumbs.length > 0 && (
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i}>
                {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
                {i < crumbs.length - 1 && <span className="mx-1">/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <div className="text-muted">{subtitle}</div>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2 no-print">{children}</div>}
    </div>
  );
}
