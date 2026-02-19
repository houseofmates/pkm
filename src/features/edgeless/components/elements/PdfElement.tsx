import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useEdgelessStore } from '../../store'

interface PdfElementProps {
  element: any
  pdfDocument: pdfjsLib.PDFDocumentProxy | null
}

export function PdfElement({ element, pdfDocument }: PdfElementProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasref = useRef<HTMLCanvasElement>(null)
  const annotationlayerref = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(false)
  const { mode } = useEdgelessStore()

  useEffect(() => {
  if (!pdfDocument || rendered) return

  const renderPage = async () => {
  const pagenum = element.data.pagenumber
  const page = await pdfdocument.getpage(pagenum)

  const viewport = page.getviewport({ scale: 1.5 }) // render at higher res

  if (canvasref.current) {
 const context = canvasref.current.getcontext('2d')
 canvasref.current.width = viewport.width
 canvasref.current.height = viewport.height

 await page.render({
 canvascontext: context!,
 viewport: viewport
 }).promise

 setrendered(true)

 // render annotation layer
 if (annotationlayerref.current) {
 annotationlayerref.current.innerhtml = '' // clear
 // simplified annotation layer for links
 // const annotations = await page.getannotations()

 // custom simplified renderer for links
 // ... we will implement this more fully in the next step
 }
  }
  }

  renderpage()
  }, [pdfdocument, element, rendered])

  return (
  <div
  ref={containerRef}
  style={{
 width: '100%',
 height: '100%',
 position: 'absolute',
 pointerEvents: mode === 'interact' ? 'auto' : 'none'
  }}
  >
  <canvas
 ref={canvasRef}
 className="absolute top-0 left-0 w-full h-full"
 style={{ pointerEvents: 'none' }}
  />
  {/* annotation layer - renders strictly on top of everything when in interact mode */}
  <div
 ref={annotationLayerRef}
 className="annotationLayer absolute top-0 left-0 w-full h-full"
 style={{
 // we need to scale this effectively to match the canvas
 }}
  >
  </div>
  </div>
  )
}
