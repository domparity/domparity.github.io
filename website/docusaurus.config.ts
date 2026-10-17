import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'domparity',
  tagline: 'Which web platform APIs work, and how, in the DOMs that JavaScript unit tests run on.',
  favicon: 'img/favicon.svg',

  url: 'https://domparity.github.io',
  baseUrl: '/',
  organizationName: 'domparity',
  projectName: 'domparity.github.io',
  trailingSlash: false,
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: {
          showReadingTime: false,
          onInlineAuthors: 'ignore',
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: { defaultMode: 'light', disableSwitch: false, respectPrefersColorScheme: true },
    navbar: {
      title: 'domparity',
      items: [
        { to: '/', label: 'Table', position: 'left', activeBaseRegex: '^/$' },
        { type: 'docSidebar', sidebarId: 'apis', label: 'APIs', position: 'left' },
        { to: '/wpt', label: 'WPT', position: 'left' },
        { to: '/about', label: 'About and method', position: 'left' },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Data',
          items: [
            { label: 'results.json', href: 'pathname:///data/results.json' },
            { label: 'wpt.json', href: 'pathname:///data/wpt.json' },
          ],
        },
        {
          title: 'Project',
          items: [{ label: 'About and method', to: '/about' }],
        },
      ],
      copyright:
        'Maintained by Sonu Kapoor, who also writes warpdom. Code: MIT. Data: CC BY 4.0.',
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
    // Search: add an Algolia DocSearch config here once the site is public.
    // algolia: { appId: '...', apiKey: '...', indexName: 'domparity' },
  } satisfies Preset.ThemeConfig,
};

export default config;
