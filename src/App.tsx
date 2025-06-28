import axios from "axios";
import { type ClassValue, clsx } from "clsx";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import "./App.css";
import logo from "./assets/icon.svg";
import.meta.env.BASE_URL;

type Deck = {
    main: number[];
    extra: number[];
    side: number[];
};
interface CardImage {
    id: number;
    image_url: string;
    image_url_small: string;
    image_url_cropped: string;
}
type CardData = {
    id: number;
    name: string;
    type: string;
    frameType: string;
    desc: string;
    atk: number;
    def: number;
    level: number;
    race: string;
    attribute: string;
    card_images: CardImage[];
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

const shuffleDeck = (deck: number[]) => {
    let i = deck.length;
    let j;
    let temp;
    while (i > 0) {
        j = Math.floor(Math.random() * (i + 1));
        temp = deck[j];
        deck[j] = deck[i];
        deck[i] = temp;
        i--;
    }
    return deck;
};

export default function App() {
    const [deck, setDeck] = useState<Deck | null>(null);
    const [deckData, setDeckData] = useState<CardData[]>([]);
    const [hands, setHands] = useState<CardData[][]>([]);
    const [goodHandCards, setGoodHandCards] = useState<CardData[]>([]);
    const [badHandCards, setBadHandCards] = useState<CardData[]>([]);
    const [suspects, setSuspects] = useState<CardData[]>([]);

    const handleDeckUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result as string;
            const deck = parseYDK(content);
            setDeck(deck);
        };
        reader.readAsText(file);
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
                setDeckData(deckData.data);
            } catch (error) {
                console.error(error);
            }
        };
        getDeckData();
    }, [deck]);

    useEffect(() => {
        if (!deckData) return;

        const hands: CardData[][] = [];
        for (let i = 0; i < deckData.length; i += 5) {
            hands.push(deckData.slice(i, i + 5));
        }
        setHands(hands);
    }, [deckData]);

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--on-background)]">
            <header className="w-full  p-4 gap-2 flex gap-4 bg-[var(--primary)] text-[var(--on-primary)]">
                <div className="h-14 flex-shrink-0">
                    <img
                        src={logo}
                        alt="logo"
                        className="h-full w-auto object-contain"
                    />
                </div>
                <div className="flex flex-col justify-center items-start">
                    <h1 className=" text-2xl font-bold">YGO - Culprit Hunt</h1>
                    <p>Find the culprit in your deck!</p>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                <h2 className="text-xl font-semibold">
                    Upload a deck to start
                </h2>
                <div className="bg-[var(--surface)] text-[var(--on-surface)] p-4 flex justify-center">
                    <label className="cursor-pointer bg-[var(--primary)] text-[var(--on-primary)] px-8 py-4 rounded inline-block">
                        UPLOAD DECK
                        <input
                            type="file"
                            className="hidden"
                            accept=".ydk"
                            onChange={handleDeckUpload}
                        />
                    </label>
                </div>
                {deckData && deckData.length > 0 && (
                    <div className="gap-4">
                        <h2 className="text-lg font-semibold">Main Deck:</h2>
                        <div className="bg-[var(--surface)] p-4 rounded-md shadow-inner ">
                            <ul className="flex flex-col items-center overflow-y-auto gap-4 bg-[var(--surface)] h-72 scrollbar-hide ">
                                {hands.map((hand, handIndex) => (
                                    <li
                                        className="relative w-10/12 first:w-full flex justify-center gap-1 p-2 rounded-md bg-gradient-to-r from-[var(--error)]/40 via-[var(--neutral-200)] to-[var(--success)]/40"
                                        key={handIndex}>
                                        {hand.map((card, cardIndex) => {
                                            return (
                                                <img
                                                    src={
                                                        card.card_images[0]
                                                            .image_url_small
                                                    }
                                                    alt={card.name}
                                                    className="w-1/6 border border-[var(--border)] rounded-sm shadow-sm hover:scale-105 transition-transform duration-150 ease-in-out"
                                                    key={`${handIndex}-${card.id}-${cardIndex}`}
                                                />
                                            );
                                        })}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </main>
            {/* <footer>Created by hynwkm</footer> */}
        </div>
    );
}
