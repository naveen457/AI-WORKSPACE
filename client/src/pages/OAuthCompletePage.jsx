import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/api";

function decodeJwtPayload(token) {
    try {
        const [, payload] = token.split(".");
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

function OAuthCompletePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const providerFromUrl = searchParams.get("provider") || "OAuth";
    const decodedProfile = useMemo(() => {
        if (!token) {
            return {
                email: "",
                firstName: "",
                lastName: "",
            };
        }

        const decoded = decodeJwtPayload(token);

        if (!decoded) {
            return {
                email: "",
                firstName: "",
                lastName: "",
            };
        }

        return {
            email: decoded.email || "",
            firstName: decoded.firstName || "",
            lastName: decoded.lastName || "",
        };
    }, [token]);
    const [formData, setFormData] = useState({
        firstName: decodedProfile.firstName,
        lastName: decodedProfile.lastName,
        email: decodedProfile.email,
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [statusMessage, setStatusMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const provider = providerFromUrl;
    const initialStatusMessage = !token
        ? "Invalid session. Please try again."
        : !decodedProfile.email
            ? "Invalid token. Please try again."
            : "";

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    }

    function validateForm() {
        let newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = "First name is required";
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = "Last name is required";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        } else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = "Password must include one uppercase letter";
        } else if (!/[a-z]/.test(formData.password)) {
            newErrors.password = "Password must include one lowercase letter";
        } else if (!/[0-9]/.test(formData.password)) {
            newErrors.password = "Password must include one number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatusMessage(initialStatusMessage);

        if (initialStatusMessage) return;

        if (!validateForm()) return;

        try {
            setIsSubmitting(true);

            const response = await api.post("/auth/oauth-complete-signup", {
                token,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                password: formData.password,
            });

            if (response.data.token) {
                localStorage.setItem("authToken", response.data.token);
                setStatusMessage("Account created successfully! Redirecting...");
                
                setTimeout(() => {
                    window.location.href = `/auth?token=${encodeURIComponent(response.data.token)}`;
                }, 1000);
            }
        } catch (error) {
            setStatusMessage(
                error.response?.data?.message || "Unable to complete signup. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-0 py-0 lg:px-4 lg:py-10">
            <div className="w-full min-h-screen lg:min-h-0 lg:max-w-5xl flex flex-col items-center justify-center gap-6">
                <h1 className="hidden lg:block text-4xl font-bold text-gray-800 dark:text-neutral-100">
                    ASTRIX
                </h1>

                <div className="flex w-full min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-neutral-900 lg:min-h-0 lg:h-[68vh] lg:rounded-lg lg:shadow-2xl">
                    <div className="hidden lg:flex w-2/5 bg-gray-300 dark:bg-neutral-800 items-center justify-center">
                        <div className="text-center">
                            <div className="w-64 h-64 bg-gray-400 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                                <span className="text-gray-700 dark:text-neutral-200 text-lg font-semibold">ASTRIX</span>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="w-full lg:w-3/5 bg-white dark:bg-neutral-950 px-8 sm:px-12 py-8 flex flex-col gap-5 justify-center overflow-y-auto"
                    >
                <div className="flex items-center justify-center gap-2 text-[#e89a63]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e89a63]">
                        <span className="block h-4 w-2 -skew-x-12 rounded-sm bg-white" />
                    </span>

                    <span className="text-lg font-semibold">
                        ASTRIX
                    </span>
                </div>

                <div className="bg-[#f7ece7] dark:bg-neutral-900 px-4 py-5 text-center">
                    <h2 className="text-lg font-serif text-black dark:text-neutral-100">
                        Complete Your Profile
                    </h2>

                    <p className="mt-2 text-sm leading-5 text-black dark:text-neutral-300">
                        Confirm your details to finish setting up your account with {provider}
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-black dark:text-neutral-100">
                            First Name
                        </label>

                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="First Name"
                            className={`h-11 rounded border bg-white px-4 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100
                            ${errors.firstName
                                ? "border-red-500"
                                : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                            }`}
                        />

                        {
                            errors.firstName &&
                            <p className="text-xs text-red-500">
                                {errors.firstName}
                            </p>
                        }
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-black dark:text-neutral-100">
                            Last Name
                        </label>

                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Last Name"
                            className={`h-11 rounded border bg-white px-4 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100
                            ${errors.lastName
                                ? "border-red-500"
                                : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                            }`}
                        />

                        {
                            errors.lastName &&
                            <p className="text-xs text-red-500">
                                {errors.lastName}
                            </p>
                        }
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                        Email
                    </label>

                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        disabled
                        placeholder="Email"
                        className="h-11 rounded border border-gray-300 bg-gray-50 px-4 text-sm text-gray-600 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                    />

                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                        This email comes from your {provider} account and cannot be changed here.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                        Password
                    </label>

                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            className={`h-11 w-full rounded border bg-white px-4 pr-11 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100
                            ${errors.password
                                ? "border-red-500"
                                : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                            }`}
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-gray-500 hover:text-[#e89a63] dark:text-neutral-400"
                        >
                            <PasswordEyeIcon isVisible={showPassword} />
                        </button>
                    </div>

                    {
                        errors.password &&
                        <p className="text-xs text-red-500">
                            {errors.password}
                        </p>
                    }
                </div>

                {
                    statusMessage &&
                    <div className={`text-center text-sm p-3 rounded ${
                        statusMessage.includes("error") || statusMessage.includes("Invalid")
                            ? "bg-red-50 text-red-700"
                            : statusMessage.includes("successfully")
                                ? "bg-green-50 text-green-700"
                                : "bg-blue-50 text-blue-700"
                    }`}>
                        {statusMessage}
                    </div>
                }
                {
                    !statusMessage && initialStatusMessage &&
                    <div className="text-center text-sm p-3 rounded bg-red-50 text-red-700">
                        {initialStatusMessage}
                    </div>
                }

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 rounded bg-[#eaa06d] font-serif font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSubmitting ? "Creating Account..." : "Complete Signup"}
                </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function PasswordEyeIcon({ isVisible }) {
    if (isVisible) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
                <path d="M8.2 5.4A10.7 10.7 0 0 1 12 4c5 0 8.4 4.4 9.5 6a13 13 0 0 1-3 3.6" />
                <path d="M6.1 6.8A13.7 13.7 0 0 0 2.5 10c1.1 1.6 4.5 6 9.5 6a10 10 0 0 0 3.1-.5" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

export default OAuthCompletePage;
