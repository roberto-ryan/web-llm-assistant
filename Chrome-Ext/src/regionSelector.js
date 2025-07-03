// regionSelector.js
// Provides a function to select a region of the screen by click-and-drag

export function selectRegion() {
  return new Promise((resolve, reject) => {
    let startX, startY, currentX, currentY;
    let isSelecting = false;
    let selectionBox = null;
    let overlay = null;

    function createOverlay() {
      overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.zIndex = '2147483647';
      overlay.style.cursor = 'crosshair';
      overlay.style.background = 'rgba(0,0,0,0.05)';
      overlay.style.userSelect = 'none';
      document.body.appendChild(overlay);
    }

    function createSelectionBox() {
      selectionBox = document.createElement('div');
      selectionBox.style.position = 'fixed';
      selectionBox.style.border = '2px dashed #007bff';
      selectionBox.style.background = 'rgba(0,123,255,0.15)';
      selectionBox.style.pointerEvents = 'none';
      selectionBox.style.zIndex = '2147483648';
      overlay.appendChild(selectionBox);
    }

    function onMouseDown(e) {
      if (e.button !== 0) return;
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      createSelectionBox();
      updateSelectionBox(startX, startY, startX, startY);
      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseup', onMouseUp);
      window.addEventListener('keydown', onKeyDown);
    }

    function onMouseMove(e) {
      if (!isSelecting) return;
      currentX = e.clientX;
      currentY = e.clientY;
      updateSelectionBox(startX, startY, currentX, currentY);
    }

    function onMouseUp(e) {
      if (!isSelecting) return;
      isSelecting = false;
      overlay.removeEventListener('mousemove', onMouseMove);
      overlay.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      const rect = getRect(startX, startY, e.clientX, e.clientY);
      cleanup();
      if (rect.width > 5 && rect.height > 5) {
        resolve(rect);
      } else {
        reject(new Error('Selection too small or cancelled'));
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        isSelecting = false;
        cleanup();
        reject(new Error('Selection cancelled'));
      }
    }

    function updateSelectionBox(x1, y1, x2, y2) {
      const rect = getRect(x1, y1, x2, y2);
      selectionBox.style.left = rect.x + 'px';
      selectionBox.style.top = rect.y + 'px';
      selectionBox.style.width = rect.width + 'px';
      selectionBox.style.height = rect.height + 'px';
    }

    function getRect(x1, y1, x2, y2) {
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return { x, y, width, height };
    }

    function cleanup() {
      if (selectionBox && selectionBox.parentNode) selectionBox.parentNode.removeChild(selectionBox);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      selectionBox = null;
      overlay = null;
    }

    createOverlay();
    overlay.addEventListener('mousedown', onMouseDown);
  });
} 