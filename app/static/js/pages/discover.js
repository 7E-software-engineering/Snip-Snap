// File overview: Implements page-specific frontend behavior and event handling.

import { TagList } from "../components/tagList.js";
import { initPostGallery } from "../features/postGallery.js";
import { initDiscoverSearch } from "../features/discoverSearch.js";

const tagListMount = document.getElementById("tagListMount");
const galleryMount = document.getElementById("postGalleryMount");
const sentinelEl = document.getElementById("postGallerySentinel");
const searchMount = document.getElementById("searchBarMount");
const out = document.getElementById("discoverSelection");

const tagList = new TagList({
  mountEl: tagListMount,
  initialItems: [{ id: 2, type: "filter" }, { id: 1, type: "filter" }, { id: 0, type: "filter" }],
});

initPostGallery({
  mountEl: galleryMount,
  sentinelEl,
  tagList,
  config: {
    endpoint: "/api/gallery/posts",
    columns: 3,
    limit: 18,
  },
});

initDiscoverSearch({
  mountEl: searchMount,
  outEl: out,
  tagList,
  config: {
    endpoint: "/api/discover/search_items",
  },
});