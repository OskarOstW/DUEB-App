type PendingEditor = { flush: () => Promise<void>; pending: () => boolean };
const editors = new Set<PendingEditor>();
const retired = new Set<PendingEditor>();

export function registerDraftEditor(editor: PendingEditor) {
  editors.add(editor);
  return () => {
    retired.add(editor);
    void editor.flush().then(() => { editors.delete(editor); retired.delete(editor); }).catch(() => {
      // Bei Speicherfehlern bleibt der Entwurf für einen erneuten Versuch erreichbar.
    });
  };
}

export async function flushDrafts() {
  await Promise.all([...editors].map(async editor => {
    await editor.flush();
    if (retired.has(editor)) { editors.delete(editor); retired.delete(editor); }
  }));
}

window.addEventListener('beforeunload', event => {
  if ([...editors].some(editor => editor.pending())) {
    event.preventDefault();
    event.returnValue = '';
  }
});
