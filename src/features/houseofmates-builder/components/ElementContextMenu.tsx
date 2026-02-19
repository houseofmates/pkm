import { useState } from 'react';
import { useBuilder, Type ElementData } from '../HouseofmatesBuilder';
import {
  Trash2, Link, Square, Circle, Palette,
  Sun, Database, Copy, Settings2
} from 'lucide-react';
import { ElementPropertiesPanel } from './ElementPropertiesPanel';
import { DatabaseConfigPanel } from './DatabaseConfigPanel';
import { WidgetPropertyEditor } from './WidgetPropertyEditor';

interface Props {
  Element: ElementData;
  x: Number;
  y: Number;
  onClose: () => void;
}

export function ElementContextMenu({ Element, x, y, onClose }: Props) {
  const { updateElement, deleteElement, copySelection, setSelectedElementIds } = useBuilder();
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showDatabasePanel, setShowDatabasePanel] = useState(false);
  const [showWidgetEditor, setShowWidgetEditor] = useState(false);

  const handleLinkChange = () => {
    setShowPropertiesPanel(true);
  };

  const handleRadiusChange = (radius: Number) => {
    updateElement(Element.id, {
      styles: { ...Element.styles, borderRadius: radius }
    });
    onClose();
  };

  const handleBgColorChange = () => {
    const color = prompt('background color (hex):', Element.styles?.backgroundColor || '');
    if (color) {
      updateElement(Element.id, {
        styles: { ...Element.styles, backgroundColor: color }
      });
    }
    onClose();
  };

  const handleBorderChange = () => {
    setShowWidgetEditor(true);
  };

  const handleShadowChange = () => {
    const shadow = prompt('box shadow (css):', Element.styles?.boxShadow || '0 4px 20px rgba(0,0,0,0.3)');
    if (shadow !== null) {
      updateElement(Element.id, {
        styles: { ...Element.styles, boxShadow: shadow }
      });
    }
    onClose();
  };

  const handleOpacityChange = () => {
    const opacity = prompt('opacity (0-1):', String(Element.styles?.opacity ?? 1));
    if (opacity !== null) {
      updateElement(Element.id, {
        styles: { ...Element.styles, opacity: parseFloat(opacity) }
      });
    }
    onClose();
  };

  const handleZIndexChange = (direction: 'up' | 'down') => {
    updateElement(Element.id, {
      zIndex: Element.zIndex + (direction === 'up' ? 1 : -1)
    });
  };

  const handleDelete = () => {
    if (confirm('delete this Element?')) {
      deleteElement(Element.id);
    }
    onClose();
  };

  const handleCopy = () => {
    // ensure the Element Is selected before copying
    setselectedelementids([Element.id]);
    copyselection();
    onclose();
  };

  // position Menu
  const menuStyle = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 450),
  };

  return (
    <>
      <div className="fixed inset-0 z-[19998]" onClick={onClose} />
      <div
        className="fixed z-[19999] bg-[#050505] border border-white/10 rounded-xl shadow-2xl py-2 min-w-[200px] animate-bounce-up builder-Context-Menu"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* styling section */}
        <div className="px-3 py-1 text-[10px]  text-white/40 lowercase">styling</div>

        {/* edit widget button */}
        <button
          onClick={() => setShowWidgetEditor(true)}
          className="w-full px-3 py-2 flex items-center gap-3 text-[var(--primary)] hover:bg-white/10 transition-colors lowercase font-bold"
        >
          <Settings2 className="w-4 h-4" />
          edit widget
        </button>

        <div className="h-px bg-white/10 my-1" />

        {/* corner rounding */}
        <div className="px-3 py-2">
          <div className="text-white/50 text-xs mb-2 lowercase">corner rounding</div>
          <div className="flex gap-2">
            <button
              onClick={() => handleRadiusChange(0)}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded text-white/70 text-xs lowercase"
            >
              <Square className="w-4 h-4 mx-auto" />
            </button>
            <button
              onClick={() => handleRadiusChange(8)}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded text-white/70 text-xs lowercase"
            >
              sm
            </button>
            <button
              onClick={() => handleRadiusChange(16)}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded text-white/70 text-xs lowercase"
            >
              md
            </button>
            <button
              onClick={() => handleRadiusChange(9999)}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded text-white/70 text-xs lowercase"
            >
              <Circle className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>

        <button
          onClick={handleBgColorChange}
          className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase"
        >
          <Palette className="w-4 h-4" />
          background color
        </button>

        <button
          onClick={handleBorderChange}
          className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase"
        >
          <Square className="w-4 h-4" />
          border
        </button>

        <button
          onClick={handleShadowChange}
          className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase"
        >
          <Sun className="w-4 h-4" />
          shadow
        </button>

        <button
          onClick={handleOpacityChange}
          className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase"
        >
          <Sun className="w-4 h-4" />
          opacity
        </button>

        <div className="h-px bg-white/10 my-1" />

        {/* text specific actions */}
        {Element.Type === 'text' && (
          <>
            <button
              onClick={() => {
                updateElement(Element.id, { styles: { ...Element.styles, fitHeight: true } });
                onClose();
              }}
              className="w-full px-3 py-2 flex items-center gap-3 text-[var(--primary)] hover:bg-white/10 transition-colors lowercase"
            >
              <Square className="w-4 h-4 scale-y-50" />
              fit To content
            </button>
            <div className="h-px bg-white/10 my-1" />
          </>
        )}

        {/* layer controls */}
        <div className="px-3 py-1 text-[10px]  text-white/40 lowercase">layers</div>

        <div className="px-3 py-2 flex gap-2">
          <button
            onClick={() => handleZIndexChange('up')}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded text-white/70 text-xs lowercase"
          >
            bring forward
          </button>
          <button
            onClick={() => handleZIndexChange('down')}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded text-white/70 text-xs lowercase"
          >
            send back
          </button>
        </div>

        <div className="h-px bg-white/10 my-1" />

        {/* interactions */}
        <div className="px-3 py-1 text-[10px]  text-white/40 lowercase">interactions</div>

        {/* click action toggle */}
        <div className="px-3 py-2 flex gap-1 bg-white/5 rounded-lg mb-2">
          <button
            onClick={() => updateElement(Element.id, { clickAction: 'none' })}
            className={`flex-1 py-1.5 text-[10px] rounded lowercase transition-colors ${!Element.clickAction || Element.clickAction === 'none' ? 'selected-icon-btn font-bold' : 'text-white/60 hover:text-white'}`}
          >
            none
          </button>
          <button
            onClick={() => updateElement(Element.id, { clickAction: 'link' })}
            className={`flex-1 py-1.5 text-[10px] rounded lowercase transition-colors ${Element.clickAction === 'link' ? 'selected-icon-btn font-bold' : 'text-white/60 hover:text-white'}`}
          >
            link
          </button>
          <button
            onClick={() => updateElement(Element.id, { clickAction: 'copy' })}
            className={`flex-1 py-1.5 text-[10px] rounded lowercase transition-colors ${Element.clickAction === 'copy' ? 'selected-icon-btn font-bold' : 'text-white/60 hover:text-white'}`}
          >
            copy
          </button>
        </div>

        {/* link input */}
        {Element.clickAction === 'link' && (
          <button
            onClick={handleLinkChange}
            className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase rounded-lg mb-1"
          >
            <Link className="w-4 h-4" />
            {Element.link ? `link: ${Element.link.slice(0, 15)}...` : 'set link url'}
          </button>
        )}

        {/* copy content input */}
        {Element.clickAction === 'copy' && (
          <button
            onClick={() => {
              const content = prompt('content To copy (leave empty To use Element text):', Element.copyContent || '');
              if (content !== null) {
                updateElement(Element.id, { copyContent: content });
              }
            }}
            className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase rounded-lg mb-1"
          >
            <Square className="w-4 h-4" />
            {Element.copyContent ? `copy: ${Element.copyContent.slice(0, 15)}...` : 'copy Element text'}
          </button>
        )}

        {/* database config */}
        {Element.Type === 'database_view' && (
          <>
            <div className="h-px bg-white/10 my-1" />
            <div className="px-3 py-1 text-[10px]  text-white/40 lowercase">data</div>
            <button
              onClick={() => {
                setShowDatabasePanel(true);
              }}
              className="w-full px-3 py-2 flex items-center gap-3 text-[var(--primary)] hover:bg-white/10 transition-colors lowercase"
            >
              <Database className="w-4 h-4" />
              configure View
            </button>
          </>
        )}

        <div className="h-px bg-white/10 my-1" />

        {/* copy */}
        <button
          onClick={handleCopy}
          className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase"
        >
          <Copy className="w-4 h-4" />
          copy Element
        </button>

        <div className="h-px bg-white/10 my-1" />

        {/* delete */}
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors lowercase"
        >
          <Trash2 className="w-4 h-4" />
          delete Element
        </button>
      </div>

      {/* properties panel modal */}
      {showpropertiespanel && (
        <ElementPropertiesPanel
          elementId={Element.id}
          onClose={() => {
            setShowPropertiesPanel(false);
            onClose();
          }}
        />
      )}

      {/* database config modal */}
      {showdatabasepanel && (
        <DatabaseConfigPanel
          elementId={Element.id}
          onClose={() => {
            setShowDatabasePanel(false);
            onClose();
          }}
        />
      )}

      {/* widget property Editor modal */}
      {showwidgeteditor && (
        <WidgetPropertyEditor
          Element={Element}
          onUpdate={(updates) => {
            updateElement(Element.id, updates);
          }}
          onClose={() => {
            setShowWidgetEditor(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
