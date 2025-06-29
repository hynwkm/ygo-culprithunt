import axios from "axios";
import { type ClassValue, clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import "./App.css";
import gIcon from "./assets/github-icon.svg";
import lIcon from "./assets/linkedin-icon.svg";
import HandRow from "./components/HandRow.tsx";
import Header from "./components/Header.tsx";
import { CardData } from "./models/cardData.ts";
import { Deck } from "./models/deck.ts";
import.meta.env.BASE_URL;

const HAND_SIZE = 5;
const MAX_RETRIES = 2;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
console.log(API_URL);

const cn = (...inputs: ClassValue[]): string => {
    return twMerge(clsx(inputs));
};

const parseYDK = (content: string): Deck => {
    const lines = content.split(/\r?\n/);
    const deck: Deck = { main: [], extra: [], side: [] };
    let section: keyof Deck = "main";

    for (const line of lines) {
        if (line.startsWith("#")) {
            if (line.includes("main")) {
                section = "main";
            } else if (line.includes("extra")) {
                section = "extra";
            }
            continue;
        }
        if (line.startsWith("!side")) {
            section = "side";
            continue;
        }
        const id = parseInt(line.trim(), 10);
        if (!isNaN(id)) {
            deck[section].push(id);
        }
    }
    return deck;
};

const shuffleDeck = (cards: CardData[]): CardData[] => {
    const deck = [...cards];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

export default function App() {
    const [_goodHandCards, setGoodHandCards] = useState<CardData[]>([]);
    const [badHandCards, setBadHandCards] = useState<CardData[]>([]);
    const [clicked, setClicked] = useState<"left" | "right" | null>(null);
    const [deck, setDeck] = useState<Deck | null>(null);
    const [deckData, setDeckData] = useState<CardData[]>([]);
    const [direction, setDirection] = useState<"left" | "right" | null>(null);
    const [hands, setHands] = useState<CardData[][]>([]);
    const [numHands, setNumHands] = useState<number[]>([0, 0, 0]); // numHands, numGoodHands, numBadHands
    const [numRetries, setNumRetries] = useState<number>(0);
    const [prevNumBadCards, setPrevNumBadCards] = useState<number>(0);
    const [roundNum, setRoundNum] = useState<number>(1);
    const [selectedHand, setSelectedHand] = useState<CardData[] | null>(null);
    const [suspects, setSuspects] = useState<CardData[]>([]);

    const currentRound = useRef(roundNum);

    const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result as string;
            const deck = parseYDK(content);
            console.log(deck.main.length);
            setDeck({ ...deck });
        };
        reader.readAsText(file);
    };

    const sampleDeckUpload = async () => {
        try {
            const response = await fetch("/dark-magician.ydk");
            const content = await response.text();
            const deck = parseYDK(content);
            console.log(deck.main.length);
            setDeck({ ...deck });
        } catch (err) {
            console.error("Failed to load sample deck:", err);
        }
    };

    const handleSwipe = (direction: "Left" | "Right", hand: CardData[]) => {
        const targetHand = hand || selectedHand;
        if (!targetHand) return;
        if (direction === "Left") {
            setBadHandCards((prev) => [...prev, ...targetHand]);
        } else {
            setGoodHandCards((prev) => [...prev, ...targetHand]);
        }
        setHands((prev) => prev.filter((h) => h !== targetHand));
        setDirection(null);
        setNumHands((prev) => {
            const [total, good, bad] = prev;
            return direction === "Left"
                ? [total + 1, good, bad + 1]
                : [total + 1, good + 1, bad];
        });
    };

    useEffect(() => {
        const getDeckData = async () => {
            if (!deck) return;
            try {
                const deckData = await axios.post(
                    `${API_URL}/decks/cards`,
                    deck,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
                setNumHands([0, 0, 0]);
                setDeckData(shuffleDeck(deckData.data));
            } catch (error) {
                console.error(error);
            }
        };
        getDeckData();
    }, [deck]);

    useEffect(() => {
        if (!deckData) return;

        const hands: CardData[][] = [];
        const leftover: CardData[] = [];
        const fullChunks = Math.floor(deckData.length / HAND_SIZE) * HAND_SIZE;

        for (let i = 0; i < fullChunks; i += 5) {
            hands.push(deckData.slice(i, i + HAND_SIZE));
        }
        if (deckData.length % HAND_SIZE !== 0) {
            leftover.push(...deckData.slice(fullChunks));
        }
        setHands(hands);
        setBadHandCards(leftover);
    }, [deckData]);

    useEffect(() => {
        if (hands.length > 0) {
            setSelectedHand(hands[0]);
        } else {
            setSelectedHand(null);
        }
    }, [hands]);

    useEffect(() => {
        if (hands.length > 0) return;

        const badCount = badHandCards.length;

        if (badCount <= HAND_SIZE) {
            setSuspects(badHandCards);
            return;
        }
        const noProgress: boolean = badCount === prevNumBadCards;
        if (numRetries >= MAX_RETRIES && noProgress) {
            setSuspects(badHandCards);
            return;
        }

        setRoundNum((prev) => {
            const next = prev + 1;
            currentRound.current = next;
            return next;
        });
        setNumHands([0, 0, 0]);

        if (noProgress) {
            setNumRetries((r) => r + 1);
        } else {
            setNumRetries(0);
        }
        setPrevNumBadCards(badCount);

        const shuffledDeck = shuffleDeck(badHandCards);
        setBadHandCards([]);
        setDeckData(shuffledDeck);
    }, [hands, badHandCards, numRetries, prevNumBadCards]);

    return (
        <Router>
            <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--on-background)] font-display">
                <Header />
                <main className="w-full flex-1 overflow-auto p-4 md:px-8 flex flex-col mt-16 md:w-[768px] md:mx-auto">
                    {!deck && (
                        <h2 className="text-xl font-semibold mb-2 md:mb-4">
                            Upload a deck to start
                        </h2>
                    )}

                    {deck && (
                        <h2 className="text-xl font-semibold mb-2 md:mb-4">
                            Upload a new deck
                        </h2>
                    )}
                    <h2></h2>
                    {suspects.length == 0 && deckData.length === 0 && (
                        <div className="bg-[var(--surface)] text-[var(--on-surface)] p-4 flex justify-center mb-2 md:mb-4">
                            <motion.label
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.02 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 250,
                                    damping: 20,
                                }}
                                className="cursor-pointer bg-[var(--primary)] text-[var(--on-primary)] px-8 py-4 rounded inline-block font-medium text-lg transition-all duration-150 hover:bg-[var(--background)] hover:text-[var(--primary)] border border-[var(--primary)]">
                                UPLOAD DECK
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".ydk"
                                    onChange={handleDeckUpload}
                                />
                            </motion.label>
                        </div>
                    )}

                    {suspects.length == 0 && deckData.length === 0 && (
                        <div className="flex flex-col gap-4 mb-2 md:mb-4">
                            <h3 className="text-lg font-medium">
                                Or try it with a sample deck featuring
                            </h3>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.02 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 250,
                                    damping: 20,
                                }}
                                onClick={sampleDeckUpload}
                                className="w-1/2 max-w-52 cursor-pointer bg-[var(--secondary)] text-[var(--on-secondary)] px-4 py-2 rounded inline-block font-medium text-lg transition-all duration-150 hover:bg-[var(--background)] hover:text-[var(--secondary)] border border-[var(--secondary)]">
                                Dark Magician
                            </motion.button>
                        </div>
                    )}
                    {suspects.length == 0 &&
                        deckData &&
                        deckData.length > 0 && (
                            <>
                                <div className="gap-1 flex flex-col items-center mb-2 md:mb-4">
                                    <h2 className="text-lg font-semibold flex flex-col w-full">
                                        Round {roundNum}: {numHands[0]} Hands
                                        Tested
                                        <div className="gap-2 flex">
                                            <span className="text-[var(--success)]">
                                                {numHands[1]} Good
                                            </span>
                                            <span className="text-[var(--error)]">
                                                {numHands[2]} Bad
                                            </span>
                                        </div>
                                    </h2>
                                    <div className="justify-between hidden md:flex w-full mb-2 md:mb-4">
                                        <button
                                            onClick={() => {
                                                if (selectedHand) {
                                                    setClicked("left");
                                                    handleSwipe(
                                                        "Left",
                                                        selectedHand
                                                    );
                                                    setTimeout(
                                                        () => setClicked(null),
                                                        200
                                                    ); // reset animation state
                                                }
                                            }}
                                            className={cn(
                                                "w-full max-w-2/5 transition-all duration-150 cursor-pointer px-4 py-2 rounded inline-block font-medium border border-2",
                                                clicked === "left" &&
                                                    "animate-press",
                                                direction === "left"
                                                    ? "bg-[var(--background)] text-[var(--error)] border-[var(--error)]"
                                                    : "bg-[var(--error)]/80 text-[var(--on-primary)] border-[var(--error)] hover:bg-[var(--background)] hover:text-[var(--error)]"
                                            )}>
                                            Bad Hand
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (selectedHand) {
                                                    setClicked("right");
                                                    handleSwipe(
                                                        "Right",
                                                        selectedHand
                                                    );
                                                    setTimeout(
                                                        () => setClicked(null),
                                                        200
                                                    );
                                                }
                                            }}
                                            className={cn(
                                                "w-full max-w-2/5 transition-all duration-150 cursor-pointer px-4 py-2 rounded inline-block font-medium border border-2",
                                                clicked === "right" &&
                                                    "animate-press",
                                                direction === "right"
                                                    ? "bg-[var(--background)] text-[var(--success)] border-[var(--success)]"
                                                    : "bg-[var(--success)]/80 text-[var(--on-primary)] border-[var(--success)] hover:bg-[var(--background)] hover:text-[var(--success)]"
                                            )}>
                                            Good Hand
                                        </button>
                                    </div>

                                    <div className=" p-4 rounded-md shadow-inner relative mb-2 md:mb-4">
                                        <ul className="flex flex-col items-center overflow-y-auto gap-3 max-h-72 scrollbar-hide sm:max-h-96 md:max-h-112 lg:max-h-128">
                                            <AnimatePresence>
                                                {hands.map(
                                                    (hand, handIndex) => {
                                                        return (
                                                            <HandRow
                                                                key={`${handIndex}-${hand
                                                                    .map(
                                                                        (
                                                                            card
                                                                        ) =>
                                                                            card.id
                                                                    )
                                                                    .join(
                                                                        "-"
                                                                    )}`}
                                                                hand={hand}
                                                                handIndex={
                                                                    handIndex
                                                                }
                                                                setDirection={
                                                                    setDirection
                                                                }
                                                                handleSwipe={
                                                                    handleSwipe
                                                                }
                                                            />
                                                        );
                                                    }
                                                )}
                                            </AnimatePresence>
                                        </ul>
                                        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white to-transparent" />
                                    </div>
                                </div>
                                <div className="flex justify-between md:hidden mb-2 md:mb-4">
                                    <button
                                        onClick={() => {
                                            if (selectedHand) {
                                                setClicked("left");
                                                handleSwipe(
                                                    "Left",
                                                    selectedHand
                                                );
                                                setTimeout(
                                                    () => setClicked(null),
                                                    200
                                                ); // reset animation state
                                            }
                                        }}
                                        className={cn(
                                            "w-100 max-w-2/5 transition-all duration-150 cursor-pointer px-4 py-2 rounded inline-block font-medium border border-2",
                                            clicked === "left" &&
                                                "animate-press",
                                            direction === "left"
                                                ? "bg-[var(--background)] text-[var(--error)] border-[var(--error)]"
                                                : "bg-[var(--error)]/80 text-[var(--on-primary)] border-[var(--error)] hover:bg-[var(--background)] hover:text-[var(--error)]"
                                        )}>
                                        Bad Hand
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedHand) {
                                                setClicked("right");
                                                handleSwipe(
                                                    "Right",
                                                    selectedHand
                                                );
                                                setTimeout(
                                                    () => setClicked(null),
                                                    200
                                                );
                                            }
                                        }}
                                        className={cn(
                                            "w-100 max-w-2/5 transition-all duration-150 cursor-pointer px-4 py-2 rounded inline-block font-medium border border-2",
                                            clicked === "right" &&
                                                "animate-press",
                                            direction === "right"
                                                ? "bg-[var(--background)] text-[var(--success)] border-[var(--success)]"
                                                : "bg-[var(--success)]/80 text-[var(--on-primary)] border-[var(--success)] hover:bg-[var(--background)] hover:text-[var(--success)]"
                                        )}>
                                        Good Hand
                                    </button>
                                </div>
                            </>
                        )}

                    {suspects.length !== 0 &&
                        deckData &&
                        deckData.length > 0 && (
                            <div className="gap-4 mb-2 md:mb-4">
                                <h2 className="text-lg font-semibold flex flex-col">
                                    Culprits
                                </h2>
                                <div className=" p-4 rounded-md shadow-inner ">
                                    <ul className="flex flex-wrap overflow-y-auto max-h-40 sm:max-h-80 md:max-h-96 gap-3 scrollbar-hide justify-center">
                                        <AnimatePresence>
                                            {suspects.map((card, cardIndex) => (
                                                <motion.img
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{
                                                        duration: 0.3,
                                                    }}
                                                    key={`${card.id}-${cardIndex}`}
                                                    src={
                                                        card.card_images[0]
                                                            .image_url_small
                                                    }
                                                    alt={card.name}
                                                    className="w-1/6 border border-[var(--border)] shadow-sm transition-transform duration-150 ease-in-out object-contain pointer-events-none select-none"
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </ul>
                                </div>
                            </div>
                        )}
                </main>
                <footer className="w-full bg-[var(--primary)] text-[var(--on-surface)] text-center p-4 mt-auto pb-10 flex justify-center gap-12">
                    <a
                        href="https://github.com/hynwkm/ygo-culprithunt"
                        target="blank">
                        <img src={gIcon} alt="github icon" />
                    </a>
                    <a
                        href="https://www.linkedin.com/in/hyunwoo-kim/"
                        target="blank">
                        <img src={lIcon} alt="linked icon" />
                    </a>
                </footer>
            </div>
        </Router>
    );
}
