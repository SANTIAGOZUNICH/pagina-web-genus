/**
 * Parse request body for Vercel serverless (handles string, object, or stream).
 */
export async function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return null;
      }
    }
    if (typeof req.body === 'object') return req.body;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Respuestas de respaldo desde knowledge cuando OpenAI no está disponible.
 */
export function getKnowledgeFallback(message, knowledge) {
  const lower = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

  if (/\b(moq|minim[ao]s?|cantidad minima|unidades minimas|cuantas unidades)\b/.test(lower)) {
    const moq = knowledge.comercial.moq_desarrollo_fabricacion;
    const llave = knowledge.comercial.moq_llave_en_mano;
    return `En Laboratorio Genus trabajamos con un **mínimo de ${moq} unidades** para desarrollo y fabricación cosmética. El servicio **llave en mano** (desarrollo + producción + envase + etiqueta) arranca desde **${llave} unidades**.\n\nSi me contás qué producto tenés en mente, te ayudo a evaluar qué modalidad te conviene más.`;
  }

  if (/\bserum\b.*\bniacinamida\b|\bniacinamida\b.*\bserum\b/.test(lower)) {
    return `**Excelente elección.** Un serum de niacinamida es una muy buena opción para una primera línea de skincare: es versátil, tiene buena aceptación comercial y se adapta bien a pieles mixtas o grasas.\n\nPara hacerlo más completo, yo evaluaría combinarla con **ácido hialurónico** (hidratación) o **Zinc PCA** si buscás foco en oleosidad y poros.\n\nEn Laboratorio Genus lo podemos desarrollar desde **500 unidades**, con fórmula personalizada y muestra previa. ¿Buscás algún beneficio principal: unificación de tono, control de grasa o hidratación?`;
  }

  if (/\bretinol\b.*\bvitamina\s*c\b|\bvitamina\s*c\b.*\bretinol\b|\bmezclar\b.*\bretinol\b/.test(lower)) {
    return `**Yo no recomendaría combinar retinol y vitamina C pura en el mismo producto.** Son activos exigentes: el retinol prefiere pH más neutro y la vitamina C pura (ácido ascórbico) necesita pH ácido — además, juntos aumentan el riesgo de irritación.\n\n**En mi experiencia funciona mejor** separarlos en la rutina: vitamina C (o un derivado estable) por la mañana y retinol por la noche. Si querés ambos en una línea, podemos formular un serum con **retinol** y otro con **vitamina C estabilizada** (ascorbil glucósido o MAP).\n\n¿Es para uso diario o estás pensando en un solo producto multitarea?`;
  }

  return null;
}
