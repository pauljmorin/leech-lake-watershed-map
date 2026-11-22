/* Leech Lake Watershed viewer — base build, Nov 20, 2026.
   Built from scratch on the Itasca Moraine trail map (ITM) as the
   template: same Leaflet patterns (BASES array, LAYERS array with
   lazy fetch, panel toggles, year-aerial dropdown keyed on names
   starting "Aerial YYYY"), cut down to what this viewer needs.
   Deliberately NOT ported from ITM: gazetteer search, present
   mode, print/GeoPDF export, classify/save, adoption bar,
   protocol page. All vector data lives in site/data/ as GeoJSON,
   pulled and verified Nov 20, 2026 (see data/manifest-2026-11-20.json
   and data-sources.html). All imagery is STREAMED from the
   providers' tile/WMS services — no imagery files are hosted
   (Paul, Nov 20, 2026). */

"use strict";

/* ---------- small helpers ---------- */
function esc(v) {
  if (v === null || v === undefined || v === "") return null;
  return String(v).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function fmtNum(v, digits) {
  if (v === null || v === undefined || v === "" || !isFinite(+v)) return null;
  return Number(v).toLocaleString("en-US",
    { maximumFractionDigits: (digits === undefined ? 0 : digits) });
}
function kvTable(rows) {
  var html = "<table>";
  rows.forEach(function (r) {
    var v = esc(r[1]);
    if (v !== null) html += "<tr><td class='k'>" + r[0] + "</td><td>" + v + "</td></tr>";
  });
  return html + "</table>";
}
function popKicker(text) {
  return "<p class='pop-kicker'>" + esc(text) + "</p>";
}
/* Footer link from a popup to the data-sources section that
   documents the layer's source and interpretation method. */
function popDataLink(anchor) {
  return "<div class='pop-foot'><a href='assets/data-sources.html#" + anchor +
    "' target='_blank' rel='noopener'>About this layer &mdash; " +
    "data sources</a></div>";
}
function bindPop(layer, html, maxWidth) {
  layer.bindPopup(html, {
    maxWidth: maxWidth || 340,
    maxHeight: Math.round(window.innerHeight * 0.7),
    autoPanPadding: [24, 24],
  });
}
function setStatus(text) {
  var el = document.getElementById("load-status");
  if (el) el.textContent = text || "";
}

/* ---------- map ---------- */
var map = L.map("map", {
  center: [47.20, -94.30],
  zoom: 10,
  zoomControl: true,
});
L.control.scale({ imperial: true, metric: true }).addTo(map);

/* ---------- base layers ---------- */
var MN_WMS = "https://imageserver.gisdata.mn.gov/cgi-bin/wmswm?";
function mnWms(layerName, attribution) {
  return L.tileLayer.wms(MN_WMS, {
    layers: layerName, format: "image/jpeg", transparent: false,
    version: "1.1.1", maxZoom: 18, attribution: attribution,
  });
}
var WAYBACK = "https://wayback.maptiles.arcgis.com/arcgis/rest/services/" +
  "World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/";
function waybackLayer(releaseId, releaseDate) {
  return L.tileLayer(WAYBACK + releaseId + "/{z}/{y}/{x}", {
    maxZoom: 18,
    attribution: "Aerial imagery (Esri World Imagery Wayback, " +
      "release of " + releaseDate + ")",
  });
}

/* Streets — Esri World Street Map, served from
   server.arcgisonline.com — the same host as the Esri aerial
   basemap that already loads in this viewer.
   History (Paul, Nov 21, 2026): direct tile.openstreetmap.org
   tiles are blocked for this viewer, so Streets first moved to
   CARTO Voyager (basemaps.cartocdn.com). CARTO then proved bad
   in a way no error handler can catch: every tile request —
   Leech Lake, Minneapolis, every zoom — came back HTTP 200
   with the same 2,049-byte blank tile (verified by direct
   fetch, Nov 21, 2026), so the tiles "loaded" while showing
   nothing, and the old tileerror fallback to Esri never fired.
   Esri's street tiles at the same spot return real street
   data, so Streets now uses Esri directly, with no swap. */
var osm = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, maxNativeZoom: 18,
    attribution: "Streets: Esri, HERE, Garmin, " +
      "OpenStreetMap contributors, and the GIS User Community",
  });
var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  maxZoom: 18, maxNativeZoom: 17,
  attribution: "Map data: \u00A9 OpenStreetMap contributors, SRTM | " +
    "map style: \u00A9 OpenTopoMap (CC-BY-SA)",
}).addTo(map);
var usgsTopo = L.tileLayer(
  "https://basemap.nationalmap.gov/arcgis/rest/services/" +
    "USGSTopo/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 17, maxNativeZoom: 16,
    attribution: "Topo: USGS, The National Map",
  });
var esriImagery = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18,
    attribution: "Aerial imagery: Esri, Maxar, Earthstar Geographics",
  });
/* Four more basemaps (Paul, Nov 21, 2026), all verified live over
   Leech Lake the same day: three Esri services from the same
   server.arcgisonline.com host as the Esri streets and aerial
   basemaps above (note the Esri tile order, {z}/{y}/{x}), and
   OpenStreetMap via the OSM France mirror (tile order {z}/{x}/{y})
   — the mirror, because direct tile.openstreetmap.org tiles are
   blocked for this viewer. */
var esriWorldTopo = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, maxNativeZoom: 18,
    attribution: "Topo (Esri): Esri, HERE, Garmin, " +
      "OpenStreetMap contributors, and the GIS User Community",
  });
var esriLightGray = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, maxNativeZoom: 18,
    attribution: "Light gray canvas: Esri, HERE, Garmin, " +
      "OpenStreetMap contributors, and the GIS User Community",
  });
var esriDarkGray = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, maxNativeZoom: 18,
    attribution: "Dark gray canvas: Esri, HERE, Garmin, " +
      "OpenStreetMap contributors, and the GIS User Community",
  });
var osmFrance = L.tileLayer(
  "https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    maxZoom: 19, maxNativeZoom: 18,
    attribution: "Map data: \u00A9 OpenStreetMap contributors | " +
      "map style: \u00A9 OpenStreetMap France",
  });
/* LiDAR hillshade — MnGeo WMS shaded relief from Minnesota LiDAR,
   the same service the Itasca Moraine trail map uses. */
var mnHillshade = mnWms("hillshd",
  "Shaded relief (LiDAR hillshade): MnGeo / Minnesota DNR");
/* White — no basemap: an empty layer group, so choosing it removes
   the tiles and the map background goes white. Last in the list. */
var whiteBase = L.layerGroup([]);

/* MnGeo year aerials (verified live over the lake Nov 20, 2026 —
   see data-sources.html). "fsa*" are the per-vintage NAIP mosaics
   (summer, leaf-on); the "*cir" twins are the 4-band colour-infrared
   of the same flight. Regional layers cover only part of the lake —
   their labels say so. */
var mnAerial1991 = mnWms("doq",
  "Aerial imagery (1991, black-and-white): USGS / MnGeo");
var mnAerialLandsat = mnWms("landsat",
  "Aerial imagery (2002\u201304 Landsat, 30 m): USGS / MnGeo");
var mnAerial2003 = mnWms("fsa",
  "Aerial imagery (2003 NAIP): USDA-FSA / MnGeo");
var mnAerial2006 = mnWms("usgs2006",
  "Aerial imagery (2006): USGS / MnGeo");
var mnAerial2008 = mnWms("fsa2008",
  "Aerial imagery (2008 NAIP): USDA-FSA / MnGeo");
var mnAerial2008cir = mnWms("cir2008",
  "Aerial imagery (2008 NAIP colour-infrared): USDA-FSA / MnGeo");
var mnAerial2009 = mnWms("fsa2009",
  "Aerial imagery (2009 NAIP): USDA-FSA / MnGeo");
var mnAerial2010 = mnWms("fsa2010",
  "Aerial imagery (2010 NAIP): USDA-FSA / MnGeo");
var mnAerial2012Fall = mnWms("fall12",
  "Aerial imagery (2012 fall, central MN): MnGeo");
var mnAerial2012FallCir = mnWms("fallcir12",
  "Aerial imagery (2012 fall CIR, central MN): MnGeo");
var mnAerial2013 = mnWms("fsa2013",
  "Aerial imagery (2013 NAIP): USDA-FSA / MnGeo");
var mnAerial2013cir = mnWms("fsa2013cir",
  "Aerial imagery (2013 NAIP colour-infrared): USDA-FSA / MnGeo");
var mnAerial2013Hm = mnWms("nc13hm",
  "Aerial imagery (2013 spring leaf-off, south/central lake): MnGeo");
var mnAerial2013HmCir = mnWms("nc13hmcir",
  "Aerial imagery (2013 spring leaf-off CIR, south/central lake): MnGeo");
var mnAerial2013Ft = mnWms("nc13ft",
  "Aerial imagery (2013 spring, north fringe): MnGeo");
var mnAerial2013FtCir = mnWms("nc13ftcir",
  "Aerial imagery (2013 spring CIR, north fringe): MnGeo");
var mnAerial2015 = mnWms("fsa2015",
  "Aerial imagery (2015 NAIP): USDA-FSA / MnGeo");
var mnAerial2015cir = mnWms("fsa2015cir",
  "Aerial imagery (2015 NAIP colour-infrared): USDA-FSA / MnGeo");
var mnAerial2017 = mnWms("fsa2017",
  "Aerial imagery (2017 NAIP): USDA-FSA / MnGeo");
var mnAerial2017cir = mnWms("fsa2017cir",
  "Aerial imagery (2017 NAIP colour-infrared): USDA-FSA / MnGeo");
var mnAerial2018Itas = mnWms("itas18",
  "Aerial imagery (2018 spring, east fringe): MnGeo / Itasca County");
var mnAerial2018ItasCir = mnWms("itas18cir",
  "Aerial imagery (2018 spring CIR, east fringe): MnGeo / Itasca County");
var mnAerial2019 = mnWms("fsa2019",
  "Aerial imagery (2019 NAIP): USDA-FSA / MnGeo");
var mnAerial2019cir = mnWms("fsa2019cir",
  "Aerial imagery (2019 NAIP colour-infrared): USDA-FSA / MnGeo");
var mnAerial2020Belt = mnWms("belt20",
  "Aerial imagery (2020 spring, north tip): MnGeo / Beltrami County");
var mnAerial2020BeltCir = mnWms("belt20cir",
  "Aerial imagery (2020 spring CIR, north tip): MnGeo / Beltrami County");
var mnAerial2021 = mnWms("fsa2021",
  "Aerial imagery (2021 NAIP): USDA-FSA / MnGeo");
var mnAerial2021cir = mnWms("fsa2021cir",
  "Aerial imagery (2021 NAIP colour-infrared): USDA-FSA / MnGeo");
var mnAerial2023 = mnWms("fsa2023",
  "Aerial imagery (2023 NAIP): USDA-FSA / MnGeo");
var mnAerial2023cir = mnWms("fsa2023cir",
  "Aerial imagery (2023 NAIP colour-infrared): USDA-FSA / MnGeo");
var mnAerial2023Belt = mnWms("belt23",
  "Aerial imagery (2023 spring, north tip): MnGeo / Beltrami County");
var mnAerial2025 = mnWms("fsa2025",
  "Aerial imagery (2025 NAIP): USDA-FSA / MnGeo");
var mnAerial2025cir = mnWms("fsa2025cir",
  "Aerial imagery (2025 NAIP colour-infrared): USDA-FSA / MnGeo");

/* Esri Wayback year-end releases, 2014–2026. Release IDs copied
   exactly from the Wayback WMTS capabilities (verified Nov 20,
   2026 — IDs are non-sequential, never infer them). Caveat: the
   2014–2017 tiles at the Leech Lake test point are byte-identical,
   so those four years may show no visible change here. */
var esriWayback2014 = waybackLayer(5844, "2014-12-30");
var esriWayback2015 = waybackLayer(28163, "2015-12-16");
var esriWayback2016 = waybackLayer(18966, "2016-12-20");
var esriWayback2017 = waybackLayer(25521, "2017-11-16");
var esriWayback2018 = waybackLayer(23448, "2018-12-14");
var esriWayback2019 = waybackLayer(4756, "2019-12-12");
var esriWayback2020 = waybackLayer(29260, "2020-12-16");
var esriWayback2021 = waybackLayer(26120, "2021-12-21");
var esriWayback2022 = waybackLayer(45134, "2022-12-14");
var esriWayback2023 = waybackLayer(56102, "2023-12-07");
var esriWayback2024 = waybackLayer(16453, "2024-12-12");
var esriWayback2025 = waybackLayer(13192, "2025-12-18");
var esriWayback2026 = waybackLayer(3692, "2026-11-18");

/* ---------- basemap chooser ---------- */
/* The working maps first, then the current Esri aerial, then the
   year aerials (one dropdown, below), then White — no basemap LAST.
   A base is a year aerial when its name starts with "Aerial " + a
   4-digit year (ITM pattern). */
