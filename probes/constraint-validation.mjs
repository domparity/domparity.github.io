import { equal } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#the-constraint-validation-api';

export default {
  id: 'constraint-validation',
  title: 'checkValidity() / validity',
  summary: 'Form constraint validation: the ValidityState flags, checkValidity() and custom messages.',
  spec: SPEC,
  exists: (w) => {
    const i = w.document.createElement('input');
    return typeof i.checkValidity === 'function' && !!i.validity;
  },
  existsDescription: 'An <input> has checkValidity() and a validity object.',
  checks: [
    {
      id: 'value-missing',
      description: 'An empty required input has validity.valueMissing true; checkValidity() returns false and fires "invalid".',
      spec: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-checkvalidity',
      run(w) {
        const i = w.document.body.appendChild(w.document.createElement('input'));
        i.required = true;
        let fired = false;
        i.addEventListener('invalid', () => (fired = true));
        equal(i.validity.valueMissing, true, 'validity.valueMissing');
        equal(i.checkValidity(), false, 'checkValidity()');
        equal(fired, true, '"invalid" fired');
      },
    },
    {
      id: 'type-mismatch',
      description: 'An email input with value "x" has validity.typeMismatch true.',
      spec: 'https://html.spec.whatwg.org/multipage/input.html#email-state-(type=email)',
      run(w) {
        const i = w.document.createElement('input');
        i.type = 'email';
        i.value = 'x';
        equal(i.validity.typeMismatch, true, 'validity.typeMismatch');
        equal(i.validity.valid, false, 'validity.valid');
      },
    },
    {
      id: 'custom-validity',
      description: 'setCustomValidity("Bad") sets validity.customError and validationMessage "Bad".',
      spec: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-setcustomvalidity',
      run(w) {
        const i = w.document.createElement('input');
        i.setCustomValidity('Bad');
        equal(i.validity.customError, true, 'validity.customError');
        equal(i.validationMessage, 'Bad', 'validationMessage');
      },
    },
    {
      id: 'pattern-and-length',
      description: 'pattern="[0-9]+" with value "a1" gives patternMismatch; minLength does not apply to a value set by script (tooShort stays false).',
      spec: 'https://html.spec.whatwg.org/multipage/input.html#the-pattern-attribute',
      run(w) {
        const i = w.document.createElement('input');
        i.pattern = '[0-9]+';
        i.minLength = 5;
        i.value = 'a1';
        equal(i.validity.patternMismatch, true, 'validity.patternMismatch');
        equal(i.validity.tooShort, false, 'validity.tooShort');
      },
    },
  ],
};
