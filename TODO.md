# todo: fix record table issues

- [x] fix right border on rows — removed per-row plus button, added border-r to row container, conditional last-cell border-r removal
- [x] fix plus button below rows — moved "create new record" button to absolute positioning at bottom of table
- [x] fix flickering — stabilized fetchData callback by using ref for availableCollections (broke infinite re-render loop caused by useCollections returning new array reference every render)