var BASES = [
  { name: "Topo (OpenTopoMap)", code: "topo", label: "Topo",
    sub: "OpenTopoMap", layer: topo },
  { name: "USGS Topo", code: "usgs", label: "USGS Topo",
    sub: "1:24k quadrangles", layer: usgsTopo },
  { name: "LiDAR hillshade", code: "lidar-hillshade",
    label: "LiDAR hillshade", sub: "MnGeo / Minnesota DNR",
    layer: mnHillshade },
  { name: "Esri World Imagery (current)", code: "esri-aerial",
    label: "Aerial (Esri, current)", sub: "Esri World Imagery",
    layer: esriImagery },
  { name: "Topo (Esri World Topo Map)", code: "esri-topo",
    label: "Esri Topo", sub: "Esri World Topo Map",
    layer: esriWorldTopo },
  { name: "Light gray canvas (Esri)", code: "esri-light-gray",
    label: "Light gray", sub: "Esri Light Gray Canvas",
    layer: esriLightGray },
  { name: "Dark gray canvas (Esri)", code: "esri-dark-gray",
    label: "Dark gray", sub: "Esri Dark Gray Canvas",
    layer: esriDarkGray },
  { name: "Streets (OpenStreetMap France)", code: "osm-france",
    label: "OSM France", sub: "OpenStreetMap France mirror",
    layer: osmFrance },
  /* Year aerials, newest first. Wayback entries are the year-end
     release of that year; NAIP entries are the summer flight.
     Regional entries carry their honest partial coverage in the
     label — they cover only part of the lake, they are not broken. */
  { name: "Aerial 2026 (Wayback)", code: "aerial-2026",
    label: "Aerial 2026", sub: "Esri Wayback, release 2026-11-18",
    layer: esriWayback2026 },
  { name: "Aerial 2025 (summer)", code: "aerial-2025-naip",
    label: "Aerial 2025 (summer)", sub: "NAIP \u00B7 60 cm",
    layer: mnAerial2025 },
  { name: "Aerial 2025 (CIR)", code: "aerial-2025-cir",
    label: "Aerial 2025 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2025cir },
  { name: "Aerial 2025 (Wayback)", code: "aerial-2025",
    label: "Aerial 2025", sub: "Esri Wayback, release 2025-12-18",
    layer: esriWayback2025 },
  { name: "Aerial 2024 (Wayback)", code: "aerial-2024",
    label: "Aerial 2024", sub: "Esri Wayback, release 2024-12-12",
    layer: esriWayback2024 },
  { name: "Aerial 2023 (summer)", code: "aerial-2023-naip",
    label: "Aerial 2023 (summer)", sub: "NAIP \u00B7 30 cm",
    layer: mnAerial2023 },
  { name: "Aerial 2023 (CIR)", code: "aerial-2023-cir",
    label: "Aerial 2023 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2023cir },
  { name: "Aerial 2023 (Wayback)", code: "aerial-2023",
    label: "Aerial 2023", sub: "Esri Wayback, release 2023-12-07",
    layer: esriWayback2023 },
  { name: "Aerial 2023 (spring, north tip only)", code: "aerial-2023-belt",
    label: "Aerial 2023 (spring, north tip only)",
    sub: "Beltrami Co. \u00B7 9 in", layer: mnAerial2023Belt },
  { name: "Aerial 2022 (Wayback)", code: "aerial-2022",
    label: "Aerial 2022", sub: "Esri Wayback, release 2022-12-14",
    layer: esriWayback2022 },
  { name: "Aerial 2021 (summer)", code: "aerial-2021-naip",
    label: "Aerial 2021 (summer)", sub: "NAIP \u00B7 60 cm",
    layer: mnAerial2021 },
  { name: "Aerial 2021 (CIR)", code: "aerial-2021-cir",
    label: "Aerial 2021 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2021cir },
  { name: "Aerial 2021 (Wayback)", code: "aerial-2021",
    label: "Aerial 2021", sub: "Esri Wayback, release 2021-12-21",
    layer: esriWayback2021 },
  { name: "Aerial 2020 (Wayback)", code: "aerial-2020",
    label: "Aerial 2020", sub: "Esri Wayback, release 2020-12-16",
    layer: esriWayback2020 },
  { name: "Aerial 2020 (spring, north tip only)", code: "aerial-2020-belt",
    label: "Aerial 2020 (spring, north tip only)",
    sub: "Beltrami Co. \u00B7 9 in", layer: mnAerial2020Belt },
  { name: "Aerial 2020 (spring, north tip only, CIR)", code: "aerial-2020-belt-cir",
    label: "Aerial 2020 (spring, north tip only, CIR)",
    sub: "Beltrami Co. \u00B7 9 in", layer: mnAerial2020BeltCir },
  { name: "Aerial 2019 (summer)", code: "aerial-2019-naip",
    label: "Aerial 2019 (summer)", sub: "NAIP \u00B7 60 cm",
    layer: mnAerial2019 },
  { name: "Aerial 2019 (CIR)", code: "aerial-2019-cir",
    label: "Aerial 2019 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2019cir },
  { name: "Aerial 2019 (Wayback)", code: "aerial-2019",
    label: "Aerial 2019", sub: "Esri Wayback, release 2019-12-12",
    layer: esriWayback2019 },
  { name: "Aerial 2018 (Wayback)", code: "aerial-2018",
    label: "Aerial 2018", sub: "Esri Wayback, release 2018-12-14",
    layer: esriWayback2018 },
  { name: "Aerial 2018 (spring, east fringe only)", code: "aerial-2018-itas",
    label: "Aerial 2018 (spring, east fringe only)",
    sub: "Itasca Co. \u00B7 1 ft", layer: mnAerial2018Itas },
  { name: "Aerial 2018 (spring, east fringe only, CIR)", code: "aerial-2018-itas-cir",
    label: "Aerial 2018 (spring, east fringe only, CIR)",
    sub: "Itasca Co. \u00B7 1 ft", layer: mnAerial2018ItasCir },
  { name: "Aerial 2017 (summer)", code: "aerial-2017-naip",
    label: "Aerial 2017 (summer)", sub: "NAIP \u00B7 1 m",
    layer: mnAerial2017 },
  { name: "Aerial 2017 (CIR)", code: "aerial-2017-cir",
    label: "Aerial 2017 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2017cir },
  { name: "Aerial 2017 (Wayback)", code: "aerial-2017",
    label: "Aerial 2017", sub: "Esri Wayback, release 2017-11-16",
    layer: esriWayback2017 },
  { name: "Aerial 2016 (Wayback)", code: "aerial-2016",
    label: "Aerial 2016", sub: "Esri Wayback, release 2016-12-20",
    layer: esriWayback2016 },
  { name: "Aerial 2015 (summer)", code: "aerial-2015-naip",
    label: "Aerial 2015 (summer)", sub: "NAIP \u00B7 1 m",
    layer: mnAerial2015 },
  { name: "Aerial 2015 (CIR)", code: "aerial-2015-cir",
    label: "Aerial 2015 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2015cir },
  { name: "Aerial 2015 (Wayback)", code: "aerial-2015",
    label: "Aerial 2015", sub: "Esri Wayback, release 2015-12-16",
    layer: esriWayback2015 },
  { name: "Aerial 2014 (Wayback)", code: "aerial-2014",
    label: "Aerial 2014", sub: "Esri Wayback, release 2014-12-30",
    layer: esriWayback2014 },
  { name: "Aerial 2013 (summer)", code: "aerial-2013-naip",
    label: "Aerial 2013 (summer)", sub: "NAIP \u00B7 1 m",
    layer: mnAerial2013 },
  { name: "Aerial 2013 (CIR)", code: "aerial-2013-cir",
    label: "Aerial 2013 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2013cir },
  { name: "Aerial 2013 (spring, south/central lake only)", code: "aerial-2013-hm",
    label: "Aerial 2013 (spring, south/central lake only)",
    sub: "leaf-off \u00B7 50 cm", layer: mnAerial2013Hm },
  { name: "Aerial 2013 (spring, south/central lake only, CIR)", code: "aerial-2013-hm-cir",
    label: "Aerial 2013 (spring, south/central lake only, CIR)",
    sub: "leaf-off \u00B7 50 cm", layer: mnAerial2013HmCir },
  { name: "Aerial 2013 (spring, north fringe only)", code: "aerial-2013-ft",
    label: "Aerial 2013 (spring, north fringe only)",
    sub: "leaf-off \u00B7 1 ft", layer: mnAerial2013Ft },
  { name: "Aerial 2013 (spring, north fringe only, CIR)", code: "aerial-2013-ft-cir",
    label: "Aerial 2013 (spring, north fringe only, CIR)",
    sub: "leaf-off \u00B7 1 ft", layer: mnAerial2013FtCir },
  { name: "Aerial 2012 (fall, central MN)", code: "aerial-2012-fall",
    label: "Aerial 2012 (fall, central MN)", sub: "MnGeo",
    layer: mnAerial2012Fall },
  { name: "Aerial 2012 (fall, central MN, CIR)", code: "aerial-2012-fall-cir",
    label: "Aerial 2012 (fall, central MN, CIR)", sub: "MnGeo",
    layer: mnAerial2012FallCir },
  { name: "Aerial 2010 (summer)", code: "aerial-2010-naip",
    label: "Aerial 2010 (summer)", sub: "NAIP \u00B7 1 m",
    layer: mnAerial2010 },
  { name: "Aerial 2009 (summer)", code: "aerial-2009-naip",
    label: "Aerial 2009 (summer)", sub: "NAIP \u00B7 1 m",
    layer: mnAerial2009 },
  { name: "Aerial 2008 (summer)", code: "aerial-2008-naip",
    label: "Aerial 2008 (summer)", sub: "NAIP \u00B7 1 m",
    layer: mnAerial2008 },
  { name: "Aerial 2008 (CIR)", code: "aerial-2008-cir",
    label: "Aerial 2008 (CIR)", sub: "NAIP colour-infrared",
    layer: mnAerial2008cir },
  { name: "Aerial 2006 (summer/fall)", code: "aerial-2006",
    label: "Aerial 2006 (summer/fall)", sub: "USGS \u00B7 40 counties",
    layer: mnAerial2006 },
  { name: "Aerial 2003 (summer)", code: "aerial-2003",
    label: "Aerial 2003 (summer)", sub: "NAIP \u00B7 1 m",
    layer: mnAerial2003 },
  { name: "Aerial 2002\u201304 (Landsat)", code: "aerial-2002-landsat",
    label: "Aerial 2002\u201304 (Landsat)", sub: "coarse 30 m",
    layer: mnAerialLandsat },
  { name: "Aerial 1991 (black-and-white)", code: "aerial-1991",
    label: "Aerial 1991 (black-and-white)", sub: "USGS DOQ \u00B7 1 m",
    layer: mnAerial1991 },
  /* Streets (Esri World Street Map) sits immediately before
     White (Paul, Nov 21, 2026) — moved from the head of the
     list; the default opener is unchanged (Topo). */
  { name: "Streets (OSM)", code: "streets", label: "Streets",
    sub: "Esri World Street Map", layer: osm },
  { name: "White \u2014 no basemap", code: "white", label: "White",
    sub: "no base map", layer: whiteBase, white: true },
];
function baseByName(name) {
  for (var i = 0; i < BASES.length; i++) {
    if (BASES[i].name === name) return BASES[i];
  }
  return null;
}
var currentBase = baseByName("Topo (OpenTopoMap)");
function isAerialYear(def) {
  return /^Aerial \d{4}/.test(def.name);
}
var yearSelect = null;
function markActiveBase(name) {
  document.querySelectorAll("#background-choices .bg-choice").forEach(function (row) {
    var on = row.getAttribute("data-base") === name;
    row.classList.toggle("on", on);
    row.setAttribute("aria-pressed", on ? "true" : "false");
  });
  if (yearSelect) {
    yearSelect.value = isAerialYear({ name: name }) ? name : "";
  }
}
function setBase(name) {
  var def = baseByName(name);
  if (!def || def === currentBase) return;
  map.removeLayer(currentBase.layer);
  map.addLayer(def.layer);
  currentBase = def;
  document.body.classList.toggle("base-imagery", /^Aerial/.test(name));
  document.body.classList.toggle("base-white", !!def.white);
  markActiveBase(name);
}
(function buildBackground() {
  function rowFor(def) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bg-choice";
    btn.setAttribute("data-base", def.name);
    btn.setAttribute("aria-pressed", def === currentBase ? "true" : "false");
    if (def === currentBase) btn.classList.add("on");
    btn.textContent = def.label + " ";
    if (def.sub) {
      var sub = document.createElement("span");
      sub.className = "bg-sub";
      sub.textContent = def.sub;
      btn.appendChild(sub);
    }
    btn.addEventListener("click", function () { setBase(def.name); });
    return btn;
  }
  function yearMenu() {
    var wrap = document.createElement("div");
    wrap.className = "bg-year-wrap";
    var label = document.createElement("label");
    label.className = "bg-year-label";
    label.setAttribute("for", "bg-year-select");
    label.textContent = "Aerial photography by year";
    var note = document.createElement("div");
    note.className = "bg-year-note";
    note.textContent = "Streamed from MnGeo (NAIP and county flights) and " +
      "Esri Wayback. Entries marked with a place cover only part of " +
      "the lake. Wayback 2014\u20132017 show the same underlying " +
      "imagery at Leech Lake, so those years may look identical.";
    var sel = document.createElement("select");
    sel.id = "bg-year-select";
    sel.className = "bg-year-select";
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "Choose a year\u2026";
    sel.appendChild(ph);
    BASES.forEach(function (def) {
      if (!isAerialYear(def)) return;
      var opt = document.createElement("option");
      opt.value = def.name;
      opt.textContent = def.label + " \u2014 " + (def.sub || "");
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      if (sel.value) setBase(sel.value);
    });
    wrap.appendChild(label);
    wrap.appendChild(note);
    wrap.appendChild(sel);
    yearSelect = sel;
    return wrap;
  }
  var main = document.getElementById("background-choices");
  if (!main) return;
  BASES.forEach(function (def) {
    if (isAerialYear(def)) return;
    main.appendChild(rowFor(def));
  });
  main.appendChild(yearMenu());
})();

/* ---------- overlay layers ---------- */
/* LAYERS pattern (ITM): id, label, title, file, onByDefault, group,
   swatch, build. Layers load lazily — the GeoJSON is fetched only
   when its toggle is first switched on (or at open, for the
   on-by-default layers). Popups are content-first, in plain
   language, with a link to the source record where one exists and
   a footer link to the layer's data-sources section. */
function swatchFor(def) {
  var s = def.swatch;
  if (!s) return "";
  if (s.kind === "fill") {
    return "<span class='tog-swatch-fill' style='background:" + s.color +
      ";border-color:" + (s.border || s.color) + "'></span>";
  }
  if (s.kind === "icon") {
    return "<img class='tog-swatch-icon' src='" + s.url +
      "' alt='' aria-hidden='true'>";
  }
  if (s.kind === "pin") {
    return "<span class='tog-swatch-pin' style='background:" + s.color +
      "'></span>";
  }
  return "<span class='tog-swatch-line' style='border-top-color:" +
    s.color + "'></span>";
}

/* Public water access marker (Paul, Nov 21, 2026): the DNR-style
   brown-square boat-ramp pictogram (boat on trailer on the ramp),
   as a Leaflet icon. 15 px square — half the original 30 px size
   (Paul, Nov 21, 2026), centred on the point so the popup opens
   just above it. */
var boatRampIcon = L.icon({
  iconUrl: "assets/boat-ramp-dnr.webp",
  iconSize: [15, 15],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
  className: "boat-ramp-marker",
});
function lakeFinderLink(dow) {
  if (!dow) return null;
  return "<a href='https://www.dnr.state.mn.us/lakefind/showreport.html" +
    "?downum=" + encodeURIComponent(dow) + "' target='_blank' " +
    "rel='noopener'>LakeFinder report for this lake (DNR)</a>";
}

/* ---------- MPCA impaired / assessed waters helpers ----------
   Category colours (MPCA Integrated Report categories):
   5 red (impaired, TMDL required), 4A orange (impaired, TMDL
   approved), 4D amber (impaired/threatened, natural conditions —
   no TMDL), 4C teal, 3 grey (insufficient information),
   2 green (fully supporting). The per-pollutant columns in the
   impaired files (hg_f, nutrients, e_coli, …) carry the YEAR
   the impairment was listed, not a Y/N flag; imp_param is the
   authoritative parameter list. */
var CAT_COLORS = {
  "5": "#c81e1e", "4A": "#e8590c", "4B": "#e8590c",
  "4D": "#a16207", "4C": "#0e7490", "3": "#6b7280",
  "2": "#15803d", "1": "#15803d",
};
function catColor(cat) {
  return CAT_COLORS[String(cat || "").trim()] || "#555555";
}
var CAT_RANK = { "5": 6, "4A": 5, "4B": 5, "4D": 4, "4C": 4,
  "3": 3, "2": 2, "1": 1 };
function worstCatValue(p, fields) {
  var worst = null, worstRank = -1;
  fields.forEach(function (f) {
    var v = p[f];
    if (v === null || v === undefined || v === "" || v === "None") return;
    var r = CAT_RANK[String(v).trim()];
    if (r !== undefined && r > worstRank) { worstRank = r; worst = String(v).trim(); }
  });
  return worst;
}
var POLLUTANT_LABELS = {
  hg_f: "Mercury in fish tissue (Hg-F)", hg_w: "Mercury in water (Hg-W)",
  nutrients: "Nutrients", e_coli: "E. coli",
  pcb_f: "PCBs in fish tissue (PCB-F)", pcb_w: "PCBs in water (PCB-W)",
  pfos_f: "PFOS in fish tissue (PFOS-F)", pfos_w: "PFOS in water (PFOS-W)",
  ammonia: "Ammonia", chloride: "Chloride", clpyr: "Chlorpyrifos",
  ddt: "DDT", dieldrin: "Dieldrin", dioxin: "Dioxin",
  fishesbio: "Fish bioassessment (FishesBio)",
  invertbio: "Invertebrate bioassessment (InvertBio)",
  sulfate: "Sulfate", toxaphene: "Toxaphene",
  ace: "Acetochlor", al: "Aluminum", arsenic: "Arsenic",
  do_: "Dissolved oxygen", fc: "Fecal coliform",
  nitrates: "Nitrates", ph: "pH", temp: "Temperature",
  tss: "Total suspended solids", turbidity: "Turbidity",
};
/* Rows of [pollutant label, listing year] for every pollutant
   column that holds a year (a number in year range). */
function listingYearRows(p) {
  var rows = [];
  Object.keys(POLLUTANT_LABELS).forEach(function (k) {
    var v = p[k];
    if (typeof v === "number" && v >= 1900 && v <= 2100) {
      rows.push([POLLUTANT_LABELS[k] + " \u2014 listed", String(v)]);
    }
  });
  return rows;
}
var USE_LABELS = {
  AQR: "Aquatic recreation", AQL: "Aquatic life",
  AQC: "Aquatic consumption", WR: "Wild rice",
  DW: "Drinking water", LRV: "Limited resource value",
};
function expandUses(v) {
  if (!v) return null;
  return String(v).split(";").map(function (s) {
    s = s.trim();
    return USE_LABELS[s] ? USE_LABELS[s] + " (" + s + ")" : s;
  }).join("; ");
}
var SUPPORT_LABELS = {
  FS: "Fully supporting", NS: "Not supporting",
  IF: "Insufficient information", NA: "Not assessed",
  EX: "Not assessed \u2014 insufficient data",
};
function supportText(code) {
  if (!code) return null;
  return SUPPORT_LABELS[code] ? SUPPORT_LABELS[code] + " (" + code + ")" : String(code);
}
/* Per-use rows for an assessed water: one row per use that was
   assessed, showing support, its category and last assessment
   year. Fields: aqr/aql/aqc/wr/dw (+lrv on streams), each with
   _cat and _last_ay companions. */
function assessedUseRows(p, includeLrv) {
  var uses = [["aqr", "Aquatic recreation (AQR)"],
    ["aql", "Aquatic life (AQL)"],
    ["aqc", "Aquatic consumption (AQC)"],
    ["wr", "Wild rice (WR)"], ["dw", "Drinking water (DW)"]];
  if (includeLrv) uses.push(["lrv", "Limited resource value (LRV)"]);
  var rows = [];
  uses.forEach(function (u) {
    var support = p[u[0]];
    var cat = p[u[0] + "_cat"];
    var ay = p[u[0] + "_last_ay"];
    if (support === "None") support = null;
    if (cat === "None") cat = null;
    if (ay === "None") ay = null;
    if (!support && !cat) return;
    var parts = [];
    if (support) parts.push(supportText(support));
    if (cat) parts.push("Category " + cat);
    if (ay) parts.push("last assessed " + ay);
    rows.push([u[1], parts.join(" \u00B7 ")]);
  });
  return rows;
}
function catLabel(cat, catDesc) {
  if (!cat) return null;
  return "Category " + cat + (catDesc ? " \u2014 " + catDesc : "");
}

/* ---------- USGS NWIS helpers ----------
   (The Minnesota Well Index helpers that used to sit here went
   with the wells layer when Paul had it removed, Nov 21, 2026.) */
/* NWIS station names are space-padded in the source; collapse. */
function cleanName(v) {
  if (!v) return null;
  var s = String(v).replace(/\s+/g, " ").trim();
  return s || null;
}
/* NWIS status comes from the pull's two-query comparison
   (siteStatus=all vs siteStatus=active): status is
   "active_listed" or "inactive", and live_reporting says whether
   the site actually returned an instantaneous value in the
   7 days before the pull. Active-listed is NOT live. */
function nwisTypeText(code) {
  if (code === "LK") return "Lake gauge (LK)";
  if (code === "ST") return "Stream gauge (ST)";
  if (code === "GW") return "Groundwater well (GW)";
  return code || null;
}
function nwisStatusText(p) {
  if (p.live_reporting === "yes") return "Reporting live";
  if (p.status === "active_listed") {
    return "Listed active \u2014 not currently reporting";
  }
  return "Inactive";
}
/* The one live gauge's latest reading, as a kvTable row. The
   value is a pull-time snapshot (Nov 21, 2026) and is labelled
   as such \u2014 it is never presented as a live value. */
function nwisLiveRow(p) {
  if (p.live_reporting !== "yes" || !p.live_value) return null;
  var when = null;
  if (p.live_value_dt) {
    var m = String(p.live_value_dt).match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      when = m[4] + ":" + m[5] + " CST, " + (+m[3]) + " " +
        months[(+m[2]) - 1] + " " + m[1];
    }
  }
  return [(p.live_param_name || "Latest value") + " (at pull time)",
    p.live_value + (p.live_units ? " " + p.live_units : "") +
    (when ? " \u2014 " + when : "")];
}

/* Shared builder for the History theme's point layers (Nov 21,
   2026): one coloured circle marker per feature, with the popup
   HTML supplied per layer. Several History points are approximate
   pointers, not surveyed sites — each popup says which. */
/* "Source:" line for History popups whose source field holds one
   or more raw URLs: each becomes a link labeled by its host, so
   a long URL never overflows the popup. */
function sourceLinksHtml(source) {
  if (!source) return "";
  var urls = String(source).split(/;\s*/).filter(function (u) {
    return u;
  });
  if (!urls.length) return "";
  var links = urls.map(function (u) {
    var m = u.match(/^https?:\/\/([^\/]+)/);
    return "<a href='" + esc(u) + "' target='_blank' rel='noopener'>" +
      esc(m ? m[1] : u) + "</a>";
  });
  return "<p class='pop-source'>Source: " + links.join(", ") + "</p>";
}

/* Shared builder for the historical-map tile layers (Nov 21,
   2026): each georeferenced scan was converted to an XYZ WebP
   tile pyramid under assets/tiles/<slug>/ at build time (the
   source GeoTIFFs total ~4 GB and cannot ship raw). min/max
   NativeZoom pin Leaflet to the generated zooms — outside them
   it scales the nearest generated tiles instead of requesting
   tiles that do not exist. Bounds keep requests inside the
   sheet. */
function histTiles(slug, zmin, zmax, bounds, attribution, opacity) {
  return function () {
    return L.tileLayer("assets/tiles/" + slug + "/{z}/{x}/{y}.webp", {
      minNativeZoom: zmin, maxNativeZoom: zmax,
      bounds: bounds, opacity: opacity, maxZoom: 18,
      attribution: attribution,
    });
  };
}

/* ---------- Census helpers (Nov 21, 2026) ----------
   Census theme design rule (Paul, Nov 21, 2026): units render
   WHOLE across Beltrami, Cass and Hubbard counties — nothing is
   clipped or allocated to the watershed. The watershed-basin
   layer's dimming mask sits ABOVE the census layers in the draw
   order, so the parts of a unit outside the basin read muted
   while the unit itself stays whole and clickable.
   Every ACS estimate is stored with its margin of error (the
   field ending in M) and every popup shows it: block-group MOEs
   are large, often ±30–50% of the estimate. Census sentinel
   -666666666 was stored as null at pull time and is simply not
   shown. The 2020 PL figures are full counts and carry no MOE. */
var SEASONAL_STEPS = [
  { max: 0.10, color: "#edf8e9", label: "under 10%" },
  { max: 0.25, color: "#bae4b3", label: "10–25%" },
  { max: 0.40, color: "#74c476", label: "25–40%" },
  { max: 0.55, color: "#31a354", label: "40–55%" },
  { max: 0.70, color: "#0d7a4a", label: "55–70%" },
  { max: Infinity, color: "#005a32", label: "70% and over" },
];
function seasonalColor(share) {
  if (share === null || share === undefined || !isFinite(+share)) {
    return "#cccccc";
  }
  for (var i = 0; i < SEASONAL_STEPS.length; i++) {
    if (+share < SEASONAL_STEPS[i].max) return SEASONAL_STEPS[i].color;
  }
  return "#005a32";
}
/* ---------- Census variable switcher (Paul, Nov 21, 2026) ----------
   One variable recolours the block groups, the tracts and the
   reservation together; the legend scale follows it. Default is
   seasonal share, as the layers shipped. Every variable is
   already in the two census data files — no new pull. Density is
   derived in the browser: ACS population (B01001_001E) divided
   by land area (ALAND, m², converted to square miles). The
   reservation record carries no ALAND, so it has no density and
   draws in the no-data grey when density is chosen; its popup
   values never change. Breaks are fixed round-number classes
   spanning the combined tract + block-group ranges, so the two
   geographies stay directly comparable on one scale. */
function pctSteps(breaks, colors, labels) {
  return breaks.map(function (b, i) {
    return { max: b, color: colors[i], label: labels[i] };
  });
}
var SHARE_LABELS = ["under 10%", "10–25%", "25–40%", "40–55%",
  "55–70%", "70% and over"];
var SHARE_BREAKS = [0.10, 0.25, 0.40, 0.55, 0.70, Infinity];
var CENSUS_VARS = [
  { id: "seasonal", label: "Seasonal homes (% of housing)",
    legend: "Seasonal share of housing (ACS 2024 5-year)",
    field: "seasonal_share", steps: SEASONAL_STEPS },
  { id: "income", label: "Median household income ($)",
    legend: "Median household income (ACS 2024 5-year, B19013)",
    field: "B19013_001E",
    steps: [
      { max: 40000, color: "#ffffd4", label: "under $40,000" },
      { max: 55000, color: "#fee391", label: "$40,000–$55,000" },
      { max: 70000, color: "#fec44f", label: "$55,000–$70,000" },
      { max: 85000, color: "#fe9929", label: "$70,000–$85,000" },
      { max: 100000, color: "#d95f0e", label: "$85,000–$100,000" },
      { max: Infinity, color: "#993404", label: "$100,000 and over" },
    ],
    note: "Income at block-group level is indicative only: its " +
      "margins of error run ±30–50% of the estimate. The tracts " +
      "are the reliable view for income." },
  { id: "median-age", label: "Median age (years)",
    legend: "Median age (ACS 2024 5-year, B01002)",
    field: "B01002_001E",
    steps: [
      { max: 30, color: "#eff3ff", label: "under 30" },
      { max: 38, color: "#c6dbef", label: "30–38" },
      { max: 44, color: "#6baed6", label: "38–44" },
      { max: 48, color: "#3182bd", label: "44–48" },
      { max: 53, color: "#08519c", label: "48–53" },
      { max: Infinity, color: "#08306b", label: "53 and over" },
    ] },
  { id: "population", label: "Population",
    legend: "Population (ACS 2024 5-year, B01001)",
    field: "B01001_001E",
    steps: [
      { max: 750, color: "#fef0d9", label: "under 750" },
      { max: 1250, color: "#fdcc8a", label: "750–1,250" },
      { max: 2000, color: "#fc8d59", label: "1,250–2,000" },
      { max: 3000, color: "#e34a33", label: "2,000–3,000" },
      { max: 4500, color: "#b30000", label: "3,000–4,500" },
      { max: Infinity, color: "#7f0000", label: "4,500 and over" },
    ] },
  { id: "density", label: "Population density (per sq mi)",
    legend: "Population density — people per square mile of land " +
      "(ACS population ÷ land area)",
    field: "__density",
    steps: [
      { max: 10, color: "#fef0d9", label: "under 10 / sq mi" },
      { max: 50, color: "#fdd49e", label: "10–50 / sq mi" },
      { max: 200, color: "#fdae6b", label: "50–200 / sq mi" },
      { max: 750, color: "#fd8d3c", label: "200–750 / sq mi" },
      { max: 2000, color: "#e6550d", label: "750–2,000 / sq mi" },
      { max: Infinity, color: "#a63603", label: "2,000+ / sq mi" },
    ],
    note: "Density is computed from the stored ACS population " +
      "and each unit\u2019s land area (ALAND). The reservation " +
      "record carries no land-area field, so it has no density " +
      "and draws grey on this variable." },
  { id: "vacancy", label: "Vacant homes (%)",
    legend: "Vacancy rate (ACS 2024 5-year)",
    field: "vacancy_rate",
    steps: pctSteps(SHARE_BREAKS,
      ["#edf8fb", "#b2e2e2", "#66c2a4", "#31a354", "#006d2c",
        "#00441b"], SHARE_LABELS) },
  { id: "owner", label: "Owner-occupied homes (%)",
    legend: "Owner-occupied share of occupied housing (ACS 2024)",
    field: "owner_share",
    steps: [
      { max: 0.50, color: "#f7fbff", label: "under 50%" },
      { max: 0.65, color: "#deebf7", label: "50–65%" },
      { max: 0.75, color: "#9ecae1", label: "65–75%" },
      { max: 0.85, color: "#3182bd", label: "75–85%" },
      { max: 0.92, color: "#08519c", label: "85–92%" },
      { max: Infinity, color: "#08306b", label: "92% and over" },
    ] },
  { id: "under18", label: "Under 18 (%)",
    legend: "Share of population under 18 (ACS 2024 5-year)",
    field: "share_under18",
    steps: [
      { max: 0.10, color: "#feebe2", label: "under 10%" },
      { max: 0.18, color: "#fcc5c0", label: "10–18%" },
      { max: 0.25, color: "#fa9fb5", label: "18–25%" },
      { max: 0.32, color: "#f768a1", label: "25–32%" },
      { max: 0.40, color: "#dd3497", label: "32–40%" },
      { max: Infinity, color: "#ae017e", label: "40% and over" },
    ] },
  { id: "over65", label: "Age 65+ (%)",
    legend: "Share of population age 65 and over (ACS 2024)",
    field: "share_65plus",
    steps: [
      { max: 0.12, color: "#ffffd4", label: "under 12%" },
      { max: 0.20, color: "#fee391", label: "12–20%" },
      { max: 0.28, color: "#fec44f", label: "20–28%" },
      { max: 0.36, color: "#fe9929", label: "28–36%" },
      { max: 0.45, color: "#cc4c02", label: "36–45%" },
      { max: Infinity, color: "#8c2d04", label: "45% and over" },
    ] },
  { id: "native", label: "Native American share (%)",
    legend: "Native American share of population (ACS 2024, B02001)",
    field: "share_native",
    steps: [
      { max: 0.02, color: "#f6e8d8", label: "under 2%" },
      { max: 0.05, color: "#e8c39e", label: "2–5%" },
      { max: 0.10, color: "#d29a5b", label: "5–10%" },
      { max: 0.25, color: "#a66a2c", label: "10–25%" },
      { max: 0.50, color: "#7a4a16", label: "25–50%" },
      { max: Infinity, color: "#54300a", label: "50% and over" },
    ] },
  { id: "hispanic", label: "Hispanic or Latino share (%)",
    legend: "Hispanic or Latino share of population (ACS 2024, B03003)",
    field: "share_hispanic",
    steps: [
      { max: 0.01, color: "#ffffcc", label: "under 1%" },
      { max: 0.02, color: "#a1dab4", label: "1–2%" },
      { max: 0.03, color: "#41b6c4", label: "2–3%" },
      { max: 0.05, color: "#2c7fb8", label: "3–5%" },
      { max: 0.07, color: "#253494", label: "5–7%" },
      { max: Infinity, color: "#081d58", label: "7% and over" },
    ] },
  { id: "poverty", label: "Poverty rate (% below poverty \u2014 tracts only)",
    legend: "Share below the poverty line (ACS 2024, B17001) — " +
      "tracts only",
    field: "poverty_rate",
    steps: [
      { max: 0.08, color: "#fee5d9", label: "under 8%" },
      { max: 0.12, color: "#fcae91", label: "8–12%" },
      { max: 0.16, color: "#fb6a4a", label: "12–16%" },
      { max: 0.20, color: "#de2d26", label: "16–20%" },
      { max: 0.26, color: "#a50f15", label: "20–26%" },
      { max: Infinity, color: "#67000d", label: "26% and over" },
    ],
    note: "Poverty is tract-level only: the Census Bureau does " +
      "not publish B17001 at block-group level, so block groups " +
      "have no poverty rate and draw as no-data grey on this " +
      "variable. No block-group poverty values exist or are " +
      "estimated here." },
  { id: "ba-plus", label: "Bachelor's degree or higher, age 25+ (%)",
    legend: "Share age 25+ with a bachelor's degree or higher " +
      "(ACS 2024, B15003)",
    field: "share_ba_plus",
    steps: [
      { max: 0.10, color: "#f7fbff", label: "under 10%" },
      { max: 0.18, color: "#deebf7", label: "10–18%" },
      { max: 0.25, color: "#9ecae1", label: "18–25%" },
      { max: 0.35, color: "#3182bd", label: "25–35%" },
      { max: 0.45, color: "#08519c", label: "35–45%" },
      { max: Infinity, color: "#08306b", label: "45% and over" },
    ] },
  { id: "hs-plus", label: "High school diploma or higher, age 25+ (%)",
    legend: "Share age 25+ with a high school diploma or higher " +
      "(ACS 2024, B15003)",
    field: "share_hs_plus",
    steps: [
      { max: 0.80, color: "#edf8e9", label: "under 80%" },
      { max: 0.85, color: "#bae4b3", label: "80–85%" },
      { max: 0.90, color: "#74c476", label: "85–90%" },
      { max: 0.93, color: "#31a354", label: "90–93%" },
      { max: 0.96, color: "#006d2c", label: "93–96%" },
      { max: Infinity, color: "#00441b", label: "96% and over" },
    ] },
  { id: "hhsize", label: "Household size (people)",
    legend: "Average household size (ACS 2024 5-year, B25010)",
    field: "B25010_001E",
    steps: [
      { max: 2.0, color: "#ffffcc", label: "under 2.0" },
      { max: 2.3, color: "#a1dab4", label: "2.0–2.3" },
      { max: 2.6, color: "#41b6c4", label: "2.3–2.6" },
      { max: 2.9, color: "#2c7fb8", label: "2.6–2.9" },
      { max: 3.2, color: "#253494", label: "2.9–3.2" },
      { max: Infinity, color: "#081d58", label: "3.2 and over" },
    ] },
  { id: "year-built", label: "Median year built",
    legend: "Median year housing was built (ACS 2024, B25035)",
    field: "B25035_001E",
    steps: [
      { max: 1960, color: "#ece7f2", label: "before 1960" },
      { max: 1970, color: "#d0d1e6", label: "1960s" },
      { max: 1980, color: "#a6bddb", label: "1970s" },
      { max: 1990, color: "#74a9cf", label: "1980s" },
      { max: 2000, color: "#2b8cbe", label: "1990s" },
      { max: Infinity, color: "#045a8d", label: "2000 and later" },
    ] },
  { id: "housing-units", label: "Housing units",
    legend: "Total housing units (ACS 2024 5-year, B25001)",
    field: "B25001_001E",
    steps: [
      { max: 400, color: "#edf8e9", label: "under 400" },
      { max: 700, color: "#bae4b3", label: "400–700" },
      { max: 1100, color: "#74c476", label: "700–1,100" },
      { max: 1600, color: "#31a354", label: "1,100–1,600" },
      { max: 2400, color: "#006d2c", label: "1,600–2,400" },
      { max: Infinity, color: "#00441b", label: "2,400 and over" },
    ] },
];
var currentCensusVarId = "seasonal";
function censusVarById(id) {
  for (var i = 0; i < CENSUS_VARS.length; i++) {
    if (CENSUS_VARS[i].id === id) return CENSUS_VARS[i];
  }
  return CENSUS_VARS[0];
}
function censusValue(p, def) {
  if (!p) return null;
  if (def.field === "__density") {
    var pop = p.B01001_001E, aland = p.ALAND;
    if (pop === null || pop === undefined || !aland) return null;
    return +pop / (+aland / 2589988.11);
  }
  var v = p[def.field];
  if (v === null || v === undefined || !isFinite(+v)) return null;
  return +v;
}
function censusColorFor(p, def) {
  var v = censusValue(p, def);
  if (v === null) return "#cccccc";
  for (var i = 0; i < def.steps.length; i++) {
    if (v < def.steps[i].max) return def.steps[i].color;
  }
  return def.steps[def.steps.length - 1].color;
}
function censusFill(p) {
  return censusColorFor(p, censusVarById(currentCensusVarId));
}
/* Legend hooks, filled in by buildLegend below (the map-corner
   legend) and by the panel build (the legend under the Census
   group). Both show the same scale for the chosen variable:
   the colour ramp low to high with its labelled value breaks,
   plus a grey "no data" chip. */
var censusLegendHead = null, censusLegendScale = null,
  censusLegendNote = null;
var censusPanelLegendEl = null, censusPanelScaleEl = null,
  censusPanelNameEl = null, censusPanelPovertyEl = null,
  censusPanelHintEl = null, censusGroupBodyEl = null;
function fillCensusScale(container, def) {
  if (!container) return;
  container.innerHTML = "";
  def.steps.forEach(function (step) {
    var chip = document.createElement("span");
    chip.className = "leg-chip";
    var sw = document.createElement("span");
    sw.className = "leg-chip-swatch";
    sw.style.background = step.color;
    chip.appendChild(sw);
    chip.appendChild(document.createTextNode(step.label));
    container.appendChild(chip);
  });
  var grey = document.createElement("span");
  grey.className = "leg-chip";
  var gsw = document.createElement("span");
  gsw.className = "leg-chip-swatch";
  gsw.style.background = "#cccccc";
  grey.appendChild(gsw);
  grey.appendChild(document.createTextNode("grey = no data"));
  container.appendChild(grey);
}
function anyCensusOn() {
  return ["census-blockgroups", "census-tracts", "census-aian"].some(
    function (id) {
      var d = layerById(id);
      return d && d.box && d.box.checked;
    });
}
/* The legend under the Census group (Paul, Nov 21, 2026): while
   any census layer is on it shows the current variable's name
   and scale; while none is on it shows the hint that stands
   where the legend will appear. */
function refreshCensusPanelLegend() {
  if (!censusPanelLegendEl) return;
  var on = anyCensusOn();
  var def = censusVarById(currentCensusVarId);
  if (censusPanelHintEl) {
    censusPanelHintEl.style.display = on ? "none" : "";
  }
  if (censusPanelNameEl) {
    censusPanelNameEl.style.display = on ? "" : "none";
    censusPanelNameEl.textContent = def.label +
      " (ACS 2024 5-year), low to high:";
  }
  if (censusPanelScaleEl) {
    censusPanelScaleEl.style.display = on ? "" : "none";
    if (on) fillCensusScale(censusPanelScaleEl, def);
  }
  if (censusPanelPovertyEl) {
    censusPanelPovertyEl.style.display =
      (on && def.id === "poverty") ? "" : "none";
  }
}
function updateCensusLegend() {
  var def = censusVarById(currentCensusVarId);
  if (censusLegendHead) {
    censusLegendHead.textContent = "Census areas are coloured by " +
      def.label + " (ACS 2024 5-year), low to high:";
  }
  fillCensusScale(censusLegendScale, def);
  if (censusLegendNote) {
    censusLegendNote.textContent = def.note || "";
    censusLegendNote.style.display = def.note ? "" : "none";
  }
  refreshCensusPanelLegend();
}
function restyleCensusLayers() {
  ["census-blockgroups", "census-tracts", "census-aian"].forEach(
    function (id) {
      var def = layerById(id);
      if (def && def.layer && def._censusStyle &&
          def.layer.setStyle) {
        def.layer.setStyle(def._censusStyle);
      }
    });
  updateCensusLegend();
}
function setCensusVar(id) {
  if (censusVarById(id).id === currentCensusVarId &&
      id !== currentCensusVarId) return;
  currentCensusVarId = censusVarById(id).id;
  var sel = document.getElementById("census-var-select");
  if (sel && sel.value !== currentCensusVarId) {
    sel.value = currentCensusVarId;
  }
  var note = document.getElementById("census-var-note");
  var def = censusVarById(currentCensusVarId);
  if (note) {
    note.textContent = def.note || "";
    note.style.display = def.note ? "" : "none";
  }
  restyleCensusLayers();
}
/* "1,404 ± 261" — an ACS estimate with its margin of error. */
function fmtEst(e, m, digits) {
  var es = fmtNum(e, digits);
  if (es === null) return null;
  var ms = fmtNum(m, digits);
  return ms === null ? es : es + " \u00B1 " + ms;
}
function fmtMoney(e, m) {
  var es = fmtNum(e);
  if (es === null) return null;
  var ms = fmtNum(m);
  return "$" + es + (ms === null ? "" : " \u00B1 $" + ms);
}
/* Margin of error for a derived share (a proportion), by the
   Census Bureau's published approximation for derived
   proportions: sqrt(MOE_num² − share² × MOE_den²) / denominator,
   falling back to the ratio form when the subtraction would go
   negative. Returned as a proportion (0–1), like the share. */
function shareMoe(numE, numM, denE, denM) {
  if (numE === null || numE === undefined || numM === null ||
      numM === undefined || !denE || denM === null ||
      denM === undefined || !isFinite(numM) || !isFinite(denM)) {
    return null;
  }
  var p = numE / denE;
  var under = numM * numM - p * p * denM * denM;
  if (under < 0) under = numM * numM + p * p * denM * denM;
  return Math.sqrt(under) / denE;
}
function fmtShare(share, moe) {
  if (share === null || share === undefined || !isFinite(+share)) {
    return null;
  }
  var s = (share * 100).toFixed(1) + "%";
  if (moe !== null && moe !== undefined && isFinite(moe)) {
    s += " (\u00B1 " + (moe * 100).toFixed(1) + " pts)";
  }
  return s;
}
/* One popup body for a whole census unit — block group, tract,
   or the reservation AIAN record (same field set in all three
   files). unitName is the popup heading; kicker the eyebrow. */
function censusPopupHtml(p, kicker, heading, extraNote) {
  var rows = [
    ["County", p.county_name ? p.county_name + " County" : null],
    ["Population (ACS 2024)", fmtEst(p.B01001_001E, p.B01001_001M)],
    ["Population (2020 Census count)", fmtNum(p.pl_pop_2020)],
    ["Median age", fmtEst(p.B01002_001E, p.B01002_001M, 1)],
    ["Median household income", fmtMoney(p.B19013_001E, p.B19013_001M)],
    ["Average household size", fmtEst(p.B25010_001E, p.B25010_001M, 2)],
    ["Under 18", fmtEst(p.pop_under18, p.pop_under18_moe)],
    ["Share under 18", fmtShare(p.share_under18,
      shareMoe(p.pop_under18, p.pop_under18_moe,
        p.B01001_001E, p.B01001_001M))],
    ["Age 65 and over", fmtEst(p.pop_65plus, p.pop_65plus_moe)],
    ["Share 65 and over", fmtShare(p.share_65plus,
      shareMoe(p.pop_65plus, p.pop_65plus_moe,
        p.B01001_001E, p.B01001_001M))],
    ["Housing units (ACS 2024)", fmtEst(p.B25001_001E, p.B25001_001M)],
    ["Housing units (2020 Census count)", fmtNum(p.pl_housing_2020)],
    ["Occupied units", fmtEst(p.B25002_002E, p.B25002_002M)],
    ["Vacant units", fmtEst(p.B25002_003E, p.B25002_003M)],
    ["Vacancy rate", fmtShare(p.vacancy_rate,
      shareMoe(p.B25002_003E, p.B25002_003M,
        p.B25001_001E, p.B25001_001M))],
    ["Seasonal / vacation homes", fmtEst(p.B25004_006E, p.B25004_006M)],
    ["Seasonal share of housing", fmtShare(p.seasonal_share,
      shareMoe(p.B25004_006E, p.B25004_006M,
        p.B25001_001E, p.B25001_001M))],
    ["Owner-occupied", fmtEst(p.B25003_002E, p.B25003_002M)],
    ["Owner share of occupied", fmtShare(p.owner_share,
      shareMoe(p.B25003_002E, p.B25003_002M,
        p.B25002_002E, p.B25002_002M))],
    ["Renter-occupied", fmtEst(p.B25003_003E, p.B25003_003M)],
    ["Median year built", fmtEst(p.B25035_001E, p.B25035_001M)],
    ["Native American share", fmtShare(p.share_native,
      p.share_native_moe)],
    ["Hispanic or Latino share", fmtShare(p.share_hispanic,
      p.share_hispanic_moe)],
    ["Below poverty", fmtShare(p.poverty_rate, p.poverty_rate_moe)],
    ["Bachelor\u2019s degree or higher (age 25+)",
      fmtShare(p.share_ba_plus, p.share_ba_plus_moe)],
    ["With bachelor\u2019s or higher (count, 25+)",
      fmtEst(p.pop_ba_plus, p.pop_ba_plus_moe)],
    ["High school diploma or higher (age 25+)",
      fmtShare(p.share_hs_plus, p.share_hs_plus_moe)],
    ["With high school or higher (count, 25+)",
      fmtEst(p.pop_hs_plus, p.pop_hs_plus_moe)],
  ];
  return popKicker(kicker) +
    "<h3>" + esc(heading) + "</h3>" +
    kvTable(rows) +
    "<p class='pop-note'>ACS figures are 2024 5-year estimates " +
    "(2020\u20132024 pooled), each shown with its margin of " +
    "error (\u00B1) \u2014 at block-group level the margins are " +
    "large, often \u00B130\u201350% of the estimate. Share " +
    "margins are the Census Bureau\u2019s derived-proportion " +
    "approximation. The 2020 Census counts are full counts " +
    "(April 1, 2020, usual residence) and have no margin of " +
    "error. \u201CSeasonal\u201D counts housing units held for " +
    "seasonal, recreational or occasional use \u2014 a housing " +
    "stock, not a count of people.</p>" +
    /* Poverty is tract-level only (extension pull, Nov 21, 2026):
       B17001 is not published for block groups — every block
       group in the file carries a null poverty rate — so a block
       group popup says so plainly instead of showing a gap. */
    ((p.poverty_rate === null || p.poverty_rate === undefined) &&
      p.BLKGRPCE !== undefined ?
      "<p class='pop-note'>Poverty is not published at " +
      "block-group level: the Census Bureau does not release " +
      "B17001 for block groups, so this unit has no poverty " +
      "rate. Poverty is mapped on the tracts.</p>" : "") +
    (extraNote || "");
}

function histPoints(gj, color, popupFor, maxWidth) {
  return L.geoJSON(gj, {
    pointToLayer: function (f, latlng) {
      return L.circleMarker(latlng, {
        radius: 6, color: color, weight: 2,
        fillColor: color, fillOpacity: 0.75,
      });
    },
    onEachFeature: function (f, l) {
      bindPop(l, popupFor(f.properties), maxWidth);
    },
  });
}

/* ---------- Fish / wildlife / land helpers (Nov 21, 2026) ----------
   Several DNR services carry dates as epoch milliseconds
   (survey dates, designation dates); render them as plain
   dates, never as raw numbers. */
var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtEpochDate(v) {
  if (typeof v !== "number" || !isFinite(v)) return null;
  var d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.getUTCDate() + " " + MONTHS_SHORT[d.getUTCMonth()] +
    " " + d.getUTCFullYear();
}
/* Centroid of a polygon ring by the shoelace formula; used to
   place the one fish-IBI marker per lake on its lake polygon. */
function ringCentroid(ring) {
  var twiceArea = 0, cx = 0, cy = 0;
  for (var i = 0; i < ring.length - 1; i++) {
    var x0 = ring[i][0], y0 = ring[i][1];
    var x1 = ring[i + 1][0], y1 = ring[i + 1][1];
    var f = x0 * y1 - x1 * y0;
    twiceArea += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if (Math.abs(twiceArea) < 1e-12) {
    return [ring[0][1], ring[0][0]];
  }
  return [cy / (3 * twiceArea), cx / (3 * twiceArea)];
}
function featureCentroid(geom) {
  if (!geom) return null;
  var polys = geom.type === "Polygon" ? [geom.coordinates] :
    geom.type === "MultiPolygon" ? geom.coordinates : [];
  var best = null, bestArea = -1;
  polys.forEach(function (poly) {
    if (!poly || !poly[0]) return;
    var ring = poly[0];
    var area = 0;
    for (var i = 0; i < ring.length - 1; i++) {
      area += ring[i][0] * ring[i + 1][1] -
        ring[i + 1][0] * ring[i][1];
    }
    if (Math.abs(area) > bestArea) {
      bestArea = Math.abs(area);
      best = ringCentroid(ring);
    }
  });
  return best;
}

/* ---------- Cass County pull helpers (Nov 21, 2026) ----------
   The Cass County group (end of LAYERS) is built from the
   county GIS pull of Nov 21, 2026: 44 datasets pulled, 42
   wired as layers here. The two Cass Lake city layers came
   back empty — the city is outside the watershed — and are
   recorded in data-sources.html instead of wired. These
   builders keep the 42 defs compact: cassVec for polygons and
   lines, cassPts for points; each popup function returns the
   popup body and the builder appends the data-sources footer
   link for the layer's anchor. */
function cassTxt(v) {
  if (v === null || v === undefined) return null;
  var s = String(v).trim();
  return s === "" ? null : s;
}
/* County sale dates are YYYYMMDD numbers; render as a date. */
function cassDate(v) {
  var s = String(v == null ? "" : v);
  var m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return cassTxt(v);
  var mo = MONTHS_SHORT[parseInt(m[2], 10) - 1];
  if (!mo) return cassTxt(v);
  return parseInt(m[3], 10) + " " + mo + " " + m[1];
}
function cassChunks(stem, n) {
  var out = [];
  for (var i = 1; i <= n; i++) {
    out.push("assets/data/" + stem + "-" + i + ".geojson");
  }
  return out;
}
function cassVec(style, anchor, popFn) {
  return function (gj) {
    return L.geoJSON(gj, {
      style: style,
      onEachFeature: function (f, l) {
        bindPop(l, popFn(f.properties) + popDataLink(anchor));
      },
    });
  };
}
function cassPts(color, radius, anchor, popFn) {
  return function (gj) {
    return L.geoJSON(gj, {
      pointToLayer: function (f, latlng) {
        return L.circleMarker(latlng, {
          radius: radius, color: color, weight: 1.2,
          fillColor: color, fillOpacity: 0.7,
        });
      },
      onEachFeature: function (f, l) {
        bindPop(l, popFn(f.properties) + popDataLink(anchor));
      },
    });
  };
}
/* Shared popup body for the county forest-inventory family
   (Forest Plan, FIM stands, both harvestable cuts): one FIM
   schema throughout. Cover-type values are the county's FIM
   codes, shown exactly as stored — the service carries no
   decode table for them. */
function cassFimPop(kicker) {
  return function (p) {
    return popKicker(kicker) +
      "<h3>Stand " + esc(p.STAND_KEY || "") + "</h3>" +
      kvTable([
        ["Cover type code (as stored)", cassTxt(p.MAIN_CTYPE)],
        ["Stand age", p.CURAGE ? fmtNum(p.CURAGE) + " yrs" : null],
        ["Area", p.TOTAL_ACRE ?
          fmtNum(p.TOTAL_ACRE, 1) + " acres" : null],
        ["Assessed", p.ASSMTYEAR ? String(p.ASSMTYEAR) : null],
        ["Status", cassTxt(p.STATUS)],
      ]) +
      "<p class='pop-note'>County forest inventory (FIM) " +
      "stand. Cover-type codes are the county&rsquo;s own, " +
      "shown as stored.</p>";
  };
}
/* Shared popup body for the three county road layers.
   ROADCLASS is null on every feature in the county data;
   FUNCTIONAL is populated but coded (2, 3, 4, 5, 10, 99)
   with no domain in the service — shown as stored. */
function cassRoadPop(kicker, withSpeed) {
  return function (p) {
    var rows = [
      ["Jurisdiction", cassTxt(p.JURIS)],
      ["Surface", cassTxt(p.SURF_TYPE)],
      ["Functional class code (as stored)",
        (p.FUNCTIONAL === null || p.FUNCTIONAL === undefined) ?
          null : String(p.FUNCTIONAL)],
    ];
    if (withSpeed) {
      rows.push(["Speed limit", p.SPEEDLIMIT ?
        fmtNum(p.SPEEDLIMIT) + " mph" : null]);
    }
    rows.push(["Route", cassTxt(p.ROUTE_NAME)]);
    return popKicker(kicker) +
      "<h3>" + esc(cassTxt(p.ST_CONCAT) ||
        cassTxt(p.ROUTE_NAME) || "Road") + "</h3>" +
      kvTable(rows) +
      "<p class='pop-note'>County road centreline. The " +
      "county&rsquo;s ROADCLASS field is unpopulated in this " +
      "data, and the functional-class codes are shown exactly " +
      "as stored &mdash; the service carries no decode table " +
      "for them.</p>";
  };
}
/* Shared popup body for the surveyor corner monuments
   (north and south services, one schema). */
function cassCornerPop(p) {
  return popKicker("Survey corner monument \u2014 Cass County") +
    "<h3>Corner " + esc(cassTxt(p.INDEX_NUM) || "") + "</h3>" +
    kvTable([
      ["Township / range",
        (cassTxt(p.TWP) && cassTxt(p.RNG)) ?
          "T" + String(p.TWP).trim() + " R" + String(p.RNG).trim() :
          null],
      ["Status code (as stored)", cassTxt(p.CORNER_STATUS)],
      ["Certified by (as stored)", cassTxt(p.Cert_By)],
      ["Certified", fmtEpochDate(p.Cert_Date)],
      ["Monument", cassTxt(p.DESC_)],
    ]) +
    "<p class='pop-note'>A PLSS survey corner monument from " +
    "the county surveyor&rsquo;s control-point records. " +
    "Status codes are shown as stored.</p>";
}
/* One CRV sales def per sale year. FENCE (Nov 21, 2026): the
   hosted files have the purchase price REMOVED — the layer
   keeps the sale year and sale date only, and no buyer,
   seller or taxpayer name was ever pulled. */
function cassCrvDef(year) {
  var anchor = "cass-crv-sales";
  return {
    id: "cass-crv-sales-" + year,
    label: "Property sales " + year + " (CRV)",
    title: "Cass County Certificate of Real Estate Value " +
      "sales recorded in " + year + ", clipped to the " +
      "watershed (pulled Nov 21, 2026) \u2014 OFF by default. " +
      "Sale prices are NOT shown on this map, and no buyer or " +
      "seller names are held",
    file: "assets/data/cass-crv-sales-" + year + ".geojson",
    onByDefault: false, group: "Political & administrative",
    subgroup: "County — Cass · Sales",
    swatch: { kind: "fill", color: "#f9a825", border: "#b7860b" },
    anchor: anchor,
    build: cassVec(
      { color: "#b7860b", weight: 0.7, opacity: 0.8,
        fillColor: "#f9a825", fillOpacity: 0.30 },
      anchor,
      function (p) {
        return popKicker("Property sale \u2014 CRV " + year) +
          "<h3>Sale recorded " +
            esc(cassDate(p.sale_date) || String(year)) + "</h3>" +
          kvTable([
            ["Parcel", cassTxt(p.parcel_nbr)],
            ["Sale date", cassDate(p.sale_date)],
            ["Property class code (as stored)",
              (p.primary_class === null ||
                p.primary_class === undefined) ?
                null : String(p.primary_class)],
            ["Deeded acres", p.deeded_acres ?
              fmtNum(p.deeded_acres, 2) : null],
            ["Deed type", cassTxt(p.dor_deed_type)],
            ["Year built", p.year_built ?
              String(p.year_built) : null],
          ]) +
          "<p class='pop-note'>A Certificate of Real Estate " +
          "Value sale. The purchase price is not shown on " +
          "this map, and no buyer or seller names are held " +
          "&mdash; the layer records that a sale happened, " +
          "and when.</p>";
      }),
  };
}

var LAYERS = [
  {
    id: "watershed-basin", label: "Watershed \u2014 whole basin",
    title: "The whole Leech Lake River basin (DNR Major 8) \u2014 " +
      "every stream that eventually reaches Leech Lake and the river " +
      "below it. The land outside the basin is dimmed; the basin " +
      "itself is not.",
    file: "assets/data/watershed-whole-basin.geojson",
    onByDefault: true, group: "The watershed",
    swatch: { kind: "line", color: "#000000" },
    anchor: "watershed-basin",
    infoUrl: "https://mn.gov/mngeo/gis-data-and-maps/info-by-topic/water/watersheds.jsp",
    infoName: "MnGeo — Watersheds Data for Minnesota",
    build: function (gj) {
      /* Dim OUTSIDE the basin only (Paul, Nov 21, 2026): an
         inverted mask — a world-sized polygon with the basin cut
         out as a hole — shades everything around the watershed,
         while the watershed itself gets no fill at all. The basin
         boundary is drawn on top as a thick black line. Both
         parts stay non-interactive so clicks pass through to the
         parcels and other features underneath. */
      var holes = [];
      (gj.features || []).forEach(function (f) {
        var g = f.geometry;
        if (!g) return;
        var polys = g.type === "Polygon" ? [g.coordinates] :
          g.type === "MultiPolygon" ? g.coordinates : [];
        polys.forEach(function (poly) {
          if (!poly || !poly[0]) return;
          holes.push(poly[0].map(function (c) {
            return L.latLng(c[1], c[0]);
          }));
        });
      });
      var world = [L.latLng(-85, -180), L.latLng(-85, 180),
        L.latLng(85, 180), L.latLng(85, -180)];
      var mask = L.polygon([world].concat(holes), {
        interactive: false, stroke: false,
        fillColor: "#141a16", fillOpacity: 0.38, fillRule: "evenodd",
      });
      var boundary = L.geoJSON(gj, {
        interactive: false,
        style: { color: "#000000", weight: 4, opacity: 1,
          fill: false, fillOpacity: 0 },
      });
      return L.featureGroup([mask, boundary]);
    },
  },
  {
    id: "watershed-direct", label: "Watershed \u2014 land draining directly to the lake",
    title: "The land that drains straight into Leech Lake (WBD HUC10 0701010205) \u2014 " +
      "the tributary subwatersheds are separate",
    file: "assets/data/watershed-direct-to-lake.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#1b7a4d", border: "#1b7a4d" },
    anchor: "watershed-direct",
    infoUrl: "https://www.usgs.gov/national-hydrography/access-national-hydrography-products",
    infoName: "USGS — National Hydrography Products (WBD)",
    build: function (gj) {
      return L.geoJSON(gj, {
        interactive: false,
        style: { color: "#1b7a4d", weight: 2, opacity: 0.8,
          fillColor: "#1b7a4d", fillOpacity: 0.10 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Watershed") +
            "<h3>Land draining directly to Leech Lake</h3>" +
            "<p>The subwatershed whose streams run straight into the " +
            "lake \u2014 not the tributary valleys (Steamboat, Kabekona, " +
            "Woman Lake, Boy River, Leech Lake River), which are their " +
            "own subwatersheds.</p>" +
            kvTable([
              ["Subwatershed", "WBD HUC10 " + (p.huc10 || "0701010205") + " \u2014 " + (p.name || "Leech Lake")],
              ["Area", fmtNum(p.areasqkm, 2) + " km\u00B2 (" + fmtNum(p.areaacres) + " acres)"],
            ]) + popDataLink("watershed-direct"));
        },
      });
    },
  },
  {
    id: "lakes", label: "Lakes",
    title: "Lakes and ponds in the watershed (DNR Hydrography) \u2014 " +
      "Leech Lake shown as one whole-lake outline",
    file: "assets/data/lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#4a90c2", border: "#2f6ea5" },
    anchor: "lakes",
    infoUrl: "https://www.dnr.state.mn.us/whaf/about/gis_data_sources.html",
    infoName: "DNR — GIS Data Sources",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#2f6ea5", weight: 1, opacity: 0.7,
          fillColor: "#4a90c2", fillOpacity: 0.35 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          /* Leech Lake itself (DNR 11-0203-00) is non-clickable so
             clicks pass through to parcels and other features
             underneath it (Paul, Nov 21, 2026). Other lakes keep
             their popups. */
          if (p.dowlknum === "11020300") {
            l.options.interactive = false;
            return;
          }
          var name = p.pw_basin_name && p.pw_basin_name !== "Unnamed" ?
            p.pw_basin_name : "Unnamed lake";
          var link = (p.in_lakefinder === "Y") ? lakeFinderLink(p.dowlknum) : null;
          bindPop(l, popKicker("Lake") +
            "<h3>" + esc(name) + "</h3>" +
            kvTable([
              ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
              ["Shoreline", p.shore_mi ? fmtNum(p.shore_mi, 1) + " miles" : null],
              ["County", p.cty_name],
              ["DNR lake number", p.dowlknum],
            ]) +
            /* Kabekona (DNR 29-0075-00) is the watershed's one
               designated Outstanding Resource Value Water
               (MPCA ORVW pull, Nov 21, 2026 — see
               data-sources.html#orv-waters). The designation is
               carried as this popup annotation, NOT as a layer of
               its own, and is not the separate "exceptional-resource
               lakes" inventory list. */
            (p.dowlknum === "29007500" ?
              "<p class='pop-note'>Outstanding Resource Value " +
              "Water \u2014 Restricted, designated 3/7/1988 " +
              "(Minn. R. 7050.0470). " +
              "<a href='assets/data-sources.html#orv-waters' " +
              "target='_blank' rel='noopener'>About this " +
              "designation</a></p>" : "") +
            (link ? "<p>" + link + "</p>" : "") +
            popDataLink("lakes"));
        },
      });
    },
  },
  {
    id: "infested-waters", label: "Infested waters",
    title: "Waters listed by the DNR as infested with aquatic invasive species \u2014 " +
      "one row per waterbody and species; check the DNR's current list before relying on a per-lake species claim",
    file: "assets/data/infested-waters.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#b91c1c", border: "#b91c1c" },
    anchor: "infested-waters",
    infoUrl: "https://www.dnr.state.mn.us/invasives/ais/infested.html",
    infoName: "DNR infested waters list",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#b91c1c", weight: 1.5, opacity: 0.8,
          fillColor: "#b91c1c", fillOpacity: 0.30 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Infested water") +
            "<h3>" + esc(p.waterbodyname || "Unnamed water") + " \u2014 " +
            esc(p.commonname || "invasive species") + "</h3>" +
            "<p>Listed by the DNR as infested with this species.</p>" +
            kvTable([
              ["Species", p.commonname],
              ["Listed (designated)", p.designateddate],
              ["Confirmed", p.confirmdate],
              ["Counties", p.counties],
              ["DNR lake number", p.downumber],
              ["Note", p.note],
            ]) +
            "<p><a href='https://www.dnr.state.mn.us/invasives/ais/infested.html' " +
            "target='_blank' rel='noopener'>DNR infested waters list " +
            "(official record \u2014 check it before relying on a " +
            "per-lake species claim)</a></p>" +
            popDataLink("infested-waters"));
        },
      });
    },
  },
  {
    /* Bathymetry contours — OFF by default: the file is ~9.9 MB
       (1,590 contour polylines), so it is fetched only when the
       toggle is switched on. Hosted-copy delivery note (Nov 21,
       2026): like the parcels file, the single ~9.9 MB contours
       file is split for the hosted page into three chunk files
       (bathymetry-contours-1..3.geojson, features concatenated in
       order by ensureLayer). Same 1,590 contours, same fields —
       only the delivery is split. */
    id: "bathymetry-contours", label: "Bathymetry \u2014 depth contours",
    title: "DNR lake bathymetry depth contours for the surveyed lakes " +
      "in the watershed \u2014 every 5 ft (10 ft in deeper water), " +
      "0\u2013200 ft. Click a contour for its depth",
    files: ["assets/data/bathymetry-contours-1.geojson",
      "assets/data/bathymetry-contours-2.geojson",
      "assets/data/bathymetry-contours-3.geojson"],
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "line", color: "#1a5a8a" },
    anchor: "bathymetry-contours",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/901/metadata.pdf",
    infoName: "Lake bathymetry metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: function (f) {
          var shore = f.properties && f.properties.abs_depth === 0;
          return { color: "#1a5a8a", weight: shore ? 1.6 : 1,
            opacity: shore ? 0.9 : 0.7 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var depth = (p.abs_depth !== null && p.abs_depth !== undefined) ?
            p.abs_depth : null;
          bindPop(l, popKicker("Depth contour") +
            "<h3>" + (depth === 0 ? "Shoreline (0 ft)" :
              depth !== null ? esc(fmtNum(depth)) + " ft deep" :
              "Depth contour") + "</h3>" +
            kvTable([
              ["Lake", p.lake_name],
              ["Depth", depth !== null ?
                (depth === 0 ? "0 ft \u2014 the shoreline" :
                  fmtNum(depth) + " feet below the surface") : null],
              ["DNR lake number", p.dowlknum],
            ]) +
            "<p class='pop-note'>Contours are drawn every 5 ft " +
            "(10 ft apart in deeper water). Depths are from the " +
            "DNR&rsquo;s survey of this lake \u2014 see the " +
            "bathymetry outlines layer for the survey&rsquo;s " +
            "date and map number.</p>" +
            popDataLink("bathymetry-contours"));
        },
      });
    },
  },
  {
    id: "bathymetry-outlines", label: "Bathymetry \u2014 surveyed lakes",
    title: "Outlines of the lakes the DNR has bathymetry surveys for " +
      "(144 outlines, 85 lakes/basins) \u2014 click one for the lake " +
      "name and its survey information",
    file: "assets/data/bathymetry-outlines.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#7fb3d5", border: "#14486e" },
    anchor: "bathymetry-outlines",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/901/metadata.pdf",
    infoName: "Lake bathymetry metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#14486e", weight: 1.5, opacity: 0.9,
          fillColor: "#7fb3d5", fillOpacity: 0.10 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var county = p.cty_name ?
            p.cty_name.charAt(0).toUpperCase() + p.cty_name.slice(1) :
            null;
          bindPop(l, popKicker("Bathymetry survey outline") +
            "<h3>" + esc(p.lake_name || "Surveyed lake") + "</h3>" +
            kvTable([
              ["Survey finished", p.survey_end],
              ["Survey map", p.survey_map],
              ["Survey data source", p.data_src],
              ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
              ["County", county],
              ["DNR lake number", p.dowlknum],
            ]) +
            (p.island === "Y" ?
              "<p class='pop-note'>This outline is an island in the " +
              "lake, drawn as its own feature in the DNR data.</p>" : "") +
            popDataLink("bathymetry-outlines"));
        },
      });
    },
  },
  {
    id: "impaired-lakes", label: "Impaired lakes (MPCA 2024)",
    title: "Lakes on the MPCA 2024 final impaired waters list (303(d)) " +
      "in the watershed \u2014 coloured by Integrated Report category " +
      "(4A orange, 5 red). Click one for its category, impairment " +
      "parameters and the year each was listed",
    file: "assets/data/impaired-lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#e8590c", border: "#c81e1e" },
    anchor: "impaired-lakes",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/315/metadata.pdf",
    infoName: "Impaired waters 2024 metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: function (f) {
          var c = catColor(f.properties && f.properties.cat);
          return { color: c, weight: 1.5, opacity: 0.9,
            fillColor: c, fillOpacity: 0.38 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var rows = [
            ["Category", catLabel(p.cat, p.cat_desc)],
            ["Impairment(s)", p.imp_param],
            ["Affected use", expandUses(p.affected_u)],
          ].concat(listingYearRows(p)).concat([
            ["Area", p.area_acres ? fmtNum(p.area_acres, 1) + " acres" : null],
            ["County", p.county],
            ["In the reservation", p.in_reservation === "Y" ?
              "Yes \u2014 listed among the impaired lakes partially " +
              "within a reservation (MPCA layer 12)" :
              p.in_reservation === "N" ? "No" : p.in_reservation],
            ["Reservation", p.indian_reservation &&
              p.indian_reservation !== "None" ? p.indian_reservation : null],
            ["Use class", p.use_class],
            ["Waterbody ID (AUID)", p.auid],
          ]);
          bindPop(l, popKicker("Impaired lake \u2014 MPCA 2024") +
            "<h3>" + esc(p.name || "Unnamed lake") + "</h3>" +
            kvTable(rows) +
            "<p class='pop-note'>From the MPCA&rsquo;s 2024 final " +
            "impaired waters list (303(d)) \u2014 not the 2026 draft. " +
            "The year shown for each pollutant is the year that " +
            "impairment was listed.</p>" +
            popDataLink("impaired-lakes"));
        },
      });
    },
  },
  {
    id: "assessed-lakes", label: "Assessed lakes (MPCA 2024)",
    title: "Every lake the MPCA assessed in the watershed (2024), " +
      "impaired or not \u2014 coloured by the worst (most impaired) " +
      "per-use category among the uses assessed. Click one for the " +
      "per-use support, category and last assessment year",
    file: "assets/data/assessed-lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#15803d", border: "#15803d" },
    anchor: "assessed-lakes",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/287/metadata.pdf",
    infoName: "Assessed waters 2024 metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      var fields = ["aqr_cat", "aql_cat", "aqc_cat", "wr_cat", "dw_cat"];
      return L.geoJSON(gj, {
        style: function (f) {
          var c = catColor(worstCatValue(f.properties || {}, fields));
          return { color: c, weight: 1.2, opacity: 0.85,
            fillColor: c, fillOpacity: 0.30 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var worst = worstCatValue(p, fields);
          var rows = [
            ["Worst per-use category", worst ? "Category " + worst : null],
          ].concat(assessedUseRows(p, false)).concat([
            ["Area", p.water_size ? fmtNum(p.water_size) + " acres" : null],
            ["Use class", p.use_class],
            ["Waterbody ID (AUID)", p.auid],
          ]);
          bindPop(l, popKicker("Assessed lake \u2014 MPCA 2024") +
            "<h3>" + esc(p.name || "Unnamed lake") + "</h3>" +
            kvTable(rows) +
            "<p class='pop-note'>Every assessed lake, impaired or " +
            "not. The fill colour is the worst (most impaired) of " +
            "the per-use categories above; each use keeps its own " +
            "support, category and last assessment year.</p>" +
            popDataLink("assessed-lakes"));
        },
      });
    },
  },
  {
    id: "delisted-lakes", label: "Delisted lakes (MPCA 2024)",
    title: "Lakes removed from the impaired waters list in the " +
      "MPCA 2024 cycle \u2014 click one for the pollutant, the year " +
      "it was listed and the year it was delisted",
    file: "assets/data/delisted-lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#0e7490", border: "#0e7490" },
    anchor: "delisted-lakes",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/315/metadata.pdf",
    infoName: "Impaired waters 2024 metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#0e7490", weight: 1.5, opacity: 0.9,
          fillColor: "#0e7490", fillOpacity: 0.30 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Delisted lake \u2014 MPCA 2024") +
            "<h3>" + esc(p.name || "Unnamed lake") + "</h3>" +
            kvTable([
              ["Pollutant", p.pollutant],
              ["Affected use", expandUses(p.affected_use)],
              ["Listed", p.listed],
              ["Delisted", p.delisted],
              ["Why", p.comments],
              ["Status", p.status],
              ["Waterbody ID (AUID)", p.auid],
            ]) +
            "<p class='pop-note'>Removed from the 303(d) impaired " +
            "waters list in the 2024 cycle.</p>" +
            popDataLink("delisted-lakes"));
        },
      });
    },
  },
  {
    id: "water-accesses", label: "Public water accesses",
    title: "DNR public water access sites in the watershed \u2014 " +
      "trailer launches and carry-in sites",
    file: "assets/data/water-accesses.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "icon", url: "assets/boat-ramp-dnr.webp" },
    anchor: "water-accesses",
    infoUrl: "https://www.dnr.state.mn.us/water_access/index.html",
    infoName: "DNR — Public water accesses",
    build: function (gj) {
      return L.geoJSON(gj, {
        pointToLayer: function (f, latlng) {
          /* keyboard:false + no title/alt on purpose: a title/alt
             turns every marker into a focusable page control, so
             the ~80 accesses — most of them outside any given
             phone viewport, and a few a few pixels apart at the
             default zoom — read as unreachable controls. Like the
             circle markers this layer used before, the icons stay
             full tap/click targets that open the same popup; they
             just are not tab stops. */
          return L.marker(latlng, {
            icon: boatRampIcon,
            keyboard: false,
          });
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Public water access") +
            "<h3>" + esc(p.access_name || "Water access") + "</h3>" +
            kvTable([
              ["Water", p.lake_name],
              ["Launch", p.launch_type],
              ["Ramps", p.number_of_ramps],
              ["Docks", p.number_of_docks],
              ["Ramp surface", p.ramp_surface],
              ["Managed by", p.administrator],
              ["County", p.county_name],
              ["Alert", p.alerts],
            ]) + popDataLink("water-accesses"));
        },
      });
    },
  },
  {
    id: "tributaries", label: "Tributaries & streams",
    title: "Rivers, streams and connectors in the watershed (DNR Hydrography)",
    file: "assets/data/tributaries.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "line", color: "#2f6fb2" },
    anchor: "tributaries",
    infoUrl: "https://www.dnr.state.mn.us/whaf/about/gis_data_sources.html",
    infoName: "DNR — GIS Data Sources",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#2f6fb2", weight: 2, opacity: 0.8 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var name = p.kittle_name || p.label || "Unnamed stream";
          var len = (p.length_mi !== null && p.length_mi !== undefined) ?
            (p.length_mi < 0.01 ? "under 0.01 miles" :
              fmtNum(p.length_mi, 2) + " miles") : null;
          bindPop(l, popKicker("Stream") +
            "<h3>" + esc(name) + "</h3>" +
            kvTable([
              ["Type", p.strm_type_desc],
              ["This segment", len],
            ]) + popDataLink("tributaries"));
        },
      });
    },
  },
  {
    id: "impaired-streams", label: "Impaired streams (MPCA 2024)",
    title: "Stream reaches on the MPCA 2024 final impaired waters " +
      "list (303(d)) in the watershed \u2014 coloured by Integrated " +
      "Report category (5 red, 4D amber). Click one for its " +
      "category, impairment parameters and listing year",
    file: "assets/data/impaired-streams.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "line", color: "#c81e1e" },
    anchor: "impaired-streams",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/315/metadata.pdf",
    infoName: "Impaired waters 2024 metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: function (f) {
          return { color: catColor(f.properties && f.properties.cat),
            weight: 3.5, opacity: 0.95 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var rows = [
            ["Category", catLabel(p.cat, p.cat_desc)],
            ["Impairment(s)", p.imp_param],
            ["Affected use", expandUses(p.affected_u)],
          ].concat(listingYearRows(p)).concat([
            ["Reach", p.reach_desc],
            ["Length", p.length_miles ?
              fmtNum(p.length_miles, 2) + " miles" : null],
            ["County", p.county],
            ["Use class", p.use_class],
            ["Waterbody ID (AUID)", p.auid],
          ]);
          bindPop(l, popKicker("Impaired stream \u2014 MPCA 2024") +
            "<h3>" + esc(p.name || "Unnamed stream") + "</h3>" +
            kvTable(rows) +
            (p.auid === "07010102-511" ?
              "<p class='pop-note'>Kabekona River E. coli delisting " +
              "is pending in the 2026 draft list; this layer shows " +
              "the 2024 final list, where the reach is Category 5.</p>" : "") +
            "<p class='pop-note'>From the MPCA&rsquo;s 2024 final " +
            "impaired waters list (303(d)) \u2014 not the 2026 draft. " +
            "The year shown for each pollutant is the year that " +
            "impairment was listed.</p>" +
            popDataLink("impaired-streams"));
        },
      });
    },
  },
  {
    id: "assessed-streams", label: "Assessed streams (MPCA 2024)",
    title: "Every stream reach the MPCA assessed in the watershed " +
      "(2024), impaired or not \u2014 coloured by the worst (most " +
      "impaired) per-use category among the uses assessed",
    file: "assets/data/assessed-streams.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "line", color: "#15803d" },
    anchor: "assessed-streams",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/287/metadata.pdf",
    infoName: "Assessed waters 2024 metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      var fields = ["aqr_cat", "aql_cat", "aqc_cat", "wr_cat",
        "dw_cat", "lrv_cat"];
      return L.geoJSON(gj, {
        style: function (f) {
          return { color: catColor(worstCatValue(f.properties || {}, fields)),
            weight: 3, opacity: 0.9 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var worst = worstCatValue(p, fields);
          var rows = [
            ["Worst per-use category", worst ? "Category " + worst : null],
          ].concat(assessedUseRows(p, true)).concat([
            ["Reach", p.loc_desc],
            ["Length", p.water_size ?
              fmtNum(p.water_size, 2) + " miles" : null],
            ["Use class", p.use_class],
            ["Waterbody ID (AUID)", p.auid],
          ]);
          bindPop(l, popKicker("Assessed stream \u2014 MPCA 2024") +
            "<h3>" + esc(p.name || "Unnamed stream") + "</h3>" +
            kvTable(rows) +
            "<p class='pop-note'>Every assessed reach, impaired or " +
            "not. The line colour is the worst (most impaired) of " +
            "the per-use categories above.</p>" +
            popDataLink("assessed-streams"));
        },
      });
    },
  },
  {
    /* Fish tissue (FCMP) — the file's 2,111 rows are per sample
       per chemical, NOT sites: 43 station ids share coordinates,
       so the build groups rows by monitoring_station_id and draws
       ONE marker per station, its popup summarising that
       station's samples. Waterbody names stay verbatim from the
       data ("Leech (Main Basin)", not "Leech Lake"). */
    id: "fish-tissue", label: "Fish tissue \u2014 mercury, PFAS, PCBs",
    title: "MPCA Fish Contaminant Monitoring Program results, " +
      "grouped to one marker per sampling station (43 stations, " +
      "2,111 sample-chemical results, 1970\u20132025) \u2014 click a " +
      "marker for the station's species, chemicals, years and " +
      "latest mercury, PCB and PFOS results",
    file: "assets/data/fcmp-fish-tissue.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#7c2d12" },
    anchor: "fish-tissue",
    infoUrl: "https://www.health.state.mn.us/communities/environment/fish/techinfo/index.html",
    infoName: "MDH — Fish Contaminant Monitoring Program",
    build: function (gj) {
      var byStation = {};
      var order = [];
      (gj.features || []).forEach(function (f) {
        var p = f.properties || {};
        var sid = p.monitoring_station_id || "unknown";
        if (!byStation[sid]) {
          byStation[sid] = { id: sid, rows: [], feature: f };
          order.push(sid);
        }
        byStation[sid].rows.push(p);
      });
      function distinct(rows, key) {
        var seen = {}, out = [];
        rows.forEach(function (p) {
          var v = p[key];
          if (v === null || v === undefined || v === "") return;
          if (!seen[v]) { seen[v] = true; out.push(v); }
        });
        return out;
      }
      /* Latest results for one chemical at one station: the most
         recent sample year for that chemical, then per species
         the highest detected result that year (labelled as the
         highest, with the sample count). */
      function latestChem(rows, chemName) {
        var chem = rows.filter(function (p) {
          return p.chemical_name === chemName &&
            typeof p.result === "number" && p.detect_flag !== "N";
        });
        if (!chem.length) return null;
        var yr = Math.max.apply(null, chem.map(function (p) {
          return p.sample_year;
        }));
        var bySpecies = {};
        chem.forEach(function (p) {
          if (p.sample_year !== yr) return;
          var s = p.common_name || "Unknown species";
          if (!bySpecies[s]) bySpecies[s] = { max: null, n: 0, units: p.result_units };
          bySpecies[s].n += 1;
          if (bySpecies[s].max === null || p.result > bySpecies[s].max) {
            bySpecies[s].max = p.result;
          }
        });
        var parts = Object.keys(bySpecies).sort().map(function (s) {
          var b = bySpecies[s];
          return s + " \u2014 highest " + fmtNum(b.max, 3) + " " +
            (b.units || "") + " (" + b.n + " sample" +
            (b.n === 1 ? "" : "s") + ")";
        });
        return yr + ": " + parts.join("; ");
      }
      var group = L.featureGroup();
      order.forEach(function (sid) {
        var st = byStation[sid];
        var rows = st.rows;
        var coords = st.feature.geometry &&
          st.feature.geometry.coordinates;
        if (!coords) return;
        var first = rows[0];
        var years = rows.map(function (p) { return p.sample_year; })
          .filter(function (y) { return typeof y === "number"; });
        var groups = {};
        rows.forEach(function (p) {
          if (p.chemical_group) {
            groups[p.chemical_group] = (groups[p.chemical_group] || 0) + 1;
          }
        });
        var groupText = Object.keys(groups).sort().map(function (g) {
          return g + " (" + groups[g] + ")";
        }).join(", ");
        var sampleCodes = distinct(rows, "sys_sample_code").length;
        var marker = L.circleMarker([coords[1], coords[0]], {
          radius: 6, color: "#7c2d12", weight: 2,
          fillColor: "#c2410c", fillOpacity: 0.75,
        });
        bindPop(marker, popKicker("Fish tissue \u2014 MPCA FCMP") +
          "<h3>" + esc(distinct(rows, "waterbody").join("; ") ||
            "Fish sampling station") + "</h3>" +
          kvTable([
            ["Station", st.id],
            ["Location", distinct(rows, "location_description")
              .slice(0, 3).join("; ") || null],
            ["County", distinct(rows, "station_county").join(", ") || null],
            ["Results", fmtNum(rows.length) + " sample-chemical rows " +
              "from " + fmtNum(sampleCodes) + " samples"],
            ["Years sampled", years.length ?
              Math.min.apply(null, years) + "\u2013" +
              Math.max.apply(null, years) : null],
            ["Species", distinct(rows, "common_name").join(", ") || null],
            ["Chemicals by group", groupText || null],
            ["Chemicals", distinct(rows, "chemical_name").join(", ") || null],
            ["Latest mercury (Hg)", latestChem(rows, "Hg")],
            ["Latest PCBs", latestChem(rows, "PCBs")],
            ["Latest PFOS", latestChem(rows, "PFOS")],
          ]) +
          "<p class='pop-note'>One marker per station: the source " +
          "data is one row per fish sample per chemical, so a " +
          "station&rsquo;s rows are summarised here, not plotted " +
          "individually. Latest values are the highest detected " +
          "result per species in that station&rsquo;s most recent " +
          "year for that chemical (mercury and PCBs in ppm, PFAS " +
          "in ppb, wet weight).</p>" +
          popDataLink("fish-tissue"));
        group.addLayer(marker);
      });
      return group;
    },
  },
  {
    id: "water-quality", label: "Water-quality monitoring stations",
    title: "MPCA surface-water monitoring stations sampled in 2015 or later \u2014 " +
      "lake, stream, biological and discharge stations",
    file: "assets/data/water-quality-stations.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#2e7d32" },
    anchor: "water-quality",
    infoUrl: "https://operations.gis.data.mn.gov/api/publicdownload/download/296/metadata.pdf",
    infoName: "MPCA station metadata — Geospatial Commons (PDF)",
    build: function (gj) {
      var typeColor = {
        LAKE: "#1565c0", STREAM: "#2e7d32",
        BIOLOGICAL: "#6a1b9a", DISCHARGE: "#e65100",
      };
      return L.geoJSON(gj, {
        pointToLayer: function (f, latlng) {
          var c = typeColor[f.properties.station_type] || "#555555";
          return L.circleMarker(latlng, {
            radius: 5, color: c, weight: 2,
            fillColor: c, fillOpacity: 0.7,
          });
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var latest = null;
          if (p.latest_sampling_date) {
            try {
              latest = new Date(+p.latest_sampling_date)
                .toISOString().slice(0, 10);
            } catch (e) { latest = null; }
          }
          bindPop(l, popKicker("Water-quality station") +
            "<h3>" + esc(p.station_name || p.station_id || "Monitoring station") + "</h3>" +
            kvTable([
              ["Station", p.station_id],
              ["Type", p.station_type],
              ["Water", p.wu_name],
              ["Latest sampling", p.latest_sampling_year +
                (latest ? " (" + latest + ")" : "")],
              ["First sampled", p.first_sampling_year],
              ["Sampling events", p.event_count],
              ["Results", p.result_count],
              ["County", p.county_name],
            ]) +
            (p.url_text ? "<p><a href='" + esc(p.url_text) + "' " +
              "target='_blank' rel='noopener'>Open this station in " +
              "MPCA EDA (results and reports)</a></p>" : "") +
            popDataLink("water-quality"));
        },
      });
    },
  },
  {
    id: "mpca-sites", label: "MPCA sites (What's in My Neighborhood)",
    title: "MPCA What's in My Neighborhood sites in the watershed \u2014 " +
      "contaminated properties, petroleum tank leak sites, landfills, " +
      "hazardous-waste sites, permitted facilities and emergency-response " +
      "activities (813 sites, pulled Nov 21, 2026). A sites database, " +
      "not a live spill feed; listing does not imply a current threat",
    file: "assets/data/wimn-sites.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#9a3412" },
    anchor: "mpca-sites",
    infoUrl: "https://webapp.pca.state.mn.us/wimn/about",
    infoName: "MPCA What's in My Neighborhood",
    build: function (gj) {
      return L.geoJSON(gj, {
        pointToLayer: function (f, latlng) {
          return L.circleMarker(latlng, {
            radius: 5, color: "#9a3412", weight: 2,
            fillColor: "#9a3412", fillOpacity: 0.7,
          });
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          /* For multi-activity / multi-program sites the *_list
             fields carry the real activities and programs, while
             activity / program_name only say "Multiple\u2026" \u2014
             prefer the list fields (they equal the singular fields
             on single-activity sites). */
          var activity = p.activity_list || p.activity;
          var program = p.program_name_list || p.program_name;
          bindPop(l, popKicker("MPCA site") +
            "<h3>" + esc(p.name || "MPCA site") + "</h3>" +
            kvTable([
              ["Activity", activity],
              ["Program", program],
              ["County", p.county],
              ["Address", p.address],
              ["MPCA ID", p.mpca_id],
            ]) +
            (p.site_url ? "<p><a href='" + esc(p.site_url) + "' " +
              "target='_blank' rel='noopener'>Open this site in " +
              "MPCA What&rsquo;s in My Neighborhood</a></p>" : "") +
            "<p class='pop-note'>Listing in this database does not " +
            "imply a current threat \u2014 the MPCA page for the site " +
            "carries its current status.</p>" +
            popDataLink("mpca-sites"));
        },
      });
    },
  },
  {
    /* USGS surface gauges — ON by default, symbolised by
       reporting status: live-reporting (green, larger — only
       05205900 Leech Lake at Sugar Point), active-listed but
       silent (amber — 05205200 Boy River near Remer, which must
       NOT be presented as live), inactive (grey). Each popup
       links to the gauge's USGS Water Data page. */
    id: "nwis-gauges", label: "USGS surface gauges (NWIS)",
    title: "USGS NWIS lake and stream gauges in the watershed " +
      "(32 sites, pulled Nov 21, 2026), coloured by reporting " +
      "status: green is reporting live (only Leech Lake at Sugar " +
      "Point), amber is listed active but not currently " +
      "reporting, grey is inactive",
    file: "assets/data/nwis-surface-gauges.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#16a34a" },
    anchor: "nwis-gauges",
    infoUrl: "https://waterdata.usgs.gov/",
    infoName: "USGS Water Data",
    build: function (gj) {
      return L.geoJSON(gj, {
        pointToLayer: function (f, latlng) {
          var p = f.properties;
          if (p.live_reporting === "yes") {
            return L.circleMarker(latlng, {
              radius: 8, color: "#14532d", weight: 2.5,
              fillColor: "#16a34a", fillOpacity: 0.9,
            });
          }
          if (p.status === "active_listed") {
            return L.circleMarker(latlng, {
              radius: 6, color: "#d97706", weight: 2,
              fillColor: "#d97706", fillOpacity: 0.75,
            });
          }
          return L.circleMarker(latlng, {
            radius: 5, color: "#9ca3af", weight: 1.5,
            fillColor: "#9ca3af", fillOpacity: 0.55,
          });
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var rows = [
            ["Site", p.site_no],
            ["Type", nwisTypeText(p.site_tp_cd)],
            ["Status", nwisStatusText(p)],
          ];
          var liveRow = nwisLiveRow(p);
          if (liveRow) rows.push(liveRow);
          var note = "";
          if (p.live_reporting === "yes") {
            note = "<p class='pop-note'>The one gauge in the " +
              "watershed currently reporting. The reading above " +
              "is the value at pull time (Nov 21, 2026), not a " +
              "live feed \u2014 the USGS page carries current " +
              "values.</p>";
          } else if (p.status === "active_listed") {
            note = "<p class='pop-note'>Listed active by the " +
              "USGS, but it returned no instantaneous values in " +
              "the 7 days before the pull and no daily values in " +
              "the 30 days before it \u2014 not a live gauge.</p>";
          }
          bindPop(l, popKicker("USGS surface gauge") +
            "<h3>" + esc(cleanName(p.station_nm) || p.site_no) + "</h3>" +
            kvTable(rows) +
            "<p><a href='https://waterdata.usgs.gov/" +
              "monitoring-location/USGS-" + esc(p.site_no) + "/' " +
              "target='_blank' rel='noopener'>Open this gauge in " +
              "USGS Water Data</a></p>" +
            note +
            popDataLink("nwis-gauges"));
        },
      });
    },
  },
  {
    /* USGS groundwater wells — OFF by default, symbolised by
       status: active-listed (teal) vs inactive (grey). None of
       the 117 active-listed wells actually reported a value in
       the 7 days before the pull — active-listed is a listing
       status, not a live feed. */
    id: "nwis-wells", label: "USGS groundwater wells (NWIS)",
    title: "USGS NWIS groundwater wells in the watershed " +
      "(958 wells, pulled Nov 21, 2026), coloured by status: " +
      "teal is listed active, grey is inactive. Listed active " +
      "does not mean currently reporting \u2014 none of the 117 " +
      "active-listed wells returned a value in the 7 days " +
      "before the pull",
    file: "assets/data/nwis-groundwater-wells.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#0e7490" },
    anchor: "nwis-groundwater",
    infoUrl: "https://waterdata.usgs.gov/",
    infoName: "USGS Water Data",
    build: function (gj) {
      return L.geoJSON(gj, {
        pointToLayer: function (f, latlng) {
          var active = f.properties.status === "active_listed";
          return L.circleMarker(latlng, {
            radius: active ? 5 : 4,
            color: active ? "#0e7490" : "#9ca3af",
            weight: active ? 2 : 1.5,
            fillColor: active ? "#0e7490" : "#9ca3af",
            fillOpacity: active ? 0.7 : 0.5,
          });
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("USGS groundwater well") +
            "<h3>" + esc(cleanName(p.station_nm) || p.site_no) + "</h3>" +
            kvTable([
              ["Site", p.site_no],
              ["Type", nwisTypeText(p.site_tp_cd)],
              ["Status", nwisStatusText(p)],
            ]) +
            (p.nwis_url ? "<p><a href='" + esc(p.nwis_url) + "' " +
              "target='_blank' rel='noopener'>Open this well in " +
              "USGS Water Data</a></p>" : "") +
            (p.status === "active_listed" ?
              "<p class='pop-note'>Listed active by the USGS, " +
              "but none of the 117 active-listed groundwater " +
              "wells in the watershed returned a value in the 7 " +
              "days before the pull (Nov 21, 2026).</p>" : "") +
            popDataLink("nwis-groundwater"));
        },
      });
    },
  },
  {
    id: "reservation", label: "Leech Lake Reservation",
    title: "The Leech Lake Reservation boundary (BIA AIAN-LAR LAR0033) \u2014 " +
      "the federal boundary as published, not a legal survey",
    file: "assets/data/reservation.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "Leech Lake Reservation",
    swatch: { kind: "fill", color: "#6d28d9", border: "#6d28d9" },
    anchor: "reservation",
    infoUrl: "https://biamaps.geoplatform.gov/server/rest/services/DivLTR/BIA_AIAN_National_LAR/FeatureServer",
    infoName: "BIA AIAN-LAR service description",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#6d28d9", weight: 2, opacity: 0.8,
          fillColor: "#6d28d9", fillOpacity: 0.05 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Reservation") +
            "<h3>" + esc(p.name || "Leech Lake Reservation") + "</h3>" +
            "<p>" + esc(p.band || "Leech Lake Band of Ojibwe") + "</p>" +
            kvTable([
              ["Area (from the drawn boundary)",
                p.area_acres ? "about " + fmtNum(p.area_acres) + " acres" : null],
              ["Source code", p.larid],
              ["Source", p.source],
            ]) +
            "<p class='pop-note'>The federal reservation boundary as " +
            "published \u2014 not a legal survey.</p>" +
            /* Treaty timeline (Nov 21, 2026): narrative only — no
               historic treaty boundary is drawn, because no public
               vector polygon exists for the 1855, 1864 or 1867
               boundaries, and the 1855 treaty was signed in
               Washington, D.C., so there is no signing site in the
               watershed to map. */
            "<div class='pop-treaty'><h4>Treaty history</h4><ul>" +
            "<li><strong>February 22, 1855</strong> \u2014 Treaty of " +
            "Washington creates the Leech Lake, Cass Lake and Lake " +
            "Winnibigoshish reservations.</li>" +
            "<li><strong>May 7, 1864</strong> and <strong>March 19, " +
            "1867</strong> \u2014 treaties augment and consolidate " +
            "the reservations.</li>" +
            "<li><strong>October 29, 1873; November 4, 1873; " +
            "May 26, 1874</strong> \u2014 executive orders further " +
            "enlarge the Reservation.</li>" +
            "<li><strong>1934</strong> \u2014 under the Indian " +
            "Reorganization Act, the reservations merge into the " +
            "present \u201cGreater\u201d Leech Lake Reservation.</li>" +
            "</ul><p class='pop-note'>No boundary is drawn for the " +
            "historic treaties \u2014 no public vector boundary " +
            "exists for them, and any reconstruction would need " +
            "THPO and Band approval.</p></div>" +
            popDataLink("reservation"));
        },
      });
    },
  },
  {
    /* Townships — the Census county subdivisions (2020 vintage):
       41 townships, 5 unorganized territories and 9 cities carried
       as subdivisions, clipped to the watershed. The kind shown is
       the file's derived subtype field, never the raw LSADC /
       FUNCSTAT / COUSUBCC codes (see data-sources.html). OFF by
       default — startup shows only the watershed layer. Like
       parcels, the layer carries no source page of its own in the
       records, so its ⓘ points at its data-sources section. */
    id: "townships", label: "Townships",
    title: "Townships, unorganized territories and cities as Census " +
      "county subdivisions (2020) in the watershed \u2014 click one " +
      "for its name, kind, county and 2020 Census population",
    file: "assets/data/townships.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "Townships",
    swatch: { kind: "fill", color: "#90a4ae", border: "#546e7a" },
    anchor: "townships",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#546e7a", weight: 1.5, opacity: 0.9,
          dashArray: "7 4", fillColor: "#90a4ae", fillOpacity: 0.05 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var sub = p.subtype || "";
          var subLabel = sub ?
            sub.charAt(0).toUpperCase() + sub.slice(1) : "Subdivision";
          bindPop(l, popKicker(subLabel) +
            "<h3>" + esc(p.NAME || p.BASENAME || "Subdivision") + "</h3>" +
            kvTable([
              ["Type", subLabel],
              ["County", p.county_name ?
                p.county_name + " County" : null],
              ["Population (2020 Census)", fmtNum(p.POP100)],
              ["Housing units (2020 Census)", fmtNum(p.HU100)],
            ]) +
            "<p class='pop-note'>Census county subdivisions (2020), " +
            "clipped to the watershed: a subdivision on the edge " +
            "appears only as the part inside the watershed, while " +
            "its population and housing counts are for the whole " +
            "subdivision. The cities in this layer are the same " +
            "polygons as the Incorporated Places layer \u2014 a " +
            "duplication in the source geography, not an error.</p>" +
            popDataLink("townships"));
        },
      });
    },
  },
  /* ---------- Census theme (Nov 21, 2026) ----------
     All Census layers are OFF by default. Units render WHOLE
     across Beltrami, Cass and Hubbard counties — no clipping, no
     allocation to the watershed (Paul's rule); the watershed
     basin layer's mask draws over them and mutes what lies
     outside the basin. Fills are coloured by the variable chosen
     in the Census group switcher (default: the seasonal share of
     housing) — one variable recolours block groups, tracts and
     the reservation together, and the legend follows it. Every
     popup shows each ACS estimate with its margin of error,
     whichever variable is chosen. Data: ACS 2024 5-year + 2020
     PL 94-171, pulled Nov 21, 2026 (see data-sources.html,
     "Census"). The derived summer-peak population estimate from
     the theme design is deliberately NOT shown: its method is
     not yet agreed, and it must never read as a census count. */
  {
    id: "census-blockgroups", label: "Census block groups (84 areas)",
    title: "Census block groups across Beltrami, Cass and Hubbard " +
      "counties (ACS 2024 5-year), drawn WHOLE — never clipped to " +
      "the watershed — and coloured by the variable chosen in " +
      "the Census switcher (default: seasonal share of housing). " +
      "Click one for its population, housing, age and income " +
      "estimates, each with its margin of error. Block-group " +
      "income margins run ±30–50% — tracts are the reliable " +
      "view for income",
    file: "assets/data/census-blockgroups-data.geojson",
    onByDefault: false, group: "People",
    swatch: { kind: "fill", color: "#31a354", border: "#1b5e20" },
    anchor: "census-blockgroups",
    build: function (gj) {
      var styleFn = function (f) {
        return { color: "#40513f", weight: 1, opacity: 0.8,
          fillColor: censusFill(f.properties), fillOpacity: 0.55 };
      };
      this._censusStyle = styleFn;
      return L.geoJSON(gj, {
        style: styleFn,
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, censusPopupHtml(p,
            "Census block group — ACS 2024",
            (p.NAMELSAD || "Block group") + ", " +
              (p.county_name || "") + " County",
            "<p class='pop-note'>This block group is drawn whole " +
            "and every figure belongs to the whole unit — nothing " +
            "is clipped or allocated to the watershed. Where the " +
            "unit extends past the basin, the watershed layer " +
            "mutes that part on the map; the numbers do not " +
            "change.</p>") +
            popDataLink("census-blockgroups"), 380);
        },
      });
    },
  },
  {
    id: "census-tracts", label: "Census tracts (32 areas)",
    title: "Census tracts across Beltrami, Cass and Hubbard " +
      "counties (ACS 2024 5-year), drawn WHOLE — never clipped " +
      "to the watershed — and coloured by the variable chosen " +
      "in the Census switcher (default: seasonal share of " +
      "housing). Tract margins of error are smaller than block-" +
      "group ones — tracts are the reliable view for income; " +
      "click one for the full estimates with MOEs",
    file: "assets/data/census-tracts-data.geojson",
    onByDefault: false, group: "People",
    swatch: { kind: "fill", color: "#74c476", border: "#1b5e20" },
    anchor: "census-tracts",
    build: function (gj) {
      var styleFn = function (f) {
        return { color: "#40513f", weight: 1.5, opacity: 0.9,
          fillColor: censusFill(f.properties), fillOpacity: 0.45 };
      };
      this._censusStyle = styleFn;
      return L.geoJSON(gj, {
        style: styleFn,
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, censusPopupHtml(p,
            "Census tract — ACS 2024",
            (p.NAMELSAD || "Census tract") + ", " +
              (p.county_name || "") + " County",
            "<p class='pop-note'>This tract is drawn whole and " +
            "every figure belongs to the whole unit — nothing is " +
            "clipped or allocated to the watershed. Tracts are " +
            "the steadier geography: their margins of error are " +
            "smaller than the block groups\u2019.</p>") +
            popDataLink("census-tracts"), 380);
        },
      });
    },
  },
  {
    /* The reservation as ONE census unit (AIAN area 1940R): the
       hosted file joins the single ACS/PL record onto the
       viewer's BIA reservation geometry, per the theme design —
       the popup carries the acreage footnote (the ACS tabulation
       follows the Census AIAN boundary, land-only ~623k ac; the
       drawn BIA geometry measures ~824k ac). Census population
       is NOT tribal enrollment, and the popup says so. */
    id: "census-aian", label: "Leech Lake Reservation (one area)",
    title: "The Leech Lake Reservation as one census area (ACS " +
      "2024 5-year, AIAN area 1940R): population 10,983, 2020 " +
      "Census count 11,388, median household income $63,767 — " +
      "each ACS figure with its margin of error. Census " +
      "population is not tribal enrollment",
    file: "assets/data/census-aian-1940.geojson",
    onByDefault: false, group: "People",
    swatch: { kind: "fill", color: "#0d7a4a", border: "#1b5e20" },
    anchor: "census-aian",
    build: function (gj) {
      var styleFn = function (f) {
        return { color: "#1b5e20", weight: 2, opacity: 0.9,
          fillColor: censusFill(f.properties), fillOpacity: 0.45 };
      };
      this._censusStyle = styleFn;
      return L.geoJSON(gj, {
        style: styleFn,
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, censusPopupHtml(p,
            "Leech Lake Reservation — one census area (ACS 2024)",
            p.name || "Leech Lake Reservation",
            "<p class='pop-note'>The reservation tabulated as a " +
            "single American Indian Area (GEOID 1940R), not sliced " +
            "across the three counties\u2019 block groups. Census " +
            "population counts people who live here; tribal " +
            "enrollment counts Band members wherever they live — " +
            "the two numbers are different things and must not be " +
            "conflated. The ACS tabulation follows the Census " +
            "AIAN boundary (land only, about 623,000 acres); the " +
            "boundary drawn here is the BIA geometry, which " +
            "measures about 824,000 acres including lake water — " +
            "the same acreage footnote as the Reservation " +
            "layer.</p>") +
            popDataLink("census-aian"), 380);
        },
      });
    },
  },
  /* ---------- History theme (Nov 21, 2026) ----------
     All History layers are OFF by default. The files were pulled
     and verified Nov 21, 2026 (see the per-dataset sidecar
     manifests, merged into data/manifest-2026-11-20.json, and
     data-sources.html, "History"). Several layers are approximate
     pointers built from published sources; the popups and the
     data-sources sections carry the caveats, including where
     Leech Lake Band THPO review is still owed. */
  {
    id: "nrhp", label: "National Register of Historic Places",
    title: "Places in the watershed listed on the National Register " +
      "of Historic Places (NPS, pulled Nov 21, 2026) \u2014 8 listings. " +
      "Battle Point is a pointer only",
    file: "assets/data/nrhp.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#8a5a19" },
    anchor: "nrhp",
    build: function (gj) {
      return histPoints(gj, "#8a5a19", function (p) {
        var notes = "";
        if (p.thpo_required === "yes") {
          notes += "<p class='pop-note'>Pointer only \u2014 the " +
            "published general location. Anything more precise " +
            "awaits Leech Lake Band THPO approval.</p>";
        }
        if (p.note) {
          notes += "<p class='pop-note'>" + esc(p.note) + "</p>";
        }
        return popKicker("National Register of Historic Places") +
          "<h3>" + esc(p.name || "Listed place") + "</h3>" +
          kvTable([
            ["Reference number", p.refnum],
            ["Listed", p.listing_date],
            ["Address", p.address],
            ["City", p.city],
            ["County", p.county ? p.county + " County" : null],
            ["Type", p.res_type],
            ["Status", p.status],
          ]) + notes + popDataLink("nrhp");
      });
    },
  },
  {
    id: "mnhs-markers", label: "Historic markers (MNHS series)",
    title: "Historic markers at the Whipholt Roadside Parking Area " +
      "and the Cass County Museum, Walker \u2014 plaque texts shown " +
      "verbatim (4 markers, verified Nov 21, 2026)",
    file: "assets/data/mnhs-markers.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#455a64" },
    anchor: "mnhs-markers",
    build: function (gj) {
      return histPoints(gj, "#455a64", function (p) {
        var text = "";
        if (p.marker_text) {
          text = String(p.marker_text).split(/\n\s*\n/).map(
            function (para) {
              return "<p>" + esc(para) + "</p>";
            }).join("");
        }
        return popKicker("Historic marker") +
          "<h3>" + esc(p.name || "Marker") + "</h3>" +
          (p.subtitle ? "<p><em>" + esc(p.subtitle) + "</em></p>" : "") +
          text +
          kvTable([
            ["Site", p.site],
            ["Erected by", p.erected_by],
            ["Erected", p.year],
          ]) +
          (p.hmdb_url ? "<p><a href='" + esc(p.hmdb_url) + "' " +
            "target='_blank' rel='noopener'>This marker on HMdb " +
            "(Historical Marker Database)</a></p>" : "") +
          (p.notes ? "<p class='pop-note'>" + esc(p.notes) + "</p>" : "") +
          popDataLink("mnhs-markers");
      }, 380);
    },
  },
  {
    /* The label names the frozen Aug 2021 GNIS Archive on purpose:
       these are archive records and must never read as current
       GNIS. Current GNIS (Nov 2026) holds ZERO historical features
       in the watershed \u2014 verified three ways; that verified
       zero is recorded in data-sources.html, and no layer is made
       from the empty current-GNIS file. */
    id: "gnis-historic-archive",
    label: "Historic places \u2014 GNIS Archive (frozen Aug 2021)",
    title: "Historical post offices and locales from the GNIS " +
      "Archive, frozen August 2021 \u2014 archive records, NOT " +
      "current GNIS (28 places). Current GNIS holds none in the " +
      "watershed (verified zero)",
    file: "assets/data/gnis-historic-archive.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#78716c" },
    anchor: "gnis-historic-archive",
    build: function (gj) {
      return histPoints(gj, "#78716c", function (p) {
        return popKicker("Historic place \u2014 GNIS Archive") +
          "<h3>" + esc(p.name || "Historic place") + "</h3>" +
          kvTable([
            ["Feature class", p.feature_class],
            ["County", p.county ? p.county + " County" : null],
            ["GNIS feature ID", p.feature_id],
            ["Topo map", p.map_name],
            ["Source", p.source],
          ]) +
          "<p class='pop-note'>From the GNIS Archive, frozen " +
          "August 2021 \u2014 an archive record, not current GNIS. " +
          "The position is as the archive recorded it.</p>" +
          popDataLink("gnis-historic-archive");
      });
    },
  },
  {
    id: "fur-trade-posts", label: "Fur-trade posts",
    title: "Fur-trade post locations from published sources " +
      "(Nute 1930; Cass County Museum marker) \u2014 approximate " +
      "markers only, no surveyed post sites (5 posts)",
    file: "assets/data/fur-trade-posts.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#854d0e" },
    anchor: "fur-trade-posts",
    build: function (gj) {
      return histPoints(gj, "#854d0e", function (p) {
        return popKicker("Fur-trade post") +
          "<h3>" + esc(p.name || "Trading post") + "</h3>" +
          (p.former_name ? "<p>Formerly " + esc(p.former_name) +
            ".</p>" : "") +
          kvTable([
            ["Company", p.company],
            ["Date", p.date_approx],
            ["Source", p.source],
          ]) +
          (p.source_quote ? "<p><em>\u201c" + esc(p.source_quote) +
            "\u201d</em></p>" : "") +
          (p.notes ? "<p>" + esc(p.notes) + "</p>" : "") +
          "<p class='pop-note'>Approximate marker \u2014 placed on " +
          "the named feature from published sources; the post site " +
          "itself is not surveyed. Wording is source text only; " +
          "placement and wording are subject to Leech Lake Band " +
          "THPO review.</p>" +
          popDataLink("fur-trade-posts");
      }, 380);
    },
  },
  {
    id: "leech-lake-dam", label: "Leech Lake Dam",
    title: "Leech Lake Dam (Federal Dam) \u2014 construction begun " +
      "1882, in operation 1884, timber replaced with reinforced " +
      "concrete 1900\u20131903. The popup links to the live USACE gauge",
    file: "assets/data/leech-lake-dam.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#0f4c5c" },
    anchor: "leech-lake-dam",
    build: function (gj) {
      return histPoints(gj, "#0f4c5c", function (p) {
        return popKicker("Dam") +
          "<h3>" + esc(p.name || "Leech Lake Dam") +
          (p.alt_name ? " (" + esc(p.alt_name) + ")" : "") + "</h3>" +
          kvTable([
            ["Construction begun", p.construction_began],
            ["In operation", p.in_operation],
            ["Rebuilt", p.rebuilt ?
              p.rebuilt + " \u2014 timber dam replaced with " +
              "reinforced concrete" : null],
            ["Control structure", p.control_structure_length_ft ?
              p.control_structure_length_ft + " ft" : null],
            ["Operator", p.operator],
            ["Project", p.project],
            ["National Inventory of Dams", p.nid_id],
            ["Dam tender\u2019s house", p.dam_tenders_house],
            ["Location", p.town],
          ]) +
          (p.usace_gauge_url ? "<p><a href='" +
            esc(p.usace_gauge_url) + "' target='_blank' " +
            "rel='noopener'>Live gauge report \u2014 USACE station " +
            esc(p.usace_gauge_station || "MissHW_Leech") +
            "</a></p>" : "") +
          popDataLink("leech-lake-dam");
      });
    },
  },
  {
    id: "historic-settlements", label: "Historic settlements",
    title: "Historic settlements in the watershed (8), plus six " +
      "neighboring Reservation communities just outside it, " +
      "labeled as neighbors (14 places). Founding dates only " +
      "where verified",
    file: "assets/data/historic-settlements.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#4d7c0f" },
    anchor: "historic-settlements",
    build: function (gj) {
      return histPoints(gj, "#4d7c0f", function (p) {
        var neighbor = p.in_watershed === "neighbor";
        return popKicker(neighbor ?
            "Historic settlement \u2014 neighboring community" :
            "Historic settlement") +
          "<h3>" + esc(p.name || "Settlement") + "</h3>" +
          kvTable([
            ["County", p.county ? p.county + " County" : null],
            ["Founded", p.founding_date],
            ["In the watershed", neighbor ?
              "No \u2014 neighboring community, outside the " +
              "watershed boundary" : "Yes"],
          ]) +
          (p.date_note ? "<p>" + esc(p.date_note) + "</p>" : "") +
          (p.notes ? "<p class='pop-note'>" + esc(p.notes) +
            "</p>" : "") +
          sourceLinksHtml(p.source) +
          "<p class='pop-note'>Approximate point \u2014 the " +
          "community centre, not a surveyed site.</p>" +
          popDataLink("historic-settlements");
      });
    },
  },
  {
    id: "missions-agency", label: "Missions and the Leech Lake Agency",
    title: "The Boutwell mission (1833), the Leech Lake Agency " +
      "sites and the three boarding schools \u2014 approximate " +
      "pointers only; the boarding schools are community-level " +
      "pointers with no building sites mapped (7 sites)",
    file: "assets/data/missions-agency.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#7e2a3c" },
    anchor: "missions-agency",
    build: function (gj) {
      return histPoints(gj, "#7e2a3c", function (p) {
        var catLabel = {
          mission: "Mission", agency: "Leech Lake Agency",
          boarding_school: "Boarding school", community: "Community",
        }[p.category] || "Historic site";
        var notes = "";
        if (p.category === "boarding_school") {
          notes += "<p class='pop-note'>Pointer only \u2014 a " +
            "community-level location. No building site or " +
            "footprint is mapped.</p>";
        }
        if (p.name && p.name.indexOf("New Agency") !== -1) {
          notes += "<p class='pop-note'>Display placeholder: the " +
            "sources say only \u201ca peninsula about 2.5 miles " +
            "across the water from the Old Agency\u201d \u2014 the " +
            "bearing is unverified, and this placement is not a " +
            "surveyed direction.</p>";
        }
        return popKicker(catLabel) +
          "<h3>" + esc(p.name || "Site") + "</h3>" +
          kvTable([
            ["Dates", p.dates],
          ]) +
          (p.date_detail ? "<p>" + esc(p.date_detail) + "</p>" : "") +
          sourceLinksHtml(p.source) +
          notes +
          "<p class='pop-note'>Approximate pointer \u2014 no " +
          "public source pins the exact site. Wording and " +
          "placement are subject to Leech Lake Band THPO " +
          "review.</p>" +
          popDataLink("missions-agency");
      }, 380);
    },
  },
  {
    /* 1939 aerial photo centres (Nov 21, 2026): one point per
       digitised frame centre from MHAPO's photo-centre service —
       253 BXQ (Cass) + 247 BXU (Hubbard) = 500. Styled by the
       status field: the two lake frames stand out in red
       (bxu04058, status on_lake, centred on Walker Bay water;
       bxu03065, shows_lake_water, Walker Bay west shore), then
       in_watershed green, near_watershed amber, and
       outside_watershed muted grey. Each popup links out to the
       frame image itself. Only 2 of the 500 frames show lake
       water because the Cass flight's lake frames were never
       digitised — see data-sources.html#aerials-1939-centres. */
    id: "aerials-1939-centres", label: "1939 aerial photo centres",
    title: "Centres of the 500 digitised 1939 aerial photographs " +
      "(ASCS flights BXQ Cass and BXU Hubbard, MHAPO) \u2014 red: the " +
      "two frames that show lake water; green: centre inside the " +
      "watershed; amber: near it; grey: outside. Each point is a " +
      "frame centre and each frame covers about 2.8 miles " +
      "across, so a centre outside the watershed can still show " +
      "watershed ground. Click a point to open its frame image",
    file: "assets/data/aerials-1939-centres.geojson",
    onByDefault: false, group: "History",
    swatch: { kind: "pin", color: "#c81e1e" },
    anchor: "aerials-1939-centres",
    infoUrl: "https://apps.lib.umn.edu/mhapo/",
    infoName: "Minnesota Historical Aerial Photographs Online (MHAPO)",
    build: function (gj) {
      var STATUS = {
        on_lake: { color: "#c81e1e", stroke: "#ffffff", radius: 9,
          weight: 2, fillOpacity: 1,
          label: "Centre on lake water" },
        shows_lake_water: { color: "#c81e1e", stroke: "#ffffff",
          radius: 9, weight: 2, fillOpacity: 1,
          label: "Shows lake water" },
        in_watershed: { color: "#1b7a4d", stroke: "#1b7a4d",
          radius: 6, weight: 2, fillOpacity: 0.8,
          label: "Centre inside watershed" },
        near_watershed: { color: "#a16207", stroke: "#a16207",
          radius: 5, weight: 1.5, fillOpacity: 0.7,
          label: "Near watershed \u2014 frame touches the watershed" },
        outside_watershed: { color: "#9ca3af", stroke: "#6b7280",
          radius: 4, weight: 1, fillOpacity: 0.55,
          label: "Outside watershed" },
      };
      function statusOf(p) {
        return STATUS[p.status] || STATUS.outside_watershed;
      }
      return L.geoJSON(gj, {
        pointToLayer: function (f, latlng) {
          var s = statusOf(f.properties || {});
          return L.circleMarker(latlng, {
            radius: s.radius, color: s.stroke, weight: s.weight,
            fillColor: s.color, fillOpacity: s.fillOpacity,
          });
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var s = statusOf(p);
          var flightText = p.flight === "BXQ" ?
            "BXQ \u2014 Cass County flight" :
            p.flight === "BXU" ? "BXU \u2014 Hubbard County flight" :
            p.flight;
          var isLake = p.status === "on_lake" ||
            p.status === "shows_lake_water";
          bindPop(l, popKicker("1939 aerial photograph") +
            "<h3>" + esc(p.photo_id || "1939 frame") + "</h3>" +
            kvTable([
              ["Photo ID", p.photo_id],
              ["Flight", flightText],
              ["County", p.county ? p.county + " County" : null],
              ["Roll", p.roll],
              ["Frame", p.frame],
              ["Year", p.year ? String(p.year) : "1939"],
              ["Status", s.label],
            ]) +
            (isLake ? "<p class='pop-note'>One of only two " +
              "frames among the 500 that show lake water \u2014 the " +
              "Cass flight\u2019s frames over the lake were " +
              "never digitised.</p>" : "") +
            "<p class='pop-note'>Each point is a frame centre; " +
            "each frame covers about 2.8 miles across, so a " +
            "centre outside the watershed can still show " +
            "watershed ground.</p>" +
            (p.download_url ? "<p><a href='" +
              esc(p.download_url) + "' target='_blank' " +
              "rel='noopener'>Open the 1939 frame image</a></p>" :
              "") +
            popDataLink("aerials-1939-centres"));
        },
      });
    },
  },
  /* ---------- Fish & wildlife theme (Nov 21, 2026) ----------
     All layers OFF by default. Pulled Nov 21, 2026 (see the
     per-dataset sidecar manifests, merged into
     data/manifest-2026-11-20.json, and data-sources.html,
     "Fish & wildlife"). Each layer's info icon points at its
     data-sources section. */
  {
    id: "surveyed-lakes", label: "Surveyed lakes (DNR)",
    title: "Lakes the DNR has surveyed (142 lakes, pulled " +
      "Nov 21, 2026) \u2014 click one for its LakeFinder survey " +
      "report link",
    file: "assets/data/surveyed-lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#0e7c86", border: "#0e7c86" },
    anchor: "surveyed-lakes",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#0e7c86", weight: 1.2, opacity: 0.85,
          fillColor: "#0e7c86", fillOpacity: 0.22 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var name = p.pw_basin_name && p.pw_basin_name !== "Unnamed" ?
            p.pw_basin_name : "Unnamed lake";
          bindPop(l, popKicker("Surveyed lake \u2014 DNR") +
            "<h3>" + esc(name) + "</h3>" +
            kvTable([
              ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
              ["Shoreline", p.shore_mi ? fmtNum(p.shore_mi, 1) + " miles" : null],
              ["County", p.cty_name],
              ["DNR lake number", p.dowlknum],
              ["Fisheries office", p.fsh_office],
              ["Survey data", p.has_data === "Y" ?
                "Survey data available in LakeFinder" :
                "No survey data in LakeFinder"],
            ]) +
            (p.survey_url ? "<p><a href='" + esc(p.survey_url) +
              "' target='_blank' rel='noopener'>LakeFinder survey " +
              "report for this lake (DNR)</a></p>" : "") +
            "<p class='pop-note'>The DNR service carries the " +
            "link only \u2014 the survey contents (species, catch " +
            "rates) live on the LakeFinder page.</p>" +
            popDataLink("surveyed-lakes"));
        },
      });
    },
  },
  {
    /* Fish IBI \u2014 CORRECTION (Nov 21, 2026): the file's 111
       features are survey ROWS across 46 lakes (1\u20138 surveys
       each, 2005\u20132024), not 111 lakes. The build groups
       rows by DOW and draws ONE marker per lake, placed on the
       lake polygon, showing its MOST RECENT survey; the popup
       carries the survey year and links to LakeFinder for the
       full history. All 111 rows stay in the data file. Leech
       Lake itself is NOT in this service (large lakes are
       assessed under the Large Lake Program). */
    id: "fish-ibi", label: "Fish IBI \u2014 most recent survey per lake",
    title: "DNR fish Index of Biological Integrity scores: one " +
      "marker per lake (46 lakes), showing each lake's most " +
      "recent survey (the file holds all 111 survey rows, " +
      "2005\u20132024). Click a marker for the score, its year " +
      "and the LakeFinder link to the full history",
    file: "assets/data/fish-ibi-lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#1b7a4d" },
    anchor: "fish-ibi",
    build: function (gj) {
      var byDow = {}, order = [];
      (gj.features || []).forEach(function (f) {
        var p = f.properties || {};
        if (!byDow[p.dow]) {
          byDow[p.dow] = { rows: [], feature: f };
          order.push(p.dow);
        }
        byDow[p.dow].rows.push(p);
      });
      function statusColor(status) {
        if (!status) return "#555555";
        if (status.indexOf("Above") !== -1 &&
            status.indexOf("Exceptional") !== -1) return "#14532d";
        if (status.indexOf("Above") !== -1) return "#1b7a4d";
        if (status.indexOf("Tribal") !== -1) return "#5e548e";
        return "#c81e1e";
      }
      var group = L.featureGroup();
      order.forEach(function (dow) {
        var entry = byDow[dow];
        var rows = entry.rows.slice().sort(function (a, b) {
          return (b.survey_year || 0) - (a.survey_year || 0);
        });
        var latest = rows[0];
        var c = featureCentroid(entry.feature.geometry);
        if (!c) return;
        var outline = L.geoJSON(entry.feature, {
          interactive: false,
          style: { color: statusColor(latest.status), weight: 1,
            opacity: 0.7, fillColor: statusColor(latest.status),
            fillOpacity: 0.08 },
        });
        group.addLayer(outline);
        var marker = L.circleMarker(c, {
          radius: 7, color: "#ffffff", weight: 2,
          fillColor: statusColor(latest.status), fillOpacity: 0.9,
        });
        var years = rows.map(function (r) { return r.survey_year; })
          .filter(function (y) { return typeof y === "number"; });
        bindPop(marker, popKicker("Fish IBI \u2014 DNR") +
          "<h3>" + esc(latest.lake_name || "Lake") + "</h3>" +
          kvTable([
            ["Most recent survey", latest.survey_year ?
              String(latest.survey_year) : null],
            ["Fish IBI score", latest.ibi_score !== null &&
              latest.ibi_score !== undefined ?
              String(latest.ibi_score) : null],
            ["Status (most recent)", latest.status],
            ["Surveys on record", fmtNum(rows.length) +
              (years.length ? " (" + Math.min.apply(null, years) +
                "\u2013" + Math.max.apply(null, years) + ")" : "")],
            ["Lake type (IBI model)", latest.model_description],
            ["Fisheries area", latest.fisheries_area],
            ["DNR lake number", dow],
          ]) +
          (lakeFinderLink(dow) ? "<p>" + lakeFinderLink(dow) +
            " \u2014 the full survey history is on LakeFinder.</p>" : "") +
          "<p class='pop-note'>One marker per lake: this lake " +
          "has " + rows.length + " survey row" +
          (rows.length === 1 ? "" : "s") + " in the data " +
          "(2005\u20132024 across all lakes); the marker shows " +
          "the most recent. Leech Lake is not in this dataset " +
          "\u2014 large lakes are assessed under the DNR Large " +
          "Lake Program, not the small-lake fish IBI.</p>" +
          popDataLink("fish-ibi"));
        group.addLayer(marker);
      });
      return group;
    },
  },
  {
    id: "plant-ibi", label: "Plant IBI (lake plants)",
    title: "DNR lake plant IBI (Floristic Quality Index) scores " +
      "(125 lakes, pulled Nov 21, 2026) \u2014 every lake in the " +
      "watershed pull is at or above its eutrophication " +
      "threshold. Click one for its most recent FQI",
    file: "assets/data/plant-ibi-lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#5a9367", border: "#3d6b47" },
    anchor: "plant-ibi",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#3d6b47", weight: 1.2, opacity: 0.85,
          fillColor: "#5a9367", fillOpacity: 0.28 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var name = p.pw_basin_n && p.pw_basin_n !== "Unnamed" ?
            p.pw_basin_n : "Unnamed lake";
          bindPop(l, popKicker("Plant IBI \u2014 DNR") +
            "<h3>" + esc(name) + "</h3>" +
            kvTable([
              ["Most recent survey", fmtEpochDate(p.recent_survey_date)],
              ["Floristic Quality Index (recent)",
                p.recent_fqi !== null && p.recent_fqi !== undefined ?
                  fmtNum(p.recent_fqi, 1) : null],
              ["Plant taxa found (recent)",
                p.recent_taxa_richness !== null &&
                  p.recent_taxa_richness !== undefined ?
                  fmtNum(p.recent_taxa_richness) : null],
              ["Against the eutrophication threshold",
                p.fqi_threshold_status ?
                  p.fqi_threshold_status.charAt(0).toUpperCase() +
                  p.fqi_threshold_status.slice(1) : null],
              ["Surveys on record", p.number_surveys],
              ["FQI range (all surveys)",
                (p.min_fqi !== null && p.min_fqi !== undefined &&
                  p.max_fqi !== null && p.max_fqi !== undefined) ?
                  fmtNum(p.min_fqi, 1) + "\u2013" +
                  fmtNum(p.max_fqi, 1) : null],
              ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
              ["County", p.cty_name],
              ["DNR lake number", p.dowlknum],
            ]) +
            "<p class='pop-note'>The plant IBI scores a lake " +
            "from its plant community (Floristic Quality Index). " +
            "All 125 lakes in this pull are at or above their " +
            "eutrophication threshold.</p>" +
            popDataLink("plant-ibi"));
        },
      });
    },
  },
  {
    id: "lakes-bio-significance",
    label: "Lakes of biological significance",
    title: "DNR Lakes of Biological Significance (69 lakes, " +
      "pulled Nov 21, 2026), coloured by significance class: " +
      "Outstanding (58), High (4), Moderate (7). Click one for " +
      "its class and per-taxon ranks",
    file: "assets/data/lakes-biological-significance.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#14532d", border: "#14532d" },
    anchor: "lakes-biological-significance",
    build: function (gj) {
      var CLASS_COLORS = { "Outstanding": "#14532d",
        "High": "#2e7d32", "Moderate": "#7cb342" };
      return L.geoJSON(gj, {
        style: function (f) {
          var c = CLASS_COLORS[f.properties &&
            f.properties.lbs_class] || "#555555";
          return { color: c, weight: 1.2, opacity: 0.9,
            fillColor: c, fillOpacity: 0.32 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var name = p.pw_basin_name && p.pw_basin_name !== "Unnamed" ?
            p.pw_basin_name : "Unnamed lake";
          function rank(v) {
            return (v === null || v === undefined) ? null : String(v);
          }
          bindPop(l, popKicker("Lake of biological significance \u2014 DNR") +
            "<h3>" + esc(name) + "</h3>" +
            kvTable([
              ["Significance class", p.lbs_class],
              ["Plant rank", rank(p.plant_rank)],
              ["Fish rank", rank(p.fish_rank)],
              ["Herp rank", rank(p.herp_rank)],
              ["Bird rank", rank(p.bird_rank)],
              ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
              ["County", p.cty_name],
              ["DNR lake number", p.dowlknum],
            ]) +
            popDataLink("lakes-biological-significance"));
        },
      });
    },
  },
  {
    id: "wildlife-management-areas", label: "Wildlife Management Areas",
    title: "DNR Wildlife Management Areas in the watershed " +
      "(8 WMAs, pulled Nov 21, 2026) \u2014 Mud Goose is the big " +
      "one at 17,011 acres. Click one for its size and " +
      "managing office",
    file: "assets/data/wildlife-management-areas.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#c05621", border: "#7c2d12" },
    anchor: "wildlife-management-areas",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#7c2d12", weight: 1.5, opacity: 0.9,
          fillColor: "#c05621", fillOpacity: 0.28 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Wildlife Management Area \u2014 DNR") +
            "<h3>" + esc(p.name || p.unit_name || "WMA") + "</h3>" +
            kvTable([
              ["Area", p.gis_area_acres ?
                fmtNum(p.gis_area_acres, 1) + " acres" : null],
              ["Managed by", p.managing_admin_office ?
                p.managing_admin_office + " office" : null],
              ["Nearest town", p.nearest_town],
              ["Special recreation", p.special_rec_opportunities],
            ]) +
            popDataLink("wildlife-management-areas"));
        },
      });
    },
  },
  {
    id: "scientific-natural-areas", label: "Scientific & Natural Areas",
    title: "DNR Scientific and Natural Areas in the watershed: " +
      "2 SNAs in 3 boundary polygons (pulled Nov 21, 2026) " +
      "\u2014 Lester Lake and Hole in the Bog Peatland (one of " +
      "its polygons is not designated SNA land). Click one " +
      "for its designation and owner",
    file: "assets/data/scientific-natural-areas.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#9d174d", border: "#9d174d" },
    anchor: "scientific-natural-areas",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#9d174d", weight: 1.5, opacity: 0.9,
          fillColor: "#9d174d", fillOpacity: 0.28 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Scientific & Natural Area \u2014 DNR") +
            "<h3>" + esc(p.name || p.unit_name || "SNA") + "</h3>" +
            kvTable([
              ["Designation", p.designated],
              ["Area", p.gis_acres ?
                fmtNum(p.gis_acres, 1) + " acres" : null],
              ["Owner", p.own_desc],
              ["Designated", fmtEpochDate(p.date_designated)],
              ["Contact", p.point_of_contact],
            ]) +
            (p.designated === "Not Designated" ?
              "<p class='pop-note'>This polygon is inside the " +
              "SNA boundary but is not designated SNA land.</p>" : "") +
            popDataLink("scientific-natural-areas"));
        },
      });
    },
  },
  /* ---------- Land cover & forests theme (Nov 21, 2026) ----------
     All layers OFF by default; the three heaviest (NWI
     wetlands, native plant communities, hydric soils) ship in
     chunk files like the parcels and bathymetry contours, and
     are zoom-gated. The Chippewa land-unit layer is the
     forest's gross ADMINISTRATIVE unit \u2014 it is NOT
     federal ownership, and it is labelled that way everywhere
     (see the correction in its entry below). */
  {
    id: "state-forests", label: "State forests",
    title: "DNR state forest boundaries in the watershed " +
      "(8 forests, pulled Nov 21, 2026) \u2014 Bowstring is the " +
      "largest at 526,285 acres (the full forest, not just its " +
      "watershed part). Click one for its acreage",
    file: "assets/data/state-forests.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#33691e", border: "#1b3a10" },
    anchor: "state-forests",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#1b3a10", weight: 1.5, opacity: 0.85,
          fillColor: "#33691e", fillOpacity: 0.20 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("State forest \u2014 DNR") +
            "<h3>" + esc(p.name || "State forest") + "</h3>" +
            kvTable([
              ["Area (whole forest)", p.acres ?
                fmtNum(p.acres) + " acres" : null],
            ]) +
            "<p class='pop-note'>The full forest boundary; only " +
            "part of it lies inside the watershed.</p>" +
            popDataLink("state-forests"));
        },
      });
    },
  },
  {
    id: "chippewa-nf-boundary", label: "Chippewa National Forest \u2014 boundary",
    title: "The Chippewa National Forest proclaimed boundary " +
      "(USFS EDW, pulled Nov 21, 2026): 62.4% of the watershed " +
      "lies inside it, and 90.1% of the Reservation's measured " +
      "area lies within it. The full boundary is drawn, not " +
      "clipped to the watershed",
    file: "assets/data/chippewa-nf-boundary.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "line", color: "#7c2d12" },
    anchor: "chippewa-nf-boundary",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#7c2d12", weight: 2.5, opacity: 0.9,
          fillColor: "#7c2d12", fillOpacity: 0.04 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("National forest \u2014 USFS") +
            "<h3>" + esc(p.FORESTNAME || "Chippewa National Forest") +
            " \u2014 proclaimed boundary</h3>" +
            kvTable([
              ["Boundary area (GIS acres)", p.GIS_ACRES ?
                fmtNum(p.GIS_ACRES) + " acres" : null],
              ["Of the watershed", "535,256 acres of the " +
                "857,972-acre watershed (62.4%) lie inside " +
                "this boundary"],
              ["Reservation overlap", "90.1% of the " +
                "Reservation's measured area lies within " +
                "the boundary"],
            ]) +
            "<p class='pop-note'>The proclaimed (administrative) " +
            "boundary: the land inside it is a mix of federal, " +
            "state, tribal, county and private ownership. The " +
            "boundary is not an ownership map.</p>" +
            popDataLink("chippewa-nf-boundary"));
        },
      });
    },
  },
  {
    /* Chippewa NF land unit \u2014 CORRECTION (Nov 21, 2026):
       this EDW LandUnit feature is the gross administrative
       unit (~1.6M acres), near-identical to the proclaimed
       boundary. It is NOT National Forest System ownership:
       true NFS ownership (~666k acres) is the separate EDW
       SurfaceOwnership dataset, which was NOT pulled. Never
       label or describe this layer as ownership. */
    id: "chippewa-nf-land",
    label: "Chippewa NF \u2014 administrative land unit (not ownership)",
    title: "The Chippewa National Forest administrative land " +
      "unit (USFS EDW LandUnit, pulled Nov 21, 2026) \u2014 the " +
      "gross administrative unit, near-identical to the " +
      "proclaimed boundary. NOT federal ownership: the true " +
      "National Forest System ownership parcels (~666,000 " +
      "acres) are a separate dataset that was not pulled",
    file: "assets/data/chippewa-nf-land.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "line", color: "#b45309" },
    anchor: "chippewa-nf-land",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#b45309", weight: 2, opacity: 0.9,
          dashArray: "8 5", fillColor: "#b45309",
          fillOpacity: 0.03 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("National forest \u2014 USFS") +
            "<h3>" + esc(p.NFSLANDUNITNAME ||
              "Chippewa National Forest") +
            " \u2014 administrative land unit</h3>" +
            kvTable([
              ["Unit area (GIS acres)", p.GIS_ACRES ?
                fmtNum(p.GIS_ACRES) + " acres" : null],
              ["Headquarters", p.HQ_LOCATION],
            ]) +
            "<p class='pop-note'><strong>Not an ownership " +
            "map.</strong> This is the forest's gross " +
            "administrative unit \u2014 essentially the same " +
            "area as the proclaimed boundary, including state, " +
            "tribal, county and private inholdings. True " +
            "National Forest System ownership (about 666,000 " +
            "acres) is a separate USFS dataset (Surface " +
            "Ownership) that has not been pulled for this " +
            "map.</p>" +
            popDataLink("chippewa-nf-land"));
        },
      });
    },
  },
  {
    id: "counties", label: "Counties",
    title: "The three counties the watershed touches \u2014 " +
      "Beltrami, Cass and Hubbard (MnGeo, pulled Nov 21, " +
      "2026). Full county polygons are drawn, not cut to the " +
      "watershed: Beltrami and Hubbard lie mostly outside it",
    file: "assets/data/counties.geojson",
    onByDefault: false, group: "Political & administrative",
    swatch: { kind: "line", color: "#37474f" },
    anchor: "counties",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#37474f", weight: 2, opacity: 0.85,
          dashArray: "10 6", fill: false, fillOpacity: 0 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("County") +
            "<h3>" + esc(p.co_name || "County") + " County</h3>" +
            kvTable([
              ["County FIPS", p.co_fips],
            ]) +
            "<p class='pop-note'>The whole county is drawn; " +
            "only the part inside the watershed boundary " +
            "belongs to the watershed.</p>" +
            popDataLink("counties"));
        },
      });
    },
  },
  {
    id: "huc10-subwatersheds", label: "Subwatersheds (HUC10)",
    title: "The five tributary subwatersheds of the basin " +
      "(WBD HUC10, pulled Nov 21, 2026): Steamboat River " +
      "(0201), Kabekona River (0202), Woman Lake (0203), Boy " +
      "River (0204) and Leech Lake River (0206). The sixth, " +
      "0205 Leech Lake, is the separate \u201Cland draining " +
      "directly to the lake\u201D layer",
    file: "assets/data/huc10-subwatersheds.geojson",
    onByDefault: false, group: "The watershed",
    swatch: { kind: "fill", color: "#2e7d9e", border: "#2e7d9e" },
    anchor: "huc10-subwatersheds",
    build: function (gj) {
      var HUC_COLORS = { "0701010201": "#2e7d9e",
        "0701010202": "#3a9e6e", "0701010203": "#7a6ea8",
        "0701010204": "#b07a2a", "0701010206": "#4a7a3a" };
      return L.geoJSON(gj, {
        style: function (f) {
          var c = HUC_COLORS[f.properties &&
            f.properties.huc10] || "#2e7d9e";
          return { color: c, weight: 1.5, opacity: 0.85,
            fillColor: c, fillOpacity: 0.14 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Subwatershed") +
            "<h3>" + esc(p.name || "Subwatershed") + "</h3>" +
            kvTable([
              ["Subwatershed", "WBD HUC10 " + (p.huc10 || "")],
              ["Area", (p.areasqkm ? fmtNum(p.areasqkm, 2) +
                " km\u00B2" : "") +
                (p.areaacres ? " (" + fmtNum(p.areaacres) +
                  " acres)" : "") || null],
            ]) +
            "<p class='pop-note'>One of the five tributary " +
            "subwatersheds. The sixth subwatershed, 0205 " +
            "Leech Lake, drains directly to the lake and is " +
            "the separate layer in the Watershed group.</p>" +
            popDataLink("huc10-subwatersheds"));
        },
      });
    },
  },
  {
    id: "dnr-fisheries-areas", label: "DNR fisheries areas",
    title: "DNR Fisheries administrative areas covering the " +
      "watershed (4 areas, pulled Nov 21, 2026) \u2014 office " +
      "territories, not habitat boundaries. Walker Area is " +
      "the Leech Lake office. Click one for the office's " +
      "contact details",
    file: "assets/data/dnr-fisheries-areas.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "line", color: "#0e7490" },
    anchor: "dnr-fisheries-areas",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#0e7490", weight: 2, opacity: 0.85,
          dashArray: "7 4", fillColor: "#0e7490",
          fillOpacity: 0.03 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("DNR Fisheries area") +
            "<h3>" + esc(p.area_name || "Fisheries area") + "</h3>" +
            kvTable([
              ["Office", p.city],
              ["Address", p.address],
              ["Phone", p.phone],
              ["Email", p.email],
              ["Area size", p.sqmi ? fmtNum(p.sqmi) + " sq mi" : null],
            ]) +
            (p.area_web ? "<p><a href='" + esc(p.area_web) +
              "' target='_blank' rel='noopener'>This area on " +
              "the DNR website</a></p>" : "") +
            "<p class='pop-note'>An administrative area \u2014 " +
            "the territory of a DNR Fisheries office, not a " +
            "habitat boundary.</p>" +
            popDataLink("dnr-fisheries-areas"));
        },
      });
    },
  },
  {
    id: "dnr-wildlife-areas", label: "DNR wildlife areas",
    title: "DNR Wildlife administrative areas covering the " +
      "watershed (3 areas, pulled Nov 21, 2026) \u2014 office " +
      "territories, not habitat boundaries. Click one for " +
      "the office's contact details",
    file: "assets/data/dnr-wildlife-areas.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "line", color: "#854d0e" },
    anchor: "dnr-wildlife-areas",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#854d0e", weight: 2, opacity: 0.85,
          dashArray: "7 4", fillColor: "#854d0e",
          fillOpacity: 0.03 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("DNR Wildlife area") +
            "<h3>" + esc(p.area_name || "Wildlife area") + "</h3>" +
            kvTable([
              ["Office", p.city],
              ["Address", p.address],
              ["Phone", p.phone],
              ["Email", p.email],
              ["Area size", p.sqmi ? fmtNum(p.sqmi) + " sq mi" : null],
            ]) +
            "<p class='pop-note'>An administrative area \u2014 " +
            "the territory of a DNR Wildlife office, not a " +
            "habitat boundary.</p>" +
            popDataLink("dnr-wildlife-areas"));
        },
      });
    },
  },
  {
    /* Native plant communities \u2014 heavy: the source file
       is 39.2 MB unsimplified (11,182 polygons). Hosted
       delivery (Nov 21, 2026): geometry simplified
       Douglas-Peucker ~7 m (topology preserved, coordinates
       rounded to 6 decimals) to ~13.4 MB and split into four
       chunk files, features concatenated in order by
       ensureLayer \u2014 same communities, same fields.
       Zoom-gated (minZoom 12) and OFF by default, like
       parcels. Coverage is survey-based: unmapped ground
       does not mean no native-plant value. */
    id: "native-plant-communities", label: "Native plant communities",
    title: "DNR Native Plant Communities in the watershed " +
      "(11,182 polygons, pulled Nov 21, 2026) \u2014 OFF by " +
      "default, and loads only at zoom 12 or closer. Coverage " +
      "is survey-based: ground with no polygon has not " +
      "necessarily been surveyed. Coloured by ecological system",
    files: ["assets/data/native-plant-communities-1.geojson",
      "assets/data/native-plant-communities-2.geojson",
      "assets/data/native-plant-communities-3.geojson",
      "assets/data/native-plant-communities-4.geojson"],
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#4a7a3a", border: "#33691e" },
    anchor: "native-plant-communities",
    minZoom: 12,
    gateText: "native plant communities (about 13 MB, simplified for delivery)",
    build: function (gj) {
      var SYS_COLORS = { MH: "#4a7a3a", WM: "#2e8b74",
        WF: "#2f5d3a", FP: "#6b7a2a", FD: "#b07a2a",
        MR: "#8a9a3a", AP: "#7a9e9e", LK: "#4a7a9e",
        RV: "#5a8a6e", CG: "#9a8a4a" };
      return L.geoJSON(gj, {
        style: function (f) {
          var c = SYS_COLORS[f.properties &&
            f.properties.system_code] || "#5a7a4a";
          return { color: c, weight: 0.7, opacity: 0.8,
            fillColor: c, fillOpacity: 0.38 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var title = (p.npc_description || "").trim() ||
            p.class_description || "Native plant community";
          bindPop(l, popKicker("Native plant community \u2014 DNR") +
            "<h3>" + esc(title) + "</h3>" +
            kvTable([
              ["Community code", p.npc_code],
              ["Class", p.class_description],
              ["Ecological system", p.system_description],
              ["Condition rank", p.condition_rank],
              ["Biodiversity significance",
                p.biodiversity_significance_rank],
              ["Observed", p.observation_year ?
                String(p.observation_year) : null],
              ["Area", p.gis_acres ?
                fmtNum(p.gis_acres, 1) + " acres" : null],
            ]) +
            "<p class='pop-note'>Survey-based coverage: " +
            "polygons exist only where the County Biological " +
            "Survey (or DNR land-cover work) has surveyed \u2014 " +
            "unmapped ground does not mean no native-plant " +
            "value.</p>" +
            popDataLink("native-plant-communities"));
        },
      });
    },
  },
  {
    /* NWI wetlands \u2014 the heaviest layer: 71,539 polygons,
       52.9 MB as pulled (already simplified ~7 m at pull).
       Hosted delivery (Nov 21, 2026): split into 15 chunk
       files like the parcels, features concatenated in order
       by ensureLayer, geometry unchanged. Zoom-gated
       (minZoom 12) and OFF by default. NWI is not a legal or
       regulatory delineation; intended use scale 1:12,000;
       the watershed's vintage is the Central Minnesota
       project, imagery year 2014. */
    id: "nwi-wetlands", label: "Wetlands (NWI)",
    title: "National Wetlands Inventory wetlands in the " +
      "watershed (71,539 polygons, pulled Nov 21, 2026) " +
      "\u2014 OFF by default, and loads only at zoom 12 or " +
      "closer. NWI is not a legal or regulatory delineation " +
      "of wetland boundaries. Coloured by wetland type",
    files: ["assets/data/nwi-wetlands-1.geojson",
      "assets/data/nwi-wetlands-2.geojson",
      "assets/data/nwi-wetlands-3.geojson",
      "assets/data/nwi-wetlands-4.geojson",
      "assets/data/nwi-wetlands-5.geojson",
      "assets/data/nwi-wetlands-6.geojson",
      "assets/data/nwi-wetlands-7.geojson",
      "assets/data/nwi-wetlands-8.geojson",
      "assets/data/nwi-wetlands-9.geojson",
      "assets/data/nwi-wetlands-10.geojson",
      "assets/data/nwi-wetlands-11.geojson",
      "assets/data/nwi-wetlands-12.geojson",
      "assets/data/nwi-wetlands-13.geojson",
      "assets/data/nwi-wetlands-14.geojson",
      "assets/data/nwi-wetlands-15.geojson"],
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#2e8b74", border: "#1f6a58" },
    anchor: "nwi-wetlands",
    minZoom: 12,
    gateText: "NWI wetlands (about 53 MB in 15 chunks)",
    build: function (gj) {
      var TYPE_COLORS = {
        "Freshwater Forested/Shrub Wetland": "#2e7d4f",
        "Freshwater Emergent Wetland": "#57a773",
        "Freshwater Pond": "#4a90c2",
        "Lake": "#2f6ea5",
        "Riverine": "#3a7ca5",
      };
      return L.geoJSON(gj, {
        style: function (f) {
          var c = TYPE_COLORS[f.properties &&
            f.properties.WETLAND_TYPE] || "#5a8a6e";
          return { color: c, weight: 0.5, opacity: 0.7,
            fillColor: c, fillOpacity: 0.38 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Wetland \u2014 NWI") +
            "<h3>" + esc(p.WETLAND_TYPE || "Wetland") + "</h3>" +
            kvTable([
              ["Cowardin code", p.ATTRIBUTE],
              ["Area", p.ACRES ? fmtNum(p.ACRES, 2) + " acres" : null],
            ]) +
            "<p class='pop-note'>National Wetlands Inventory " +
            "(USFWS), Central Minnesota project, imagery year " +
            "2014. NWI mapping is not a legal or regulatory " +
            "delineation of wetland boundaries.</p>" +
            popDataLink("nwi-wetlands"));
        },
      });
    },
  },
  {
    /* Hydric soils \u2014 the SSURGO hydric cut ONLY (6,651
       polygons, 10.4 MB): the full SSURGO pull was deferred.
       Hosted delivery: three chunk files, features
       concatenated in order by ensureLayer. Zoom-gated
       (minZoom 11) and OFF by default. A map unit is in the
       cut when a MAJOR component is hydric. */
    id: "ssurgo-hydric-soils", label: "Hydric soils (SSURGO)",
    title: "SSURGO hydric soils in the watershed \u2014 the " +
      "hydric cut only (6,651 polygons, pulled Nov 21, 2026; " +
      "the full soils pull was deferred). OFF by default, and " +
      "loads only at zoom 11 or closer. Click one for the " +
      "soil map unit",
    files: ["assets/data/ssurgo-hydric-soils-1.geojson",
      "assets/data/ssurgo-hydric-soils-2.geojson",
      "assets/data/ssurgo-hydric-soils-3.geojson"],
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#5b7fa6", border: "#33506e" },
    anchor: "ssurgo-hydric-soils",
    minZoom: 11,
    gateText: "hydric soils (about 10 MB)",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#33506e", weight: 0.6, opacity: 0.75,
          fillColor: "#5b7fa6", fillOpacity: 0.35 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Hydric soil \u2014 SSURGO") +
            "<h3>" + esc(p.muname || "Hydric soil") + "</h3>" +
            kvTable([
              ["Map unit symbol", p.musym],
              ["Survey area", p.areaname],
              ["This polygon (clipped)", p.acres_clip ?
                fmtNum(p.acres_clip, 1) + " acres" : null],
              ["Map unit total (survey area)", p.muacres ?
                fmtNum(p.muacres) + " acres" : null],
              ["Hydric", p.hydric],
            ]) +
            "<p class='pop-note'>Hydric cut only: a map unit " +
            "is included when a major component of it is " +
            "hydric. The full SSURGO soils pull was deferred " +
            "\u2014 soils that are not hydric are not shown " +
            "anywhere on this map.</p>" +
            popDataLink("ssurgo-hydric-soils"));
        },
      });
    },
  },
  {
    /* NLCD 2021 land cover \u2014 a LIVE WMS overlay, not a
       file (MRLC GeoServer, config in
       site/data/manifest-nlcd-2026-11-21.json; verified live
       Nov 21, 2026). 30 m raster, 16-class Anderson Level
       II. Streamed from MRLC, never hosted here. OFF by
       default. Do not substitute the newer Annual NLCD
       layers for the 2021 layer.
       NO styles parameter \u2014 deliberately (Paul's bug
       report, Nov 21, 2026: ticking the layer showed
       nothing). GetCapabilities advertises the style
       "mrlc_NLCD_Land_Cover" for this layer, but a GetMap
       naming it comes back HTTP 200 with an XML
       ServiceException ("StyleNotDefined: No such style:
       mrlc_NLCD_Land_Cover") instead of an image, so every
       tile failed and the overlay never rendered. With no
       style named, the same GetMap returns the real PNG in
       the layer's default NLCD styling \u2014 verified live
       Nov 21, 2026 (256\u00D7256 PNG over Leech Lake, NLCD
       palette: open water, forest, wetland classes). */
    id: "nlcd-2021", label: "Land cover (NLCD 2021)",
    title: "National Land Cover Database 2021 land cover " +
      "(MRLC), streamed live as a WMS overlay \u2014 30 m " +
      "raster, 16 land-cover classes. An overlay, drawn over " +
      "the basemap",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#8a9a5b", border: "#5a6a3a" },
    anchor: "nlcd-2021",
    makeLayer: function () {
      return L.tileLayer.wms(
        "https://www.mrlc.gov/geoserver/mrlc_display/wms", {
          layers: "NLCD_2021_Land_Cover_L48",
          format: "image/png", transparent: true,
          version: "1.3.0", opacity: 0.85, maxZoom: 18,
          attribution: "Land cover (NLCD 2021): MRLC / USGS",
        });
    },
  },
  {
    /* Cass County Pictometry spring flights (Paul, Nov 21,
       2026 \u2014 \u201Cwire all three\u201D) \u2014 LIVE tile overlays,
       not files: the county\u2019s own tiled ArcGIS services,
       standard tile/{z}/{y}/{x} pattern, the same streaming
       pattern as the Esri World Imagery basemap. Imagery
       streams from Cass County and is never hosted here. All
       three are spring flights = LEAF-OFF (Paul\u2019s leaf
       on/off labelling rule, Nov 21, 2026 \u2014 the label says
       so) and all three cover CASS COUNTY ONLY: tiles return
       404 outside the county line, which is expected, not a
       bug (verified at Steamboat River, on the Hubbard side).
       2024 and 2020 tiles are cached to z20 (~15 cm, inferred
       from the z20 tiles \u2014 the service metadata states no
       GSD); 2017 tiles stop at ~z17 (~1.2 m/px), so that
       layer pins maxNativeZoom to 17 and Leaflet upscales
       from there instead of requesting tiles that do not
       exist. Credit: EagleView / Pictometry + Cass County.
       All OFF by default, in the order 2024, 2020, 2017.
       Survey and live verification (Nov 21, 2026):
       cass-county-aerial-layers-2026-11-21.md in the project
       workspace. */
    id: "cass-aerial-2024",
    label: "Aerial 2024 (Cass Co. Pictometry, leaf-off)",
    title: "Cass County spring 2024 flight \u2014 EagleView / " +
      "Pictometry ortho mosaic, leaf-off, streamed live from " +
      "Cass County GIS. Cass County only: tiles stop at the " +
      "county line (no tiles outside it \u2014 that is " +
      "expected, not a fault). Tiles cached to zoom 20, " +
      "about 15 cm. The only spring-2024 county flight; " +
      "MnGeo has no 2024",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#5b84ae", border: "#3d5f82" },
    anchor: "cass-aerial-2024",
    makeLayer: function () {
      return L.tileLayer(
        "https://cassweb.casscountymn.gov/arcgis/rest/services/" +
          "2024_Pictometry/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 20, maxNativeZoom: 20,
          attribution: "Aerial imagery (2024 spring, leaf-off, " +
            "Cass County only): EagleView / Pictometry, Cass County",
        });
    },
  },
  {
    id: "cass-aerial-2020",
    label: "Aerial 2020 (Cass Co. Pictometry, leaf-off)",
    title: "Cass County spring 2020 flight \u2014 EagleView / " +
      "Pictometry ortho mosaic, leaf-off, streamed live from " +
      "Cass County GIS. Cass County only: tiles stop at the " +
      "county line (no tiles outside it \u2014 that is " +
      "expected, not a fault). Tiles cached to zoom 20, " +
      "about 15 cm. Full-lake coverage \u2014 the MnGeo 2020 " +
      "flight covers only the lake\u2019s north tip",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#7d9dbd", border: "#557494" },
    anchor: "cass-aerial-2020",
    makeLayer: function () {
      return L.tileLayer(
        "https://cassweb.casscountymn.gov/arcgis/rest/services/" +
          "2020_Pictometry/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 20, maxNativeZoom: 20,
          attribution: "Aerial imagery (2020 spring, leaf-off, " +
            "Cass County only): EagleView / Pictometry, Cass County",
        });
    },
  },
  {
    id: "cass-aerial-2017",
    label: "Aerial 2017 (Cass Co. Pictometry, leaf-off)",
    title: "Cass County spring 2017 flight \u2014 EagleView / " +
      "Pictometry ortho mosaic, leaf-off, streamed live from " +
      "Cass County GIS. Cass County only: tiles stop at the " +
      "county line (no tiles outside it \u2014 that is " +
      "expected, not a fault). Tiles are cached only to " +
      "about zoom 17 (~1.2 m/px), so the layer upscales past " +
      "that. The only genuinely dated spring-2017 leaf-off " +
      "view in the set \u2014 the Wayback 2014\u20132017 tiles " +
      "at the lake are byte-identical, a likely repeat vintage",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#a3b8cc", border: "#74879c" },
    anchor: "cass-aerial-2017",
    makeLayer: function () {
      return L.tileLayer(
        "https://cassweb.casscountymn.gov/arcgis/rest/services/" +
          "2017_Pictometry/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 20, maxNativeZoom: 17,
          attribution: "Aerial imagery (2017 spring, leaf-off, " +
            "Cass County only): EagleView / Pictometry, Cass County",
        });
    },
  },
  {
    /* GLO survey plats \u2014 a LIVE overlay, not a file: the
       MnGeo cached MapServer's ArcGIS export endpoint, layer 0
       (statewide_glo_mosaic). WMS is NOT enabled on this service
       (its capabilities are "Map,Data" only; the WMSServer path
       returns the HTML services-directory page, so a WMS layer
       renders nothing \u2014 Paul's bug report, Nov 21, 2026),
       and the cached z/x/y tile URL pattern 404s because the
       service's tileInfo scheme differs. So each Leaflet tile
       is an export request: bbox in EPSG:3857 metres, png,
       transparent. The cache's native grid is EPSG:26915; the
       export reprojects on the fly. Verified live Nov 21, 2026:
       an export over Leech Lake returned the real plat mosaic
       (section grid, "LEECH LAKE" lettered across the water).
       Streamed from MnGeo, never hosted here. OFF by default.
       Source page: https://mn.gov/mngeo/gis-data-and-maps/web-map-services/historic-plat-service/ */
    id: "glo-plats", label: "GLO survey plats (1848\u20131907)",
    title: "The original General Land Office survey plats of the " +
      "watershed townships (1848\u20131907), streamed live from " +
      "MnGeo \u2014 an overlay, drawn over the basemap",
    onByDefault: false, group: "History",
    swatch: { kind: "fill", color: "#e3d5a8", border: "#a08c4f" },
    anchor: "glo-plats",
    makeLayer: function () {
      var ExportGrid = L.GridLayer.extend({
        createTile: function (coords, done) {
          var tile = document.createElement("img");
          tile.alt = "";
          var size = this.getTileSize();
          var nwPx = L.point(coords.x * size.x, coords.y * size.y);
          var sePx = L.point(nwPx.x + size.x, nwPx.y + size.y);
          var crs = this._map.options.crs;
          var nw = crs.project(this._map.unproject(nwPx, coords.z));
          var se = crs.project(this._map.unproject(sePx, coords.z));
          var bbox = [Math.min(nw.x, se.x), Math.min(nw.y, se.y),
            Math.max(nw.x, se.x), Math.max(nw.y, se.y)].join(",");
          tile.onload = function () { done(null, tile); };
          tile.onerror = function (e) { done(e, tile); };
          tile.src = "https://feat.gisdata.mn.gov/arcgis/rest/" +
            "services/MnGeo/MN_GLO_Plats_cached/MapServer/export" +
            "?bbox=" + bbox + "&bboxSR=3857&imageSR=3857" +
            "&size=" + size.x + "," + size.y +
            "&format=png&transparent=true&f=image";
          return tile;
        },
      });
      return new ExportGrid({
        opacity: 0.85, maxZoom: 18,
        attribution: "Original Public Land Survey plats: MnGeo",
      });
    },
  },
  /* ---------- Historical maps (Nov 21, 2026) ----------
     The georeferenced historical maps from the pipeline's
     status report of Nov 21, 2026, wired as tile overlays —
     every one OFF by default, in the History theme. The source
     GeoTIFFs total ~4.0 GB, so each was converted to an XYZ
     WebP tile pyramid (assets/tiles/<slug>/) at zooms matched
     to its scan resolution. RMSE figures in the titles and in
     data-sources.html are the pipeline's independent
     check-point RMSEs; for the early maps the large figures
     are the maps' OWN error, not warp failures. The 44 blocked
     items and the downloaded-but-not-warped sheets (DNR B0050
     panels, Sanborn detail sheets) are recorded in
     data-sources.html, "Historical maps — not on the map",
     and are deliberately NOT layers.
     Later on Nov 21, 2026, on Paul's review: the Paul Bunyan
     pictorial map, the DNR B0050 depth maps (master + the
     three Kabekona Bay sheets), the 1940 Census block map and
     the duplicate Walker 1990-print layer were REMOVED (bad
     georeferencing / duplicate), as were the Allen 1880
     plates, the Railroad Commissioners' c. 1886 map, Pike's
     route chart (Coues 1895), both Sanborn index maps,
     Winchell 1901, and the 1930 railroad pages 1, 2 and 4
     (the Great Northern page 3 stays), and the sheet collars of the
     three USGS topo mosaics (1968–72, 1996, 1:100,000) were
     cropped from their tiles — see the collar note in
     data-sources.html, "USGS historic topographic
     quadrangles". */
  {
    id: "marschner-vegetation",
    label: "Original vegetation (Marschner, 1929\u201331)",
    title: "Pre-settlement vegetation from Marschner's map of " +
      "the original vegetation of Minnesota, compiled 1929\u201331 " +
      "from the GLO surveyors' field notes (1848\u20131907) and " +
      "published 1974 \u2014 414 polygons, 13 classes, clipped to " +
      "the watershed. Vector data, no warp and no RMSE. The DNR " +
      "warns it is Marschner's interpretation, not definitive",
    file: "assets/data/marschner-vegetation.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#588157", border: "#386641" },
    anchor: "marschner-vegetation",
    build: function (gj) {
      var COLORS = {
        "Conifer Bogs and Swamps": "#2f5d50",
        "Lakes (open water)": "#5b8ec4",
        "Aspen-Birch (trending to Conifers)": "#6aa84f",
        "Mixed White Pine and Red Pine": "#1f6f43",
        "Jack Pine Barrens and Openings": "#b08945",
        "Wet Prairie": "#b8c256",
        "Big Woods - Hardwoods (oak, maple, basswood, hickory)":
          "#386641",
        "Mixed Hardwood and Pine (Maple, White Pine, Basswood, etc)":
          "#588157",
        "White Pine": "#7fc97f",
        "Aspen-Birch (trending to hardwoods)": "#95a83b",
        "Aspen-Oak Land": "#c98f3d",
        "Brush Prairie": "#dfc27a",
        "Undefined": "#9a9a9a",
      };
      return L.geoJSON(gj, {
        style: function (f) {
          var c = COLORS[(f.properties || {}).XCLASS] || "#cccccc";
          return { color: c, weight: 0.6, opacity: 0.85,
            fillColor: c, fillOpacity: 0.55 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties || {};
          bindPop(l, popKicker("Original vegetation \u2014 Marschner") +
            "<h3>" + esc(p.XCLASS || "Vegetation polygon") + "</h3>" +
            kvTable([
              ["Marschner class code", p.CLASS != null ?
                String(p.CLASS) : null],
              ["Acres (source figure)", p.ACRES != null ?
                fmtNum(p.ACRES) + " acres" : null],
            ]) +
            "<p class='pop-note'>Pre-settlement vegetation as " +
            "Marschner compiled it in 1929\u201331 from the original " +
            "surveyors' field notes. The DNR warns these polygons " +
            "\u201creflect Marschner's interpretations from " +
            "incomplete information and cannot be considered " +
            "accurate or definitive.\u201d</p>" +
            popDataLink("marschner-vegetation"));
        },
      });
    },
  },
  {
    id: "topo-1970s", label: "USGS topo quads \u2014 1968\u201372 editions (1:24,000)",
    title: "Every 1:24,000 USGS quadrangle covering the " +
      "watershed in its first edition (1968\u201372 surveys; 60 " +
      "quads, including Walker 1972, Federal Dam 1971 and " +
      "Benedict 1972), as one mosaic. Already-georeferenced " +
      "USGS scans \u2014 no RMSE applies. Sheet collars cropped " +
      "(Nov 21, 2026): the quads meet at their neatlines, with " +
      "a narrow see-through gap along some edges where a " +
      "neighbour's collar had covered the sheet edge in the " +
      "flattened source mosaic",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#ddd3ac", border: "#a08c4f" },
    anchor: "usgs-topo",
    makeLayer: histTiles("topo-1970s", 10, 14,
      [[46.7500, -95.0000], [47.5000, -93.7500]],
      "USGS Historical Topographic Map Collection", 0.92),
  },
  {
    id: "topo-1996", label: "USGS topo quads \u2014 1996 editions (1:24,000)",
    title: "Every 1:24,000 USGS quadrangle covering the " +
      "watershed in its 1996 edition (39 quads \u2014 23 quads " +
      "were never re-surveyed and exist only in the earlier " +
      "editions), as one mosaic. Already-georeferenced USGS " +
      "scans \u2014 no RMSE applies. Sheet collars cropped " +
      "(Nov 21, 2026): the quads meet at their neatlines, with " +
      "a narrow see-through gap along some edges where a " +
      "neighbour's collar had covered the sheet edge in the " +
      "flattened source mosaic",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#ddd3ac", border: "#a08c4f" },
    anchor: "usgs-topo",
    makeLayer: histTiles("topo-1996", 10, 14,
      [[46.8750, -94.7500], [47.5000, -93.7500]],
      "USGS Historical Topographic Map Collection", 0.92),
  },
  {
    id: "topo-100k", label: "USGS topo \u2014 1:100,000 sheets (1976\u201392)",
    title: "The 1:100,000 USGS sheets overlapping the " +
      "watershed: Cass Lake 1977, Pine River 1976 and Pokegama " +
      "Lake 1992, as one mosaic. No RMSE applies. Sheet " +
      "collars cropped (Nov 21, 2026): the sheets meet at " +
      "their neatlines, with a narrow see-through gap along " +
      "some edges where a neighbour's collar had covered the " +
      "sheet edge in the flattened source mosaic",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#ddd3ac", border: "#a08c4f" },
    anchor: "usgs-topo",
    makeLayer: histTiles("topo-100k", 9, 13,
      [[46.5000, -95.0000], [47.5000, -93.0000]],
      "USGS Historical Topographic Map Collection", 0.92),
  },
  {
    id: "topo-bemidji-1954", label: "USGS topo \u2014 Bemidji 1954 (1:250,000)",
    title: "The Bemidji 1:250,000 sheet, 1954 edition \u2014 the " +
      "canonical scan (TNM 804476) of four duplicate scans of " +
      "the same sheet. No RMSE applies",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#ddd3ac", border: "#a08c4f" },
    anchor: "usgs-topo",
    makeLayer: histTiles("topo-bemidji-1954", 8, 12,
      [[46.8020, -96.2258], [48.0703, -93.7728]],
      "USGS Historical Topographic Map Collection", 0.92),
  },
  {
    id: "topo-bemidji-1957", label: "USGS topo \u2014 Bemidji 1957 (1:250,000)",
    title: "The Bemidji 1:250,000 sheet, 1957 edition. " +
      "No RMSE applies",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#ddd3ac", border: "#a08c4f" },
    anchor: "usgs-topo",
    makeLayer: histTiles("topo-bemidji-1957", 8, 12,
      [[46.8180, -96.2619], [48.0653, -93.7439]],
      "USGS Historical Topographic Map Collection", 0.92),
  },
  {
    id: "topo-bemidji-1958", label: "USGS topo \u2014 Bemidji 1958 (1:250,000)",
    title: "The Bemidji 1:250,000 sheet, 1958 edition. " +
      "No RMSE applies",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#ddd3ac", border: "#a08c4f" },
    anchor: "usgs-topo",
    makeLayer: histTiles("topo-bemidji-1958", 8, 12,
      [[46.7993, -96.1960], [48.0664, -93.6817]],
      "USGS Historical Topographic Map Collection", 0.92),
  },
  {
    id: "schoolcraft-1832", label: "Schoolcraft expedition map, 1832",
    title: "Schoolcraft / Allen map of the 1832 expedition to " +
      "the Mississippi headwaters. Check-point RMSE 63.3 km \u2014 " +
      "that is the map's own error (Allen drew the northern " +
      "lakes 50\u201390 km too far northwest), not a warp failure. " +
      "Context, not an overlay to trust at lake scale",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#e6ddba", border: "#a08c4f" },
    anchor: "schoolcraft-1832",
    makeLayer: histTiles("schoolcraft-1832", 6, 9,
      [[44.3908, -97.3926], [48.3176, -91.2160]],
      "Schoolcraft / Allen, 1832 (via Wikimedia Commons)", 0.88),
  },
  {
    id: "owen-1852", label: "Owen geological survey map, 1852",
    title: "David Dale Owen's 1852 geological survey map of " +
      "Wisconsin, Iowa and Minnesota. Check-point RMSE " +
      "25.8 km \u2014 the map's own error at this frontier, not " +
      "a warp failure",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#e6ddba", border: "#a08c4f" },
    anchor: "owen-1852",
    makeLayer: histTiles("owen-1852", 5, 9,
      [[37.0113, -99.2500], [50.3977, -85.3551]],
      "Owen, Report of a Geological Survey, 1852 (David Rumsey Collection)", 0.88),
  },
  {
    id: "glo-1866", label: "GLO sketch of the headwaters, 1866",
    title: "General Land Office sketch of the Mississippi " +
      "headwaters, 1866. Check-point RMSE 54.7 km \u2014 the " +
      "sketch's own error, not a warp failure. Context only",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#e6ddba", border: "#a08c4f" },
    anchor: "glo-1866",
    makeLayer: histTiles("glo-1866", 5, 7,
      [[42.8761, -97.5942], [49.9085, -89.6375]],
      "General Land Office, 1866 (Internet Archive copy)", 0.88),
  },
  {
    id: "logging-fig3", label: "Logging reconstruction, 1880\u201385 (1998)",
    title: "Logging in the Leech Lake country, 1880\u201385 \u2014 " +
      "figure 3 of a modern scholarly reconstruction " +
      "(From Site to Story, 1998), NOT a contemporary map. " +
      "Check-point RMSE 95 m; town symbols are schematic",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#e2d7b8", border: "#8a6d3b" },
    anchor: "logging-reconstructions",
    makeLayer: histTiles("logging-fig3", 8, 11,
      [[45.9263, -95.1919], [47.3664, -93.5791]],
      "From Site to Story (1998), fig. 3", 0.9),
  },
  {
    id: "logging-fig4", label: "Logging reconstruction, 1889\u20131900 (1998)",
    title: "Logging in the Leech Lake country, 1889\u20131900 \u2014 " +
      "figure 4 of a modern scholarly reconstruction " +
      "(From Site to Story, 1998), NOT a contemporary map. " +
      "Check-point RMSE 99 m; town symbols are schematic",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#e2d7b8", border: "#8a6d3b" },
    anchor: "logging-reconstructions",
    makeLayer: histTiles("logging-fig4", 8, 11,
      [[45.9552, -95.1732], [47.3949, -93.5605]],
      "From Site to Story (1998), fig. 4", 0.9),
  },
  {
    id: "rr-1930-p3", label: "Railroad map 1930 \u2014 Great Northern",
    title: "Minnesota railroad map 1930 (MnDOT), page 3 \u2014 " +
      "the Great Northern page: Cass Lake, Walker, Akeley. " +
      "Check-point RMSE 1,243.5 m \u2014 statewide context only",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#e8e0cc", border: "#8a7a4f" },
    anchor: "rr-1930",
    makeLayer: histTiles("rr-1930-p3", 5, 8,
      [[41.3871, -98.6970], [50.0841, -88.5723]],
      "Minnesota railroad map, 1930 (MnDOT)", 0.88),
  },
  {
    id: "soil-cass-1997", label: "Cass County general soil map, 1997",
    title: "General soil map from the 1997 Cass County soil " +
      "survey. Check-point RMSE 1,531 m \u2014 county context; " +
      "for parcel-scale soils use the soil survey layers",
    onByDefault: false, group: "History", subgroup: "Historical maps",
    swatch: { kind: "fill", color: "#e3d3ae", border: "#96762f" },
    anchor: "soil-cass-1997",
    makeLayer: histTiles("soil-cass-1997", 7, 10,
      [[45.3821, -94.9550], [47.5704, -93.5750]],
      "Soil Survey of Cass County, Minnesota (1997)", 0.88),
  },
  /* ---------- Trails & sensitive lakeshore (Nov 21, 2026) ----------
     All five layers OFF by default. Pulled Nov 21, 2026 from
     DNR services and clipped to the WBD HUC8 07010102 polygon
     (see the per-dataset sidecar manifests, merged into
     data/manifest-2026-11-20.json, and data-sources.html,
     "Trails & sensitive lakeshore"). Designated trails only:
     OHM-only trails (207 in-watershed) and mountain-bike-only
     singletrack were NOT pulled, and loon nesting areas and
     plant beds are PDF-only — no layer exists for them. */
  {
    id: "atv-trails", label: "ATV trails",
    title: "Designated ATV trails in the watershed (DNR OHV " +
      "Trails, pulled Nov 21, 2026): 199 segments — Round River " +
      "Drive (118) and Soo Line North: Cass (81); 68.33 miles " +
      "drawn inside the watershed. Every segment is " +
      "Grant-in-Aid — there is no state-funded ATV trail in " +
      "the watershed. Click a segment for its surface, width " +
      "and ATV classes",
    file: "assets/data/atv-trails.geojson",
    onByDefault: false, group: "Trails & recreation",
    swatch: { kind: "line", color: "#b45309" },
    anchor: "atv-trails",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#b45309", weight: 3, opacity: 0.9 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("ATV trail \u2014 DNR") +
            "<h3>" + esc(p.trail_name || "ATV trail") + "</h3>" +
            kvTable([
              ["Segment", p.segment_name],
              ["Funding", p.funding_type === "GIA" ?
                "Grant-in-Aid (GIA)" : p.funding_type],
              ["Surface", p.surface_type],
              ["Width", p.trail_width],
              ["ATV Class 1", p.atv_class_1 === "X" ? "Yes" : null],
              ["ATV Class 2", p.atv_class_2 === "X" ? "Yes" : null],
              ["Also open to off-highway motorcycles",
                p.off_highway_motorcycle === "X" ? "Yes" : null],
              ["Road class", p.road_class],
              ["Segment length (full segment)",
                (p.miles !== null && p.miles !== undefined) ?
                  fmtNum(p.miles, 2) + " miles" : null],
              ["Program / project", p.program_project],
            ]) +
            (p.web_site ? "<p><a href='" + esc(p.web_site) +
              "' target='_blank' rel='noopener'>This trail on " +
              "the DNR website</a></p>" : "") +
            "<p class='pop-note'>Designated ATV trails only. " +
            "All 199 segments in the watershed are Grant-in-Aid " +
            "\u2014 there is no state-funded ATV trail here. " +
            "The length is the full segment; the line drawn is " +
            "clipped to the watershed (68.33 drawn miles in " +
            "total). OHM-only trails are not in this layer.</p>" +
            popDataLink("atv-trails"));
        },
      });
    },
  },
  {
    /* Snowmobile name collisions (Nov 21, 2026) — do NOT merge
       on name: "Cass County Trails" is TWO different systems
       (CLUB, 2.2 field mi; GIA, 356.4 field mi), told apart by
       owner type and maintained-by, and the GIA system "North
       Country Trails" (maintained by PBST) is a SNOWMOBILE
       system — it is NOT the North Country Trail. Both points
       are stated in the popups and in data-sources.html. The
       service stores each system as ONE long feature, so the
       5 features are whole systems, and the `miles` field is
       the FULL system length (1,117.80 mi summed) — only
       292.03 mi is drawn inside the watershed. */
    id: "snowmobile-trails", label: "Snowmobile trails",
    title: "Snowmobile trail systems in the watershed (DNR, " +
      "pulled Nov 21, 2026): 5 systems stored as 5 long " +
      "features — Forest Rider Trails, Cass County Trails " +
      "TWICE (two different systems: CLUB 2.2 mi and " +
      "Grant-in-Aid 356.4 mi), North Country Trails (a " +
      "snowmobile system — NOT the North Country Trail) and " +
      "Nevis Wilder Trails. 292.03 miles drawn inside the " +
      "watershed; the systems' full lengths sum to 1,117.80 " +
      "miles, mostly outside it. Click a system for its owner " +
      "type and maintainer",
    file: "assets/data/snowmobile-trails.geojson",
    onByDefault: false, group: "Trails & recreation",
    swatch: { kind: "line", color: "#2563eb" },
    anchor: "snowmobile-trails",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#2563eb", weight: 3, opacity: 0.9 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          var ownerLabel = p.owner_type === "GIA" ?
            "Grant-in-Aid (GIA)" : p.owner_type === "CLUB" ?
            "Club (CLUB)" : p.owner_type;
          var heading = p.trail_name || "Snowmobile trail";
          if (p.trail_name === "Cass County Trails" && p.owner_type) {
            heading += " \u2014 " + p.owner_type + " system";
          }
          var notes = "";
          if (p.trail_name === "North Country Trails") {
            notes += "<p class='pop-note'><strong>Snowmobile " +
              "system \u2014 not the North Country Trail.</strong> " +
              "Despite the similar name, this Grant-in-Aid " +
              "snowmobile system (maintained by PBST) is not " +
              "the North Country National Scenic Trail, the " +
              "hiking trail.</p>";
          }
          if (p.trail_name === "Cass County Trails") {
            notes += "<p class='pop-note'>Two different systems " +
              "share this name in the watershed: a CLUB system " +
              "(2.2 field miles) and a Grant-in-Aid system " +
              "(356.4 field miles). This is the " +
              esc(p.owner_type || "") + " one \u2014 owner type " +
              "and maintained-by tell them apart; they are not " +
              "merged.</p>";
          }
          bindPop(l, popKicker("Snowmobile trail \u2014 DNR") +
            "<h3>" + esc(heading) + "</h3>" +
            kvTable([
              ["Trail number", p.trail_num !== null &&
                p.trail_num !== undefined ? String(p.trail_num) : null],
              ["Owner type", ownerLabel],
              ["Maintained by", p.maint_by],
              ["Segment", p.segment_name],
              ["Stud restriction", p.stud_restr],
              ["System length (full system)",
                (p.miles !== null && p.miles !== undefined) ?
                  fmtNum(p.miles, 1) + " miles" : null],
            ]) +
            (p.pocwebsite ? "<p><a href='" + esc(p.pocwebsite) +
              "' target='_blank' rel='noopener'>Maintaining " +
              "club / organisation website</a></p>" : "") +
            "<p class='pop-note'>The length is the FULL system, " +
            "most of it outside the watershed: the five systems " +
            "sum to 1,117.80 field miles, of which 292.03 miles " +
            "are drawn inside the watershed.</p>" +
            notes +
            popDataLink("snowmobile-trails"));
        },
      });
    },
  },
  {
    id: "bike-trails", label: "Bike trails (state trails)",
    title: "State trails flagged for bike use in the watershed " +
      "(DNR State Trails, use_bike = 1, pulled Nov 21, 2026): " +
      "19 segments — Paul Bunyan State Trail (9) and Heartland " +
      "State Trail (10), all asphalt; 55.11 miles drawn inside " +
      "the watershed. Mountain-bike-only singletrack is a " +
      "different use class and is not in this layer",
    file: "assets/data/bike-trails.geojson",
    onByDefault: false, group: "Trails & recreation",
    swatch: { kind: "line", color: "#15803d" },
    anchor: "bike-trails",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#15803d", weight: 3, opacity: 0.9 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          function blank(v) {
            if (v === null || v === undefined) return null;
            var s = String(v).trim();
            return s || null;
          }
          var uses = [];
          if (p.use_hike === 1) uses.push("Hike");
          if (p.use_horse === 1) uses.push("Horse");
          if (p.use_bike === 1) uses.push("Bike");
          if (p.use_mntbik === 1) uses.push("Mountain bike");
          if (p.use_sleddo === 1) uses.push("Snowmobile");
          if (p.use_atvcl1 === 1) uses.push("ATV Class 1");
          if (p.use_atvcl2 === 1) uses.push("ATV Class 2");
          if (p.use_ohm === 1) uses.push("Off-highway motorcycle");
          if (p.use_orv === 1) uses.push("Off-road vehicle");
          bindPop(l, popKicker("State trail \u2014 bike use (DNR)") +
            "<h3>" + esc(p.trail_name || "State trail") + "</h3>" +
            kvTable([
              ["Alternate name", blank(p.alt_name)],
              ["Surface", p.surfacetyp],
              ["Width", blank(p.width)],
              ["Segment length (full segment)",
                (p.lengthmile !== null && p.lengthmile !== undefined) ?
                  fmtNum(p.lengthmile, 2) + " miles" : null],
              ["Uses flagged in the service",
                uses.length ? uses.join(", ") : null],
              ["Other comments", blank(p.other_com)],
              ["Program / project", p.prgm_prj],
            ]) +
            "<p class='pop-note'>State trails the DNR service " +
            "flags for bike use (use_bike = 1). All 19 segments " +
            "in the watershed are asphalt. The length is the " +
            "full segment; the line drawn is clipped to the " +
            "watershed (55.11 drawn miles in total). " +
            "Mountain-bike-only singletrack is a different use " +
            "class and is not in this layer.</p>" +
            popDataLink("bike-trails"));
        },
      });
    },
  },
  {
    /* Sensitive lakeshore points — DISPLAY PLAN (Nov 21, 2026):
       11,289 points must never render raw at low zoom. The
       layer is zoom-gated (minZoom 12, like parcels:
       the file is never fetched below zoom 12 and the layer
       hides again on zoom-out), drawn on a CANVAS renderer as
       small (3.5 px) circle markers — no DOM marker per point —
       and coloured by the service's own rel_score. rel_score
       is shown EXACTLY as stored and never recomputed: the
       service check's "rel_score = sum_idx / 23" does NOT hold
       (Full lakes sum_idx 0–43, Abbreviated 0–9 — different
       scales), so the `analysis` field is always shown with
       the scores. */
    id: "sensitive-lakeshore-points",
    label: "Sensitive lakeshore \u2014 analysis points",
    title: "DNR sensitive lakeshore analysis points (11,289 " +
      "points, pulled Nov 21, 2026 \u2014 4,845 of them on Leech " +
      "Lake): one point per shoreland analysis window, coloured " +
      "by the service's relative score. OFF by default, and " +
      "loads only at zoom 12 or closer \u2014 11,289 points are " +
      "never drawn at low zoom. Scores are shown exactly as " +
      "stored; Full and Abbreviated lakes score on different " +
      "scales",
    file: "assets/data/sensitive-lakeshore-points.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#c62828" },
    anchor: "sensitive-lakeshore-points",
    minZoom: 12,
    gateText: "sensitive lakeshore points (11,289 points, about 3.4 MB)",
    build: function (gj) {
      function scoreColor(v) {
        if (v === null || v === undefined || !isFinite(+v)) {
          return "#9ca3af";
        }
        v = +v;
        if (v < 0.2) return "#2e7d32";
        if (v < 0.4) return "#7cb342";
        if (v < 0.6) return "#d4a017";
        if (v < 0.8) return "#ef6c00";
        return "#c62828";
      }
      return L.geoJSON(gj, {
        renderer: L.canvas({ padding: 0.5 }),
        pointToLayer: function (f, latlng) {
          var c = scoreColor(f.properties &&
            f.properties.rel_score);
          return L.circleMarker(latlng, {
            radius: 3.5, color: c, weight: 1,
            fillColor: c, fillOpacity: 0.75,
          });
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Sensitive lakeshore \u2014 analysis point") +
            "<h3>" + esc(p.lake_name || "Lake") + "</h3>" +
            kvTable([
              ["County", p.cty_name ? p.cty_name + " County" : null],
              ["DNR lake number", p.dowlknum],
              ["Analysis", p.analysis],
              ["Sensitivity index (sum_idx, as stored)",
                (p.sum_idx !== null && p.sum_idx !== undefined) ?
                  fmtNum(p.sum_idx, 1) : null],
              ["Relative score (rel_score, as stored)",
                (p.rel_score !== null && p.rel_score !== undefined) ?
                  fmtNum(p.rel_score, 2) : null],
              ["Window area", (p.acres !== null &&
                  p.acres !== undefined) ?
                fmtNum(p.acres, 2) + " acres" : null],
              ["Shore length", (p.shore_mi !== null &&
                  p.shore_mi !== undefined) ?
                fmtNum(p.shore_mi, 2) + " miles" : null],
            ]) +
            "<p class='pop-note'>One point per shoreland " +
            "analysis window. Both scores are the DNR " +
            "service&rsquo;s own, shown exactly as stored and " +
            "never recomputed: Full lakes score sum_idx " +
            "0\u201343 and Abbreviated lakes 0\u20139 \u2014 " +
            "different scales, so compare scores only within " +
            "the same analysis type.</p>" +
            popDataLink("sensitive-lakeshore-points"));
        },
      });
    },
  },
  {
    id: "sensitive-lakeshore-polygons",
    label: "Sensitive lakeshore \u2014 highly sensitive areas",
    title: "DNR highly sensitive shoreland polygons (33 lakes, " +
      "pulled Nov 21, 2026). Leech Lake's five sensitive areas " +
      "are stored as ONE multipart polygon (13,078.86 sensitive " +
      "acres) \u2014 the five areas are named in the 2010 report, " +
      "not in this data. Click a polygon for its lake and " +
      "sensitive acreage",
    file: "assets/data/sensitive-lakeshore-polygons.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#7e57c2", border: "#4527a0" },
    anchor: "sensitive-lakeshore-polygons",
    build: function (gj) {
      return L.geoJSON(gj, {
        style: { color: "#4527a0", weight: 1.5, opacity: 0.9,
          fillColor: "#7e57c2", fillOpacity: 0.30 },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Highly sensitive shoreland \u2014 DNR") +
            "<h3>" + esc(p.lake_name || "Lake") + "</h3>" +
            kvTable([
              ["County", p.cty_name ? p.cty_name + " County" : null],
              ["DNR lake number", p.dowlknum],
              ["Analysis", p.analysis],
              ["Highly sensitive shoreland",
                (p.sens_acres !== null && p.sens_acres !== undefined) ?
                  fmtNum(p.sens_acres, 2) + " acres" : null],
              ["Lake area", (p.acres !== null &&
                  p.acres !== undefined) ?
                fmtNum(p.acres, 2) + " acres" : null],
              ["Shoreline", (p.shore_mi !== null &&
                  p.shore_mi !== undefined) ?
                fmtNum(p.shore_mi, 2) + " miles" : null],
            ]) +
            (p.lake_name === "Leech" ?
              "<p class='pop-note'>Leech Lake&rsquo;s five " +
              "sensitive areas are stored as ONE multipart " +
              "polygon (13,078.86 sensitive acres) \u2014 they " +
              "cannot be labelled Area 1\u20135 from this data; " +
              "the 2010 report (Fig. 76) is the source for the " +
              "five-area framing and names.</p>" : "") +
            "<p class='pop-note'>High-score shoreline clusters " +
            "buffered by a quarter mile, per the 2010 report " +
            "method. The sensitive acreage is the full-feature " +
            "value; polygons on the watershed edge are clipped " +
            "to the boundary, so the drawn area can be " +
            "smaller.</p>" +
            popDataLink("sensitive-lakeshore-polygons"));
        },
      });
    },
  },
  {
    /* Cass County group (Nov 21, 2026): the county GIS pull —
       44 datasets from cassweb.casscountymn.gov, clipped to
       the watershed, ALL OFF by default. The two Cass Lake
       city layers (DWSMA, wellhead) returned 0 features and
       are not wired; they are recorded in data-sources.html.
       County Zoning, the county Environmental Layers and the
       county Ownership/easement layers have no public
       endpoint and were not pulled — also recorded there. */
    id: "cass-wetlands-dnr-2018",
    label: "Wetlands \u2014 county DNR inventory 2018",
    title: "Wetlands from the Minnesota DNR inventory (2018) " +
      "as served by Cass County (54,622 polygons, pulled " +
      "Nov 21, 2026) \u2014 OFF by default, loads only at " +
      "zoom 12 or closer. A DIFFERENT vintage and source of " +
      "the same wetlands as the USFWS NWI layer above, not " +
      "an independent inventory. Coloured by wetland type",
    files: cassChunks("cass-wetlands-dnr-2018", 10),
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#2e8b74", border: "#1f6a58" },
    anchor: "cass-wetlands-dnr-2018",
    minZoom: 12,
    gateText: "county DNR 2018 wetlands (about 49 MB in 10 chunks)",
    build: function (gj) {
      var TYPE_COLORS = {
        "Freshwater Forested/Shrub Wetland": "#2e7d4f",
        "Freshwater Emergent Wetland": "#57a773",
        "Freshwater Pond": "#4a90c2",
        "Lake": "#2f6ea5",
        "Riverine": "#3a7ca5",
      };
      return L.geoJSON(gj, {
        style: function (f) {
          var c = TYPE_COLORS[f.properties &&
            f.properties.wetland_ty] || "#5a8a6e";
          return { color: c, weight: 0.5, opacity: 0.7,
            fillColor: c, fillOpacity: 0.38 };
        },
        onEachFeature: function (f, l) {
          var p = f.properties;
          bindPop(l, popKicker("Wetland \u2014 county DNR 2018") +
            "<h3>" + esc(p.wetland_ty || "Wetland") + "</h3>" +
            kvTable([
              ["Cowardin code", cassTxt(p.attribute)],
              ["Area", p.acres ? fmtNum(p.acres, 2) + " acres" : null],
              ["Landscape position (HGM)", cassTxt(p.hgm_desc)],
              ["Plant community", cassTxt(p.spcc_desc)],
            ]) +
            "<p class='pop-note'>The county-served copy of " +
            "the DNR&rsquo;s 2018 wetlands inventory. It is a " +
            "different vintage and source of the same " +
            "wetlands as the USFWS NWI layer, not an " +
            "independent inventory. NWI mapping is not a " +
            "legal or regulatory delineation.</p>" +
            popDataLink("cass-wetlands-dnr-2018"));
        },
      });
    },
  },
  {
    id: "cass-wetlands-nwi-delineations",
    label: "Wetlands \u2014 county NWI + delineations",
    title: "National Wetlands Inventory PLUS Cass County's " +
      "own wetland delineations, as served by the county " +
      "(31,958 polygons, pulled Nov 21, 2026) \u2014 OFF by " +
      "default, loads only at zoom 12 or closer. Overlaps " +
      "the USFWS NWI layer: a different source of the same " +
      "wetlands, not an independent inventory",
    files: cassChunks("cass-wetlands-nwi-delineations", 7),
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#7cb342", border: "#558b2f" },
    anchor: "cass-wetlands-nwi-delineations",
    minZoom: 12,
    gateText: "county NWI + delineations (about 35 MB in 7 chunks)",
    build: cassVec(
      { color: "#558b2f", weight: 0.5, opacity: 0.7,
        fillColor: "#7cb342", fillOpacity: 0.32 },
      "cass-wetlands-nwi-delineations",
      function (p) {
        return popKicker("Wetland \u2014 county NWI + delineations") +
          "<h3>" + esc(cassTxt(p.WETLAND) || "Wetland") + "</h3>" +
          kvTable([
            ["System", cassTxt(p.SYSTEM)],
            ["Class", cassTxt(p.CLASS1)],
            ["Water regime", cassTxt(p.WATER)],
            ["Area", p.WET_ACRES ?
              fmtNum(p.WET_ACRES, 2) + " acres" : null],
          ]) +
          "<p class='pop-note'>The NWI as the county serves " +
          "it, with the county&rsquo;s own delineation work " +
          "added &mdash; the delineations are what this layer " +
          "adds over the USFWS NWI layer. Same wetlands, " +
          "different source and vintage &mdash; not an " +
          "independent inventory.</p>";
      }),
  },
  {
    id: "cass-soils-survey",
    label: "Soil survey \u2014 full (county)",
    title: "The FULL Cass County soil survey (9,649 map-unit " +
      "polygons, about 140 map-unit codes, pulled Nov 21, " +
      "2026) \u2014 OFF by default, loads only at zoom 11 or " +
      "closer. Unlike the SSURGO hydric cut above, this is " +
      "every soil in the survey, not just the hydric ones",
    files: cassChunks("cass-soils-survey", 5),
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#a1887f", border: "#6d4c41" },
    anchor: "cass-soils-survey",
    minZoom: 11,
    gateText: "the full county soil survey (about 22 MB in 5 chunks)",
    build: cassVec(
      { color: "#6d4c41", weight: 0.5, opacity: 0.7,
        fillColor: "#a1887f", fillOpacity: 0.30 },
      "cass-soils-survey",
      function (p) {
        return popKicker("Soil \u2014 Cass County survey") +
          "<h3>" + esc(cassTxt(p.SOILS_DESC) || "Soil") + "</h3>" +
          kvTable([
            ["Map unit symbol", cassTxt(p.SOIL_SYM)],
            ["Survey page", cassTxt(p.SOILS_PG)],
            ["Map unit total", p.ACRES ?
              fmtNum(p.ACRES) + " acres" : null],
          ]) +
          "<p class='pop-note'>One polygon of the full " +
          "county soil survey. The map-unit total is for " +
          "the whole unit, not just this polygon.</p>";
      }),
  },
  {
    id: "cass-soils-hydric",
    label: "Hydric soils \u2014 county",
    title: "Hydric soils from the county-served soil survey " +
      "(4,939 polygons, pulled Nov 21, 2026) \u2014 OFF by " +
      "default, loads only at zoom 11 or closer. The SAME " +
      "source family (SSURGO-derived) as the SSURGO hydric " +
      "cut above, served by the county \u2014 a cross-check " +
      "with the county's own map-unit naming, not an " +
      "independent inventory",
    files: cassChunks("cass-soils-hydric", 2),
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#7fa8c9", border: "#274e6d" },
    anchor: "cass-soils-hydric",
    minZoom: 11,
    gateText: "county hydric soils (about 9 MB in 2 chunks)",
    build: cassVec(
      { color: "#274e6d", weight: 0.5, opacity: 0.7,
        fillColor: "#7fa8c9", fillOpacity: 0.32 },
      "cass-soils-hydric",
      function (p) {
        return popKicker("Hydric soil \u2014 county (SSURGO-derived)") +
          "<h3>" + esc(cassTxt(p.MUNAME) || "Hydric soil") + "</h3>" +
          kvTable([
            ["Map unit symbol", cassTxt(p.MUSYM)],
            ["Survey area", cassTxt(p.AREANAME)],
          ]) +
          "<p class='pop-note'>The county&rsquo;s serving of " +
          "the same SSURGO-derived hydric soils as the " +
          "SSURGO hydric cut layer &mdash; different serving " +
          "of the same source, not an independent inventory.</p>";
      }),
  },
  {
    /* DLAN land ownership — label fence (Nov 21, 2026): this
       is the DLAN basemap equivalent, NOT the county Ownership
       layer (which has no public endpoint). The OWNERSHIP
       codes are undecodable from the service — no coded-value
       domain is published — so they are shown RAW, never
       guessed. No owner names were pulled. */
    id: "cass-land-ownership-dlan",
    label: "Land ownership \u2014 DLAN (county basemap)",
    title: "Land ownership from the county's DLAN basemap " +
      "(21,833 parcels, pulled Nov 21, 2026) \u2014 OFF by " +
      "default, loads only at zoom 12 or closer. This is the " +
      "DLAN equivalent, NOT the county Ownership layer. The " +
      "ownership codes are shown exactly as stored: the " +
      "county service publishes no code table for them. No " +
      "owner names are held",
    files: cassChunks("cass-land-ownership-dlan", 4),
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Land & ownership",
    swatch: { kind: "fill", color: "#bcaaa4", border: "#795548" },
    anchor: "cass-land-ownership-dlan",
    minZoom: 12,
    gateText: "DLAN land ownership (about 18 MB in 4 chunks)",
    build: cassVec(
      { color: "#795548", weight: 0.5, opacity: 0.65,
        fillColor: "#bcaaa4", fillOpacity: 0.16 },
      "cass-land-ownership-dlan",
      function (p) {
        return popKicker("Land ownership \u2014 DLAN basemap") +
          "<h3>Parcel " + esc(cassTxt(p.APPRCL) || "") + "</h3>" +
          kvTable([
            ["Ownership code (as stored)",
              (p.OWNERSHIP === null || p.OWNERSHIP === undefined) ?
                null : String(p.OWNERSHIP)],
            ["Property class", cassTxt(p.TPCLS1)],
            ["Class detail", cassTxt(p.TPCLS2)],
            ["Legal", cassTxt(p.LEGAL)],
            ["Deeded acres", p.APDEED ?
              fmtNum(p.APDEED, 2) : null],
            ["School district", p.APSCHL ?
              String(p.APSCHL) : null],
          ]) +
          "<p class='pop-note'>The DLAN basemap&rsquo;s " +
          "ownership layer &mdash; the equivalent of, not " +
          "the same as, the county Ownership layer. The " +
          "ownership codes are shown raw: the county service " +
          "publishes no decode table for them (the code " +
          "meanings must come from the county&rsquo;s Link " +
          "viewer legend or GIS office). No owner names are " +
          "held.</p>";
      }),
  },
  cassCrvDef(2026),
  cassCrvDef(2025),
  cassCrvDef(2024),
  cassCrvDef(2023),
  cassCrvDef(2022),
  cassCrvDef(2021),
  {
    id: "cass-roads-elections",
    label: "Roads \u2014 county (Elections)",
    title: "County road centrelines from the Elections " +
      "service (3,477 segments, pulled Nov 21, 2026) \u2014 " +
      "the same road network as the DLAN major/minor pair " +
      "below, from a second county service. ROADCLASS is " +
      "unpopulated in the county data; functional-class " +
      "codes are shown as stored",
    file: "assets/data/cass-roads-elections.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Roads & addresses",
    swatch: { kind: "line", color: "#455a64" },
    anchor: "cass-roads-elections",
    build: cassVec(
      { color: "#455a64", weight: 1.4, opacity: 0.85 },
      "cass-roads-elections", cassRoadPop("Road \u2014 county (Elections)", false)),
  },
  {
    id: "cass-roads-major",
    label: "Roads \u2014 major (DLAN)",
    title: "Major roads from the county's DLAN basemap " +
      "(299 segments, pulled Nov 21, 2026). ROADCLASS is " +
      "unpopulated in the county data; functional-class " +
      "codes are shown as stored",
    file: "assets/data/cass-roads-major.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Roads & addresses",
    swatch: { kind: "line", color: "#263238" },
    anchor: "cass-roads-major",
    build: cassVec(
      { color: "#263238", weight: 2.6, opacity: 0.9 },
      "cass-roads-major", cassRoadPop("Road \u2014 major (DLAN)", true)),
  },
  {
    id: "cass-roads-minor",
    label: "Roads \u2014 minor (DLAN)",
    title: "Minor roads from the county's DLAN basemap " +
      "(3,172 segments, pulled Nov 21, 2026). ROADCLASS is " +
      "unpopulated in the county data; functional-class " +
      "codes are shown as stored",
    file: "assets/data/cass-roads-minor.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Roads & addresses",
    swatch: { kind: "line", color: "#90a4ae" },
    anchor: "cass-roads-minor",
    build: cassVec(
      { color: "#90a4ae", weight: 1.1, opacity: 0.85 },
      "cass-roads-minor", cassRoadPop("Road \u2014 minor (DLAN)", true)),
  },
  {
    id: "cass-address-points",
    label: "Address points (DLAN)",
    title: "Address points from the county's DLAN basemap " +
      "(12,753 points, pulled Nov 21, 2026) \u2014 OFF by " +
      "default, loads only at zoom 12 or closer. Each point " +
      "is a street address; no owner names are held",
    file: "assets/data/cass-address-points.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Roads & addresses",
    swatch: { kind: "pin", color: "#6a1b9a" },
    anchor: "cass-address-points",
    minZoom: 12,
    gateText: "DLAN address points (about 7 MB)",
    build: cassPts("#6a1b9a", 3.5, "cass-address-points",
      function (p) {
        return popKicker("Address point \u2014 DLAN basemap") +
          "<h3>" + esc(cassTxt(p.ADDRESS) || "Address point") + "</h3>" +
          kvTable([
            ["County", cassTxt(p.CO_NAME)],
            ["Source", cassTxt(p.SOURCE)],
          ]) +
          "<p class='pop-note'>A street-address point from " +
          "the county basemap. The address is the point&rsquo;s " +
          "own; no owner name is held.</p>";
      }),
  },
  {
    id: "cass-property-addresses",
    label: "Property addresses (Elections 911)",
    title: "Property address points from the Elections " +
      "service (13,433 points, pulled Nov 21, 2026) \u2014 " +
      "OFF by default, loads only at zoom 12 or closer. The " +
      "911 addressing base; each point's own street address, " +
      "no owner names",
    file: "assets/data/cass-property-addresses.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Roads & addresses",
    swatch: { kind: "pin", color: "#00838f" },
    anchor: "cass-property-addresses",
    minZoom: 12,
    gateText: "property address points (about 4 MB)",
    build: cassPts("#00838f", 3.5, "cass-property-addresses",
      function (p) {
        return popKicker("Property address \u2014 Elections (911)") +
          "<h3>" + esc(cassTxt(p.PHYSADDR) || "Address point") + "</h3>" +
          kvTable([
            ["Unit", cassTxt(p.UNIT)],
            ["Community", cassTxt(p.POSTCOMM)],
            ["ZIP", cassTxt(p.ZIP)],
            ["Parcel", cassTxt(p.APPRCL)],
          ]) +
          "<p class='pop-note'>A 911 property-address point. " +
          "The address is the property&rsquo;s own; no owner " +
          "name is held.</p>";
      }),
  },
  {
    id: "cass-corner-monuments-north",
    label: "Survey corners \u2014 north",
    title: "PLSS survey corner monuments, north half of the " +
      "county (3,896 in the watershed, pulled Nov 21, 2026) " +
      "\u2014 OFF by default, loads only at zoom 12 or closer. " +
      "Status codes are shown as stored",
    file: "assets/data/cass-corner-monuments-north.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Survey",
    swatch: { kind: "pin", color: "#4e342e" },
    anchor: "cass-corner-monuments-north",
    minZoom: 12,
    gateText: "survey corner monuments (about 2 MB)",
    build: cassPts("#4e342e", 3, "cass-corner-monuments-north",
      cassCornerPop),
  },
  {
    id: "cass-corner-monuments-south",
    label: "Survey corners \u2014 south",
    title: "PLSS survey corner monuments, south half of the " +
      "county \u2014 only 2 fall inside the watershed (the " +
      "north/south service split runs across the basin; " +
      "pulled Nov 21, 2026). Status codes are shown as stored",
    file: "assets/data/cass-corner-monuments-south.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Survey",
    swatch: { kind: "pin", color: "#8d6e63" },
    anchor: "cass-corner-monuments-south",
    build: cassPts("#8d6e63", 3, "cass-corner-monuments-south",
      cassCornerPop),
  },
  {
    id: "cass-watersheds-major",
    label: "Watersheds \u2014 major HUC8 (county)",
    title: "Major watersheds (HUC8) from the county service " +
      "(5 polygons, pulled Nov 21, 2026): the Leech Lake " +
      "River basin plus the four neighbouring HUC8s that " +
      "touch the clip \u2014 they are drawn whole, not clipped " +
      "to the basin",
    file: "assets/data/cass-watersheds-major.geojson",
    onByDefault: false, group: "The watershed",
    swatch: { kind: "line", color: "#1565c0" },
    anchor: "cass-watersheds-major",
    build: cassVec(
      { color: "#1565c0", weight: 2, opacity: 0.85,
        dashArray: "8 5", fillColor: "#1565c0", fillOpacity: 0.04 },
      "cass-watersheds-major",
      function (p) {
        return popKicker("Major watershed \u2014 county (HUC8)") +
          "<h3>" + esc(cassTxt(p.major_name) || "Watershed") + "</h3>" +
          kvTable([
            ["Area", p.acres ? fmtNum(p.acres) + " acres" : null],
            ["Area", p.sq_miles ? fmtNum(p.sq_miles) + " sq mi" : null],
          ]) +
          "<p class='pop-note'>One of the five HUC8 polygons " +
          "the county clip returned. Only the Leech Lake " +
          "River basin is this map&rsquo;s watershed; the " +
          "other four are its neighbours, drawn whole.</p>";
      }),
  },
  {
    id: "cass-watersheds-minor",
    label: "Watersheds \u2014 minor HUC14 (county)",
    title: "Minor watersheds (HUC14) from the county service " +
      "(112 polygons, pulled Nov 21, 2026), including minors " +
      "of the neighbouring HUC8s that touch the clip",
    file: "assets/data/cass-watersheds-minor.geojson",
    onByDefault: false, group: "The watershed",
    swatch: { kind: "fill", color: "#42a5f5", border: "#1565c0" },
    anchor: "cass-watersheds-minor",
    build: cassVec(
      { color: "#1565c0", weight: 1, opacity: 0.7,
        fillColor: "#42a5f5", fillOpacity: 0.08 },
      "cass-watersheds-minor",
      function (p) {
        return popKicker("Minor watershed \u2014 county (HUC14)") +
          "<h3>" + esc(cassTxt(p.minor_name) || "Minor watershed") + "</h3>" +
          kvTable([
            ["Major watershed", cassTxt(p.major_name)],
            ["Area", p.acres ? fmtNum(p.acres) + " acres" : null],
          ]) +
          "<p class='pop-note'>A DNR minor watershed (HUC14) " +
          "as the county serves it.</p>";
      }),
  },
  {
    /* Tullibee refuge fence (Nov 21, 2026): the refuge has
       NO polygon of its own — it is defined by its lakes
       (this layer) plus the upstream minors (next layer).
       No refuge boundary is drawn or implied. */
    id: "cass-tullibee-refuge-lakes",
    label: "Tullibee refuge lakes",
    title: "The lakes of the Tullibee (cisco) Refuge in the " +
      "watershed (11 lakes, pulled Nov 21, 2026). The refuge " +
      "itself has no polygon \u2014 it is defined by these " +
      "lakes and their upstream minor watersheds",
    file: "assets/data/cass-tullibee-refuge-lakes.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#00897b", border: "#00695c" },
    anchor: "cass-tullibee-refuge-lakes",
    build: cassVec(
      { color: "#00695c", weight: 1.2, opacity: 0.85,
        fillColor: "#00897b", fillOpacity: 0.30 },
      "cass-tullibee-refuge-lakes",
      function (p) {
        var lf = lakeFinderLink(cassTxt(p.dowlknum));
        return popKicker("Tullibee (cisco) refuge lake") +
          "<h3>" + esc(cassTxt(p.pw_basin_n) || "Lake") + "</h3>" +
          kvTable([
            ["Cisco tier", cassTxt(p.Cisco_Tier)],
            ["DNR lake number", cassTxt(p.dowlknum)],
            ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
            ["Shoreline", p.shore_mi ?
              fmtNum(p.shore_mi, 1) + " miles" : null],
          ]) +
          (lf ? "<p>" + lf + "</p>" : "") +
          "<p class='pop-note'>A refuge lake. The Tullibee " +
          "Refuge has no boundary polygon of its own \u2014 it " +
          "is defined by its lakes and the minor watersheds " +
          "upstream of them (the next layer).</p>";
      }),
  },
  {
    id: "cass-tullibee-upstream-minors",
    label: "Tullibee upstream minors",
    title: "The HUC14 minor watersheds upstream of the " +
      "Tullibee refuge lakes (37, pulled Nov 21, 2026), " +
      "carrying the county's watershed-health assessment " +
      "fields. Together with the refuge lakes they define " +
      "the refuge \u2014 there is no refuge polygon",
    file: "assets/data/cass-tullibee-upstream-minors.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#80cbc4", border: "#00897b" },
    anchor: "cass-tullibee-upstream-minors",
    build: cassVec(
      { color: "#00897b", weight: 1.2, opacity: 0.85,
        dashArray: "6 4", fillColor: "#80cbc4", fillOpacity: 0.22 },
      "cass-tullibee-upstream-minors",
      function (p) {
        return popKicker("Tullibee upstream minor watershed") +
          "<h3>" + esc(cassTxt(p.minor_name) || "Minor watershed") + "</h3>" +
          kvTable([
            ["Major watershed", cassTxt(p.major_name)],
            ["Area", p.acres ? fmtNum(p.acres) + " acres" : null],
            ["MBS biodiversity significance", cassTxt(p.MBS_Biodiv)],
            ["Phosphorus", cassTxt(p.Phosphorus)],
            ["Lake water-quality trend", cassTxt(p.Lake_WQ_tr)],
          ]) +
          "<p class='pop-note'>One of the minor watersheds " +
          "upstream of a refuge lake, with the county&rsquo;s " +
          "watershed-health assessment fields, shown as " +
          "stored. The clip is by intersection, so a minor " +
          "of a neighbouring basin that touches this one " +
          "can appear.</p>";
      }),
  },
  {
    id: "cass-ais-infested-waters",
    label: "Infested waters \u2014 county AIS",
    title: "Infested waters on the COUNTY AIS list (8 " +
      "waterbodies in the watershed, pulled Nov 21, 2026). " +
      "A different source from the DNR infested-waters layer " +
      "above (12 waterbodies) \u2014 two lists of the same " +
      "thing, not independent inventories",
    file: "assets/data/cass-ais-infested-waters.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "fill", color: "#ef5350", border: "#c62828" },
    anchor: "cass-ais-infested-waters",
    build: cassVec(
      { color: "#c62828", weight: 1.2, opacity: 0.85,
        fillColor: "#ef5350", fillOpacity: 0.28 },
      "cass-ais-infested-waters",
      function (p) {
        return popKicker("Infested water \u2014 county AIS") +
          "<h3>" + esc(cassTxt(p.waterbodyn) || "Waterbody") + "</h3>" +
          kvTable([
            ["Species", cassTxt(p.commonname)],
            ["Scientific name", cassTxt(p.scientific)],
            ["Designated", cassTxt(p.designated)],
            ["Counties", cassTxt(p.counties)],
            ["DNR lake number", cassTxt(p.dowlknum)],
          ]) +
          "<p class='pop-note'>On the county&rsquo;s AIS " +
          "infested-waters list. The DNR list (the layer in " +
          "the Water group) names 12 waterbodies here; the " +
          "two lists are different sources of the same " +
          "thing and do not always agree.</p>";
      }),
  },
  {
    id: "cass-ais-observations",
    label: "AIS observations (county)",
    title: "County AIS observations, EDDMapS-sourced (760 " +
      "in the watershed, pulled Nov 21, 2026) \u2014 mostly " +
      "terrestrial plants: reed canarygrass 591, purple " +
      "loosestrife 77, then rusty crayfish and the " +
      "mysterysnails. Reporter names were not pulled",
    file: "assets/data/cass-ais-observations.geojson",
    onByDefault: false, group: "Leech Lake",
    swatch: { kind: "pin", color: "#ad1457" },
    anchor: "cass-ais-observations",
    build: cassPts("#ad1457", 4, "cass-ais-observations",
      function (p) {
        return popKicker("AIS observation \u2014 county (EDDMapS)") +
          "<h3>" + esc(cassTxt(p.commonname) || "Observation") + "</h3>" +
          kvTable([
            ["Scientific name", cassTxt(p.scientific)],
            ["Locality", cassTxt(p.locality)],
            ["Site", cassTxt(p.sitename)],
            ["Waterbody", cassTxt(p.waterbodyn)],
            ["County", cassTxt(p.county)],
          ]) +
          "<p class='pop-note'>An invasive-species " +
          "observation reported to EDDMapS and served by " +
          "the county. Reporter, surveyor and reviewer names " +
          "were not pulled.</p>";
      }),
  },
  {
    id: "cass-culverts",
    label: "Culverts (county)",
    title: "Cass County culverts in the watershed \u2014 only " +
      "6 of the 63 countywide (pulled Nov 21, 2026). The " +
      "McKinley Township culvert sublayer was not pulled",
    file: "assets/data/cass-culverts.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Culverts & gravel pits",
    swatch: { kind: "pin", color: "#5d4037" },
    anchor: "cass-culverts",
    build: cassPts("#5d4037", 4.5, "cass-culverts",
      function (p) {
        return popKicker("Culvert \u2014 Cass County") +
          "<h3>Culvert" +
            (cassTxt(p.Point_Numb) ?
              " " + esc(String(p.Point_Numb)) : "") + "</h3>" +
          kvTable([
            ["Location", cassTxt(p.LOCATION_A)],
            ["Ownership class", cassTxt(p.OWNERSHIP)],
            ["Stream form", cassTxt(p.StrmForm)],
            ["Parcel", cassTxt(p.PARCEL_ID)],
          ]) +
          "<p class='pop-note'>A county culvert record. The " +
          "ownership field is an ownership class, not a " +
          "person; most attribute fields are unpopulated in " +
          "the county data for these six.</p>";
      }),
  },
  {
    id: "cass-gravel-pits",
    label: "Gravel pits (county)",
    title: "Gravel pit locations in the watershed (23 of " +
      "64 countywide, pulled Nov 21, 2026). Owner and " +
      "operator names and addresses were not pulled",
    file: "assets/data/cass-gravel-pits.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Culverts & gravel pits",
    swatch: { kind: "pin", color: "#8d6e63" },
    anchor: "cass-gravel-pits",
    build: cassPts("#8d6e63", 4.5, "cass-gravel-pits",
      function (p) {
        return popKicker("Gravel pit \u2014 Cass County") +
          "<h3>" + esc(cassTxt(p.Location) || "Gravel pit") + "</h3>" +
          kvTable([
            ["Status", cassTxt(p.AppStatus)],
            ["Permit", cassTxt(p.PER_NUM)],
            ["Street", cassTxt(p.Street)],
            ["City", cassTxt(p.City)],
          ]) +
          "<p class='pop-note'>A county gravel-pit location. " +
          "Owner and operator names and addresses were not " +
          "pulled; the pit name is the county&rsquo;s own " +
          "location label.</p>";
      }),
  },
  {
    id: "cass-timber-permits",
    label: "Timber permits (county)",
    title: "County timber permits in the watershed (72, " +
      "pulled Nov 21, 2026) \u2014 25 Active, 47 recorded " +
      "NA. The operator is the permittee on a public permit " +
      "record",
    file: "assets/data/cass-timber-permits.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#fb8c00", border: "#ef6c00" },
    anchor: "cass-timber-permits",
    build: cassVec(
      { color: "#ef6c00", weight: 1, opacity: 0.85,
        fillColor: "#fb8c00", fillOpacity: 0.28 },
      "cass-timber-permits",
      function (p) {
        return popKicker("Timber permit \u2014 county TSM") +
          "<h3>Timber permit" +
            (cassTxt(p.PERMITNUM) ?
              " " + esc(cassTxt(p.PERMITNUM)) : "") + "</h3>" +
          kvTable([
            ["Status", cassTxt(p.STATUS)],
            ["Operator (permittee)", cassTxt(p.Operator)],
            ["Acres", p.ACRES ? fmtNum(p.ACRES, 1) : null],
            ["Year", p.YEAR_ ? String(p.YEAR_) : null],
            ["Expires", cassTxt(p.DateExpires)],
          ]) +
          "<p class='pop-note'>A county timber permit. The " +
          "operator is the permittee &mdash; usually a " +
          "logging company &mdash; on a public permit record.</p>";
      }),
  },
  {
    id: "cass-forest-plan-2024-2029",
    label: "Forest plan 2024\u20132029 (county)",
    title: "Stands in the county Forest Plan 2024\u20132029 " +
      "(757 in the watershed, pulled Nov 21, 2026). Wired " +
      "once, from the TSM service \u2014 the Forestry " +
      "service's copy of the same plan is an exact duplicate " +
      "and was not pulled twice",
    file: "assets/data/cass-forest-plan-2024-2029.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#558b2f", border: "#33691e" },
    anchor: "cass-forest-plan-2024-2029",
    build: cassVec(
      { color: "#33691e", weight: 0.6, opacity: 0.8,
        fillColor: "#558b2f", fillOpacity: 0.25 },
      "cass-forest-plan-2024-2029",
      cassFimPop("Forest plan stand \u2014 2024\u20132029")),
  },
  {
    id: "cass-timber-sales-current",
    label: "Timber sales \u2014 current (county)",
    title: "County timber sales, current (1,121 in the " +
      "watershed, pulled Nov 21, 2026)",
    file: "assets/data/cass-timber-sales-current.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#9e9d24", border: "#827717" },
    anchor: "cass-timber-sales-current",
    build: cassVec(
      { color: "#827717", weight: 0.6, opacity: 0.8,
        fillColor: "#9e9d24", fillOpacity: 0.26 },
      "cass-timber-sales-current",
      function (p) {
        return popKicker("Timber sale \u2014 county (current)") +
          "<h3>Timber sale" +
            (cassTxt(p.PERMITNUM) ?
              " " + esc(cassTxt(p.PERMITNUM)) : "") + "</h3>" +
          kvTable([
            ["Year", p.YEAR_ ? String(p.YEAR_) : null],
            ["Acres", p.ACRES ? fmtNum(p.ACRES, 1) : null],
          ]) +
          "<p class='pop-note'>A current county timber sale " +
          "polygon.</p>";
      }),
  },
  {
    id: "cass-fim-stands-current",
    label: "Forest stands \u2014 FIM current",
    title: "County forest inventory (FIM) stands, current " +
      "(6,341 stands, pulled Nov 21, 2026) \u2014 OFF by " +
      "default, loads only at zoom 12 or closer. Cover-type " +
      "codes are the county's own, shown as stored",
    files: cassChunks("cass-fim-stands-current", 3),
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#6a9a4a", border: "#4a7a3a" },
    anchor: "cass-fim-stands-current",
    minZoom: 12,
    gateText: "FIM forest stands (about 12 MB in 3 chunks)",
    build: cassVec(
      { color: "#4a7a3a", weight: 0.5, opacity: 0.75,
        fillColor: "#6a9a4a", fillOpacity: 0.22 },
      "cass-fim-stands-current",
      cassFimPop("FIM stand \u2014 current")),
  },
  {
    id: "cass-fim-harvestable-50yrs",
    label: "FIM harvestable, over 50 yrs",
    title: "Harvestable FIM forest types over 50 years old " +
      "(1,461 stands, pulled Nov 21, 2026). Cover-type codes " +
      "are the county's own, shown as stored",
    file: "assets/data/cass-fim-harvestable-50yrs.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#8bc34a", border: "#558b2f" },
    anchor: "cass-fim-harvestable-50yrs",
    build: cassVec(
      { color: "#558b2f", weight: 0.6, opacity: 0.8,
        fillColor: "#8bc34a", fillOpacity: 0.26 },
      "cass-fim-harvestable-50yrs",
      cassFimPop("FIM stand \u2014 harvestable, over 50 yrs")),
  },
  {
    id: "cass-fim-harvestable-ash-lh-50yrs",
    label: "FIM harvestable ash / lowland hardwood, over 50 yrs",
    title: "Harvestable FIM ash and lowland-hardwood types " +
      "over 50 years old (202 stands, pulled Nov 21, 2026)",
    file: "assets/data/cass-fim-harvestable-ash-lh-50yrs.geojson",
    onByDefault: false, group: "Land & habitat",
    swatch: { kind: "fill", color: "#c0ca33", border: "#827717" },
    anchor: "cass-fim-harvestable-ash-lh-50yrs",
    build: cassVec(
      { color: "#827717", weight: 0.6, opacity: 0.8,
        fillColor: "#c0ca33", fillOpacity: 0.28 },
      "cass-fim-harvestable-ash-lh-50yrs",
      cassFimPop("FIM stand \u2014 harvestable ash / LH, over 50 yrs")),
  },
  {
    id: "cass-precincts",
    label: "Precincts",
    title: "Voting precincts in the watershed (49, pulled " +
      "Nov 21, 2026), with their school-district splits. " +
      "Polling-place street addresses were not pulled; " +
      "polling-place names are shown",
    file: "assets/data/cass-precincts.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Districts",
    swatch: { kind: "fill", color: "#b39ddb", border: "#5e35b1" },
    anchor: "cass-precincts",
    build: cassVec(
      { color: "#5e35b1", weight: 1.2, opacity: 0.85,
        dashArray: "6 4", fillColor: "#b39ddb", fillOpacity: 0.05 },
      "cass-precincts",
      function (p) {
        return popKicker("Voting precinct") +
          "<h3>" + esc(cassTxt(p.PRECNTNAME) || "Precinct") + "</h3>" +
          kvTable([
            ["Polling place", cassTxt(p.POLLING)],
            ["School district", p.SCH_DIST ?
              String(p.SCH_DIST) : null],
            ["Commissioner district", p.COMDIST ?
              String(p.COMDIST) : null],
            ["MN House", cassTxt(p.MNHOUSE)],
            ["MN Senate", cassTxt(p.MNSENATE)],
          ]) +
          "<p class='pop-note'>A voting precinct as the " +
          "county serves it (precincts are split here by " +
          "school district). The polling place is named; its " +
          "street address was not pulled.</p>";
      }),
  },
  {
    id: "cass-school-districts",
    label: "School districts (county)",
    title: "School districts touching the watershed (5 of " +
      "10 countywide, pulled Nov 21, 2026). District office " +
      "addresses and phone numbers were not pulled",
    file: "assets/data/cass-school-districts.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Districts",
    swatch: { kind: "line", color: "#283593" },
    anchor: "cass-school-districts",
    build: cassVec(
      { color: "#283593", weight: 2, opacity: 0.85,
        dashArray: "8 5", fillColor: "#283593", fillOpacity: 0.03 },
      "cass-school-districts",
      function (p) {
        return popKicker("School district") +
          "<h3>" + esc(cassTxt(p.NAME) || "School district") + "</h3>" +
          "<p class='pop-note'>A school district boundary as " +
          "the county serves it, drawn whole.</p>";
      }),
  },
  {
    id: "cass-commissioner-districts",
    label: "Commissioner districts",
    title: "County commissioner districts touching the " +
      "watershed (3 of 5, pulled Nov 21, 2026). The " +
      "commissioner named is the sitting commissioner \u2014 " +
      "a public official; contact details were not pulled",
    file: "assets/data/cass-commissioner-districts.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Districts",
    swatch: { kind: "line", color: "#00695c" },
    anchor: "cass-commissioner-districts",
    build: cassVec(
      { color: "#00695c", weight: 2, opacity: 0.85,
        dashArray: "8 5", fillColor: "#00695c", fillOpacity: 0.03 },
      "cass-commissioner-districts",
      function (p) {
        return popKicker("Commissioner district") +
          "<h3>District " + esc(cassTxt(p.COMDIST) || "") + "</h3>" +
          kvTable([
            ["Commissioner", cassTxt(p.COMMISSION)],
          ]) +
          "<p class='pop-note'>A county commissioner " +
          "district, drawn whole. The commissioner is the " +
          "sitting public official for the district.</p>";
      }),
  },
  {
    id: "cass-house-senate-districts",
    label: "MN House & Senate districts",
    title: "Minnesota House and Senate districts touching " +
      "the watershed (3 district polygons, pulled Nov 21, " +
      "2026)",
    file: "assets/data/cass-house-senate-districts.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "State",
    swatch: { kind: "line", color: "#6a1b9a" },
    anchor: "cass-house-senate-districts",
    build: cassVec(
      { color: "#6a1b9a", weight: 2, opacity: 0.85,
        dashArray: "8 5", fillColor: "#6a1b9a", fillOpacity: 0.03 },
      "cass-house-senate-districts",
      function (p) {
        return popKicker("Legislative district") +
          "<h3>House District " +
            esc(cassTxt(p.DISTRICT) || "") + "</h3>" +
          kvTable([
            ["MN Senate district", cassTxt(p.SENATE)],
            ["US Congress district", cassTxt(p.CONG)],
          ]) +
          "<p class='pop-note'>A state legislative district " +
          "as the county serves it, drawn whole.</p>";
      }),
  },
  {
    id: "cass-walker-zoning",
    label: "Walker zoning (city, Jan 2026)",
    title: "City of Walker zoning, January 2026 (154 " +
      "parcels, pulled Nov 21, 2026). This is the CITY's " +
      "zoning \u2014 the county Zoning Classification layer " +
      "has no public endpoint and is not on this map",
    file: "assets/data/cass-walker-zoning.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "City — Walker",
    swatch: { kind: "fill", color: "#ba68c8", border: "#8e24aa" },
    anchor: "cass-walker-zoning",
    build: cassVec(
      { color: "#8e24aa", weight: 0.8, opacity: 0.85,
        fillColor: "#ba68c8", fillOpacity: 0.25 },
      "cass-walker-zoning",
      function (p) {
        return popKicker("Zoning \u2014 City of Walker (Jan 2026)") +
          "<h3>" + esc(cassTxt(p.Zone_Name) || "Zone") + "</h3>" +
          kvTable([
            ["Zone code", cassTxt(p.Zone_ID)],
            ["Area", p.ACRES ? fmtNum(p.ACRES, 2) + " acres" : null],
          ]) +
          "<p class='pop-note'>City of Walker zoning, " +
          "January 2026 &mdash; not the county zoning " +
          "classification, which the county does not publish " +
          "as a service.</p>";
      }),
  },
  {
    id: "cass-walker-shoreland-district",
    label: "Walker shoreland district",
    title: "City of Walker shoreland district (1 polygon, " +
      "pulled Nov 21, 2026). The layer carries no attributes " +
      "beyond an ID \u2014 the district is the geometry",
    file: "assets/data/cass-walker-shoreland-district.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "City — Walker",
    swatch: { kind: "fill", color: "#4dd0e1", border: "#00acc1" },
    anchor: "cass-walker-shoreland-district",
    build: cassVec(
      { color: "#00acc1", weight: 1.5, opacity: 0.9,
        fillColor: "#4dd0e1", fillOpacity: 0.22 },
      "cass-walker-shoreland-district",
      function (p) {
        return popKicker("Shoreland district \u2014 City of Walker") +
          "<h3>Walker shoreland district</h3>" +
          "<p class='pop-note'>The city&rsquo;s shoreland " +
          "district. The county layer carries no attributes " +
          "beyond an ID &mdash; the district is the geometry.</p>";
      }),
  },
  {
    id: "cass-walker-city-boundary",
    label: "Walker city boundary",
    title: "The City of Walker boundary (pulled Nov 21, 2026)",
    file: "assets/data/cass-walker-city-boundary.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "City — Walker",
    swatch: { kind: "line", color: "#37474f" },
    anchor: "cass-walker-city-boundary",
    build: cassVec(
      { color: "#37474f", weight: 2.5, opacity: 0.9,
        dashArray: "10 6", fill: false, fillOpacity: 0 },
      "cass-walker-city-boundary",
      function (p) {
        return popKicker("City boundary") +
          "<h3>" + esc(cassTxt(p.MUNI_NAME) || "Walker") + "</h3>" +
          kvTable([
            ["Area", p.ACRES ? fmtNum(p.ACRES) + " acres" : null],
          ]) +
          "<p class='pop-note'>The City of Walker boundary " +
          "as the county serves it.</p>";
      }),
  },
  {
    id: "cass-walker-wellhead-protection",
    label: "Walker wellhead protection",
    title: "City of Walker wellhead protection areas (2, " +
      "pulled Nov 21, 2026) \u2014 the MDH water-management " +
      "areas around the city's wells",
    file: "assets/data/cass-walker-wellhead-protection.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "City — Walker",
    swatch: { kind: "fill", color: "#26a69a", border: "#00838f" },
    anchor: "cass-walker-wellhead-protection",
    build: cassVec(
      { color: "#00838f", weight: 1.2, opacity: 0.85,
        fillColor: "#26a69a", fillOpacity: 0.28 },
      "cass-walker-wellhead-protection",
      function (p) {
        return popKicker("Wellhead protection \u2014 Walker") +
          "<h3>" + esc(cassTxt(p.whp_name) || "Wellhead protection area") + "</h3>" +
          kvTable([
            ["Type code (as stored)", cassTxt(p.whp_type_c)],
            ["Time of travel", p.tot ? fmtNum(p.tot) + " yrs" : null],
            ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
          ]) +
          "<p class='pop-note'>A wellhead protection area " +
          "for the City of Walker&rsquo;s drinking-water " +
          "wells (MDH water management, served by the county).</p>";
      }),
  },
  {
    id: "cass-walker-dwsma",
    label: "Walker DWSMA",
    title: "City of Walker Drinking Water Supply Management " +
      "Areas (2, pulled Nov 21, 2026)",
    file: "assets/data/cass-walker-dwsma.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "City — Walker",
    swatch: { kind: "fill", color: "#26a69a", border: "#00695c" },
    anchor: "cass-walker-dwsma",
    build: cassVec(
      { color: "#00695c", weight: 1.2, opacity: 0.85,
        dashArray: "6 4", fillColor: "#26a69a", fillOpacity: 0.16 },
      "cass-walker-dwsma",
      function (p) {
        return popKicker("DWSMA \u2014 Walker") +
          "<h3>Drinking Water Supply Management Area</h3>" +
          kvTable([
            ["Vulnerability", cassTxt(p.dws_vul)],
            ["Type code (as stored)", cassTxt(p.dv_type_c)],
            ["Area", p.acres ? fmtNum(p.acres, 1) + " acres" : null],
          ]) +
          "<p class='pop-note'>The surface area that " +
          "contributes water to Walker&rsquo;s wells within " +
          "a 10-year time of travel (MDH, served by the county).</p>";
      }),
  },
  {
    id: "cass-hackensack-utility-service-area",
    label: "Hackensack utility service area",
    title: "City of Hackensack utility service areas (5 " +
      "polygons, pulled Nov 21, 2026), including the two " +
      "labelled Birch Lake Township",
    file: "assets/data/cass-hackensack-utility-service-area.geojson",
    onByDefault: false, group: "Political & administrative", subgroup: "County — Cass · Municipal",
    swatch: { kind: "fill", color: "#a1887f", border: "#5d4037" },
    anchor: "cass-hackensack-utility-service-area",
    build: cassVec(
      { color: "#5d4037", weight: 1.2, opacity: 0.85,
        fillColor: "#a1887f", fillOpacity: 0.20 },
      "cass-hackensack-utility-service-area",
      function (p) {
        return popKicker("Utility service area \u2014 Hackensack") +
          "<h3>" + esc(cassTxt(p.TYPE) || "Utility service area") + "</h3>" +
          "<p class='pop-note'>A utility service area as the " +
          "county serves it under the City of Hackensack " +
          "service group.</p>";
      }),
  },
];
function layerById(id) {
  for (var i = 0; i < LAYERS.length; i++) {
    if (LAYERS[i].id === id) return LAYERS[i];
  }
  return null;
}

