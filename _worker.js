
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwvA9BW_gkIe56ir1bcEp7LA5rHXA4od5JaV49eTXJLaWlf7lIwkfmsuRc5VXl33_fUdw/exec";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname === "/api/") {
      if (request.method !== "POST") {
        return respuesta({
          ok: false,
          mensaje: "MÉTODO NO PERMITIDO."
        }, 405);
      }

      const origen = request.headers.get("Origin");

      if (origen && new URL(origen).host !== url.host) {
        return respuesta({
          ok: false,
          mensaje: "ORIGEN NO AUTORIZADO."
        }, 403);
      }

      try {
        const datos = await request.json();

        const accionesPermitidas = [
          "login",
          "validate",
          "logout"
        ];

        if (!accionesPermitidas.includes(datos.action)) {
          return respuesta({
            ok: false,
            mensaje: "ACCIÓN NO RECONOCIDA."
          }, 400);
        }

        if (!env.API_SECRET) {
          return respuesta({
            ok: false,
            mensaje: "FALTA CONFIGURAR API_SECRET EN CLOUDFLARE."
          }, 500);
        }

        const respuestaGoogle = await fetch(URL_APPS_SCRIPT, {
          method: "POST",
          redirect: "follow",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...datos,
            secret: env.API_SECRET
          })
        });

        const texto = await respuestaGoogle.text();

        let resultado;

        try {
          resultado = JSON.parse(texto);

        } catch (error) {
          return respuesta({
            ok: false,
            mensaje:
              "GOOGLE NO HA DEVUELTO JSON. DETALLE: " +
              texto.substring(0, 500),
            estadoHTTP: respuestaGoogle.status,
            tipoContenido:
              respuestaGoogle.headers.get("Content-Type")
          }, 502);
        }

        return respuesta(resultado, 200);

      } catch (error) {
        return respuesta({
          ok: false,
          mensaje: "ERROR DE COMUNICACIÓN CON EL SISTEMA.",
          detalle: String(error.message || error)
        }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};


function respuesta(datos, estado) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
