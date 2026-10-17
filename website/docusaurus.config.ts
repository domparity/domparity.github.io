import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DOMParity',
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

  headTags: [
    { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
    { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' } },
    { tagName: 'link', attributes: { rel: 'apple-touch-icon', href: '/img/apple-touch-icon.png' } },
  ],
  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Montserrat:wght@400;700&display=swap',
  ],

  // Per-spec and per-interface Coverage pages, from ../data/idl.json.
  plugins: ['./plugins/coverage.mjs'],

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
    image: 'img/social-card.png',
    colorMode: { defaultMode: 'light', disableSwitch: false, respectPrefersColorScheme: true },
    navbar: {
      logo: { alt: 'DOMParity', src: 'img/logo.svg', srcDark: 'img/logo-dark.svg', height: 36 },
      items: [
        { to: '/', label: 'Featured', position: 'left', activeBaseRegex: '^/$' },
        { to: '/coverage', label: 'Coverage', position: 'left', activeBaseRegex: '^/coverage' },
        { type: 'docSidebar', sidebarId: 'apis', label: 'APIs', position: 'left' },
        { to: '/wpt', label: 'WPT', position: 'left' },
        { to: '/about', label: 'About', position: 'left' },
        { href: 'https://github.com/domparity/domparity.github.io', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Data',
          items: [
            { label: 'results.json', href: 'pathname:///data/results.json' },
            { label: 'idl.json', href: 'pathname:///data/idl.json' },
            { label: 'spec-groups.json', href: 'pathname:///data/spec-groups.json' },
            { label: 'wpt.json', href: 'pathname:///data/wpt.json' },
            { label: 'changelog.json', href: 'pathname:///data/changelog.json' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'About and method', to: '/about' },
            { label: 'What changed', to: '/changes' },
            { label: 'Report a wrong result', href: 'https://github.com/domparity/domparity.github.io/issues/new?template=wrong-result.yml' },
            { label: 'Sponsor the maintainer', href: 'https://github.com/sponsors/sonukapoor' },
          ],
        },
      ],
      copyright:
        'Maintained by <a href="https://sonukapoor.com">Sonu Kapoor</a>, who also writes <a href="https://github.com/sonukapoor/warpdom">warpdom</a>. Code: MIT. Data: CC BY 4.0.',
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
    // Search: add an Algolia DocSearch config here once the site is public.
    // algolia: { appId: '...', apiKey: '...', indexName: 'domparity' },
  } satisfies Preset.ThemeConfig,
};

export default config;
