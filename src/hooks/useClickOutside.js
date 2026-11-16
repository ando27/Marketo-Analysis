import { useEffect, useRef } from 'react';

/**
 * Calls onOutside when the user clicks outside the returned ref or presses Escape.
 */
export default function useClickOutside(active, onOutside) {
    const ref = useRef(null);

    useEffect(() => {
        if (!active) return undefined;

        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onOutside();
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') onOutside();
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [active, onOutside]);

    return ref;
}
