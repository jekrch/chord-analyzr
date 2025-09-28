import { useCallback } from 'react';
import { 
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import {
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    TouchSensor,
    useSensor, 
    useSensors
} from '@dnd-kit/core';
import { DropResult } from '@hello-pangea/dnd';

// Helper function to detect mobile devices
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
};

interface UseMobileDragProps {
    addedChords: any[];
    activeChordIndex: number | null;
    playbackStore: any;
    isLiveMode: boolean;
}

export const useMobileDrag = ({
    addedChords,
    activeChordIndex,
    playbackStore,
    isLiveMode
}: UseMobileDragProps) => {
    // Mobile-optimized sensors configuration
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: isMobile() ? {
                // For mobile: use longer delay and higher tolerance to avoid conflicts
                delay: 300,
                tolerance: 8,
            } : {
                // For desktop: use distance for immediate response
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 400, // Longer delay for mobile
                tolerance: 10, // Higher tolerance
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Drag handlers with aggressive mobile behavior prevention
    const handleDragStart = useCallback(() => {
        document.body.classList.add('dragging');
        
        // Aggressive mobile browser behavior prevention
        if (isMobile()) {
            // Prevent all scrolling and browser behaviors
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';
            document.body.style.touchAction = 'none';
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            
            // Prevent pull-to-refresh
            document.documentElement.style.overscrollBehavior = 'none';
            document.documentElement.style.touchAction = 'none';
            
            // Prevent viewport manipulation
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('data-original-content', viewport.getAttribute('content') || '');
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }
        }
    }, []);

    const handleDragCancel = useCallback(() => {
        document.body.classList.remove('dragging');
        
        if (isMobile()) {
            // Restore original behaviors
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
            document.body.style.touchAction = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            
            document.documentElement.style.overscrollBehavior = '';
            document.documentElement.style.touchAction = '';
            
            // Restore viewport
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                const originalContent = viewport.getAttribute('data-original-content');
                if (originalContent) {
                    viewport.setAttribute('content', originalContent);
                    viewport.removeAttribute('data-original-content');
                }
            }
        }
    }, []);

    // @dnd-kit drag end handler for live mode with cleanup
    const handleDragEndDndKit = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        
        // Clean up drag state immediately with same logic as handleDragCancel
        document.body.classList.remove('dragging');
        
        if (isMobile()) {
            // Restore original behaviors
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
            document.body.style.touchAction = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            
            document.documentElement.style.overscrollBehavior = '';
            document.documentElement.style.touchAction = '';
            
            // Restore viewport
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                const originalContent = viewport.getAttribute('data-original-content');
                if (originalContent) {
                    viewport.setAttribute('content', originalContent);
                    viewport.removeAttribute('data-original-content');
                }
            }
        }
        
        if (over && active.id !== over.id) {
            // Extract indices from the IDs
            const activeIndex = parseInt(active.id.toString().replace('chord-', ''));
            const overIndex = parseInt(over.id.toString().replace('chord-', ''));
            
            if (!isNaN(activeIndex) && !isNaN(overIndex) && 
                activeIndex >= 0 && activeIndex < addedChords.length && 
                overIndex >= 0 && overIndex < addedChords.length) {
                
                const reorderedChords = arrayMove(addedChords, activeIndex, overIndex);
                console.log('Reordered chords:', reorderedChords.map(c => c.name));
                playbackStore.setAddedChords(reorderedChords);

                // Update active chord index
                if (activeChordIndex !== null) {
                    if (activeChordIndex === activeIndex) {
                        playbackStore.setActiveChordIndex(overIndex);
                    } else if (activeIndex < activeChordIndex && overIndex >= activeChordIndex) {
                        playbackStore.setActiveChordIndex(activeChordIndex - 1);
                    } else if (activeIndex > activeChordIndex && overIndex <= activeChordIndex) {
                        playbackStore.setActiveChordIndex(activeChordIndex + 1);
                    }
                }
            }
        }
    }, [addedChords, activeChordIndex, playbackStore]);

    // @hello-pangea/dnd drag end handler for non-live mode
    const handleDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;
        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;
        if (sourceIndex === destinationIndex) return;

        const reorderedChords = Array.from(addedChords);
        const [removed] = reorderedChords.splice(sourceIndex, 1);
        reorderedChords.splice(destinationIndex, 0, removed);
        playbackStore.setAddedChords(reorderedChords);

        // Update active chord index
        if (activeChordIndex === null) return;
        if (activeChordIndex === sourceIndex) {
            playbackStore.setActiveChordIndex(destinationIndex);
        } else if (sourceIndex < activeChordIndex && destinationIndex >= activeChordIndex) {
            playbackStore.setActiveChordIndex(activeChordIndex - 1);
        } else if (sourceIndex > activeChordIndex && destinationIndex <= activeChordIndex) {
            playbackStore.setActiveChordIndex(activeChordIndex + 1);
        }
    }, [addedChords, activeChordIndex, playbackStore]);

    // Custom modifier to restrict dragging within the container bounds (mobile-friendly)
    const restrictToContainer = useCallback((args: any) => {
        const { containerNodeRect, draggingNodeRect, transform } = args;
        
        if (!containerNodeRect || !draggingNodeRect) {
            return transform;
        }

        // Add some padding for mobile to make edge cases easier
        const padding = isMobile() ? 20 : 10;
        
        // Calculate boundaries with padding
        const containerLeft = containerNodeRect.left + padding;
        const containerRight = containerNodeRect.right - padding;
        const containerTop = containerNodeRect.top + padding;
        const containerBottom = containerNodeRect.bottom - padding;

        // Calculate the dragged element's position
        const elementLeft = draggingNodeRect.left + transform.x;
        const elementRight = draggingNodeRect.right + transform.x;
        const elementTop = draggingNodeRect.top + transform.y;
        const elementBottom = draggingNodeRect.bottom + transform.y;

        let constrainedX = transform.x;
        let constrainedY = transform.y;

        // Constrain horizontal movement
        if (elementLeft < containerLeft) {
            constrainedX = containerLeft - draggingNodeRect.left;
        } else if (elementRight > containerRight) {
            constrainedX = containerRight - draggingNodeRect.right;
        }

        // Constrain vertical movement
        if (elementTop < containerTop) {
            constrainedY = containerTop - draggingNodeRect.top;
        } else if (elementBottom > containerBottom) {
            constrainedY = containerBottom - draggingNodeRect.bottom;
        }

        return {
            ...transform,
            x: constrainedX,
            y: constrainedY,
        };
    }, []);

    return {
        sensors,
        handleDragStart,
        handleDragCancel,
        handleDragEndDndKit,
        handleDragEnd,
        restrictToContainer
    };
};