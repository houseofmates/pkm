# Edgeless Canvas Performance Optimization

## implementation plan

### task 1: spatial index viewport culling
- [ ] add `queryvisible` method to spatial-index.ts for viewport culling
- [ ] implement aggressive culling with margin for smooth scrolling

### task 2: memoization fixes in edgelesscanvas.tsx
- [ ] add usememo for viewport bounds calculation
- [ ] add viewport culling to overlayelements
- [ ] add usecallback for event handlers
- [ ] use stable store selectors

### task 3: react.memo for element components
- [ ] wrap recordnodeelement with react.memo
- [ ] wrap embedelement with react.memo
- [ ] wrap other heavy elements (linkelement, shoppingcard, etc.)

