import { GoogleGenAI, Type, createPartFromFunctionResponse } from '@google/genai';
import { describirAlerta, glosarioDeAlertas } from './alertas.js';
import pool from './db.js';

// Free tier: sin tarjeta, sin costo. Se desactivan los reintentos internos del SDK (5 intentos con espera de
// hasta 60 s ante un 429/503): el cambio al siguiente modelo (generarConRespaldo) ya cubre ese caso y así un
// modelo sin cuota falla en ~1 s en vez de bloquear la respuesta.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { retryOptions: { attempts: 1 }, timeout: 20000 },
});

// Modelos gratuitos en orden de preferencia. La cuota gratuita es por modelo (p. ej. gemini-2.5-flash
// permite ~20 peticiones al día), así que si uno se agota o no está disponible se pasa al siguiente.
// Se puede cambiar con GEMINI_MODELS="modelo1,modelo2,..." sin tocar el código.
const MODELOS = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-flash-latest,gemini-flash-lite-latest')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const ESTADOS_CON_RESPALDO = new Set([404, 429, 500, 503]); // modelo inexistente, sin cuota, error o saturado
const modeloEnEspera = new Map(); // modelo -> timestamp hasta el que no se vuelve a intentar

// Segundos que Google pide esperar (campo retryDelay del 429); entre 30 s y 1 h para volver a probar pronto.
const segundosDeEspera = (error) => {
  const match = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(String(error?.message ?? ''));
  return Math.min(Math.max(match ? Number(match[1]) : 60, 30), 3600);
};

async function generarConRespaldo(params) {
  const ahora = Date.now();
  const disponibles = MODELOS.filter((m) => (modeloEnEspera.get(m) ?? 0) <= ahora);
  const candidatos = disponibles.length > 0 ? disponibles : MODELOS;
  let ultimoError;

  for (const model of candidatos) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (error) {
      if (!ESTADOS_CON_RESPALDO.has(error?.status)) throw error;
      ultimoError = error;
      modeloEnEspera.set(model, Date.now() + segundosDeEspera(error) * 1000);
      console.warn(`Modelo ${model} no disponible (${error.status}); se prueba el siguiente.`);
    }
  }
  throw ultimoError;
}

const SYSTEM_PROMPT = `Eres el asistente de AbejaNet, una app de monitoreo de colmenas con sensores IoT.
Respondes preguntas frecuentes sobre la app y das recomendaciones sobre el estado de las colmenas
del usuario, basándote SIEMPRE en datos reales obtenidos con las herramientas disponibles.

Reglas:
- IDIOMA: responde SIEMPRE en el idioma del último mensaje del usuario. Si te escribe en inglés, responde
  completamente en inglés (If the user writes in English, answer fully in English). Si no queda claro, usa
  el idioma configurado en la app del usuario (se indica al final de estas instrucciones).
- Nunca inventes datos de sensores, alertas o colmenas. Si necesitas datos, usa las herramientas.
- LA AUSENCIA DE DATOS NO ES UNA BUENA NOTICIA: nunca digas que "no hay problemas" o que "todo está bien" solo
  porque una herramienta devolvió una lista vacía. Solo puedes afirmarlo si hay lecturas recientes de una colmena
  y no tiene alertas. Si el usuario no tiene colmenas, si la colmena que menciona no existe entre las suyas, o si
  una colmena no tiene sensor ni lecturas, dilo de forma explícita y clara (por ejemplo: "Todavía no tienes
  colmenas registradas; pide acceso al administrador de tu apiario").
- Solo puedes ver información de las colmenas del usuario que está preguntando (ya filtrado por el backend).
- Si detectas una tendencia preocupante (ej. peso bajando fuerte, temperatura muy alta), sugiere revisar
  la colmena en persona, pero deja claro que no reemplazas el criterio del apicultor.
- ALERTAS: si el usuario pregunta por alertas, avisos, notificaciones o "si pasó algo", usa
  consultar_alertas_recientes (no respondas de memoria). Resume por colmena empezando por lo más grave (EXTREMA y
  CAMBIO BRUSCO primero) y por las no leídas. De cada alerta di qué ocurrió (valor y fecha), qué significa (usa el
  campo "significado" y el glosario de alertas) y qué revisar. Para calor extremo o cambio brusco recomienda revisar la
  colmena DE INMEDIATO (posible incendio o fallo del sensor). Si pregunta por qué se alertó, explica el umbral. Una alerta
  antigua y ya leída es menos urgente: dilo. Todas las alertas automáticas son críticas y le llegan a TODOS los usuarios a
  cargo de la colmena como notificación push.
- Respuestas breves y claras, pensadas para alguien usando un celular.`;

// ------------------------------------------------------------------
// Declaraciones de herramientas (formato Gemini) + funciones reales.
// Las funciones reciben el usuarioId autenticado por closure — NUNCA
// confiamos en un id que "proponga" el modelo.
// ------------------------------------------------------------------