/* ---------- lazy loading + zoom gate ---------- */
/* Zoom-gated layers (each carries its own minZoom): their files
   are never fetched below the gate zoom, and a loaded gated layer
   is hidden again if the map zooms back out. Other layers have no
   gate. (The Parcels layer that first used this gate was removed
   from the public copy on Nov 21, 2026; it survives in the main
   viewer, from which it can be restored.) */
function gateOpen(def) {
  return !def.minZoom || map.getZoom() >= def.minZoom;
}
function applyGate(def) {
  if (!def.box) return;
  if (!def.box.checked) {
    if (def.layer) map.removeLayer(def.layer);
    if (def.gateNote) def.gateNote.textContent = "";
    return;
  }
  if (!gateOpen(def)) {
    if (def.layer) map.removeLayer(def.layer);
    if (def.gateNote) {
      def.gateNote.textContent = "Loads at zoom " + def.minZoom +
        " or closer \u2014 zoom in to see " +
        (def.gateText || "this layer") + ".";
    }
    return;
  }
  if (def.gateNote) def.gateNote.textContent = "";
  ensureLayer(def, true);
}
function ensureLayer(def, announce) {
  if (def.layer) {
    def.layer.addTo(map);
    assertDrawOrder();
    return;
  }
  if (def.loading) return;
  /* Live-service layers (the GLO survey plats overlay) build
     their Leaflet layer directly from the provider's service —
     there is no file to fetch. */
  if (def.makeLayer) {
    def.layer = def.makeLayer();
    if (def.box && def.box.checked && gateOpen(def)) {
      def.layer.addTo(map);
      assertDrawOrder();
    }
    if (def.errEl) def.errEl.hidden = true;
    return;
  }
  def.loading = true;
  if (announce) setStatus("Loading " + def.label + "\u2026");
  /* A layer normally has one file; a layer with "files" (the
     chunked layers) fetches each chunk and concatenates the
     features, in order, into one FeatureCollection. */
  var urls = def.files || [def.file];
  Promise.all(urls.map(function (u) {
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }))
    .then(function (parts) {
      var gj = parts[0];
      if (parts.length > 1) {
        gj = { type: "FeatureCollection", features: [] };
        parts.forEach(function (p) {
          gj.features = gj.features.concat(p.features);
        });
      }
      return gj;
    })
    .then(function (gj) {
      def.layer = def.build(gj);
      if (def.box && def.box.checked && gateOpen(def)) {
        def.layer.addTo(map);
        assertDrawOrder();
      }
      def.loading = false;
      if (def.errEl) def.errEl.hidden = true;
      setStatus("");
    })
    .catch(function (err) {
      def.loading = false;
      if (def.errEl) {
        def.errEl.textContent = "Could not load " + def.label +
          " (" + err.message + ").";
        def.errEl.hidden = false;
      }
      setStatus("");
      if (def.box) def.box.checked = false;
    });
}
/* Draw order, re-asserted on every layer add (layers load
   asynchronously): the census fills at the back —
   deliberately UNDER the watershed-basin layer, whose dimming
   mask then mutes the parts of each whole census unit that lie
   outside the basin (Paul's census rule, Nov 21, 2026) — then
   the other big fills (watershed, reservation, lakes, infested
   waters), then the tributary lines, then the point layers on
   top. */
