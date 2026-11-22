# Leech Lake Watershed

An interactive map of the Leech Lake watershed (WBD HUC8 07010102, 857,968 acres;
Beltrami, Cass, and Hubbard counties, Minnesota) — the lakes, the people, the place.
Built for the Leech Lake Association from public sources.

Open `index.html` (GitHub Pages serves this repo). No build step: plain HTML,
Leaflet, and GeoJSON + WebP tile pyramids under `assets/`.

## What this copy is

This is the **public copy** of the viewer. Two layers are intentionally absent:

- **Parcels** — the parcel layer was cut from this copy on Nov 21, 2026, pending a
  decision on restoring it. The main (private) viewer still carries parcels as
  the restore source; parcels can be put back with one deploy when decided.
- **Minnesota Well Index** (`wells`) — removed from the public copy at build time.
  The USGS groundwater-wells layer (`nwis-wells`) is still present.

Everything else matches the main viewer as of Nov 21, 2026: 125 layers, the
eight-group panel, the copy-link button, and the data-sources page
(`assets/data-sources.html`, one section per layer with source, date, count,
and caveats).

## Data notes

- Census units render **whole** across the three counties — nothing is clipped
  or allocated to the watershed. The watershed polygon dims what lies outside it.
- Aerial imagery is **streamed, never vendored**: the three Cass County
  Pictometry flights (2024, 2020, 2017) load live from the county ArcGIS
  service, as do the Esri/wayback basemaps, the NLCD 2021 WMS overlay, and the
  GLO plat overlay. The 1939 aerial frames are linked, not hosted.
- Heavy GeoJSON layers are split into numbered chunk files
  (e.g. `nwi-wetlands-1..15.geojson`) so no single file is oversized; the
  viewer loads the chunks in order.
- The 13 historical-map layers are WebP XYZ tile pyramids under
  `assets/tiles/<slug>/{z}/{x}/{y}.webp`, regenerated Nov 22, 2026 from the
  georeferenced scans (GDAL, XYZ, WebP quality 75) at the zoom ranges and
  neatline bounds the viewer declares. Source scans: see `SOURCES.md` in the
  project workspace (not shipped here).

## Size

~552 MB, 13,343 files: data 335 MiB (141 GeoJSON + 82 manifests), tiles 216 MiB
(13,104 tiles), app code ~1 MiB. Largest single file ~10.8 MB, well under
GitHub's 100 MB per-file limit.
