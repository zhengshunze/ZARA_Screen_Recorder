const { ipcRenderer } = require('electron');

const selectionBox = document.getElementById('selectionBox');
let startX, startY, offsetX, offsetY;
let isDragging = false;
let isResizing = false;
let initialLeft, initialTop;

document.addEventListener('mousedown', (event) => {
  startX = event.clientX;
  startY = event.clientY;

  // Calculate the initial position of the selection box based on mouse click
  initialLeft = startX;
  initialTop = startY;

  // Check if the click is inside the selection box
  const selectionRect = selectionBox.getBoundingClientRect();
  if (
    event.clientX >= selectionRect.left &&
    event.clientX <= selectionRect.right &&
    event.clientY >= selectionRect.top &&
    event.clientY <= selectionRect.bottom
  ) {
    isDragging = true;
    offsetX = event.clientX - initialLeft;
    offsetY = event.clientY - initialTop;
  } else {
    isResizing = true;
    selectionBox.style.backgroundImage = `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='white' stroke-width='6' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`;
    selectionBox.style.width = '0';
    selectionBox.style.height = '0';
  }

  // Prevent default behavior of the left mouse button to avoid selection issues
  event.preventDefault();
});

document.addEventListener('mousemove', (event) => {
  if (isDragging) {
    const newX = event.clientX - offsetX;
    const newY = event.clientY - offsetY;
    selectionBox.style.left = newX + 'px';
    selectionBox.style.top = newY + 'px';
  } else if (isResizing) {
    const newWidth = Math.abs(event.clientX - startX);
    const newHeight = Math.abs(event.clientY - startY);

    const newLeft = event.clientX < startX ? startX - newWidth : initialLeft;
    const newTop = event.clientY < startY ? startY - newHeight : initialTop;

    selectionBox.style.left = newLeft + 'px';
    selectionBox.style.top = newTop + 'px';
    selectionBox.style.width = newWidth + 'px';
    selectionBox.style.height = newHeight + 'px';
  }
});

document.addEventListener('mouseup', async () => {
  isDragging = false;
  isResizing = false;

  const width = parseInt(selectionBox.style.width);
  const height = parseInt(selectionBox.style.height);

  // Check if the width and height are greater than zero before sending data and closing the window
  if (width > 0 && height > 0) {
    const left = parseInt(selectionBox.style.left);
    const top = parseInt(selectionBox.style.top);
    ipcRenderer.send('selected-area-data', { left, top, width, height });
    window.close();
  }
});
