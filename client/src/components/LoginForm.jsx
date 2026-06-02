import { useState } from "react";
import api from "../api/api";
import OAuthButtons from "./OAuthButtons";

function LoginForm() {

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        resetOtp: "",
        newPassword: ""
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authMode, setAuthMode] = useState("login");

    function handleChange(e) {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: name === "resetOtp" ? value.replace(/\D/g, "").slice(0, 6) : value
        });
    }

    function validateIdentifier() {
        let newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        return newErrors;
    }

    function validatePassword(password, fieldName = "password") {
        if (!password) {
            return fieldName === "password" ? "Password is required" : "New password is required";
        }

        if (password.length < 8) {
            return "Password must be at least 8 characters";
        }

        if (!/[A-Z]/.test(password)) {
            return "Password must include one uppercase letter";
        }

        if (!/[a-z]/.test(password)) {
            return "Password must include one lowercase letter";
        }

        if (!/[0-9]/.test(password)) {
            return "Password must include one number";
        }

        return "";
    }

    function resetToLogin(message = "") {
        setAuthMode("login");
        setErrors({});
        setStatusMessage(message);
        setFormData({
            email: formData.email,
            password: "",
            resetOtp: "",
            newPassword: ""
        });
    }

    async function handleLogin() {
        let newErrors = validateIdentifier();

        if (!formData.password) {
            newErrors.password = "Password is required";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        try {
            setIsSubmitting(true);

            await api.post("/auth/login", {
                email: formData.email.trim(),
                password: formData.password
            });

            setStatusMessage("Login successful.");
        } catch (error) {
            setStatusMessage(
                error.response?.data?.message || "Unable to login. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResetOtpRequest() {
        const newErrors = validateIdentifier();

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        try {
            setIsSubmitting(true);

            await api.post("/auth/request-password-reset-otp", {
                email: formData.email.trim()
            });

            setAuthMode("reset");
            setStatusMessage("Password reset OTP sent. Please check your email.");
        } catch (error) {
            setStatusMessage(
                error.response?.data?.message || "Unable to send reset OTP. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handlePasswordReset() {
        let newErrors = validateIdentifier();
        const passwordError = validatePassword(formData.newPassword, "newPassword");

        if (formData.resetOtp.length !== 6) {
            newErrors.resetOtp = "Enter the 6-digit OTP sent to your email";
        }

        if (passwordError) {
            newErrors.newPassword = passwordError;
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        try {
            setIsSubmitting(true);

            await api.post("/auth/reset-password", {
                email: formData.email.trim(),
                otp: formData.resetOtp,
                password: formData.newPassword
            });

            setStatusMessage("Password reset successful. Redirecting to login...");
            setTimeout(() => {
                resetToLogin("Password reset successful. Please login with your new password.");
            }, 900);
        } catch (error) {
            setStatusMessage(
                error.response?.data?.message || "Unable to reset password. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatusMessage("");

        if (authMode === "forgot") {
            await handleResetOtpRequest();
            return;
        }

        if (authMode === "reset") {
            await handlePasswordReset();
            return;
        }

        await handleLogin();
    }

    return (
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
                    {authMode === "login" ? "Login to ASTRIX" : "Reset Password"}
                </h2>

                <p className="mt-2 text-sm leading-5 text-black dark:text-neutral-300">
                    {
                        authMode === "forgot"
                            ? "Enter your email to receive a password reset OTP."
                            : authMode === "reset"
                                ? "Enter the OTP and your new password."
                                : "Enter your account details to continue."
                    }
                </p>
            </div>

            <div className="flex flex-col gap-2">

                <label className="text-xs font-medium text-black dark:text-neutral-100">
                    Email
                </label>

                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={authMode === "reset"}
                    placeholder="Email"
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

            {
                authMode === "login" &&
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
                            <PasswordEyeIcon isVisible={showPassword} />
                        </button>
                    </div>

                    {
                        errors.password &&
                        <p className="text-xs text-red-500">
                            {errors.password}
                        </p>
                    }

                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode("forgot");
                            setErrors({});
                            setStatusMessage("");
                        }}
                        className="self-start text-xs font-semibold text-[#d47f4f] hover:text-[#b8663b]"
                    >
                        Forgot / Reset password?
                    </button>

                </div>
            }

            {
                authMode === "reset" &&
                <>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-black dark:text-neutral-100">
                            Reset OTP
                        </label>

                        <input
                            type="text"
                            inputMode="numeric"
                            name="resetOtp"
                            value={formData.resetOtp}
                            onChange={handleChange}
                            placeholder="Enter 6-digit OTP"
                            className={`h-11 rounded border bg-white px-4 text-center text-lg tracking-[0.3em] text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100
                            ${errors.resetOtp
                                ? "border-red-500"
                                : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                            }`}
                        />

                        {
                            errors.resetOtp &&
                            <p className="text-xs text-red-500">
                                {errors.resetOtp}
                            </p>
                        }
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-black dark:text-neutral-100">
                            New Password
                        </label>

                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="New Password"
                                className={`h-11 w-full rounded border bg-white px-4 pr-11 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100
                                ${errors.newPassword
                                    ? "border-red-500"
                                    : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                                }`}
                            />

                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-gray-500 hover:text-[#e89a63] dark:text-neutral-400"
                            >
                                <PasswordEyeIcon isVisible={showNewPassword} />
                            </button>
                        </div>

                        {
                            errors.newPassword &&
                            <p className="text-xs text-red-500">
                                {errors.newPassword}
                            </p>
                        }
                    </div>

                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleResetOtpRequest}
                        className="self-start text-xs font-semibold text-[#d47f4f] hover:text-[#b8663b] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        Resend OTP
                    </button>
                </>
            }

            {
                authMode !== "login" &&
                <button
                    type="button"
                    onClick={() => resetToLogin()}
                    className="self-start text-xs font-semibold text-gray-600 hover:text-black dark:text-neutral-300 dark:hover:text-white"
                >
                    Back to login
                </button>
            }

            {
                statusMessage &&
                <p className="text-center text-sm text-gray-700 dark:text-neutral-300">
                    {statusMessage}
                </p>
            }

            <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded bg-[#eaa06d] font-serif font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
            >
                {
                    isSubmitting
                        ? authMode === "login" ? "Logging in..." : authMode === "forgot" ? "Sending OTP..." : "Resetting..."
                        : authMode === "login" ? "Login" : authMode === "forgot" ? "Send Reset OTP" : "Reset Password"
                }
            </button>

            {
                authMode === "login" &&
                <>
                    <div className="my-2 border-t border-gray-300"></div>
                    <OAuthButtons />
                </>
            }

            </form>
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

export default LoginForm;