var DRAW_ORDER = ["glo-plats", "cass-aerial-2024",
  "cass-aerial-2020", "cass-aerial-2017", "topo-bemidji-1954",
  "topo-bemidji-1957", "topo-bemidji-1958", "topo-100k",
  "topo-1970s", "topo-1996",
  "schoolcraft-1832", "owen-1852", "glo-1866",
  "logging-fig3", "logging-fig4",
  "rr-1930-p3",
  "soil-cass-1997",
  "marschner-vegetation",
  "nlcd-2021", "census-blockgroups",
  "census-tracts", "census-aian", "watershed-basin", "watershed-direct",
  "huc10-subwatersheds", "counties", "chippewa-nf-land",
  "chippewa-nf-boundary", "dnr-fisheries-areas", "dnr-wildlife-areas",
  "reservation", "townships", "lakes", "surveyed-lakes", "plant-ibi",
  "lakes-bio-significance", "infested-waters", "bathymetry-outlines",
  "bathymetry-contours", "assessed-lakes", "impaired-lakes",
  "delisted-lakes", "state-forests", "wildlife-management-areas",
  "scientific-natural-areas", "ssurgo-hydric-soils",
  "native-plant-communities", "nwi-wetlands",
  "cass-watersheds-major", "cass-watersheds-minor",
  "cass-tullibee-upstream-minors", "cass-land-ownership-dlan",
  "cass-soils-survey", "cass-soils-hydric",
  "cass-wetlands-dnr-2018", "cass-wetlands-nwi-delineations",
  "cass-ais-infested-waters", "cass-tullibee-refuge-lakes",
  "cass-crv-sales-2021", "cass-crv-sales-2022",
  "cass-crv-sales-2023", "cass-crv-sales-2024",
  "cass-crv-sales-2025", "cass-crv-sales-2026",
  "cass-fim-stands-current", "cass-forest-plan-2024-2029",
  "cass-timber-sales-current", "cass-timber-permits",
  "cass-fim-harvestable-50yrs",
  "cass-fim-harvestable-ash-lh-50yrs", "cass-precincts",
  "cass-school-districts", "cass-commissioner-districts",
  "cass-house-senate-districts", "cass-walker-zoning",
  "cass-walker-shoreland-district", "cass-walker-dwsma",
  "cass-walker-wellhead-protection",
  "cass-hackensack-utility-service-area",
  "cass-walker-city-boundary",
  "sensitive-lakeshore-polygons", "tributaries",
  "assessed-streams",
  "impaired-streams", "atv-trails", "snowmobile-trails",
  "bike-trails", "cass-roads-elections", "cass-roads-minor", "cass-roads-major", "water-accesses", "water-quality",
  "mpca-sites", "fish-tissue", "fish-ibi", "nwis-gauges", "nwis-wells",
  "sensitive-lakeshore-points", "cass-ais-observations", "cass-culverts",
  "cass-gravel-pits", "cass-corner-monuments-north",
  "cass-corner-monuments-south", "cass-property-addresses",
  "cass-address-points", "nrhp", "mnhs-markers",
  "gnis-historic-archive",
  "fur-trade-posts", "leech-lake-dam", "historic-settlements",
  "missions-agency", "aerials-1939-centres"];
