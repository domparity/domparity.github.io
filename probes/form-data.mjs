import { equal } from '../src/assert.mjs';

const SPEC = 'https://xhr.spec.whatwg.org/#dom-formdata';

function entries(fd) {
  return Array.from(fd.entries(), ([k, v]) => `${k}=${v}`).join('&');
}

export default {
  id: 'form-data',
  title: 'new FormData(form)',
  summary: 'Builds the form data set of a form the way submission would.',
  spec: SPEC,
  global: 'FormData',
  exists: (w) => typeof w.FormData === 'function',
  checks: [
    {
      id: 'controls',
      description: 'Includes text inputs, checked checkboxes and selected options; skips unchecked, disabled and unnamed controls.',
      spec: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-the-form-data-set',
      run(w) {
        const f = w.document.body.appendChild(w.document.createElement('form'));
        f.innerHTML =
          '<input name="a" value="1"><input name="b" type="checkbox" value="on1" checked>' +
          '<input name="c" type="checkbox"><input name="d" value="x" disabled><input value="noname">' +
          '<select name="s" multiple><option selected>p</option><option>q</option><option selected>r</option></select>';
        equal(entries(new w.FormData(f)), 'a=1&b=on1&s=p&s=r', 'entries');
      },
    },
    {
      id: 'submitter',
      description: 'new FormData(form, submitter) includes the submitter button\'s name and value.',
      spec: SPEC,
      run(w) {
        const f = w.document.body.appendChild(w.document.createElement('form'));
        f.innerHTML = '<input name="a" value="1"><button name="act" value="save">Save</button>';
        equal(entries(new w.FormData(f, f.querySelector('button'))), 'a=1&act=save', 'entries');
      },
    },
  ],
};
