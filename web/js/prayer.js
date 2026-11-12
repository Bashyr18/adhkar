/* Prayer-time engine — offline astronomical calculation (solar position after the
   USNO/Meeus low-precision formulas). Mirrored line-for-line by android/…/PrayerCalc.java,
   which drives notifications and widgets when the app is closed. Keep the two in sync. */
(function (root) {
  'use strict';
  var D2R = Math.PI / 180,
    R2D = 180 / Math.PI;
  function sin(d) {
    return Math.sin(d * D2R);
  }
  function cos(d) {
    return Math.cos(d * D2R);
  }
  function tan(d) {
    return Math.tan(d * D2R);
  }
  function asin(x) {
    return Math.asin(x) * R2D;
  }
  function acos(x) {
    return Math.acos(x) * R2D;
  }
  function atan2(y, x) {
    return Math.atan2(y, x) * R2D;
  }
  function acot(x) {
    return Math.atan(1 / x) * R2D;
  }
  function fix(a, b) {
    a = a - b * Math.floor(a / b);
    return a < 0 ? a + b : a;
  }

  /* fajr/isha: degrees below horizon; ishaMin: fixed minutes after maghrib; maghribDeg: angle instead of sunset. */
  var METHODS = {
    mwl: { name: 'Muslim World League', fajr: 18, isha: 17 },
    isna: { name: 'ISNA · North America', fajr: 15, isha: 15 },
    egypt: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
    makkah: { name: 'Umm al-Qurā · Makkah', fajr: 18.5, ishaMin: 90 },
    karachi: { name: 'University of Karachi', fajr: 18, isha: 18 },
    dubai: { name: 'Dubai · UAE', fajr: 18.2, isha: 18.2 },
    qatar: { name: 'Qatar', fajr: 18, ishaMin: 90 },
    kuwait: { name: 'Kuwait', fajr: 18, isha: 17.5 },
    singapore: { name: 'MUIS · Singapore', fajr: 20, isha: 18 },
    jakim: { name: 'JAKIM · Malaysia', fajr: 20, isha: 18 },
    kemenag: { name: 'Kemenag · Indonesia', fajr: 20, isha: 18 },
    turkey: { name: 'Diyanet · Türkiye', fajr: 18, isha: 17, adj: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 } },
    france: { name: 'UOIF · France', fajr: 12, isha: 12 },
    russia: { name: 'Spiritual Admin. · Russia', fajr: 16, isha: 15 },
    morocco: { name: 'Morocco', fajr: 19, isha: 17, adj: { maghrib: 5 } },
    algeria: { name: 'Algeria', fajr: 18, isha: 17 },
    tunisia: { name: 'Tunisia', fajr: 18, isha: 18 },
    jordan: { name: 'Jordan', fajr: 18, isha: 18, adj: { maghrib: 5 } }
  };
  var ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var NAMES = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'ʿAṣr', maghrib: 'Maghrib', isha: 'ʿIshāʾ' };
  var AR = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };

  function julian(y, m, d) {
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    var A = Math.floor(y / 100),
      B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sunPos(jd) {
    var D = jd - 2451545.0;
    var g = fix(357.529 + 0.98560028 * D, 360),
      q = fix(280.459 + 0.98564736 * D, 360);
    var L = fix(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360),
      e = 23.439 - 0.00000036 * D;
    var RA = atan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - fix(RA, 24) };
  }

  /* Times for civil date y-m-d at (lat,lng). Returns epoch ms per prayer (UTC-based, timezone-free). */
  /* Polar day/night: when the sun never rises or sets, use the nearest latitude (±65°) where it does. */
  function compute(y, m, d, o) {
    var r = computeAt(y, m, d, o);
    if ((!isFinite(r.sunrise) || !isFinite(r.maghrib)) && Math.abs(o.lat) > 65) {
      var o2 = {};
      for (var k in o) o2[k] = o[k];
      o2.lat = o.lat > 0 ? 65 : -65;
      r = computeAt(y, m, d, o2);
      r.polar = true;
    }
    return r;
  }
  function computeAt(y, m, d, o) {
    var M = METHODS[o.method] || METHODS.mwl,
      lat = o.lat,
      lng = o.lng;
    var jd = julian(y, m, d) - lng / (15 * 24);
    function midDay(t) {
      var eq = sunPos(jd + t).eqt;
      return fix(12 - eq, 24);
    }
    function angleTime(angle, t, ccw) {
      var dec = sunPos(jd + t).decl,
        noon = midDay(t);
      var c = (-sin(angle) - sin(dec) * sin(lat)) / (cos(dec) * cos(lat));
      if (c > 1 || c < -1) return NaN;
      var T = acos(c) / 15;
      return noon + (ccw ? -T : T);
    }
    function asrTime(factor, t) {
      var dec = sunPos(jd + t).decl;
      return angleTime(-acot(factor + tan(Math.abs(lat - dec))), t);
    }
    var t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, maghrib: 18, isha: 18 };
    var riseAngle = 0.833 + 0.0347 * Math.sqrt(Math.max(0, o.elev || 0));
    for (var i = 0; i < 2; i++) {
      var p = {};
      for (var k in t) p[k] = t[k] / 24;
      t = {
        fajr: angleTime(M.fajr, p.fajr, true),
        sunrise: angleTime(riseAngle, p.sunrise, true),
        dhuhr: midDay(p.dhuhr),
        asr: asrTime(o.asr === 'hanafi' ? 2 : 1, p.asr),
        sunset: angleTime(riseAngle, p.sunset),
        maghrib: M.maghribDeg ? angleTime(M.maghribDeg, p.maghrib) : angleTime(riseAngle, p.maghrib),
        isha: M.ishaMin ? NaN : angleTime(M.isha, p.isha)
      };
    }
    if (M.ishaMin) t.isha = t.maghrib + M.ishaMin / 60;
    /* high latitudes: cap fajr/isha to a portion of the night when the sun never reaches the angle */
    var night = 24 + t.sunrise - t.sunset,
      rule = o.highLat || 'angle',
      none = rule === 'none';
    /* "none" keeps the true angle times, falling back to the angle rule only on nights the sun never reaches it */
    function portion(angle) {
      return rule === 'mid' ? 0.5 : rule === 'seventh' ? 1 / 7 : angle / 60;
    }
    if (isFinite(night)) {
      var fp = portion(M.fajr) * night;
      if (!isFinite(t.fajr) || (!none && t.sunrise - t.fajr > fp)) t.fajr = t.sunrise - fp;
      if (!M.ishaMin) {
        var ip = portion(M.isha) * night;
        if (!isFinite(t.isha) || (!none && t.isha - t.sunset > ip)) t.isha = t.sunset + ip;
      }
      if (M.maghribDeg) {
        var mp = portion(M.maghribDeg) * night;
        if (!isFinite(t.maghrib) || (!none && t.maghrib - t.sunset > mp)) t.maghrib = t.sunset + mp;
      }
    }
    var adj = o.adj || {},
      madj = M.adj || {},
      base = Date.UTC(y, m - 1, d),
      out = {};
    ORDER.forEach(function (k) {
      var h = t[k] - lng / 15 + ((adj[k] || 0) + (madj[k] || 0)) / 60;
      out[k] = isFinite(h) ? base + Math.round(h * 60) * 60000 : NaN;
    });
    return out;
  }

  /* Civil y-m-d of an epoch in a timezone (IANA name or '' for device). */
  var fmtCache = {},
    dtz = null,
    dtzAt = 0;
  function devTz() {
    var n = Date.now();
    if (n - dtzAt > 30000) {
      dtzAt = n;
      try {
        dtz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch (e) {
        dtz = '';
      }
    }
    return dtz;
  }
  function partsIn(ms, tz) {
    var key = tz || '_' + devTz();
    if (!fmtCache[key]) {
      try {
        fmtCache[key] = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz || dtz || undefined,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        });
      } catch (e) {
        fmtCache[key] = new Intl.DateTimeFormat('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        });
      }
    }
    var p = {};
    fmtCache[key].formatToParts(new Date(ms)).forEach(function (x) {
      p[x.type] = x.value;
    });
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute };
  }
  function keyOf(y, m, d) {
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  function shiftKey(k, n) {
    var a = k.split('-'),
      dt = new Date(Date.UTC(+a[0], +a[1] - 1, +a[2] + n));
    return keyOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  /* Full day (by civil key in location tz) with derived Sunnah windows. */
  function day(key, o) {
    var a = key.split('-').map(Number),
      t = compute(a[0], a[1], a[2], o);
    var nx = shiftKey(key, 1).split('-').map(Number),
      tn = compute(nx[0], nx[1], nx[2], o);
    var off = o.offsets || { ds: 20, de: 15 };
    t.key = key;
    t.nextFajr = tn.fajr;
    var nightLen = tn.fajr - t.maghrib;
    t.midnight = t.maghrib + nightLen / 2;
    t.lastThird = t.maghrib + (nightLen * 2) / 3;
    t.duhaStart = t.sunrise + off.ds * 60000;
    t.duhaEnd = t.dhuhr - off.de * 60000;
    t.duhaBest = t.sunrise + (t.dhuhr - t.sunrise) * 0.75; /* "when the young camels feel the heat", late morning */
    return t;
  }

  /* Qibla: initial great-circle bearing to the Kaʿbah, degrees from true north. */
  var KAABA = { lat: 21.422487, lng: 39.826206 };
  function qibla(lat, lng) {
    var p1 = lat * D2R,
      p2 = KAABA.lat * D2R,
      dl = (KAABA.lng - lng) * D2R;
    var b = Math.atan2(Math.sin(dl), Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dl));
    return fix(b * R2D, 360);
  }
  function distanceKm(lat, lng) {
    var p1 = lat * D2R,
      p2 = KAABA.lat * D2R,
      dp = p2 - p1,
      dl = (KAABA.lng - lng) * D2R;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /* Sun azimuth (deg from true north, clockwise) and altitude at an instant — used for the sun-based qibla. */
  function sunAzAlt(ms, lat, lng) {
    var jd = ms / 86400000 + 2440587.5,
      sp = sunPos(jd),
      dec = sp.decl;
    var d = new Date(ms),
      utcH = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    var H = 15 * (utcH + lng / 15 + sp.eqt - 12);
    var alt = asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H));
    var az = fix(atan2(sin(H), cos(H) * sin(lat) - tan(dec) * cos(lat)) + 180, 360);
    return { az: az, alt: alt };
  }

  /* Recommended method by ISO country code. */
  var BY_COUNTRY = {
    SA: 'makkah',
    YE: 'makkah',
    BH: 'makkah',
    OM: 'makkah',
    AE: 'dubai',
    QA: 'qatar',
    KW: 'kuwait',
    EG: 'egypt',
    SD: 'egypt',
    LY: 'egypt',
    SY: 'egypt',
    LB: 'egypt',
    IQ: 'mwl',
    PS: 'egypt',
    JO: 'jordan',
    PK: 'karachi',
    IN: 'karachi',
    BD: 'karachi',
    AF: 'karachi',
    LK: 'karachi',
    NP: 'karachi',
    US: 'isna',
    CA: 'isna',
    MX: 'isna',
    SG: 'singapore',
    MY: 'jakim',
    BN: 'singapore',
    ID: 'kemenag',
    TR: 'turkey',
    AZ: 'turkey',
    FR: 'france',
    RU: 'russia',
    KZ: 'russia',
    UZ: 'russia',
    TJ: 'russia',
    MA: 'morocco',
    DZ: 'algeria',
    TN: 'tunisia',
    IR: 'mwl'
  };

  root.Prayer = {
    METHODS: METHODS,
    ORDER: ORDER,
    NAMES: NAMES,
    AR: AR,
    compute: compute,
    day: day,
    partsIn: partsIn,
    keyOf: keyOf,
    shiftKey: shiftKey,
    qibla: qibla,
    distanceKm: distanceKm,
    sunAzAlt: sunAzAlt,
    methodFor: function (cc) {
      return BY_COUNTRY[cc] || 'mwl';
    },
    KAABA: KAABA
  };
})(typeof window !== 'undefined' ? window : globalThis);
