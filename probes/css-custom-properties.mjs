import { equal } from '../src/assert.mjs';

const SPEC = 'https://drafts.csswg.org/css-variables/#defining-variables';

export default {
  id: 'css-custom-properties',
  title: 'CSS custom properties (--*) and var()',
  summary: 'Author-defined properties that inherit and are substituted with var().',
  spec: SPEC,
  exists: (w) => {
    const el = w.document.createElement('div');
    return !!el.style && typeof el.style.setProperty === 'function' && typeof el.style.getPropertyValue === 'function';
  },
  existsDescription: 'element.style has setProperty() and getPropertyValue().',
  checks: [
    {
      id: 'inline-roundtrip',
      description: 'style.setProperty("--gap", "10px") is read back by style.getPropertyValue("--gap").',
      spec: 'https://drafts.csswg.org/cssom/#dom-cssstyledeclaration-setproperty',
      run(w) {
        const el = w.document.createElement('div');
        el.style.setProperty('--gap', '10px');
        equal(el.style.getPropertyValue('--gap'), '10px', 'getPropertyValue("--gap")');
      },
    },
    {
      id: 'computed-inherited',
      description: 'A custom property from a stylesheet rule on the parent is inherited: getComputedStyle(child).getPropertyValue("--gap") is "10px".',
      spec: 'https://drafts.csswg.org/css-variables/#defining-variables',
      run(w) {
        const d = w.document;
        d.head.appendChild(d.createElement('style')).textContent = '.p { --gap: 10px }';
        const parent = d.body.appendChild(d.createElement('div'));
        parent.className = 'p';
        const child = parent.appendChild(d.createElement('span'));
        equal(w.getComputedStyle(child).getPropertyValue('--gap').trim(), '10px', 'computed --gap');
      },
    },
    {
      id: 'var-substitution',
      description: 'color: var(--c) with --c: red computes to "rgb(255, 0, 0)".',
      spec: 'https://drafts.csswg.org/css-variables/#using-variables',
      run(w) {
        const d = w.document;
        const el = d.body.appendChild(d.createElement('div'));
        el.setAttribute('style', '--c: red; color: var(--c)');
        equal(w.getComputedStyle(el).color, 'rgb(255, 0, 0)', 'computed color');
      },
    },
  ],
};
