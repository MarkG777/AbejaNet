import { GoogleGenAI, Type, createPartFromFunctionResponse } from '@google/genai';
import pool from './db.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Free tier: sin tarjeta, sin costo

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
- Solo puedes ver información de las colmenas del usuario que está preguntando (ya filtrado por el backend).
- Si detectas una tendencia preocupante (ej. peso bajando fuerte, temperatura muy alta), sugiere revisar
  la colmena en persona, pero deja claro que no reemplazas el criterio del apicultor.
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
    description: 'Devuelve las alertas más recientes de una colmena del usuario (o de todas si no se especifica nombre).',
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
    description: 'Promedios y últimos valores de temperatura, humedad y peso de una colmena del usuario en los últimos N días.',
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
      return rows;
    },
    consultar_tendencia_sensor: async ({ colmena_nombre, dias }) => {
      const { rows } = await pool.query(
        `SELECT
           ROUND(AVG(la.temperatura)::numeric, 1) AS temp_promedio,
           ROUND(AVG(la.humedad)::numeric, 1) AS humedad_promedio,
           ROUND(AVG(la.peso)::numeric, 2) AS peso_promedio,
           (ARRAY_AGG(la.peso ORDER BY la.fecha_registro DESC))[1] AS peso_mas_reciente,
           (ARRAY_AGG(la.peso ORDER BY la.fecha_registro ASC))[1] AS peso_mas_antiguo,
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
      return rows[0] ?? null;
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

export async function responderPregunta(pregunta, usuarioId, historial = [], idioma = 'es') {
  const runners = buildToolRunners(usuarioId);
  const systemInstruction = `${SYSTEM_PROMPT}\n${instruccionIdiomaApp(idioma)}`;
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