function assertDrawOrder() {
  DRAW_ORDER.forEach(function (id) {
    var def = layerById(id);
    if (def && def.layer && map.hasLayer(def.layer)) {
      def.layer.bringToFront();
    }
  });
}
map.on("zoomend", function () {
  LAYERS.forEach(function (def) {
    if (def.minZoom) applyGate(def);
  });
});

/* ---------- panel toggles ---------- */
/* ---------- panel layout (Nov 21, 2026) ----------
   The panel reads top to bottom as the story of the lake
   (Paul's layer-organization plan, Nov 21, 2026): the lake
   itself, the watershed around it, the land, trails, history,
   people, politics — and the basemaps last, in their own
   section below the layer list. PANEL_LAYOUT fixes the eight
   groups, the sub-groups inside History and Political &
   administrative, and the layer order inside them; every
   layer appears exactly once. The reorganization moved
   groups and order only — no layer was added, removed,
   re-defaulted or re-styled. Two of Paul's calls of
   Nov 21, 2026: Marschner vegetation sits in Land & habitat
   (not History), and Cass County sits inside Political &
   administrative, its lake, wetland, soil and timber layers
   cross-filed in the Leech Lake, watershed and Land &
   habitat groups rather than duplicated in the county
   sub-groups. */
var PANEL_LAYOUT = [
  { group: "Leech Lake", sections: [
    { ids: ["lakes", "bathymetry-contours", "bathymetry-outlines",
      "surveyed-lakes", "fish-ibi", "plant-ibi",
      "lakes-bio-significance", "impaired-lakes", "impaired-streams",
      "assessed-lakes", "assessed-streams", "delisted-lakes",
      "fish-tissue", "infested-waters", "cass-ais-infested-waters",
      "cass-ais-observations", "water-accesses", "tributaries",
      "water-quality", "mpca-sites", "nwis-gauges", "nwis-wells",
      "sensitive-lakeshore-points",
      "sensitive-lakeshore-polygons", "watershed-direct",
      "cass-tullibee-refuge-lakes", "cass-tullibee-upstream-minors"] },
  ]},
  { group: "The watershed", sections: [
    { ids: ["watershed-basin", "huc10-subwatersheds",
      "cass-watersheds-major", "cass-watersheds-minor"] },
  ]},
  { group: "Land & habitat", sections: [
    { ids: ["native-plant-communities", "nwi-wetlands",
      "cass-wetlands-dnr-2018", "cass-wetlands-nwi-delineations",
      "ssurgo-hydric-soils", "cass-soils-hydric", "cass-soils-survey",
      "state-forests", "wildlife-management-areas",
      "scientific-natural-areas", "dnr-fisheries-areas",
      "dnr-wildlife-areas", "chippewa-nf-boundary", "chippewa-nf-land",
      "nlcd-2021", "cass-aerial-2024", "cass-aerial-2020",
      "cass-aerial-2017", "marschner-vegetation", "cass-timber-permits",
      "cass-timber-sales-current", "cass-forest-plan-2024-2029",
      "cass-fim-stands-current", "cass-fim-harvestable-50yrs",
      "cass-fim-harvestable-ash-lh-50yrs"] },
  ]},
  { group: "Trails & recreation", sections: [
    { ids: ["atv-trails", "snowmobile-trails", "bike-trails"] },
  ]},
  { group: "History", sections: [
    { ids: ["nrhp", "mnhs-markers", "gnis-historic-archive",
      "fur-trade-posts", "leech-lake-dam", "historic-settlements",
      "missions-agency", "glo-plats", "aerials-1939-centres"] },
    { name: "Historical maps", ids: ["schoolcraft-1832", "owen-1852",
      "glo-1866", "logging-fig3",
      "logging-fig4",
      "rr-1930-p3",
      "topo-bemidji-1954", "topo-bemidji-1957", "topo-bemidji-1958",
      "topo-1970s", "topo-100k",
      "topo-1996", "soil-cass-1997"] },
  ]},
  { group: "People", sections: [
    { ids: ["census-tracts", "census-blockgroups", "census-aian"] },
  ]},
  { group: "Political & administrative", sections: [
    { name: "Leech Lake Reservation", ids: ["reservation"] },
    { name: "State", ids: ["cass-house-senate-districts"] },
    { ids: ["counties"] },
    { name: "County \u2014 Cass \u00B7 Land & ownership",
      ids: ["cass-land-ownership-dlan"] },
    { name: "County \u2014 Cass \u00B7 Roads & addresses",
      ids: ["cass-roads-elections", "cass-roads-major",
        "cass-roads-minor", "cass-address-points",
        "cass-property-addresses"] },
    { name: "County \u2014 Cass \u00B7 Districts",
      ids: ["cass-precincts", "cass-school-districts",
        "cass-commissioner-districts"] },
    { name: "County \u2014 Cass \u00B7 Sales",
      ids: ["cass-crv-sales-2021", "cass-crv-sales-2022",
        "cass-crv-sales-2023", "cass-crv-sales-2024",
        "cass-crv-sales-2025", "cass-crv-sales-2026"] },
    { name: "County \u2014 Cass \u00B7 Survey",
      ids: ["cass-corner-monuments-north",
        "cass-corner-monuments-south"] },
    { name: "County \u2014 Cass \u00B7 Municipal",
      ids: ["cass-hackensack-utility-service-area"] },
    { name: "County \u2014 Cass \u00B7 Culverts & gravel pits",
      ids: ["cass-culverts", "cass-gravel-pits"] },
    { name: "City \u2014 Walker",
      ids: ["cass-walker-city-boundary", "cass-walker-zoning",
        "cass-walker-shoreland-district", "cass-walker-dwsma",
        "cass-walker-wellhead-protection"] },
    { name: "Townships", ids: ["townships"] },
  ]},
];
var togglesEl = document.getElementById("layer-toggles");
LAYERS.forEach(function (def) {
  def.layer = null;
  def.loading = false;
  var label = document.createElement("label");
  var box = document.createElement("input");
  box.type = "checkbox";
  box.checked = def.onByDefault;
  label.appendChild(box);
  var sw = document.createElement("span");
  sw.innerHTML = swatchFor(def);
  label.appendChild(sw.firstChild || document.createTextNode(""));
  label.appendChild(document.createTextNode(def.label));
  if (def.title) label.title = def.title;
  /* ⓘ info link after the label (Paul, Nov 20, 2026; source-page
     links Nov 21, 2026): every layer's ⓘ opens, in a new tab, the
     web page that describes the layer. Where the layer's source
     has a human-readable dataset or program page (def.infoUrl —
     an agency dataset/program page, never a raw ArcGIS REST
     service URL), the ⓘ goes there; where none exists, it keeps
     pointing at the layer's section in data-sources.html. */
  var info = document.createElement("a");
  info.className = "tog-info";
  info.href = def.infoUrl ||
    ("assets/data-sources.html#" + def.anchor);
  info.target = "_blank";
  info.rel = "noopener";
  info.textContent = "\u24d8";
  info.title = def.infoUrl ?
    "About this layer \u2014 " + (def.infoName || "source page") :
    "About this layer \u2014 data sources";
  info.setAttribute("aria-label",
    "About the " + def.label + " layer \u2014 " +
    (def.infoUrl ? (def.infoName || "source page") : "data sources"));
  label.appendChild(info);
  var errEl = document.createElement("div");
  errEl.className = "tog-error";
  errEl.hidden = true;
  def.box = box;
  def.errEl = errEl;
  def._label = label;
  if (def.minZoom) {
    var note = document.createElement("span");
    note.className = "tog-note";
    def.gateNote = note;
    label.appendChild(note);
  }
  box.addEventListener("change", function () {
    if (box.checked) {
      if (def.minZoom) { applyGate(def); }
      else { ensureLayer(def, true); }
    } else if (def.layer) {
      map.removeLayer(def.layer);
    }
    if (def.gateNote && !box.checked) def.gateNote.textContent = "";
    /* The Census panel legend follows the census toggles:
       it shows while any census layer is on, and the hint
       stands in its place while none is. */
    if (def.group === "People") refreshCensusPanelLegend();
  });
  if (box.checked) {
    if (def.minZoom) { applyGate(def); }
    else { ensureLayer(def, false); }
  }
});
/* Lay the toggles out in panel order, grouped per PANEL_LAYOUT.
   Each group heading is collapsible, the way the trail map's
   layer groups are (Paul, Nov 21, 2026): the whole heading row
   is the toggle — click it (or press Enter/Space on it) and
   the group's layers fold away under it; click again to bring
   them back. Sub-group headings (Historical maps; the
   Political & administrative jurisdictions) fold the same
   way. Groups start expanded, so the panel opens as it always
   has. Collapsing a group only hides its rows — layers
   already switched on stay on the map. panelIndex records
   the built structure for the layer search filter below. */
