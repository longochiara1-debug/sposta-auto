const AMIU_URL =
  "https://www.amiu.genova.it/in-evidenza/cerca-il-tuo-comune/genova/municipio-viii-medio-levante.html";

const SAFE_DATA = [
  {
    area: "Foce",
    street: "Corso Torino",
    segment: "da Via Tolemaide a Corso Buenos Aires, ambo i lati",
    recurrence: {
      ordinal: 2,
      weekday: 1,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Foce",
    street: "Piazza Tommaseo",
    segment: "tratto adiacente Scalinata Borghese",
    recurrence: {
      ordinal: 4,
      weekday: 1,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Foce",
    street: "Via Casaregis",
    segment: "da Corso Buenos Aires a Via Pisacane",
    recurrence: {
      ordinal: 2,
      weekday: 5,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Foce",
    street: "Via Casaregis",
    segment: "da Via Pisacane a Via Ruspoli",
    recurrence: {
      ordinal: 3,
      weekday: 2,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Foce",
    street: "Via Casaregis",
    segment: "da Via Tolemaide a Corso Buenos Aires",
    recurrence: {
      ordinal: 4,
      weekday: 2,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Albaro",
    street: "Piazza Dunant",
    segment: "lato monte",
    recurrence: {
      ordinal: 2,
      weekday: 1,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Albaro",
    street: "Piazza Dunant",
    segment: "lato mare",
    recurrence: {
      ordinal: 2,
      weekday: 1,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Albaro",
    street: "Via Piave",
    segment: "a scendere",
    recurrence: {
      ordinal: 4,
      weekday: 3,
    },
    time: "Orario da verificare sul cartello",
  },
  {
    area: "Albaro",
    street: "Via Piave",
    segment: "a salire",
    recurrence: {
      ordinal: 4,
      weekday: 5,
    },
    time: "Orario da verificare sul cartello",
  },
];

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
    .replace(
      /&(nbsp|amp|quot|apos|deg|agrave|egrave|eacute|igrave|ograve|ugrave|#39);/gi,
      (match) => entities[match.toLowerCase()] || match
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(
        /<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/td|\/th)>/gi,
        "\n"
      )
      .replace(/<[^>]+>/g, " ")
  )
  
