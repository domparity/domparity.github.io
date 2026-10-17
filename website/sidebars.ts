import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
// Written by scripts/generate.mjs from data/results.json.
import apis from './sidebars.generated.json';

const sidebars: SidebarsConfig = {
  apis: [
    { type: 'category', label: 'Featured APIs', collapsible: false, items: apis },
    { type: 'link', label: 'Coverage: every API', href: '/coverage' },
    'wpt',
    'changes',
    'about',
  ],
};

export default sidebars;
