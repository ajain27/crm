import { Heart } from "lucide-react";

// The heart that marks a home as a favorite, on its card or (with a label)
// in its window.
export default function FavoriteButton({
  favorite,
  onToggle,
  withLabel = false,
}) {
  const label = favorite ? "Remove from favorites" : "Add to favorites";
  return (
    <button
      type="button"
      className={`omd-fav${favorite ? " is-fav" : ""}${withLabel ? " omd-fav--label" : ""}`}
      onClick={onToggle}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
    >
      <Heart size={16} fill={favorite ? "currentColor" : "none"} />
      {withLabel && (favorite ? "Favorite" : "Add to favorites")}
    </button>
  );
}
