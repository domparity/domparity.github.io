import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
// Written by scripts/generate.mjs from data/results.json.
import apis from './sidebars.generated.json';

const sidebars: SidebarsConfig = {
  apis: [
    { type: 'category', label: 'APIs', collapsible: false, items: apis },
    'wpt',
    'about',
  ],
};

export default sidebars;
