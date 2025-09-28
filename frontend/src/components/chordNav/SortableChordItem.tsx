import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableChordItemProps {
    id: string;
    index: number;
    chord: any;
    onEdit: (index: number) => void;
    renderChordButton: (
        chord: any, 
        index: number, 
        isDragging?: boolean, 
        onEdit?: (index: number) => void
    ) => React.ReactNode;
}

export const SortableChordItem: React.FC<SortableChordItemProps> = ({
    id,
    index,
    chord,
    onEdit,
    renderChordButton
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition, // Disable transition during drag for smoother mobile experience
    };

    // Enhanced attributes for mobile
    const enhancedAttributes = {
        ...attributes,
        // Let the drag system handle touch behaviors naturally
        style: {
            userSelect: 'none' as const,  // Prevent text selection
            webkitUserSelect: 'none' as const,
            ...style
        } as React.CSSProperties
    };

    return (
        <div 
            ref={setNodeRef}
            {...enhancedAttributes}
            {...listeners}
            className="mobile-drag-item"
            style={{
                // Prevent mobile browser interference during drag
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent',
                ...enhancedAttributes.style
            }}
        >
            {renderChordButton(chord, index, isDragging, onEdit)}
        </div>
    );
};