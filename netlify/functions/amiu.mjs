const AMIU_URL =
  "https://www.amiu.genova.it/in-evidenza/cerca-il-tuo-comune/genova/municipio-viii-medio-levante.html";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",

      // Importante durante la diagnosi:
      // vogliamo dati freschi a ogni chiamata.
      "cache-control": "no-store",
    },
  });
}

function makeSnippet(text, position, radius = 1000) {
  if (position < 0) {
    return null;
  }

  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);

  return text
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
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
    return json(
      {
        error: "Metodo non consentito",
      },
      405
    );
  }

  try {
    const response = await fetch(AMIU_URL, {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "accept-language":
          "it-IT,it;q=0.9,en;q=0.8",

        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      },

      redirect: "follow",

      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();

    const lower = html.toLowerCase();

    const positionSpazzamento =
      lower.indexOf("spazzamento meccanizzato");

    const positionIgiene =
      lower.indexOf("igiene urbana");

    const positionCasaregis =
      lower.indexOf("casaregis");

    const positionTorino =
      lower.indexOf("corso torino");

    const positionTommaseo =
      lower.indexOf("tommaseo");

    const positionPiave =
      lower.indexOf("via piave");

    const diagnostic = {
      diagnosticMode: true,

      message:
        "Questa risposta serve solo a diagnosticare il contenuto restituito da AMIU a Netlify.",

      requestedUrl: AMIU_URL,

      fetchedUrl: response.url,

      httpStatus: response.status,

      httpStatusText: response.statusText,

      ok: response.ok,

      redirected: response.redirected,

      contentType:
        response.headers.get("content-type"),

      contentLengthHeader:
        response.headers.get("content-length"),

      htmlLength: html.length,

      checks: {
        containsSpazzamentoMeccanizzato:
          positionSpazzamento >= 0,

        containsIgieneUrbana:
          positionIgiene >= 0,

        containsCasaregis:
          positionCasaregis >= 0,

        containsCorsoTorino:
          positionTorino >= 0,

        containsTommaseo:
          positionTommaseo >= 0,

        containsViaPiave:
          positionPiave >= 0,
      },

      positions: {
        spazzamentoMeccanizzato:
          positionSpazzamento,

        igieneUrbana:
          positionIgiene,

        casaregis:
          positionCasaregis,

        corsoTorino:
          positionTorino,

        tommaseo:
          positionTommaseo,

        viaPiave:
          positionPiave,
      },

      beginningOfHtml: html
        .slice(0, 1500)
        .replace(/\s+/g, " ")
        .trim(),

      snippetAroundSpazzamento:
        makeSnippet(
          html,
          positionSpazzamento
        ),

      snippetAroundCasaregis:
        makeSnippet(
          html,
          positionCasaregis
        ),

      snippetAroundCorsoTorino:
        makeSnippet(
          html,
          positionTorino
        ),

      timestamp:
        new Date().toISOString(),
    };

    return json(diagnostic);
  } catch (error) {
    console.error(
      "Diagnostica AMIU fallita:",
      error
    );

    return json(
      {
        diagnosticMode: true,

        error:
          "Impossibile recuperare la pagina AMIU",

        errorName:
          error instanceof Error
            ? error.name
            : null,

        detail:
          error instanceof Error
            ? error.message
            : String(error),

        source: AMIU_URL,

        timestamp:
          new Date().toISOString(),
      },
      502
    );
  }
}

export const config = {
  path: "/api/amiu",
};
