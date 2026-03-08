import { useShop } from "../context/ShopContext";

export default function ShopOverviewPage() {
  const { shop, isLoading } = useShop();

  if (isLoading) return <div className="loading">Loading...</div>;
  if (!shop) return <div className="no-shop">No shop loaded</div>;

  return (
    <div className="shops-page">
      <h1 className="shops-page__title">Shop Overview</h1>

      <div className="shop-card">
        <div className="shop-card__header">
          <h2 className="shop-card__name">{shop.name}</h2>
          <span className="shop-card__role">{shop.role}</span>
        </div>

        <div className="shop-card__info">
          <p className="shop-card__field">
            <strong>ID:</strong> {shop.id}
          </p>
          <p className="shop-card__field">
            <strong>Slug:</strong> {shop.slug}
          </p>
          <p className="shop-card__field">
            <strong>Description:</strong> {shop.description || "-"}
          </p>
          <p className="shop-card__field">
            <strong>Phone:</strong> {shop.phone}
          </p>
          <p className="shop-card__field">
            <strong>Address:</strong> {shop.formattedAddress || '-'}
          </p>
          <p className="shop-card__field">
            <strong>Timezone:</strong> {shop.timezone}
          </p>
          <p className="shop-card__field">
            <strong>Active:</strong> {shop.isActive ? "Yes" : "No"}
          </p>
          <p className="shop-card__field">
            <strong>Created:</strong> {new Date(shop.createdAt).toLocaleString()}
          </p>
          <p className="shop-card__field">
            <strong>Updated:</strong> {new Date(shop.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}