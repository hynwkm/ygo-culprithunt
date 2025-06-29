import {
    animate,
    motion,
    spring,
    useMotionValue,
    useMotionValueEvent,
} from "motion/react";
import type { CardData } from "../models/cardData";

const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY = 0.5;
const DRAG_ELASTIC = 0.15;

export default function HandRow({
    hand,
    handIndex,
    setDirection,
    handleSwipe,
}: {
    hand: CardData[];
    handIndex: number;
    setDirection: React.Dispatch<React.SetStateAction<"left" | "right" | null>>;
    handleSwipe: (direction: "Left" | "Right", hand: CardData[]) => void;
}) {
    const dragX = useMotionValue(0);

    const SWIPE_SPRING = { type: spring, stiffness: 300, damping: 30 };

    useMotionValueEvent(dragX, "change", (latest) => {
        if (latest > SWIPE_THRESHOLD) {
            setDirection("right");
        } else if (latest < -SWIPE_THRESHOLD) {
            setDirection("left");
        } else setDirection(null);
    });

    return (
        <motion.li
            layout
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onDragEnd={(_event, info) => {
                const { offset, velocity } = info;
                if (
                    offset.x < -SWIPE_THRESHOLD ||
                    velocity.x < -SWIPE_VELOCITY
                ) {
                    handleSwipe("Left", hand);
                } else if (
                    offset.x > SWIPE_THRESHOLD ||
                    velocity.x > SWIPE_VELOCITY
                ) {
                    handleSwipe("Right", hand);
                } else {
                    animate(dragX, 0, SWIPE_SPRING);
                    setDirection(null);
                }
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            drag="x"
            dragElastic={DRAG_ELASTIC}
            dragMomentum={false}
            style={{ x: dragX, touchAction: "pan-y" }}
            className="relative w-10/12 first:w-11/12 flex justify-center gap-1 p-2 rounded-md bg-gradient-to-r from-[var(--error)]/40 via-[var(--neutral-200)] to-[var(--success)]/40 m-1 cursor-pointer">
            {hand.map((card, cardIndex) => (
                <img
                    key={`${handIndex}-${card.id}-${cardIndex}`}
                    src={card.card_images[0].image_url_small}
                    alt={card.name}
                    className="w-1/6 border border-[var(--border)] shadow-sm transition-transform duration-150 ease-in-out object-contain pointer-events-none select-none"
                />
            ))}
        </motion.li>
    );
}
