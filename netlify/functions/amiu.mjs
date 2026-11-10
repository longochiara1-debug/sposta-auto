const AMIU_URL = "https://www.amiu.genova.it/in-evidenza/cerca-il-tuo-comune/genova/municipio-viii-medio-levante.html";

const WEEKDAYS = {
  domenica: 0,
  lunedi: 1,
  martedi: 2,
  mercoledi: 3,
  giovedi: 4,
  venerdi: 5,
  sabato: 6,
};

function decodeHtml(value = "") {
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&deg;": "°",
    "&agrave;": "à",
    "&egrave;": "è",
    "&eacute;": "é",
    "&igrave;": "ì",
    "&ograve;": "ò",
    "&ugrave;": "ù",
  };

  return value
    .replace(/&(nbsp|amp|quot|apos|deg|agrave|egrave|eacute|igrave|ograve|ugrave|#39);/gi, match => entities[match.toLowerCase()] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function htmlToLines(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtml(text)
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalize(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseItalianDate(value, startTime = "08:00") {
  const match = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${startTime}`;
}

function parseSchedule(schedule) {
  const normalized = normalize(schedule);
  const timeMatch = schedule.match(/(?:dalle|dalle ore)\s*(\d{1,2})[:.](\d{2})\s*(?:alle|alle ore)\s*(\d{1,2})[:.](\d{2})/i);
  const startTime = timeMatch
    ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`
    : "08:00";
  const time = timeMatch
    ? `${startTime}–${timeMatch[3].padStart(2, "0")}:${timeMatch[4]}`
    : "Orario da verificare sul cartello";

  const dates = [...schedule.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g)]
    .map(match => parseItalianDate(match[0], startTime))
    .filter(Boolean);

  if (dates.length) return { dates: [...new Set(dates)], time };

  const recurring = normalized.match(/\b([1-5])\s*°?\s*(domenica|lunedi|martedi|mercoledi|giovedi|venerdi|sabato)\b/);
  if (recurring) {
    return {
      recurrence: {
        ordinal: Number(recurring[1]),
        weekday: WEEKDAYS[recurring[2]],
      },
      time,
    };
  }

  return null;
}

function parseDescriptor(descriptor) {
  const clean = descriptor
    .replace(/\s+spazzamento meccanizzato.*$/i, "")
    .replace(/:\s*(?:il)?\s*$/i, "")
    .trim();
  const areaMatch = clean.match(/^([^,]+),\s*/);
  const area = areaMatch ? areaMatch[1].trim() : "Genova VIII Medio Levante";
  const streetsText = areaMatch ? clean.slice(areaMatch[0].length) : clean;
  const results = [];
  const streetPattern = /(?:^|,\s*)(via|corso|piazza|viale)\s+([^,(]+?)(?:\s*\(([^)]*)\))?(?=,\s*(?:via|corso|piazza|viale)\s+|$)/gi;

  for (const match of streetsText.matchAll(streetPattern)) {
    const type = match[1].toLowerCase();
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    results.push({
      area,
      street: `${typeLabel} ${match[2].trim()}`,
      segment: (match[3] || "").trim(),
    });
  }

  return results;
}

function extractCleaningData(html) {
  const lines = htmlToLines(html);
  const items = [];

  for (let index = 0; index < lines.length; index += 1) {
    const descriptor = lines[index];
    if (!/spazzamento meccanizzato/i.test(descriptor)) continue;

    const scheduleParts = [];
    for (let offset = 1; offset <= 3 && index + offset < lines.length; offset += 1) {
      const candidate = lines[index + offset];
      if (/spazzamento meccanizzato/i.test(candidate)) break;
      scheduleParts.push(candidate);
      if (/\d{1,2}\/\d{1,2}\/\d{4}|[1-5]\s*°?\s*(?:lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)/i.test(normalize(candidate))) break;
    }

    const schedule = parseSchedule(scheduleParts.join(" "));
    if (!schedule) continue;

    for (const location of parseDescriptor(descriptor)) {
      items.push({ ...location, ...schedule });
    }
  }

  const unique = new Map();
  for (const item of items) {
    const key = JSON.stringify([item.area, item.street, item.segment, item.dates || item.recurrence, item.time]);
    unique.set(key, item);
  }
  return [...unique.values()];
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=21600, stale-while-revalidate=86400",
      "access-control-allow-origin": "*",
      ...headers,
    },
  });
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  if (request.method !== "GET") {
    return json({ error: "Metodo non consentito" }, 405, { allow: "GET, OPTIONS" });
  }

  try {
    const response = await fetch(AMIU_URL, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "SpostaAuto/1.0 (+Netlify Function; personal AMIU calendar reader)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`AMIU ha risposto ${response.status}`);
    const html = await response.text();
    const items = extractCleaningData(html);

    if (!items.length) {
      throw new Error("Nessun dato di spazzamento riconosciuto: la pagina AMIU potrebbe essere cambiata");
    }

    return json({
      source: AMIU_URL,
      municipality: "Genova VIII Medio Levante",
      updatedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Errore aggiornamento AMIU", error);
    return json({
      error: "Impossibile aggiornare i dati AMIU",
      detail: error instanceof Error ? error.message : String(error),
      source: AMIU_URL,
    }, 502, { "cache-control": "no-store" });
  }
}

export const config = {
  path: "/api/amiu",
};