var panelIndex = [];
function collapsibleHead(head, body, caret) {
  function toggle() {
    var collapsed = body.classList.toggle("collapsed");
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    caret.textContent = collapsed ? "\u25B8" : "\u25BE";
  }
  head.addEventListener("click", toggle);
  head.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      toggle();
    }
  });
}
function slugId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
var placedLayers = {};
PANEL_LAYOUT.forEach(function (g) {
  if (!togglesEl) return;
  var gh = document.createElement("div");
  gh.className = "tog-group";
  gh.setAttribute("role", "button");
  gh.setAttribute("tabindex", "0");
  gh.setAttribute("aria-expanded", "true");
  var ghName = document.createElement("span");
  ghName.textContent = g.group;
  gh.appendChild(ghName);
  var gCaret = document.createElement("span");
  gCaret.className = "tog-group-caret";
  gCaret.setAttribute("aria-hidden", "true");
  gCaret.textContent = "\u25BE";
  gh.appendChild(gCaret);
  togglesEl.appendChild(gh);
  var groupBody = document.createElement("div");
  groupBody.className = "tog-group-body";
  groupBody.id = "tog-body-" + slugId(g.group);
  gh.setAttribute("aria-controls", groupBody.id);
  togglesEl.appendChild(groupBody);
  collapsibleHead(gh, groupBody, gCaret);
  var gRec = { head: gh, body: groupBody, sections: [] };
  panelIndex.push(gRec);
  /* Census variable switcher (Paul, Nov 21, 2026): a dropdown
     at the head of the People group body, directly under the
     group heading. Choosing a variable recolours the block
     groups, tracts and reservation together (see setCensusVar)
     and the legend scale follows. It lives in the collapsible
     body, so using it never folds the group. */
  if (g.group === "People") {
    /* Plain-language flow (Paul, Nov 21, 2026): one line at
       the top of the group says how the dropdown and the
       layer rows work together, the dropdown is labelled
       "Colour the map by", a line under it says it colours
       the geographies together, and a legend under the layer
       rows (appended after the rows, below) shows the current
       variable's scale — or, while no census layer is on, the
       hint that stands where the legend will appear. */
    var flow = document.createElement("p");
    flow.className = "census-flow";
    flow.textContent = "1. Pick what to colour by. " +
      "2. Turn on tracts or block groups.";
    groupBody.appendChild(flow);
    var varRow = document.createElement("div");
    varRow.className = "census-var-row";
    var varLabel = document.createElement("label");
    varLabel.className = "census-var-label";
    varLabel.setAttribute("for", "census-var-select");
    varLabel.appendChild(document.createTextNode("Colour the map by"));
    var varSel = document.createElement("select");
    varSel.id = "census-var-select";
    varSel.className = "census-var-select";
    CENSUS_VARS.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.label;
      varSel.appendChild(opt);
    });
    varSel.value = currentCensusVarId;
    varSel.addEventListener("change", function () {
      setCensusVar(varSel.value);
    });
    varLabel.appendChild(varSel);
    varRow.appendChild(varLabel);
    var varSub = document.createElement("p");
    varSub.className = "census-var-sub";
    varSub.textContent = "Colours tracts and block groups together.";
    varRow.appendChild(varSub);
    var varNote = document.createElement("p");
    varNote.id = "census-var-note";
    varNote.className = "census-var-note";
    varNote.style.display = "none";
    varRow.appendChild(varNote);
    groupBody.appendChild(varRow);
    /* The panel census legend shell — filled and shown /
       hinted by refreshCensusPanelLegend(). It must sit UNDER
       the layer rows, so it is appended to the group body
       after the layout loop has placed them (see the statement
       after the loop). */
    censusPanelLegendEl = document.createElement("div");
    censusPanelLegendEl.className = "census-panel-legend";
    censusPanelHintEl = document.createElement("p");
    censusPanelHintEl.className = "census-panel-hint";
    censusPanelHintEl.textContent = "Turn on Census tracts " +
      "or block groups to see this on the map";
    censusPanelLegendEl.appendChild(censusPanelHintEl);
    censusPanelNameEl = document.createElement("p");
    censusPanelNameEl.className = "census-panel-name";
    censusPanelNameEl.style.display = "none";
    censusPanelLegendEl.appendChild(censusPanelNameEl);
    censusPanelScaleEl = document.createElement("div");
    censusPanelScaleEl.className = "leg-scale";
    censusPanelScaleEl.style.display = "none";
    censusPanelLegendEl.appendChild(censusPanelScaleEl);
    censusPanelPovertyEl = document.createElement("p");
    censusPanelPovertyEl.className = "census-panel-poverty";
    censusPanelPovertyEl.style.display = "none";
    censusPanelPovertyEl.textContent = "Poverty is published " +
      "at tract level only \u2014 block groups show as no data.";
    censusPanelLegendEl.appendChild(censusPanelPovertyEl);
    censusGroupBodyEl = groupBody;
  }
  g.sections.forEach(function (sec) {
    var parent = groupBody;
    var sRec = { head: null, body: null, rows: [] };
    if (sec.name) {
      var sh = document.createElement("div");
      sh.className = "tog-subgroup";
      sh.setAttribute("role", "button");
      sh.setAttribute("tabindex", "0");
      sh.setAttribute("aria-expanded", "true");
      var shName = document.createElement("span");
      shName.textContent = sec.name;
      sh.appendChild(shName);
      var sCaret = document.createElement("span");
      sCaret.className = "tog-group-caret";
      sCaret.setAttribute("aria-hidden", "true");
      sCaret.textContent = "\u25BE";
      sh.appendChild(sCaret);
      groupBody.appendChild(sh);
      var subBody = document.createElement("div");
      subBody.className = "tog-subgroup-body";
      subBody.id = "tog-body-" + slugId(g.group + " " + sec.name);
      sh.setAttribute("aria-controls", subBody.id);
      groupBody.appendChild(subBody);
      collapsibleHead(sh, subBody, sCaret);
      sRec.head = sh;
      sRec.body = subBody;
      parent = subBody;
    }
    sec.ids.forEach(function (id) {
      var def = layerById(id);
      if (!def || !def._label) return;
      parent.appendChild(def._label);
      parent.appendChild(def.errEl);
      placedLayers[id] = true;
      sRec.rows.push(def);
    });
    gRec.sections.push(sRec);
  });
});
/* Safety net: a layer missing from PANEL_LAYOUT still gets its
   toggle, at the end of the last group, rather than vanishing
   from the panel. (The layout lists every layer; this is here
   so a future layer added to LAYERS alone still shows.) */
