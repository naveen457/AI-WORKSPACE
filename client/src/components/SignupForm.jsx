import { useState } from "react";
import api from "../api/api";
import OAuthButtons from "./OAuthButtons";

function SignupForm({ onSignupVerified }) {

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        acceptedTerms: false
    });

    const [errors, setErrors] = useState({});
    const [statusMessage, setStatusMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [authStep, setAuthStep] = useState("signup");
    const [otp, setOtp] = useState("");

    function handleChange(e) {
        const { name, value, type, checked } = e.target;

        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value
        });
    }

    function handleOtpChange(e) {
        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
    }

    function validateForm() {

        let newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = "First name is required";
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = "Last name is required";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        }
        else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        }
        else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }
        else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = "Password must include one uppercase letter";
        }
        else if (!/[a-z]/.test(formData.password)) {
            newErrors.password = "Password must include one lowercase letter";
        }
        else if (!/[0-9]/.test(formData.password)) {
            newErrors.password = "Password must include one number";
        }

        if (!formData.acceptedTerms) {
            newErrors.acceptedTerms = "Please accept the terms and conditions";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

    async function requestEmailOtp() {
        try {
            setIsSubmitting(true);

            await api.post("/auth/request-email-otp", {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                password: formData.password,
                acceptedTerms: formData.acceptedTerms
            });

            setAuthStep("otp");
            setStatusMessage("OTP sent. Please check your email to verify your signup.");
        } catch (error) {
            setStatusMessage(
                error.response?.data?.message || "Unable to start email verification. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function verifyEmailOtp() {
        let newErrors = {};

        if (otp.length !== 6) {
            newErrors.otp = "Enter the 6-digit OTP sent to your email";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        try {
            setIsSubmitting(true);

            await api.post("/auth/verify-email-otp", {
                email: formData.email.trim(),
                otp
            });

            setAuthStep("success");
            setStatusMessage("Authentication successful. Redirecting to login...");
            setTimeout(() => {
                onSignupVerified?.();
            }, 900);
        } catch (error) {
            setStatusMessage(
                error.response?.data?.message || "Unable to verify OTP. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSubmit(e) {

        e.preventDefault();
        setStatusMessage("");

        if (authStep === "success") return;

        if (authStep === "otp") {
            await verifyEmailOtp();
            return;
        }

        const isValid = validateForm();

        if (!isValid) return;

        await requestEmailOtp();
    }

    return (
        <div className="flex w-full min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-neutral-900 lg:min-h-0 lg:h-[68vh] lg:rounded-lg lg:shadow-2xl">
            <div className="hidden lg:flex w-2/5 bg-gray-300 dark:bg-neutral-800 items-center justify-center">
                <div className="text-center">
                    <div className="w-64 h-64 bg-gray-400 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                        <span className="text-gray-700 dark:text-neutral-200 text-lg font-semibold">AI Workspace</span>
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
                    AI Workspace
                </span>
            </div>

            <div className="bg-[#f7ece7] dark:bg-neutral-900 px-4 py-5 text-center">
                <h2 className="text-lg font-serif text-black dark:text-neutral-100">
                    {authStep === "success" ? "Authentication Successful" : "Sign Up for AI Workspace"}
                </h2>

                <p className="mt-2 text-sm leading-5 text-black dark:text-neutral-300">
                    {
                        authStep === "otp"
                            ? "Enter the OTP sent to your email address."
                            : authStep === "success"
                                ? "Your account has been verified successfully."
                                : "Fill out your information below to begin email OTP verification."
                    }
                </p>
            </div>

            {
                authStep === "success" &&
                <div className="rounded border border-green-300 bg-green-50 px-4 py-4 text-center">
                    <p className="text-sm font-semibold text-green-700">
                        Authentication successful
                    </p>

                    <p className="mt-1 text-xs text-green-700">
                        Later this can redirect to your main website page.
                    </p>
                </div>
            }

            {
                authStep !== "success" &&
                <>
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
                        disabled={authStep === "otp"}
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
                        disabled={authStep === "otp"}
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
                    Email Address
                </label>

                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={authStep === "otp"}
                    placeholder="Email Address"
                    className={`h-11 rounded border bg-white px-4 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100
                    ${errors.email
                        ? "border-red-500"
                        : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                    }`}
                />

                {
                    errors.email &&
                    <p className="text-xs text-red-500">
                        {errors.email}
                    </p>
                }

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
                        disabled={authStep === "otp"}
                        placeholder="Password"
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
                        {
                            showPassword
                                ? (
                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
                                        <path d="M8.2 5.4A10.7 10.7 0 0 1 12 4c5 0 8.4 4.4 9.5 6a13 13 0 0 1-3 3.6" />
                                        <path d="M6.1 6.8A13.7 13.7 0 0 0 2.5 10c1.1 1.6 4.5 6 9.5 6a10 10 0 0 0 3.1-.5" />
                                    </svg>
                                )
                                : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )
                        }
                    </button>
                </div>

                {
                    errors.password &&
                    <p className="text-xs text-red-500">
                        {errors.password}
                    </p>
                }

            </div>

            <div className="flex flex-col gap-2 text-xs text-black dark:text-neutral-200">
                <p>Add me to your mailing list</p>

                <label className="flex items-start gap-2">
                    <input
                        type="checkbox"
                        name="acceptedTerms"
                        checked={formData.acceptedTerms}
                        onChange={handleChange}
                        disabled={authStep === "otp"}
                        className="mt-0.5 h-3.5 w-3.5 accent-[#e89a63]"
                    />

                    <span>
                        I agree to receive e-mails from AI Workspace and your terms and conditions.
                    </span>
                </label>

                {
                    errors.acceptedTerms &&
                    <p className="text-xs text-red-500">
                        {errors.acceptedTerms}
                    </p>
                }
            </div>

            {
                authStep === "otp" &&
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                        Email OTP
                    </label>

                    <input
                        type="text"
                        inputMode="numeric"
                        name="otp"
                        value={otp}
                        onChange={handleOtpChange}
                        placeholder="Enter 6-digit OTP"
                        className={`h-11 rounded border bg-white px-4 text-center text-lg tracking-[0.3em] text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100
                        ${errors.otp
                            ? "border-red-500"
                            : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                        }`}
                    />

                    {
                        errors.otp &&
                        <p className="text-xs text-red-500">
                            {errors.otp}
                        </p>
                    }

                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={requestEmailOtp}
                        className="self-start text-xs font-semibold text-[#d47f4f] hover:text-[#b8663b] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        Resend OTP
                    </button>
                </div>
            }
                </>
            }

            {
                statusMessage &&
                <p className="text-center text-sm text-gray-700 dark:text-neutral-300">
                    {statusMessage}
                </p>
            }

            {
                authStep !== "success" &&
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 rounded bg-[#eaa06d] font-serif font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {
                        isSubmitting
                            ? authStep === "otp" ? "Verifying..." : "Sending OTP..."
                            : authStep === "otp" ? "Verify OTP" : "Sign Me Up"
                    }
                </button>
            }

            {
                authStep === "signup" &&
                <>
                    <div className="my-2 border-t border-gray-300"></div>
                    <OAuthButtons />
                </>
            }

        </form>
        </div>
    );
}

export default SignupForm;
