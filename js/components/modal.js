let overlayEl = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay hidden';
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal();
  });
  document.body.appendChild(overlayEl);
  return overlayEl;
}

function openModal(title, bodyHTML, { onSubmit, submitLabel = 'Guardar', onDelete } = {}) {
  const overlay = ensureOverlay();
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">${title}</div>
      <form id="modal-form">
        ${bodyHTML}
        <div class="form-actions">
          ${onDelete ? '<button type="button" class="btn btn-danger" id="modal-delete">Eliminar</button>' : ''}
          <button type="button" class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${submitLabel}</button>
        </div>
      </form>
    </div>
  `;
  overlay.classList.remove('hidden');

  const form = overlay.querySelector('#modal-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (onSubmit) onSubmit(data);
    closeModal();
  });

  overlay.querySelector('#modal-cancel').addEventListener('click', closeModal);

  if (onDelete) {
    overlay.querySelector('#modal-delete').addEventListener('click', () => {
      onDelete();
      closeModal();
    });
  }

  const firstInput = form.querySelector('input, select, textarea');
  if (firstInput) firstInput.focus();
}

function closeModal() {
  if (overlayEl) overlayEl.classList.add('hidden');
}

export { openModal, closeModal };