LAYERS.forEach(function (def) {
  if (!def._label || placedLayers[def.id] || !togglesEl) return;
  togglesEl.appendChild(def._label);
  togglesEl.appendChild(def.errEl);
  if (panelIndex.length) {
    panelIndex[panelIndex.length - 1].sections.push(
      { head: null, body: null, rows: [def] });
  }
});
/* The People panel legend goes under the People layer rows
   (it was built with the group head, above, so its DOM place
   is fixed only now that the rows exist). */
if (censusGroupBodyEl && censusPanelLegendEl) {
  censusGroupBodyEl.appendChild(censusPanelLegendEl);
  refreshCensusPanelLegend();
}

/* ---------- layer search (Nov 21, 2026) ----------
   The search box at the top of the panel filters the layer
   list by label: typing "wetland" leaves the three wetlands
   layers and nothing else. A group or sub-group heading shows
   only while one of its layers matches. While a search is
   active the .searching class on #layer-toggles opens folded
   groups and sub-groups (style.css), so a match is never
   hidden inside a collapsed group; clearing the box restores
   the reader's own folds exactly, because filtering only
   shows and hides rows and headings — it never touches the
   .collapsed classes. */
(function layerSearch() {
  var input = document.getElementById("layer-search");
  var noneEl = document.getElementById("layer-search-none");
  var termEl = document.getElementById("layer-search-term");
  if (!input || !togglesEl) return;
  function applySearch() {
    var q = input.value.trim().toLowerCase();
    var anyMatch = false;
    panelIndex.forEach(function (gRec) {
      var groupMatch = false;
      gRec.sections.forEach(function (sRec) {
        var secMatch = false;
        sRec.rows.forEach(function (def) {
          var match = !q ||
            def.label.toLowerCase().indexOf(q) !== -1;
          def._label.style.display = match ? "" : "none";
          def.errEl.style.display = match ? "" : "none";
          if (match) secMatch = true;
        });
        if (sRec.head) sRec.head.style.display = secMatch ? "" : "none";
        if (sRec.body) sRec.body.style.display = secMatch ? "" : "none";
        if (secMatch) groupMatch = true;
      });
      gRec.head.style.display = groupMatch ? "" : "none";
      gRec.body.style.display = groupMatch ? "" : "none";
      if (groupMatch) anyMatch = true;
    });
    togglesEl.classList.toggle("searching", !!q);
    if (noneEl) {
      noneEl.hidden = !(q && !anyMatch);
      if (termEl) termEl.textContent = input.value.trim();
    }
  }
  input.addEventListener("input", applySearch);
})();

