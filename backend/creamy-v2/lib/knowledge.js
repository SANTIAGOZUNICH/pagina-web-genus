import fs from 'fs';
import path from 'path';

let cached = null;

export function loadKnowledge() {
  if (cached) return cached;
  const file = path.join(process.cwd(), 'backend/creamy-v2/knowledge/laboratorio.json');
  cached = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return cached;
}

export function formatKnowledgeForPrompt(knowledge) {
  const k = knowledge;
  return `
# BASE DE CONOCIMIENTO — LABORATORIO GENUS (usar como fuente para datos del lab)

## Contacto
- Web: ${k.laboratorio.web}
- Email: ${k.laboratorio.email}
- WhatsApp: ${k.laboratorio.telefono}

## Comercial
- MOQ desarrollo/fabricación: ${k.comercial.moq_desarrollo_fabricacion} unidades
- MOQ llave en mano: ${k.comercial.moq_llave_en_mano} unidades
- ${k.comercial.nota_moq}

## Servicios
${k.servicios.map((s) => `- ${s.nombre}: ${s.descripcion} (MOQ: ${s.moq})`).join('\n')}

## Proceso (${k.proceso.length} etapas)
${k.proceso.map((p) => `${p.paso}. ${p.nombre}: ${p.descripcion}`).join('\n')}

## Tiempos referenciales
- Desarrollo/muestra: ${k.tiempos_referenciales.desarrollo_muestra}
- Producción post-aprobación: ${k.tiempos_referenciales.produccion_post_aprobacion}
- ANMAT: ${k.tiempos_referenciales.registros_anmat}
- ${k.tiempos_referenciales.nota}

## Líneas de producto
${k.lineas_producto.join(', ')}

## Restricciones
- NO fabricamos: ${k.restricciones.no_fabricamos.join(', ')}
- SÍ fabricamos: ${k.restricciones.si_fabricamos.join(', ')}
- Perfumes: ${k.restricciones.perfumes}
- Claims prohibidos: ${k.restricciones.claims_prohibidos.join(', ')}

## Calidad y ANMAT
${k.calidad.descripcion}
${k.anmat.descripcion}

## Activos destacados (referencia rápida)
${Object.entries(k.activos_destacados)
  .map(([id, a]) => `- ${id}: ${a.uso}. ${a.nota || ''}`)
  .join('\n')}

## Compatibilidades clave
${k.compatibilidades_clave.map((c) => `- ${c.combinacion}: ${c.veredicto}. ${c.nota}`).join('\n')}

## Criterio consultor (aplicar en cada respuesta)
- Rol: ${k.criterio_consultor?.rol || 'Consultor senior en formulación cosmética'}
- Objetivo: ${k.criterio_consultor?.objetivo || 'Asesorar, no solo responder'}
${(k.criterio_consultor?.siempre_que_posible || []).map((item) => `- ${item}`).join('\n')}
- Tono: ${k.criterio_consultor?.tono || 'Opinión profesional con fundamento'}
`.trim();
}

export function getPageHint(pageKey, knowledge) {
  return knowledge.page_hints?.[pageKey] || knowledge.page_hints?.index || null;
}
