// P3 placeholder — real filter UI will be filled in below (P3 commit).
// For P2 wiring we ship a stub so the panel compiles.
import React from "react";
import type {
  GlobalContentTab,
  GlobalSearchDataSource,
  GlobalSearchFilters,
} from "./types";

interface Props {
  tab: GlobalContentTab;
  keyword: string;
  filters: GlobalSearchFilters;
  dataSource: GlobalSearchDataSource;
  onApply: (filters: GlobalSearchFilters) => void;
  onClose: () => void;
}

const GlobalSearchFilterPanel: React.FC<Props> = () => {
  return <div className="wk-global-search-filter-panel" />;
};

export default GlobalSearchFilterPanel;
