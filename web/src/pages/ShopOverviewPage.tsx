import { useShop } from "../context/ShopContext";
import '../styles/pages/shop-overview.css'



function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <span className="field__value">{value}</span>
    </div>
  );
}

export default function ShopOverviewPage() {
  const { shop, isLoading } = useShop();

  if (isLoading) return <div className="state-view">Loading...</div>;
  if (!shop) return <div className="state-view">No shop loaded</div>;

  return (
    <div className="overview-page">

      <div className="shop-card">

        {/* ── Header ── */}
        <div className="shop-card__header">
          <div className="shop-card__header-text">
            <h2 className="shop-card__name">{shop.name}</h2>
            {shop.description && (
              <p className="shop-card__description">{shop.description}</p>
            )}
          </div>
          <div className="shop-card__badges">
            <span className="badge badge--role">{shop.role}</span>
            <span className={`badge badge--status ${shop.isActive ? "badge--active" : "badge--inactive"}`}>
              {shop.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="shop-card__body">

          <section className="field-group">
            <h3 className="field-group__title">Identity</h3>
            <div className="field-group__grid">
              <Field label="ID" value={shop.id} />
              <Field label="Slug" value={`/${shop.slug}`} />
            </div>
          </section>

          <section className="field-group">
            <h3 className="field-group__title">Contact</h3>
            <div className="field-group__grid">
              <Field label="Phone" value={shop.phone} />
              <Field label="Address" value={shop.formattedAddress || "—"} />
            </div>
          </section>

          <section className="field-group">
            <h3 className="field-group__title">Settings</h3>
            <div className="field-group__grid">
              <Field label="Timezone" value={shop.timezone} />
            </div>
          </section>

          <section className="field-group">
            <h3 className="field-group__title">Timestamps</h3>
            <div className="field-group__grid">
              <Field label="Created" value={new Date(shop.createdAt).toLocaleString()} />
              <Field label="Last Updated" value={new Date(shop.updatedAt).toLocaleString()} />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
