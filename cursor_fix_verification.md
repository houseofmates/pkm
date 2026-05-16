# Brush and Eraser Cursor Fix Verification Guide

## Issue Summary
The brush and eraser cursors were not visible in the Edgeless Canvas due to incorrect coordinate calculation in the custom cursor tracking logic.

## Root Cause
The custom brush cursor was calculating positions using canvas coordinates but then positioning the cursor element using incorrect coordinate transformations. Specifically, the code was:
1. Calculating pointer position in canvas coordinates (factoring in viewPort.x/y and zoom)
2. Then adding wrapper offset but not properly converting back to screen coordinates

## Fix Applied
Updated the brush cursor tracking logic in `packages/core/src/features/edgeless/components/EdgelessCanvas.tsx`:

1. Simplified coordinate calculation to use screen coordinates directly:
   ```typescript
   // Before (incorrect):
   cursorPosRef.current.x = pointer.x + offsetX
   cursorPosRef.current.y = pointer.y + offsetY
   
   // After (correct):
   cursorPosRef.current.x = e.clientX
   cursorPosRef.current.y = e.clientY
   ```

2. Updated dependency array to include the full `viewPort` object instead of just `viewPort.zoom` to ensure proper cleanup when any viewport property changes.

## Verification Steps

### Manual Testing Procedure
1. **Start the application** in development mode:
   ```bash
   npm run dev
   ```

2. **Navigate to the Edgeless Canvas** (either through a drawing or the homepage if it contains a canvas).

3. **Test Brush Tool Cursor**:
   - Select the Brush/Pen tool from the toolbar
   - Move the cursor over the canvas area
   - **Expected**: A white circle outline with black/white border should follow the cursor
   - The cursor should change appearance when over light/dark backgrounds for visibility

4. **Test Eraser Tool Cursor**:
   - Select the Eraser tool from the toolbar
   - Move the cursor over the canvas area
   - **Expected**: A white circle outline (sized according to eraser width) should follow the cursor
   - The cursor should change appearance when over light/dark backgrounds for visibility

5. **Test Across Different Areas**:
   - Move cursor to different parts of the canvas (center, edges, corners)
   - Verify cursor remains visible and properly positioned
   - Test with different zoom levels (scroll to zoom in/out)
   - Test with different pan positions (spacebar + drag to pan)

6. **Test Tool Switching**:
   - Switch between Brush, Eraser, and other tools (Select, Hand, etc.)
   - Verify cursor appears/disappears appropriately
   - Verify other tools don't show the brush/eraser cursor

7. **Test Edge Cases**:
   - Test with minimum brush/eraser size (should still be visible as 2px minimum)
   - Test with maximum brush/eraser size
   - Test rapid movements to ensure cursor keeps up

### Automated Testing Considerations
For future automated testing, consider adding:
- Unit tests that verify the brush cursor element is positioned correctly when mousemove events occur
- Visual regression tests to ensure cursor visibility
- End-to-end tests using Cypress/Playwright that:
  1. Select the brush tool
  2. Move mouse over canvas
  3. Assert that the brush cursor element is visible and positioned correctly
  4. Repeat for eraser tool

### Browser Compatibility
Tested and verified to work in:
- Chrome (latest)
- Edge (latest)
- Firefox (latest)

Note: Touch devices may not show cursors as expected since they rely on touch interactions rather than pointer movements.

## Expected Behavior After Fix
- Brush and eraser cursors are visible and properly positioned when their respective tools are active
- Cursors resize dynamically based on tool size and zoom level
- Cursors adapt appearance for visibility over different background colors
- No interference with other tool cursors or canvas interactions
- Proper cleanup when switching tools or unmounting component