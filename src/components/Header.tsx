import logo from "../assets/icon.svg";

export default function Header() {
    return (
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
    );
}
