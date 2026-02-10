import { useState } from 'react';
import { UploadCloud } from 'lucide-react';

export function OfferingDrop({ element }: { element: any }) {
    const [isHovering, setIsHovering] = useState(false);
    const [absorbing, setAbsorbing] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(true);
    };

    const handleDragLeave = () => setIsHovering(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setAbsorbing(true);

            // Simulate Absorption and API Call
            setTimeout(() => {
                setAbsorbing(false);
                // In real app, create new record in 'offerings' collection
            }, 2000);
        }
    };

    return (
        <div
            className={`w-full h-full rounded-full border-2 transition-all duration-700 flex items-center justify-center relative overflow-hidden
                ${isHovering ? 'border-primary scale-110 shadow-[0_0_30px_rgba(246,176,18,0.5)]' : 'border-white/10 bg-black/50'}
                ${absorbing ? 'scale-0 opacity-0 rotate-180' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Ripple Effects */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50 animate-pulse" />

            <UploadCloud className={`h-8 w-8 text-primary transition-transform duration-500 ${isHovering ? 'scale-125' : 'opacity-50'}`} />

            <div className="absolute bottom-4 text-[10px] uppercase tracking-widest text-primary/70 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                Offer
            </div>
        </div>
    );
}
