import { equal } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#the-constraint-validation-api';

export default {
  id: 'constraint-validation',
  title: 'checkValidity() / validity',
  interfaces: ['ValidityState'],
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
      description:
        'An empty required input has validity.valueMissing true; checkValidity() returns false and fires "invalid".',
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
      id: 'pattern-mismatch',
      description:
        'pattern="[0-9]+" with value "a1" (set by script) gives validity.patternMismatch true. HTML §4.10.5.3.6 (the pattern attribute): "If the element\'s value is not the empty string, … and the element has a compiled pattern regular expression but that regular expression does not match the element\'s value, then the element is suffering from a pattern mismatch"; the pattern is anchored as ^(?:[0-9]+)$, and nothing here depends on how the value was set.',
      spec: 'https://html.spec.whatwg.org/multipage/input.html#the-pattern-attribute',
      run(w) {
        const i = w.document.createElement('input');
        i.pattern = '[0-9]+';
        i.value = 'a1';
        equal(i.validity.patternMismatch, true, 'validity.patternMismatch');
        equal(i.validity.valid, false, 'validity.valid');
      },
    },
    {
      id: 'too-short-script-value',
      description:
        'minLength does not apply to a value set by script: minLength 5 and value "a1" set by script leave validity.tooShort false. HTML §4.10.19.4 (the minlength attribute): an element is suffering from being too short only if "its dirty value flag is true, its value was last changed by a user edit (as opposed to a change made by a script), its value is not the empty string, and the length of the element\'s API value is less than the element\'s minimum allowed value length".',
      spec: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#setting-minimum-input-length-requirements:-the-minlength-attribute',
      run(w) {
        const i = w.document.createElement('input');
        i.minLength = 5;
        i.value = 'a1';
        equal(i.validity.tooShort, false, 'validity.tooShort');
      },
    },
  ],
};