const TOOL_DECLARATIONS = [
  {
    name: 'listar_colmenas',
    description: 'Lista las colmenas a las que tiene acceso el usuario actual, con su apiario.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'consultar_alertas_recientes',
    description: 'Devuelve las alertas más recientes de una colmena del usuario (o de todas si no se especifica nombre). Cada alerta trae su tipo, valor, mensaje, fecha, si ya fue leída, su nivel (critico, extremo, salto u otro) y un texto "significado" que explica qué quiere decir.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        colmena_nombre: { type: Type.STRING, description: 'Nombre exacto de la colmena. Omite para ver alertas de todas las colmenas del usuario.' },
        limite: { type: Type.INTEGER, description: 'Cuántas alertas devolver (default 10).' },
      },
    },
  },
  {
    name: 'consultar_tendencia_sensor',
    description: 'Promedios y últimos valores de temperatura, humedad, peso y presión atmosférica (hPa; puede ser nula si la colmena no tiene sensor de presión) de una colmena del usuario en los últimos N días.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        colmena_nombre: { type: Type.STRING, description: 'Nombre exacto de la colmena.' },
        dias: { type: Type.INTEGER, description: 'Ventana de días a analizar (default 7).' },
      },
      required: ['colmena_nombre'],
    },
  },
];

function buildToolRunners(usuarioId) {
  return {
    listar_colmenas: async () => {
      const { rows } = await pool.query(
        `SELECT c.id, c.nombre, a.nombre AS apiario
         FROM colmenas c
         JOIN apiarios a ON c.apiario_id = a.id
         JOIN usuarios_apiarios ua ON ua.apiario_id = a.id
         WHERE ua.usuario_id = $1
         ORDER BY c.nombre`,
        [usuarioId]
      );
      if (rows.length === 0) {
        return { colmenas: [], mensaje: 'El usuario NO tiene ninguna colmena asignada ni acceso a ningún apiario.' };
      }
      return rows;
    },
    consultar_alertas_recientes: async ({ colmena_nombre, limite }) => {
      const { rows } = await pool.query(
        `SELECT al.tipo_alerta, al.valor_registrado, al.mensaje, al.leida, al.fecha_alerta, c.nombre AS colmena
         FROM alertas al
         JOIN colmenas c ON al.colmena_id = c.id
         JOIN apiarios a ON c.apiario_id = a.id
         JOIN usuarios_apiarios ua ON ua.apiario_id = a.id
         WHERE ua.usuario_id = $1
           AND ($2::text IS NULL OR c.nombre = $2)
         ORDER BY al.fecha_alerta DESC
         LIMIT $3`,
        [usuarioId, colmena_nombre ?? null, limite ?? 10]
      );
      if (rows.length === 0) {
        // Una lista vacía no significa "sin problemas": hay que distinguir por qué está vacía.
        const { rows: propias } = await pool.query(
          `SELECT c.nombre FROM colmenas c
           JOIN usuarios_apiarios ua ON ua.apiario_id = c.apiario_id
           WHERE ua.usuario_id = $1 AND ($2::text IS NULL OR c.nombre = $2)`,
          [usuarioId, colmena_nombre ?? null]
        );
        if (propias.length === 0) {
          return {
            alertas: [],
            mensaje: colmena_nombre
              ? `No existe ninguna colmena llamada "${colmena_nombre}" entre las colmenas del usuario.`
              : 'El usuario NO tiene ninguna colmena asignada, por eso no hay alertas.',
          };
        }
        return {
          alertas: [],
          mensaje: 'No hay alertas registradas. Esto por sí solo no confirma que todo esté bien: verifica con consultar_tendencia_sensor que la colmena tenga lecturas recientes.',
        };
      }
      // Cada alerta lleva su nivel y su significado (con los umbrales reales del sistema) para que el asistente la explique.
      const alertas = rows.map((a) => ({ ...a, ...describirAlerta(a.tipo_alerta) }));
      return { total: alertas.length, no_leidas: alertas.filter((a) => !a.leida).length, alertas };
    },
    consultar_tendencia_sensor: async ({ colmena_nombre, dias }) => {
      const { rows } = await pool.query(
        `SELECT
           ROUND(AVG(la.temperatura)::numeric, 1) AS temp_promedio,
           ROUND(AVG(la.humedad)::numeric, 1) AS humedad_promedio,
           ROUND(AVG(la.peso)::numeric, 2) AS peso_promedio,
           (ARRAY_AGG(la.peso ORDER BY la.fecha_registro DESC))[1] AS peso_mas_reciente,
           (ARRAY_AGG(la.peso ORDER BY la.fecha_registro ASC))[1] AS peso_mas_antiguo,
           ROUND(AVG(la.presion)::numeric, 1) AS presion_promedio_hpa,
           (ARRAY_AGG(la.presion ORDER BY la.fecha_registro DESC) FILTER (WHERE la.presion IS NOT NULL))[1] AS presion_mas_reciente_hpa,
           (ARRAY_AGG(la.presion ORDER BY la.fecha_registro ASC) FILTER (WHERE la.presion IS NOT NULL))[1] AS presion_mas_antigua_hpa,
           COUNT(*) AS lecturas_analizadas
         FROM lecturas_ambientales la
         JOIN sensores s ON la.sensor_id = s.id
         JOIN colmenas c ON s.colmena_id = c.id
         JOIN apiarios a ON c.apiario_id = a.id
         JOIN usuarios_apiarios ua ON ua.apiario_id = a.id
         WHERE ua.usuario_id = $1
           AND c.nombre = $2
           AND la.fecha_registro >= NOW() - ($3 || ' days')::interval`,
        [usuarioId, colmena_nombre, String(dias ?? 7)]
      );
      const resumen = rows[0];
      if (!resumen || Number(resumen.lecturas_analizadas) === 0) {
        return {
          lecturas_analizadas: 0,
          mensaje: `No hay lecturas en los últimos ${dias ?? 7} días para la colmena "${colmena_nombre}": puede que no exista entre las colmenas del usuario, que no tenga sensor asignado o que el sensor esté sin conexión.`,
        };
      }
      return resumen;
    },
  };
}

