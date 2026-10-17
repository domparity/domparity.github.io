import { ok, equal, throwsNamed, until } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element';

export default {
  id: 'dialog',
  title: '<dialog> showModal() / close()',
  summary: 'The dialog element and its methods for opening it as a modal and closing it with a return value.',
  spec: SPEC,
  exists: (w) => typeof w.HTMLDialogElement === 'function' && typeof w.document.createElement('dialog').showModal === 'function',
  existsDescription: 'HTMLDialogElement exists and a <dialog> has showModal().',
  checks: [
    {
      id: 'show-modal-opens',
      description: 'showModal() on a connected dialog sets .open to true and adds the open attribute.',
      spec: 'https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal',
      run(w) {
        const dlg = w.document.body.appendChild(w.document.createElement('dialog'));
        dlg.showModal();
        equal(dlg.open, true, 'open');
        ok(dlg.hasAttribute('open'), 'no open attribute');
      },
    },
    {
      id: 'close-return-value',
      description: 'close("done") clears open, sets returnValue to "done" and fires a "close" event.',
      spec: 'https://html.spec.whatwg.org/multipage/interactive-elements.html#close-the-dialog',
      async run(w) {
        const dlg = w.document.body.appendChild(w.document.createElement('dialog'));
        let closed = false;
        dlg.addEventListener('close', () => (closed = true));
        dlg.showModal();
        dlg.close('done');
        equal(dlg.open, false, 'open');
        equal(dlg.returnValue, 'done', 'returnValue');
        await until(() => closed, 500, '"close" event did not fire');
      },
    },
    {
      id: 'disconnected-throws',
      description: 'showModal() on a dialog that is not in a document throws an "InvalidStateError" DOMException.',
      spec: 'https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal',
      run(w) {
        const dlg = w.document.createElement('dialog');
        throwsNamed(() => dlg.showModal(), 'InvalidStateError', 'showModal() on a disconnected dialog');
      },
    },
  ],
};
