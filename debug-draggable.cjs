try {
    const Draggable = require('react-draggable');
    console.log('--- Draggable EXPORTS ---');
    console.log('Type:', typeof Draggable);
    console.log('Keys:', Object.keys(Draggable));
    console.log('Draggable.default:', Draggable.default);
    console.log('Draggable.DraggableCore:', Draggable.DraggableCore);
} catch (e) {
    console.error('react-draggable not found:', e.message);
}

try {
    const Resizable = require('react-resizable');
    console.log('--- Resizable EXPORTS ---');
    console.log('Keys:', Object.keys(Resizable));
} catch (e) {
    console.error('react-resizable not found:', e.message);
}