// ------------------------------------------------------------------
// Historial de conversación: el cliente lo manda completo en cada
// petición (la API no guarda sesión). Se sanea antes de usarlo —
// nunca se confía en la forma/tamaño de lo que mande el body.
// ------------------------------------------------------------------

const MAX_TURNOS_HISTORIAL = 10;
const MAX_LARGO_TEXTO = 2000;

function construirHistorial(historial) {
  if (!Array.isArray(historial)) return [];
  return historial
    .filter((turno) => turno && (turno.role === 'user' || turno.role === 'model') && typeof turno.text === 'string' && turno.text.trim())
    .slice(-MAX_TURNOS_HISTORIAL)
    .map((turno) => ({
      role: turno.role,
      parts: [{ text: turno.text.slice(0, MAX_LARGO_TEXTO) }],
    }));
}

// ------------------------------------------------------------------
// Loop principal: manda la pregunta (con el historial previo, si lo
// hay) y ejecuta function calls hasta que Gemini responda con texto
// final (sin más function calls pendientes).
// ------------------------------------------------------------------

// Idioma configurado en la app ("es" o "en"); cualquier otro valor cae en español.
const instruccionIdiomaApp = (idioma) =>
  `Idioma configurado en la app del usuario: ${idioma === 'en' ? 'inglés (English)' : 'español'}. ` +
  'Úsalo SOLO como respaldo cuando el mensaje del usuario no deje claro su idioma (por ejemplo "ok" o "hola"); ' +
  'si el usuario escribe en otro idioma, responde en el idioma del usuario.';

// Dato real del servidor (no del modelo) sobre cuántas colmenas tiene el usuario, para que el asistente no
// confunda "sin colmenas" con "sin problemas". Si la consulta falla no se bloquea el chat.
async function estadoColmenasUsuario(usuarioId) {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM colmenas c
       JOIN usuarios_apiarios ua ON ua.apiario_id = c.apiario_id
       WHERE ua.usuario_id = $1`,
      [usuarioId]
    );
    const total = rows[0]?.total ?? 0;
    if (total === 0) {
      return 'DATO VERIFICADO DEL SERVIDOR: este usuario NO tiene ninguna colmena asignada. Si pregunta por sus colmenas, ' +
        'alertas, problemas, estado o datos, respóndele claramente que todavía no tiene colmenas registradas ni acceso ' +
        'a ningún apiario y que debe pedir acceso al administrador. Nunca digas que no hay problemas. ' +
        'Puedes seguir respondiendo preguntas generales sobre cómo usar la app.';
    }
    return `DATO VERIFICADO DEL SERVIDOR: este usuario tiene acceso a ${total} colmena(s).`;
  } catch (error) {
    console.error('No se pudo consultar el estado de colmenas del usuario para el chatbot:', error.message);
    return '';
  }
}

export async function responderPregunta(pregunta, usuarioId, historial = [], idioma = 'es') {
  const runners = buildToolRunners(usuarioId);
  const systemInstruction = `${SYSTEM_PROMPT}\n${glosarioDeAlertas()}\n${instruccionIdiomaApp(idioma)}\n${await estadoColmenasUsuario(usuarioId)}`;
  const contents = [
    ...construirHistorial(historial),
    { role: 'user', parts: [{ text: pregunta }] },
  ];

  for (let turno = 0; turno < 5; turno++) {
    const response = await generarConRespaldo({
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
    });

    const calls = response.functionCalls;
    if (!calls || calls.length === 0) {
      return response.text ?? 'No tengo una respuesta para eso.';
    }

    // Guarda el turno del modelo (con las function calls) en el historial
    contents.push(response.candidates[0].content);

    const responseParts = await Promise.all(
      calls.map(async (call) => {
        try {
          const runner = runners[call.name];
          const result = await runner(call.args ?? {});
          return createPartFromFunctionResponse(call.id ?? call.name, call.name, { result });
        } catch (error) {
          console.error(`Error ejecutando herramienta ${call.name}:`, error);
          return createPartFromFunctionResponse(call.id ?? call.name, call.name, { error: 'No se pudo obtener ese dato en este momento.' });
        }
      })
    );
    contents.push({ role: 'user', parts: responseParts });
  }

  return 'No pude terminar de procesar tu pregunta, intenta de nuevo.';
}
