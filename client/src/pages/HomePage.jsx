import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import heroImage from "../assets/hero.png";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("authUser")) || null;
    } catch {
        return null;
    }
}

function getInitials(user) {
    const first = user?.firstName?.trim()?.[0] || "";
    const last = user?.lastName?.trim()?.[0] || "";
    const email = user?.email?.trim()?.[0] || "";

    return `${first}${last}`.toUpperCase() || email.toUpperCase() || "U";
}

function ProfileAvatar({ user, className = "h-11 w-11", textClass = "text-sm" }) {
    if (user?.profilePhoto) {
        return (
            <img
                src={user.profilePhoto}
                alt="Profile"
                className={`${className} rounded-full object-cover`}
            />
        );
    }

    return (
        <div className={`flex ${className} items-center justify-center rounded-full bg-[#eaa06d] ${textClass} font-bold text-white`}>
            {getInitials(user)}
        </div>
    );
}

function getStoredTheme() {
    const storedTheme = localStorage.getItem("theme");

    if (storedTheme === "dark" || storedTheme === "light") {
        return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function HomePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(getStoredUser);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [theme, setTheme] = useState(getStoredTheme);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const token = localStorage.getItem("authToken");

        if (!token) return;

        async function loadUser() {
            try {
                const response = await api.get("/auth/me");
                setUser(response.data.user);
                localStorage.setItem("authUser", JSON.stringify(response.data.user));
            } catch {
                localStorage.removeItem("authToken");
                localStorage.removeItem("authUser");
                setUser(null);
            }
        }

        loadUser();
    }, []);

    function handleLogout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setUser(null);
        setIsProfileOpen(false);
    }

    function handleThemeToggle() {
        setTheme((currentTheme) => currentTheme === "dark" ? "light" : "dark");
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
            <header className="border-b border-gray-200 bg-white/95 dark:border-neutral-800 dark:bg-neutral-950/95">
                <div className="relative flex min-h-16 w-full items-center gap-4 px-5 lg:px-10">
                    <Link to="/" className="flex items-center gap-2 text-[#e89a63]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e89a63]">
                            <span className="block h-4 w-2 -skew-x-12 rounded-sm bg-white" />
                        </span>
                        <span className="text-lg font-bold tracking-wide">ASTRIX</span>
                    </Link>

                    <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-700 dark:text-neutral-300 md:flex">
                        <Link to="/" className="text-[#d47f4f]">Home</Link>
                        <a href="#products" className="hover:text-[#d47f4f]">Products</a>
                    </nav>

                    <div className="ml-auto hidden w-80 md:block">
                        <label className="sr-only" htmlFor="site-search">Search</label>
                        <input
                            id="site-search"
                            type="search"
                            placeholder="Search"
                            className="h-10 w-full rounded border border-gray-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#e89a63] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleThemeToggle}
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        className="flex h-10 items-center gap-2 rounded border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-[#e89a63] hover:text-[#d47f4f] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                        {
                            theme === "dark"
                                ? <SunIcon />
                                : <MoonIcon />
                        }
                        <span className="hidden sm:inline">
                            {theme === "dark" ? "Light" : "Dark"}
                        </span>
                    </button>

                    {
                        user
                            ? (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        aria-label="Open profile menu"
                                        className="rounded-full shadow-sm transition hover:opacity-90"
                                    >
                                        <ProfileAvatar user={user} />
                                    </button>

                                    {
                                        isProfileOpen &&
                                        <div className="absolute right-0 top-14 z-20 w-56 rounded border border-gray-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
                                            <div className="flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-neutral-800">
                                                <ProfileAvatar user={user} className="h-12 w-12" />

                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-gray-900 dark:text-neutral-100">
                                                        {user.firstName} {user.lastName}
                                                    </p>
                                                    <p className="truncate text-xs text-gray-500 dark:text-neutral-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => navigate("/edit-profile")}
                                                className="mt-2 h-10 w-full rounded px-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-[#f7ece7] hover:text-[#d47f4f] dark:text-neutral-100 dark:hover:bg-neutral-900"
                                            >
                                                Edit Profile
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="h-10 w-full rounded px-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-red-50 hover:text-red-600 dark:text-neutral-100 dark:hover:bg-neutral-900"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    }
                                </div>
                            )
                            : (
                                <Link
                                    to="/auth"
                                    className="rounded bg-[#eaa06d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#df925e]"
                                >
                                    Login / Signup
                                </Link>
                            )
                    }
                </div>
            </header>

            <main>
                <section className="grid min-h-[calc(100vh-64px)] w-full items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_520px] lg:px-16 xl:px-24">
                    <div className="max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d47f4f]">
                            Workspace for focused teams
                        </p>

                        <h1 className="mt-5 text-4xl font-bold leading-tight text-gray-900 dark:text-neutral-100 sm:text-5xl">
                            Build, organize, and launch your work with ASTRIX.
                        </h1>

                        <p className="mt-5 text-base leading-7 text-gray-600 dark:text-neutral-300">
                            A clean workspace for accounts, projects, and everyday productivity. Start with secure login, then keep your tools and team flow in one place.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {
                                user
                                    ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate("/edit-profile")}
                                            className="rounded bg-[#eaa06d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#df925e]"
                                        >
                                            Edit Profile
                                        </button>
                                    )
                                    : (
                                        <Link
                                            to="/auth"
                                            className="rounded bg-[#eaa06d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#df925e]"
                                        >
                                            Get Started
                                        </Link>
                                    )
                            }

                            <a
                                href="#products"
                                className="rounded border border-gray-300 px-6 py-3 text-sm font-bold text-gray-800 transition hover:border-[#e89a63] hover:text-[#d47f4f] dark:border-neutral-700 dark:text-neutral-100"
                            >
                                View Products
                            </a>
                        </div>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        <div className="flex aspect-square w-full max-w-lg items-center justify-center rounded bg-gray-200 p-10 dark:bg-neutral-800">
                            <img
                                src={heroImage}
                                alt="ASTRIX workspace layers"
                                className="h-full w-full object-contain"
                            />
                        </div>
                    </div>
                </section>

                <section id="products" className="border-y border-gray-200 bg-gray-50 py-12 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="w-full px-5 lg:px-16 xl:px-24">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
                            Products
                        </h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            {["Authentication", "Workspace", "Productivity"].map((product) => (
                                <article key={product} className="rounded border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                                    <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-neutral-100">
                                        {product}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-neutral-300">
                                        Simple tools designed to keep the ASTRIX experience fast, focused, and easy to use.
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-white py-6 dark:bg-neutral-950">
                <div className="flex w-full flex-col gap-3 px-5 text-sm text-gray-600 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between lg:px-10">
                    <span>ASTRIX</span>
                    <span>Home | Products | {user ? "Profile" : "Login / Signup"}</span>
                </div>
            </footer>
        </div>
    );
}

function SunIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.9 4.9 1.4 1.4" />
            <path d="m17.7 17.7 1.4 1.4" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m4.9 19.1 1.4-1.4" />
            <path d="m17.7 6.3 1.4-1.4" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
        </svg>
    );
}

export default HomePage;
