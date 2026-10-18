import type { FavoriteIcon } from "../../providers/settings";

/** Everything the home-screen chrome needs to render and act. */
export interface HomeControls {
  /** Page number shown in the pill: typed digits, pending target or current page. */
  pillText: string;
  pillActive: boolean;
  page: string;
  subPage: number;
  subPageCount: number;
  prevPage?: string;
  nextPage?: string;
  prevSub?: number;
  nextSub?: number;
  isLoading: boolean;
  canGoBack: boolean;
  isFavorite: boolean;
  favoriteIcon: FavoriteIcon;
  goBack: () => void;
  goHome: () => void;
  goTo: (page: string) => void;
  goPrevPage: () => void;
  goNextPage: () => void;
  goPrevSub: () => void;
  goNextSub: () => void;
  openKeypad: () => void;
  toggleFavorite: () => void;
  openMenu: () => void;
  refresh: () => void;
  share?: () => void;
}

/** The header toggle always shows; "none" only hides the icon on the chips. */
export const favoriteIconName = (icon: FavoriteIcon, filled: boolean) =>
  icon === "star"
    ? filled
      ? "star"
      : "star-outline"
    : filled
      ? "heart"
      : "heart-outline";
