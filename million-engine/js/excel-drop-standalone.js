/*! Excel drop for standalone Million-Engine.html (file:// ok). Needs global XLSX. */
(function (global) {
  "use strict";

  var COUNTRY_ALIAS = {
    austria: "AT", poland: "PL", romania: "RO", czechia: "CZ",
    "czech republic": "CZ", slovakia: "SK", hungary: "HU", croatia: "HR", serbia: "RS",
  };

  var PASSIONS = [
    { id: "RUN", label: "Running Club", match: /running/i },
    { id: "F1", label: "McLaren Mastercard F1", match: /mclaren|f1/i },
    { id: "MUSLN", label: "Music · Live Nation", match: /live\s*nation/i },
    { id: "MUSOT", label: "Music · Other", match: /music\s*-\s*other|music\s+other/i },
    { id: "GAMMC", label: "Gaming · MC assets", match: /gaming.*mc|mc\s*assets/i },
    { id: "GAMOT", label: "Gaming · Other", match: /gaming\s*-\s*other|gaming\s+other/i },
  ];

  function normHeader(h) {
    return String(h || "").toLowerCase().replace(/[''′]/g, "'").replace(/\s+/g, " ").trim();
  }

  function num(v) {
    if (v == null || v === "") return NaN;
    if (typeof v === "number") return v;
    var s = String(v).trim();
    if (!s || /^(yes|no|partially)$/i.test(s)) return NaN;
    var pct = /%$/.test(s);
    s = s.replace(/%/g, "").replace(/\s/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
    var n = Number(s);
    if (!isFinite(n)) return NaN;
    return n;
  }

  function asPctPoints(v) {
    var n = num(v);
    if (!isFinite(n)) return NaN;
    if (n > 0 && n <= 1) return Math.round(n * 10000) / 100;
    return n;
  }

  function countryCode(name) {
    return COUNTRY_ALIAS[String(name || "").trim().toLowerCase()] || null;
  }

  function fmtInt(n) {
    if (!isFinite(n)) return "—";
    return Math.round(n).toLocaleString("en-US");
  }

  function fmtPct(n) {
    if (!isFinite(n)) return "—";
    var x = Math.round(n * 100) / 100;
    return x + "%";
  }

  function fmtVol(v) {
    if (!isFinite(v)) return 0;
    if (Math.abs(v) >= 10) return Math.round(v);
    if (Math.abs(v) >= 1) return Math.round(v * 10) / 10;
    return Math.round(v * 100) / 100;
  }

  function findCol(headers, preds) {
    for (var i = 0; i < headers.length; i++) {
      var h = normHeader(headers[i]);
      for (var j = 0; j < preds.length; j++) if (preds[j](h)) return i;
    }
    return -1;
  }

  function isAcqHeader(h) {
    return h.indexOf("incl") >= 0 || h.indexOf("acquistion") >= 0 ||
      h.indexOf("acquisition") >= 0 || (h.indexOf("pp") >= 0 && h.indexOf("acq") >= 0);
  }

  function sheetToMatrix(sheet, XLSX) {
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  }

  function readRate(matrix) {
    for (var r = 0; r < Math.min(matrix.length, 30); r++) {
      var a = String(matrix[r][1] || "").toLowerCase();
      if (a.indexOf("acquisition potential") >= 0 && a.indexOf("expected") < 0 && a.indexOf(":") < 0) {
        var v = num(matrix[r][2]);
        if (!isFinite(v)) continue;
        if (v > 0 && v <= 1) return v;
        if (v > 1 && v <= 100) return v / 100;
      }
    }
    return 0.005;
  }

  function parseCountryBlock(matrix, titleRe) {
    var titleRow = -1, r, label;
    for (r = 0; r < matrix.length; r++) {
      label = String(matrix[r][1] || matrix[r][0] || "");
      if (titleRe.test(label)) { titleRow = r; break; }
    }
    if (titleRow < 0) return null;
    var headerRow = -1;
    for (r = titleRow + 1; r < Math.min(titleRow + 6, matrix.length); r++) {
      var headers = (matrix[r] || []).map(normHeader);
      if (headers.some(function (h) { return h === "countries" || h === "country"; }) &&
          headers.some(function (h) { return h === "pp1"; })) {
        headerRow = r; break;
      }
    }
    if (headerRow < 0) return null;
    var hdr = matrix[headerRow];
    var iCountry = findCol(hdr, [function (h) { return h === "countries" || h === "country"; }]);
    var iTotal = findCol(hdr, [function (h) { return h === "total" || h === "total total"; }]);
    var ppIdx = [];
    for (var p = 1; p <= 10; p++) {
      var idx = findCol(hdr, [function (h) { return h === "pp" + p || h === "pp " + p; }]);
      if (idx >= 0) ppIdx.push(idx);
    }
    if (iCountry < 0 || ppIdx.length < 10) return null;
    var out = {};
    for (r = headerRow + 1; r < matrix.length; r++) {
      var line = matrix[r] || [];
      var name = line[iCountry];
      if (String(name).trim().toLowerCase() === "total") break;
      var code = countryCode(name);
      if (!code) {
        if (String(name || "").trim() && !countryCode(name)) break;
        continue;
      }
      var vols = ppIdx.map(function (i) {
        var v = num(line[i]);
        return isFinite(v) ? v : 0;
      });
      var fromCol = iTotal >= 0 ? num(line[iTotal]) : NaN;
      var total = isFinite(fromCol) ? fromCol : vols.reduce(function (s, v) { return s + v; }, 0);
      vols.total = total;
      out[code] = vols;
    }
    return out;
  }

  function parseWorkbookToTags(workbook, XLSX) {
    var best = null;
    for (var s = 0; s < workbook.SheetNames.length; s++) {
      var name = workbook.SheetNames[s];
      var matrix = sheetToMatrix(workbook.Sheets[name], XLSX);
      var tags = parseMatrixToTags(matrix);
      if (tags && (!best || tags._nCountries > best._nCountries)) {
        best = tags;
        best._sheet = name;
      }
    }
    if (!best) throw new Error("No Acquisition Potential table found (Countries + Target + Market Share).");
    return best;
  }

  function parseMatrixToTags(matrix) {
    var headerRow = -1, r;
    for (r = 0; r < Math.min(matrix.length, 40); r++) {
      var headers = matrix[r].map(normHeader);
      var hasC = headers.some(function (h) { return h === "countries" || h === "country"; });
      var hasT = headers.some(function (h) { return h.indexOf("target") >= 0; });
      var hasM = headers.some(function (h) { return h.indexOf("market share") >= 0; });
      if (hasC && hasT && hasM) { headerRow = r; break; }
    }
    if (headerRow < 0) return null;

    var rate = readRate(matrix);
    var hdr = matrix[headerRow];
    var iCountry = findCol(hdr, [function (h) { return h === "countries" || h === "country"; }]);
    var iTarget = findCol(hdr, [
      function (h) { return h.indexOf("target cards") >= 0; },
      function (h) { return h.indexOf("target") >= 0 && h.indexOf("27") >= 0; },
      function (h) { return h === "target"; },
    ]);
    var iShare = findCol(hdr, [function (h) { return h.indexOf("share of total") >= 0; }]);
    var iMs = findCol(hdr, [function (h) { return h === "market share" || h.indexOf("market share") === 0; }]);
    var iPot = findCol(hdr, [function (h) { return h.indexOf("market potential") >= 0; }]);
    var iMax = findCol(hdr, [function (h) { return h.indexOf("max") >= 0 && h.indexOf("acq") >= 0; }]);
    var iExp = findCol(hdr, [function (h) { return h.indexOf("expected") >= 0 && h.indexOf("acq") >= 0; }]);

    var growthIdx = [];
    for (var p = 1; p <= 10; p++) {
      var gi = findCol(hdr, [
        function (h) { return h === "pp" + p; },
        function (h) { return h.indexOf("pp" + p) === 0 && !isAcqHeader(h); },
      ]);
      if (gi >= 0) growthIdx.push(gi);
    }
    var acqIdx = [];
    for (p = 1; p <= 10; p++) {
      var ai = findCol(hdr, [function (h) { return isAcqHeader(h) && h.indexOf("pp" + p) >= 0; }]);
      if (ai >= 0) acqIdx.push(ai);
    }
    if (acqIdx.length < 10 && growthIdx.length) {
      var start = Math.max.apply(null, growthIdx) + 1;
      for (var i = 0; i < 10; i++) acqIdx[i] = start + i;
    }

    var rows = [];
    for (r = headerRow + 1; r < matrix.length; r++) {
      var line = matrix[r] || [];
      var rawName = line[iCountry];
      if (String(rawName).trim().toLowerCase() === "total") break;
      var code = countryCode(rawName);
      if (!code) continue;
      var target = num(line[iTarget]);
      var marketShare = asPctPoints(line[iMs]);
      if (!isFinite(target) || !isFinite(marketShare)) continue;
      var vols = acqIdx.slice(0, 10).map(function (ix) {
        var v = num(line[ix]);
        return isFinite(v) ? v : 0;
      });
      rows.push({
        code: code,
        name: String(rawName).trim(),
        target: target,
        marketShare: marketShare,
        shareTotal: iShare >= 0 ? asPctPoints(line[iShare]) : NaN,
        pot: iPot >= 0 ? num(line[iPot]) : NaN,
        max: iMax >= 0 ? num(line[iMax]) : NaN,
        exp: iExp >= 0 ? num(line[iExp]) : NaN,
        vols: vols.every(function (v) { return v === 0; }) ? null : vols,
      });
    }
    if (!rows.length) return null;

    var hobbyMaps = {};
    for (var pi = 0; pi < PASSIONS.length; pi++) {
      var passion = PASSIONS[pi];
      hobbyMaps[passion.id] = parseCountryBlock(
        matrix,
        new RegExp("acquisition\\s+potential\\s*:.*" + passion.match.source, "i")
      ) || parseCountryBlock(matrix, passion.match) || {};
    }

    var readinessBlock = parseCountryBlock(matrix, /potentially\s+acquired\s+cards/i) || {};

    var sumT = rows.reduce(function (s, row) { return s + row.target; }, 0);
    var tags = {};
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var share = isFinite(row.shareTotal) ? row.shareTotal :
        (sumT > 0 ? Math.round((10000 * row.target) / sumT) / 100 : 0);
      var pot = isFinite(row.pot) ? Math.round(row.pot) :
        Math.round(row.target / Math.max(row.marketShare / 100, 0.0001));
      var max = isFinite(row.max) ? Math.round(row.max) : Math.round(pot * rate);
      var exp = isFinite(row.exp) ? Math.round(row.exp) : Math.round(max * (row.marketShare / 100));
      var vols = row.vols || [exp, exp, exp, exp, exp, exp, exp, exp, exp, exp];
      var ready = readinessBlock[row.code];
      var total10 = ready && isFinite(ready.total)
        ? Math.round(ready.total)
        : Math.round(vols.reduce(function (s, v) { return s + (Number(v) || 0); }, 0));

      tags[row.code + "_TARGET"] = fmtInt(row.target);
      tags[row.code + "_CARDSHARE"] = fmtPct(share);
      tags[row.code + "_MSHARE"] = fmtPct(row.marketShare);
      tags[row.code + "_MPOT"] = fmtInt(pot);
      tags[row.code + "_MAXACQ"] = fmtInt(max);
      tags[row.code + "_EXPACQ"] = fmtInt(exp);
      tags[row.code + "_TOTAL10"] = fmtInt(total10);

      for (pi = 0; pi < PASSIONS.length; pi++) {
        passion = PASSIONS[pi];
        var raw = hobbyMaps[passion.id][row.code];
        var hVols = (raw || vols.map(function (v) { return v / PASSIONS.length; })).map(fmtVol);
        while (hVols.length < 10) hVols.push(0);
        for (i = 0; i < 10; i++) tags[row.code + "_" + passion.id + "_PP" + (i + 1)] = String(hVols[i]);
        tags[row.code + "_" + passion.id + "_HEADLINE"] = passion.label + " in " + row.name;
        tags[row.code + "_" + passion.id + "_BULLET1"] = "Mastercard offering — to be defined";
      }
    }
    tags._nCountries = rows.length;
    tags._sheet = "";
    return tags;
  }

  global.parseExcelFileToTags = function (file) {
    return new Promise(function (resolve, reject) {
      if (!global.XLSX) {
        reject(new Error("XLSX library missing — keep js/vendor/xlsx.full.min.js next to this HTML folder."));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read file")); };
      reader.onload = function () {
        try {
          var wb = global.XLSX.read(new Uint8Array(reader.result), { type: "array", cellDates: true });
          resolve(parseWorkbookToTags(wb, global.XLSX));
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
