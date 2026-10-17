import { ok, equal } from '../src/assert.mjs';

const SPEC = 'https://drafts.csswg.org/web-animations-1/#dom-animatable-animate';

export default {
  id: 'web-animations',
  title: 'element.animate() / getAnimations()',
  summary: 'The Web Animations API: run keyframe animations from script and list running animations.',
  spec: SPEC,
  exists: (w) => typeof w.document.createElement('div').animate === 'function',
  existsDescription: 'typeof element.animate === "function".',
  checks: [
    {
      id: 'animate-returns-animation',
      description: 'animate(keyframes, 1000) returns an Animation whose playState is "running" and whose finished is a promise.',
      spec: SPEC,
      run(w) {
        const el = w.document.body.appendChild(w.document.createElement('div'));
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], 1000);
        ok(a && typeof a === 'object', 'animate() returned no object');
        equal(a.playState, 'running', 'playState');
        ok(a.finished && typeof a.finished.then === 'function', 'finished is not a promise');
        a.cancel();
      },
    },
    {
      id: 'get-animations',
      description: 'element.getAnimations() includes the animation just started.',
      spec: 'https://drafts.csswg.org/web-animations-1/#dom-animatable-getanimations',
      run(w) {
        const el = w.document.body.appendChild(w.document.createElement('div'));
        equal(typeof el.getAnimations, 'function', 'typeof getAnimations');
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], 1000);
        ok(el.getAnimations().includes(a), 'animation not listed');
        a.cancel();
      },
    },
  ],
};
