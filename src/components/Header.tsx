import { Link } from "react-router-dom";
import logo from "../assets/icon.svg";

export default function Header() {
    return (
        <header className="w-full  p-2 gap-3 flex bg-[var(--primary)] text-[var(--on-primary)] fixed h-16 z-10 items-center">
            <Link to="/" reloadDocument>
                <div className="h-10 flex-shrink-0 cursor-pointer">
                    <img
                        src={logo}
                        alt="logo"
                        className="h-full w-auto object-contain"
                    />
                </div>
            </Link>
            <div className="flex flex-col justify-center items-start">
                <h1 className=" text-xl font-bold">YGO - Culprit Hunt</h1>
                <p className="text-sm">Find the culprit in your deck!</p>
            </div>
        </header>
    );
}