/* The Basemap heading folds the same way (its collapsed rule
   already sits in style.css from the trail-map template). It
   starts expanded, like the layer groups. */
(function basemapToggle() {
  var head = document.getElementById("basemap-head");
  var body = document.getElementById("background-choices");
  if (!head || !body) return;
  var caret = document.createElement("span");
  caret.className = "tog-group-caret";
  caret.setAttribute("aria-hidden", "true");
  caret.textContent = "\u25BE";
  head.appendChild(caret);
  head.setAttribute("role", "button");
  head.setAttribute("tabindex", "0");
  head.setAttribute("aria-expanded", "true");
  head.setAttribute("aria-controls", "background-choices");
  function toggleBasemap() {
    var collapsed = body.classList.toggle("collapsed");
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    caret.textContent = collapsed ? "\u25B8" : "\u25BE";
  }
  head.addEventListener("click", toggleBasemap);
  head.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      toggleBasemap();
    }
  });
})();

/* ---------- legend ---------- */
(function buildLegend() {
  var legend = document.getElementById("legend");
  if (!legend) return;
  LAYERS.forEach(function (def) {
    var row = document.createElement("div");
    row.className = "leg-row";
    var sw = document.createElement("span");
    sw.innerHTML = swatchFor(def);
    row.appendChild(sw.firstChild || document.createTextNode(""));
    row.appendChild(document.createTextNode(def.label));
    legend.appendChild(row);
  });
  var note = document.createElement("p");
  note.className = "pop-note";
  note.textContent = "Water-quality dots are coloured by station type: " +
    "blue lake, green stream, purple biological, orange discharge.";
  legend.appendChild(note);
  var bathyNote = document.createElement("p");
  bathyNote.className = "pop-note";
  bathyNote.textContent = "Bathymetry contours are drawn every 5 ft " +
    "(10 ft in deeper water), from the shoreline (0 ft) to 200 ft. " +
    "The surveyed-lakes outlines mark which lakes the DNR has " +
    "bathymetry for.";
  legend.appendChild(bathyNote);
  var catNote = document.createElement("p");
  catNote.className = "pop-note";
  catNote.textContent = "Impaired and assessed waters (MPCA 2024) " +
    "are coloured by Integrated Report category: 5 red (impaired, " +
    "TMDL required), 4A orange (impaired, TMDL approved), 4D amber " +
    "(impaired or threatened from natural conditions, no TMDL), " +
    "4C teal, 3 grey (insufficient information), 2 green (fully " +
    "supporting). Assessed waters take the worst (most impaired) " +
    "of their per-use categories; delisted lakes are teal.";
  legend.appendChild(catNote);
  var fishNote = document.createElement("p");
  fishNote.className = "pop-note";
  fishNote.textContent = "Fish tissue markers are one per MPCA " +
    "sampling station, summarising every sample-chemical result " +
    "at that station (mercury, PFAS, PCBs).";
  legend.appendChild(fishNote);
  var fishIbiNote = document.createElement("p");
  fishIbiNote.className = "pop-note";
  fishIbiNote.textContent = "Fish IBI markers are one per lake " +
    "(46 lakes), coloured by the most recent survey's status: " +
    "dark green at or above the exceptional-use threshold, " +
    "green at or above the general-use threshold, violet " +
    "sampled wholly within a tribal nation, red below a " +
    "threshold. The data file holds all 111 survey rows " +
    "(2005\u20132024). Plant IBI lakes are green (all 125 are " +
    "at or above threshold); lakes of biological significance " +
    "darken with class \u2014 Outstanding, High, Moderate.";
  legend.appendChild(fishIbiNote);
  var landNote = document.createElement("p");
  landNote.className = "pop-note";
  landNote.textContent = "Chippewa National Forest: the solid " +
    "brown line is the proclaimed boundary; the dashed amber " +
    "line is the administrative land unit \u2014 NOT federal " +
    "ownership (true National Forest System ownership, about " +
    "666,000 acres, is a separate dataset not on this map). " +
    "DNR fisheries and wildlife areas are office territories, " +
    "not habitat boundaries. NWI wetlands are coloured by " +
    "type: dark green forested/shrub, mid green emergent, " +
    "blue pond, lake and riverine.";
  legend.appendChild(landNote);
  var heavyNote = document.createElement("p");
  heavyNote.className = "pop-note";
  heavyNote.textContent = "Native plant communities and NWI " +
    "wetlands appear at zoom 12 and closer; hydric soils at " +
    "zoom 11 and closer. Land cover (NLCD 2021) is a live " +
    "30 m raster overlay streamed from MRLC.";
  legend.appendChild(heavyNote);
  var cassNote = document.createElement("p");
  cassNote.className = "pop-note";
  cassNote.textContent = "The Cass County layers are the county " +
    "GIS pull of Nov 21, 2026, filed under Political & " +
    "administrative (County \u2014 Cass), with the county\u2019s " +
    "lake, wetland, soil and timber layers in the Leech Lake, " +
    "watershed and Land & habitat groups \u2014 all off by " +
    "default; " +
    "the county wetlands, soil survey, DLAN land ownership and " +
    "FIM stands load only at zoom 11\u201312 or closer. County " +
    "wetlands, soils and infested-waters layers are different " +
    "vintages and sources of the same inventories as the USFWS " +
    "NWI, SSURGO and DNR layers elsewhere in the panel, not " +
    "independent counts. DLAN ownership codes and road " +
    "functional-class codes are shown exactly as stored " +
    "\u2014 the county service publishes no decode table " +
    "for them.";
  legend.appendChild(cassNote);
  var nwisNote = document.createElement("p");
  nwisNote.className = "pop-note";
  nwisNote.textContent = "USGS gauges and wells are coloured by " +
    "reporting status. Surface gauges: green reporting live " +
    "(only Leech Lake at Sugar Point), amber listed active but " +
    "not currently reporting, grey inactive. Groundwater wells: " +
    "teal listed active, grey inactive \u2014 listed active does " +
    "not mean currently reporting.";
  legend.appendChild(nwisNote);
  var histNote = document.createElement("p");
  histNote.className = "pop-note";
  histNote.textContent = "History points are approximate: several " +
    "are pointers to a general location, not surveyed sites \u2014 " +
    "each popup says which. The GNIS Archive points are records " +
    "frozen in August 2021, not current GNIS.";
  legend.appendChild(histNote);
  var aerialNote = document.createElement("p");
  aerialNote.className = "pop-note";
  aerialNote.textContent = "1939 aerial photo centres are coloured " +
    "by status: red \u2014 the two frames that show lake water " +
    "(bxu04058 centred on Walker Bay, bxu03065 on its west shore); " +
    "green \u2014 centre inside the watershed; amber \u2014 near the " +
    "watershed (the frame touches it); grey \u2014 outside. Each " +
    "frame covers about 2.8 miles across, so an outside centre " +
    "can still show watershed ground.";
  legend.appendChild(aerialNote);
  var histMapsNote = document.createElement("p");
  histMapsNote.className = "pop-note";
  histMapsNote.textContent = "Historical maps are full-sheet " +
    "scans drawn over the basemap \u2014 one at a time reads " +
    "best; the three USGS topo mosaics are the exception, " +
    "their sheet collars cropped so the quads meet at their " +
    "neatlines. The early maps carry their own large errors " +
    "(Schoolcraft 63.3 km, the 1866 GLO sketch 54.7 km, Owen " +
    "25.8 km): those figures are the maps' own misplacement " +
    "of the northern lakes, not faults in the alignment. The " +
    "two logging figures are modern (1998) reconstructions, " +
    "not period maps. Each layer's \u24d8 gives its source, " +
    "date and check-point accuracy.";
  legend.appendChild(histMapsNote);
  var marschnerHead = document.createElement("p");
  marschnerHead.className = "pop-note";
  marschnerHead.textContent = "Marschner original vegetation " +
    "(compiled 1929\u201331) is coloured by class:";
  legend.appendChild(marschnerHead);
  var MARSCHNER_CLASSES = [
    ["Conifer Bogs and Swamps", "#2f5d50"],
    ["Lakes (open water)", "#5b8ec4"],
    ["Aspen-Birch (trending to Conifers)", "#6aa84f"],
    ["Mixed White Pine and Red Pine", "#1f6f43"],
    ["Jack Pine Barrens and Openings", "#b08945"],
    ["Wet Prairie", "#b8c256"],
    ["Big Woods \u2013 Hardwoods", "#386641"],
    ["Mixed Hardwood and Pine", "#588157"],
    ["White Pine", "#7fc97f"],
    ["Aspen-Birch (trending to hardwoods)", "#95a83b"],
    ["Aspen-Oak Land", "#c98f3d"],
    ["Brush Prairie", "#dfc27a"],
    ["Undefined", "#9a9a9a"],
  ];
  MARSCHNER_CLASSES.forEach(function (mc) {
    var row = document.createElement("div");
    row.className = "leg-row";
    var sw = document.createElement("span");
    sw.innerHTML = "<span class='tog-swatch-fill' style='" +
      "background:" + mc[1] + ";border-color:" + mc[1] +
      "'></span>";
    row.appendChild(sw.firstChild || document.createTextNode(""));
    row.appendChild(document.createTextNode(mc[0]));
    legend.appendChild(row);
  });
  var trailsNote = document.createElement("p");
  trailsNote.className = "pop-note";
  trailsNote.textContent = "Trails: ATV trails amber (199 " +
    "segments, all Grant-in-Aid), snowmobile systems blue (5 " +
    "systems \u2014 two share the name Cass County Trails and " +
    "are different systems; North Country Trails is a " +
    "snowmobile system, not the North Country Trail), bike " +
    "trails green (Paul Bunyan and Heartland state trails, all " +
    "asphalt). Sensitive lakeshore: violet polygons are the " +
    "highly sensitive shoreland areas (33 lakes); the analysis " +
    "points appear at zoom 12 and closer, coloured green to " +
    "red by the service's relative score, shown exactly as " +
    "stored.";
  legend.appendChild(trailsNote);
  var censusHead = document.createElement("p");
  censusHead.className = "pop-note";
  legend.appendChild(censusHead);
  censusLegendHead = censusHead;
  var scale = document.createElement("div");
  scale.className = "leg-scale";
  legend.appendChild(scale);
  censusLegendScale = scale;
  var censusVarNote = document.createElement("p");
  censusVarNote.className = "pop-note";
  legend.appendChild(censusVarNote);
  censusLegendNote = censusVarNote;
  updateCensusLegend();
  var censusNote = document.createElement("p");
  censusNote.className = "pop-note";
  censusNote.textContent = "Census units are drawn whole across " +
    "Beltrami, Cass and Hubbard counties \u2014 never clipped to " +
    "the watershed; the watershed layer mutes the parts outside " +
    "the basin. The \u201CColour the map by\u201D switcher at the head of " +
    "the People group recolours the block groups, tracts and " +
    "reservation together; this scale follows the chosen " +
    "variable. Every ACS estimate in a census popup carries its " +
    "margin of error: at block-group level the margins are large, " +
    "often \u00B130\u201350% of the estimate \u2014 for income, " +
    "the tracts are the reliable view. Census population " +
    "for the reservation is not tribal enrollment.";
  legend.appendChild(censusNote);
})();
(function legendToggle() {
  var btn = document.getElementById("btn-legend");
  var card = document.getElementById("legend-card");
  if (!btn || !card) return;
  btn.addEventListener("click", function () {
    var hidden = card.hidden;
    card.hidden = !hidden;
    btn.setAttribute("aria-pressed", hidden ? "true" : "false");
  });
})();

/* ---------- saved-view links + Copy link button ----------
   A saved-view link's hash encodes the centre, zoom, basemap and
   ticked layers (#v=lat,lng,zoom&b=base-code&l=layer,ids).
   Opening such a link restores that view (restoreViewFromHash,
   below). With no hash, startup shows only the whole-basin
   watershed layer (the onByDefault flags above).
   The Copy link button (user-requested; icon-only, upper-right
   corner of the map "like the trail map") composes these links:
   viewUrl() builds the URL for the current view and
   copyLinkButton() copies it — showing the "Link copied" pill
   on success, or the fallback card with a readonly input when
   the Clipboard API is unavailable. (The button was removed
   once on audit guidance and restored the same day, Nov 21,
   2026, at the user's direction — it works on the hosted copy;
   do not remove it again.) */
function viewUrl() {
  var c = map.getCenter();
  var ids = [];
  LAYERS.forEach(function (def) {
    if (def.box && def.box.checked) ids.push(def.id);
  });
  var hash = "#v=" + c.lat.toFixed(5) + "," + c.lng.toFixed(5) +
    "," + map.getZoom() +
    "&b=" + encodeURIComponent(currentBase.code) +
    "&l=" + ids.join(",");
  return window.location.href.split("#")[0] + hash;
}
function copyLinkButton() {
  var btn = document.getElementById("copy-link-btn");
  var card = document.getElementById("copy-link-card");
  var input = document.getElementById("copy-link-input");
  var pill = document.getElementById("copy-link-pill");
  var closeBtn = document.getElementById("copy-link-close");
  if (!btn) return;
  var pillTimer = null;
  function showPill() {
    if (!pill) return;
    pill.hidden = false;
    if (pillTimer) window.clearTimeout(pillTimer);
    pillTimer = window.setTimeout(function () {
      pill.hidden = true;
    }, 2200);
  }
  function showFallback(url) {
    if (card && input) {
      input.value = url;
      card.hidden = false;
      input.focus();
      input.select();
    } else if (pill) {
      /* No card in the DOM: surface the URL as the pill text
         rather than failing silently. */
      pill.textContent = url;
      showPill();
    }
  }
  btn.addEventListener("click", function () {
    var url = viewUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        if (card) card.hidden = true;
        showPill();
      }, function () {
        showFallback(url);
      });
    } else {
      showFallback(url);
    }
  });
  if (closeBtn && card) {
    closeBtn.addEventListener("click", function () {
      card.hidden = true;
      btn.focus();
    });
  }
}
copyLinkButton();
(function restoreViewFromHash() {
  var m = String(window.location.hash || "").match(
    /^#v=(-?[\d.]+),(-?[\d.]+),(\d+)(?:&b=([^&]*))?(?:&l=(.*))?$/);
  if (!m) return;
  var lat = parseFloat(m[1]), lng = parseFloat(m[2]),
    zoom = parseInt(m[3], 10);
  if (isFinite(lat) && isFinite(lng) && isFinite(zoom)) {
    map.setView([lat, lng], zoom);
  }
  if (m[4]) {
    var code = decodeURIComponent(m[4]);
    for (var i = 0; i < BASES.length; i++) {
      if (BASES[i].code === code) { setBase(BASES[i].name); break; }
    }
  }
  if (m[5] !== undefined) {
    var wanted = {};
    m[5].split(",").forEach(function (id) {
      if (id) wanted[id] = true;
    });
    LAYERS.forEach(function (def) {
      if (!def.box) return;
      var want = !!wanted[def.id];
      if (def.box.checked === want) return;
      def.box.checked = want;
      if (want) {
        if (def.minZoom) { applyGate(def); }
        else { ensureLayer(def, false); }
      } else if (def.layer) {
        map.removeLayer(def.layer);
      }
      if (def.gateNote && !want) def.gateNote.textContent = "";
    });
    refreshCensusPanelLegend();
  }
})();

