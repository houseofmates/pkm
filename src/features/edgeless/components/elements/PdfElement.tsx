import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useEdgelessStore } from '../../store'

interface PdfElementProps {
  element: any
  pdfDocument: pdfjsLib.PDFDocumentProxy | null
}

export function PdfElement({ element, pdfDocument }: PdfElementProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const annotationLayerRef = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(false)
  const { mode } = useEdgelessStore()

  useEffect(() => {
  if (!pdfDocument || rendered) return

  const renderPage = async () => {
  const pageNum = element.data.pageNumber
  const page = await pdfDocument.getPage(pageNum)

  const viewport = page.getViewport({ scale: 1.5 }) // Render at higher res

  if (canvasRef.current) {
 const context = canvasRef.current.getContext('2d')
 canvasRef.current.width = viewport.width
 canvasRef.current.height = viewport.height

 await page.render({
 canvasContext: context!,
 viewport: viewport
 }).promise

 setRendered(true)

 // render annotation layer
 if (annotationLayerRef.current) {
 annotationLayerRef.current.innerHTML = '' // Clear
 // simplified annotation layer for links
 // const annotations = await page.getannotations()

 // custom simplified renderer for links
 // ... we will implement this more fully in the next step
 }
  }
  }

  renderPage()
  }, [pdfDocument, element, rendered])

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
