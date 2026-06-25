#!/usr/bin/env node
/**
 * Validación visual de Creamy — verifica reglas CSS críticas
 */
import fs from 'fs';

const css = fs.readFileSync('assets/creamy/creamy.css', 'utf-8');
const js = fs.readFileSync('assets/creamy/creamy.js', 'utf-8');
let errors = 0;

function check(name, ok, detail) {
  if (!ok) { console.error(`❌ ${name}: ${detail}`); errors++; }
  else console.log(`✅ ${name}`);
}

check('CSS scoped bajo #creamy-widget.creamy-widget', css.includes('#creamy-widget.creamy-widget .creamy-window'), 'falta scope');
check('Desktop width 380px', css.includes('width: 380px'), 'sin ancho fijo desktop');
check('Desktop left auto', css.includes('left: auto'), 'sin left auto');
check('Sin selector body', !css.includes('body.creamy'), 'usa body selector');
check('FAB 72px', css.includes('width: 72px'), 'fab pequeño');
check('Avatar SVG en JS', js.includes('CREAMY_AVATAR_SVG'), 'sin avatar svg');
check('Hover tooltip', js.includes('creamy-fab-tooltip'), 'sin tooltip');
check('Backdrop mobile', css.includes('creamy-backdrop'), 'sin backdrop');
check('Greeting bubble', css.includes('creamy-greeting-bubble'), 'sin saludo');
check('Input scoped', css.includes('#creamy-widget.creamy-widget .creamy-textarea'), 'input sin scope');
check('Mobile bottom sheet', css.includes('height: 85vh'), 'sin mobile sheet');
check('Widget open class', js.includes('creamy-widget--open'), 'sin clase open');
check('Header es div (no header nativo)', js.includes('<div class="creamy-header"'), 'usa header nativo');
check('Sin clases huérfanas minimize/close', !js.includes('creamy-minimize-btn') && !js.includes('creamy-close-btn'), 'clases sin CSS');

console.log(errors ? `\n❌ ${errors} errores` : '\n✅ Validación visual OK');
process.exit(errors);
