import { ok, equal, throwsNamed } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/forms.html#dom-form-requestsubmit';

function form(w, html) {
  const f = w.document.body.appendChild(w.document.createElement('form'));
  f.innerHTML = html;
  return f;
}

export default {
  id: 'request-submit',
  title: 'form.requestSubmit()',
  summary: 'Submits a form as if a submit button were clicked: validation runs and a cancelable "submit" event fires.',
  spec: SPEC,
  exists: (w) => typeof w.document.createElement('form').requestSubmit === 'function',
  existsDescription: 'typeof form.requestSubmit === "function".',
  checks: [
    {
      id: 'submit-event-submitter',
      description: 'requestSubmit(button) fires a cancelable "submit" event whose submitter is that button.',
      spec: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm',
      run(w) {
        const f = form(w, '<button id="go" type="submit">Go</button>');
        let ev;
        f.addEventListener('submit', (e) => {
          ev = e;
          e.preventDefault();
        });
        f.requestSubmit(f.querySelector('#go'));
        ok(ev, '"submit" event did not fire');
        equal(ev.cancelable, true, 'event.cancelable');
        ok(ev.submitter === f.querySelector('#go'), 'event.submitter is not the button');
      },
    },
    {
      id: 'validation-blocks',
      description: 'With an empty required field, requestSubmit() fires "invalid" on it and no "submit" event.',
      spec: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#interactively-validate-the-constraints',
      run(w) {
        const f = form(w, '<input name="q" required>');
        let submitted = false;
        let invalid = false;
        f.addEventListener('submit', (e) => {
          submitted = true;
          e.preventDefault();
        });
        f.querySelector('input').addEventListener('invalid', () => (invalid = true));
        f.requestSubmit();
        equal(submitted, false, '"submit" fired');
        equal(invalid, true, '"invalid" fired');
      },
    },
    {
      id: 'non-submit-button-throws',
      description: 'requestSubmit(el) with an element that is not a submit button throws a TypeError.',
      spec: SPEC,
      run(w) {
        const f = form(w, '<input id="t" type="text">');
        throwsNamed(() => f.requestSubmit(f.querySelector('#t')), 'TypeError', 'requestSubmit(textInput)');
      },
    },
  ],
};
