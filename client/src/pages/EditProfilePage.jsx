import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const SETTINGS_SECTIONS = [
    {
        id: "personal",
        label: "Personal Details",
        description: "Identity and contact info",
    },
    {
        id: "photo",
        label: "Profile Photo",
        description: "Upload or replace your image",
    },
    {
        id: "password",
        label: "Change Password",
        description: "Verify with email OTP",
    },
];

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

function createPersonalForm(user) {
    return {
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        dateOfBirth: user?.dateOfBirth || "",
        gender: user?.gender || "",
        phone: user?.phoneNumber || user?.phone || "",
        address: user?.address || "",
    };
}

function validatePassword(password) {
    if (!password) return "New password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must include one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must include one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must include one number";

    return "";
}

function EditProfilePage() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState("personal");
    const [user, setUser] = useState(getStoredUser);
    const [personalForm, setPersonalForm] = useState(() => createPersonalForm(user));
    const [photoDraft, setPhotoDraft] = useState(user?.profilePhoto || "");
    const [passwordForm, setPasswordForm] = useState({
        otp: "",
        newPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [profileMessage, setProfileMessage] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [photoMessage, setPhotoMessage] = useState("");
    const [passwordMode, setPasswordMode] = useState("idle");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [phoneOtpModal, setPhoneOtpModal] = useState({
        isOpen: false,
        expiresInSeconds: 0,
        resendAfterSeconds: 0,
        message: "",
        error: "",
    });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
    const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);

    const isCurrentPhoneVerified =
        Boolean(user?.isPhoneVerified || user?.phoneVerified) &&
        personalForm.phone.trim() === (user?.phoneNumber || user?.phone || "");

    useEffect(() => {
        if (!phoneOtpModal.isOpen) return;
        if (phoneOtpModal.expiresInSeconds <= 0 && phoneOtpModal.resendAfterSeconds <= 0) return;

        const timer = setTimeout(() => {
            setPhoneOtpModal((currentModal) => ({
                ...currentModal,
                expiresInSeconds: Math.max(currentModal.expiresInSeconds - 1, 0),
                resendAfterSeconds: Math.max(currentModal.resendAfterSeconds - 1, 0),
            }));
        }, 1000);

        return () => clearTimeout(timer);
    }, [phoneOtpModal]);

    useEffect(() => {
        const token = localStorage.getItem("authToken");

        if (!token) {
            navigate("/auth", { replace: true });
            return;
        }

        async function loadUser() {
            try {
                const response = await api.get("/auth/me");
                syncUser(response.data.user);
            } catch {
                localStorage.removeItem("authToken");
                localStorage.removeItem("authUser");
                navigate("/auth", { replace: true });
            }
        }

        loadUser();
    }, [navigate]);

    function syncUser(nextUser) {
        setUser(nextUser);
        setPersonalForm(createPersonalForm(nextUser));
        setPhotoDraft(nextUser.profilePhoto || "");
        localStorage.setItem("authUser", JSON.stringify(nextUser));
    }

    async function savePersonalDetails() {
        const newErrors = {};

        setProfileMessage("");

        if (!personalForm.firstName.trim()) {
            newErrors.firstName = "First name is required";
        }

        if (!personalForm.lastName.trim()) {
            newErrors.lastName = "Last name is required";
        }

        if (!personalForm.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(personalForm.email)) {
            newErrors.email = "Invalid email format";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return null;

        try {
            setIsSavingProfile(true);
            const response = await api.put("/auth/personal-details", {
                firstName: personalForm.firstName.trim(),
                lastName: personalForm.lastName.trim(),
                email: personalForm.email.trim(),
                dateOfBirth: personalForm.dateOfBirth,
                gender: personalForm.gender,
                phoneNumber: personalForm.phone,
                address: personalForm.address,
            });

            if (response.data.token) {
                localStorage.setItem("authToken", response.data.token);
            }

            syncUser(response.data.user);
            return response.data.user;
        } catch (error) {
            const message = error.response?.data?.message || "Unable to update personal details.";
            setProfileMessage(message);
            return null;
        } finally {
            setIsSavingProfile(false);
        }
    }

    async function saveProfilePhoto() {
        setPhotoMessage("");

        try {
            setIsSavingProfile(true);
            const response = await api.put("/auth/profile-photo", {
                profilePhoto: photoDraft || "",
            });

            syncUser(response.data.user);
            return response.data.user;
        } catch (error) {
            setPhotoMessage(error.response?.data?.message || "Unable to update profile photo.");
            return null;
        } finally {
            setIsSavingProfile(false);
        }
    }

    async function handleProfileSubmit(e) {
        e.preventDefault();
        const savedUser = await savePersonalDetails();

        if (savedUser) {
            setProfileMessage("Personal details updated successfully.");
        }
    }

    function handlePhotoUpload(e) {
        const file = e.target.files?.[0];

        if (!file) return;

        setErrors({});
        setPhotoMessage("");

        if (!file.type.startsWith("image/")) {
            setPhotoMessage("Please choose an image file.");
            return;
        }

        if (file.size > 1024 * 1024) {
            setPhotoMessage("Please choose an image under 1 MB.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            setPhotoDraft(reader.result);
            setPhotoMessage("Photo ready. Click Update Photo to save it.");
        };

        reader.readAsDataURL(file);
    }

    async function handlePhotoSubmit(e) {
        e.preventDefault();
        const savedUser = await saveProfilePhoto();

        if (savedUser) {
            setPhotoMessage("Profile photo updated successfully.");
        }
    }

    async function handlePasswordOtpRequest() {
        setPasswordMessage("");
        setErrors({});

        if (!user?.email) {
            setPasswordMessage("Login again to change your password.");
            return;
        }

        try {
            setIsSendingOtp(true);
            await api.post("/auth/request-password-reset-otp", {
                email: user.email,
            });
            setPasswordMode("otp");
            setPasswordMessage("Password reset OTP sent. Please check your email.");
        } catch (error) {
            setPasswordMessage(error.response?.data?.message || "Unable to send reset OTP. Please try again.");
        } finally {
            setIsSendingOtp(false);
        }
    }

    async function handlePhoneOtpRequest() {
        setProfileMessage("");
        setPhoneOtpModal((currentModal) => ({
            ...currentModal,
            message: "",
            error: "",
        }));

        if (!personalForm.phone.trim()) {
            setProfileMessage("Enter a phone number before verification.");
            return;
        }

        try {
            setIsSendingPhoneOtp(true);
            const response = await api.post("/auth/phone/send-otp", {
                phoneNumber: personalForm.phone.trim(),
            });

            if (response.data.user) {
                syncUser(response.data.user);
            }

            setPhoneOtp("");
            setPhoneOtpModal({
                isOpen: !response.data.alreadyVerified,
                expiresInSeconds: response.data.expiresInSeconds || 0,
                resendAfterSeconds: response.data.resendAfterSeconds || 60,
                message: response.data.alreadyVerified
                    ? "Phone number is already verified."
                    : "OTP sent. Enter the code to verify your phone.",
                error: "",
            });

            if (response.data.alreadyVerified) {
                setProfileMessage("Phone number is already verified.");
            }
        } catch (error) {
            const retryAfterSeconds = error.response?.data?.retryAfterSeconds || 0;

            setPhoneOtpModal((currentModal) => ({
                ...currentModal,
                resendAfterSeconds: retryAfterSeconds,
                error: error.response?.data?.message || "Unable to send phone OTP.",
            }));
            setProfileMessage(error.response?.data?.message || "Unable to send phone OTP.");
        } finally {
            setIsSendingPhoneOtp(false);
        }
    }

    async function handlePhoneOtpVerify(e) {
        e.preventDefault();

        if (phoneOtp.length !== 6) {
            setPhoneOtpModal((currentModal) => ({
                ...currentModal,
                error: "Enter the 6-digit OTP.",
            }));
            return;
        }

        try {
            setIsVerifyingPhoneOtp(true);
            const response = await api.post("/auth/phone/verify-otp", {
                phoneNumber: personalForm.phone.trim(),
                otp: phoneOtp,
            });

            syncUser(response.data.user);
            setPhoneOtp("");
            setPhoneOtpModal({
                isOpen: false,
                expiresInSeconds: 0,
                resendAfterSeconds: 0,
                message: "",
                error: "",
            });
            setProfileMessage("Phone number verified successfully.");
        } catch (error) {
            setPhoneOtpModal((currentModal) => ({
                ...currentModal,
                error: error.response?.data?.message || "Unable to verify phone OTP.",
            }));
        } finally {
            setIsVerifyingPhoneOtp(false);
        }
    }

    async function handlePasswordSubmit(e) {
        e.preventDefault();
        setPasswordMessage("");

        const newErrors = {};
        const passwordError = validatePassword(passwordForm.newPassword);

        if (passwordForm.otp.length !== 6) {
            newErrors.otp = "Enter the 6-digit OTP sent to your email";
        }

        if (passwordError) {
            newErrors.newPassword = passwordError;
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        try {
            setIsChangingPassword(true);
            await api.post("/auth/reset-password", {
                email: user.email,
                otp: passwordForm.otp,
                password: passwordForm.newPassword,
            });

            setPasswordForm({ otp: "", newPassword: "" });
            setPasswordMode("idle");
            setPasswordMessage("Password changed successfully.");
        } catch (error) {
            setPasswordMessage(error.response?.data?.message || "Unable to change password. Please try again.");
        } finally {
            setIsChangingPassword(false);
        }
    }

    function renderAvatar(sizeClass = "h-16 w-16", textClass = "text-lg") {
        if (photoDraft || user?.profilePhoto) {
            return (
                <img
                    src={photoDraft || user.profilePhoto}
                    alt="Profile"
                    className={`${sizeClass} rounded-full object-cover`}
                />
            );
        }

        return (
            <div className={`flex ${sizeClass} items-center justify-center rounded-full bg-[#eaa06d] ${textClass} font-bold text-white`}>
                {getInitials(user)}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
            <header className="border-b border-gray-200 bg-white/95 dark:border-neutral-800 dark:bg-neutral-950/95">
                <div className="flex min-h-16 w-full items-center gap-4 px-5 lg:px-10">
                    <Link to="/" className="flex items-center gap-2 text-[#e89a63]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e89a63]">
                            <span className="block h-4 w-2 -skew-x-12 rounded-sm bg-white" />
                        </span>
                        <span className="text-lg font-bold tracking-wide">ASTRIX</span>
                    </Link>

                    <Link
                        to="/"
                        className="ml-auto rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800 transition hover:border-[#e89a63] hover:text-[#d47f4f] dark:border-neutral-700 dark:text-neutral-100"
                    >
                        Back Home
                    </Link>
                </div>
            </header>

            <main className="grid min-h-[calc(100vh-64px)] w-full gap-6 px-5 py-6 lg:grid-cols-[340px_1fr] lg:px-10">
                <aside className="border border-gray-200 bg-gray-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-4">
                        {renderAvatar()}

                        <div className="min-w-0">
                            <p className="truncate text-base font-bold">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="truncate text-sm text-gray-500 dark:text-neutral-400">
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-2">
                        {SETTINGS_SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => setActiveSection(section.id)}
                                className={`rounded border px-4 py-3 text-left transition ${
                                    activeSection === section.id
                                        ? "border-[#eaa06d] bg-[#f7ece7] text-[#b8663b] dark:border-[#eaa06d] dark:bg-neutral-800 dark:text-[#eaa06d]"
                                        : "border-transparent text-gray-700 hover:border-gray-200 hover:bg-white dark:text-neutral-300 dark:hover:border-neutral-800 dark:hover:bg-neutral-950"
                                }`}
                            >
                                <span className="block text-sm font-bold">{section.label}</span>
                                <span className="mt-1 block text-xs text-gray-500 dark:text-neutral-400">
                                    {section.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950 lg:p-8">
                    {activeSection === "personal" && (
                        <form onSubmit={handleProfileSubmit}>
                            <h1 className="text-2xl font-bold">Personal Details</h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
                                Manage your identity, contact information, and account details.
                            </p>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={personalForm.firstName}
                                        onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                                        placeholder="First Name"
                                        className={`h-11 rounded border bg-white px-4 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100 ${
                                            errors.firstName
                                                ? "border-red-500"
                                                : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                                        }`}
                                    />
                                    {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={personalForm.lastName}
                                        onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                                        placeholder="Last Name"
                                        className={`h-11 rounded border bg-white px-4 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100 ${
                                            errors.lastName
                                                ? "border-red-500"
                                                : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                                        }`}
                                    />
                                    {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={personalForm.email}
                                        readOnly
                                        placeholder="Email"
                                        className={`h-11 cursor-not-allowed rounded border bg-gray-50 px-4 text-sm text-gray-600 outline-none transition dark:bg-neutral-900 dark:text-neutral-400 ${
                                            errors.email
                                                ? "border-red-500"
                                                : "border-gray-300 dark:border-neutral-700"
                                        }`}
                                    />
                                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                                        Date of Birth
                                    </label>
                                    <input
                                        type="date"
                                        value={personalForm.dateOfBirth}
                                        onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
                                        className="h-11 rounded border border-gray-400 bg-white px-4 text-sm text-black outline-none transition focus:border-[#e89a63] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                                        Gender
                                    </label>
                                    <select
                                        value={personalForm.gender}
                                        onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
                                        className="h-11 rounded border border-gray-400 bg-white px-4 text-sm text-black outline-none transition focus:border-[#e89a63] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                                    >
                                        <option value="">Prefer not to say</option>
                                        <option value="female">Female</option>
                                        <option value="male">Male</option>
                                        <option value="non-binary">Non-binary</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                                        Phone Number
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            value={personalForm.phone}
                                            onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                                            placeholder="Phone Number"
                                            className="h-11 min-w-0 flex-1 rounded border border-gray-400 bg-white px-4 text-sm text-black outline-none transition focus:border-[#e89a63] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePhoneOtpRequest}
                                            disabled={!personalForm.phone.trim()}
                                            className="h-11 rounded border border-gray-300 px-4 text-sm font-bold text-gray-800 transition hover:border-[#e89a63] hover:text-[#d47f4f] disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-100"
                                        >
                                            {isSendingPhoneOtp ? "Sending..." : "Verify Phone Number"}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${
                                                isCurrentPhoneVerified
                                                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                                    : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
                                            }`}
                                        >
                                            {isCurrentPhoneVerified ? <CheckIcon /> : <AlertIcon />}
                                            {isCurrentPhoneVerified ? "Verified" : "Not Verified"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:col-span-2">
                                    <label className="text-xs font-medium text-black dark:text-neutral-100">
                                        Address
                                    </label>
                                    <textarea
                                        value={personalForm.address}
                                        onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                                        placeholder="Address"
                                        rows={4}
                                        className="rounded border border-gray-400 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#e89a63] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                                    />
                                </div>
                            </div>

                            {profileMessage && (
                                <p className="mt-4 text-sm text-gray-700 dark:text-neutral-300">
                                    {profileMessage}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSavingProfile}
                                className="mt-6 h-11 rounded bg-[#eaa06d] px-5 text-sm font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isSavingProfile ? "Saving..." : "Save Details"}
                            </button>
                        </form>
                    )}

                    {activeSection === "photo" && (
                        <form onSubmit={handlePhotoSubmit}>
                            <h1 className="text-2xl font-bold">Profile Photo</h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
                                Upload, change, or remove your profile image.
                            </p>

                            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                                {renderAvatar("h-28 w-28", "text-3xl")}

                                <div className="grid gap-3">
                                    <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded border border-gray-300 px-5 text-sm font-bold text-gray-800 transition hover:border-[#e89a63] hover:text-[#d47f4f] dark:border-neutral-700 dark:text-neutral-100">
                                        Upload Photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="sr-only"
                                        />
                                    </label>

                                    {photoDraft && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPhotoDraft("");
                                                setPhotoMessage("Photo removed. Click Update Photo to save it.");
                                            }}
                                            className="h-11 rounded border border-gray-300 px-5 text-sm font-bold text-gray-800 transition hover:border-red-300 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-100"
                                        >
                                            Remove Photo
                                        </button>
                                    )}
                                </div>
                            </div>

                            {photoMessage && (
                                <p className="mt-4 text-sm text-gray-700 dark:text-neutral-300">
                                    {photoMessage}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSavingProfile}
                                className="mt-6 h-11 rounded bg-[#eaa06d] px-5 text-sm font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isSavingProfile ? "Updating..." : "Update Photo"}
                            </button>
                        </form>
                    )}

                    {activeSection === "password" && (
                        <form onSubmit={handlePasswordSubmit}>
                            <h1 className="text-2xl font-bold">Change Password</h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
                                We will send an OTP to {user?.email || "your email"} before changing your password.
                            </p>

                            {passwordMode === "idle" ? (
                                <button
                                    type="button"
                                    onClick={handlePasswordOtpRequest}
                                    disabled={isSendingOtp}
                                    className="mt-6 h-11 rounded bg-[#eaa06d] px-5 text-sm font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSendingOtp ? "Sending OTP..." : "Change Password"}
                                </button>
                            ) : (
                                <div className="mt-6 grid max-w-xl gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-medium text-black dark:text-neutral-100">
                                            Reset OTP
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={passwordForm.otp}
                                            onChange={(e) => setPasswordForm({
                                                ...passwordForm,
                                                otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                                            })}
                                            placeholder="Enter 6-digit OTP"
                                            className={`h-11 rounded border bg-white px-4 text-center text-lg tracking-[0.3em] text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100 ${
                                                errors.otp
                                                    ? "border-red-500"
                                                    : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                                            }`}
                                        />
                                        {errors.otp && <p className="text-xs text-red-500">{errors.otp}</p>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-medium text-black dark:text-neutral-100">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                placeholder="New Password"
                                                className={`h-11 w-full rounded border bg-white px-4 pr-11 text-sm text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100 ${
                                                    errors.newPassword
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
                                        {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="submit"
                                            disabled={isChangingPassword}
                                            className="h-11 rounded bg-[#eaa06d] px-5 text-sm font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {isChangingPassword ? "Changing..." : "Verify OTP & Change Password"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handlePasswordOtpRequest}
                                            disabled={isSendingOtp}
                                            className="h-11 rounded border border-gray-300 px-5 text-sm font-bold text-gray-800 transition hover:border-[#e89a63] hover:text-[#d47f4f] disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-700 dark:text-neutral-100"
                                        >
                                            {isSendingOtp ? "Sending..." : "Resend OTP"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {passwordMessage && (
                                <p className="mt-4 text-sm text-gray-700 dark:text-neutral-300">
                                    {passwordMessage}
                                </p>
                            )}
                        </form>
                    )}
                </section>
            </main>

            {
                phoneOtpModal.isOpen &&
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <form
                        onSubmit={handlePhoneOtpVerify}
                        className="w-full max-w-md rounded border border-gray-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold">Verify Phone Number</h2>
                                <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
                                    Enter the OTP sent to {personalForm.phone}.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPhoneOtpModal({
                                    isOpen: false,
                                    expiresInSeconds: 0,
                                    resendAfterSeconds: 0,
                                    message: "",
                                    error: "",
                                })}
                                aria-label="Close phone verification"
                                className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 transition hover:border-[#e89a63] hover:text-[#d47f4f] dark:border-neutral-700 dark:text-neutral-300"
                            >
                                x
                            </button>
                        </div>

                        <div className="mt-5 flex flex-col gap-2">
                            <label className="text-xs font-medium text-black dark:text-neutral-100">
                                Phone OTP
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={phoneOtp}
                                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                className={`h-11 rounded border bg-white px-4 text-center text-lg tracking-[0.3em] text-black outline-none transition dark:bg-neutral-900 dark:text-neutral-100 ${
                                    phoneOtpModal.error
                                        ? "border-red-500"
                                        : "border-gray-400 focus:border-[#e89a63] dark:border-neutral-700"
                                }`}
                            />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-neutral-400">
                            <span>
                                OTP expires in {Math.floor(phoneOtpModal.expiresInSeconds / 60)}:{String(phoneOtpModal.expiresInSeconds % 60).padStart(2, "0")}
                            </span>
                            <button
                                type="button"
                                onClick={handlePhoneOtpRequest}
                                disabled={isSendingPhoneOtp || phoneOtpModal.resendAfterSeconds > 0}
                                className="font-bold text-[#d47f4f] hover:text-[#b8663b] disabled:cursor-not-allowed disabled:text-gray-400"
                            >
                                {
                                    phoneOtpModal.resendAfterSeconds > 0
                                        ? `Resend in ${phoneOtpModal.resendAfterSeconds}s`
                                        : isSendingPhoneOtp ? "Sending..." : "Resend OTP"
                                }
                            </button>
                        </div>

                        {
                            phoneOtpModal.message &&
                            <p className="mt-4 text-sm text-gray-700 dark:text-neutral-300">
                                {phoneOtpModal.message}
                            </p>
                        }

                        {
                            phoneOtpModal.error &&
                            <p className="mt-4 text-sm text-red-600">
                                {phoneOtpModal.error}
                            </p>
                        }

                        <button
                            type="submit"
                            disabled={isVerifyingPhoneOtp || phoneOtpModal.expiresInSeconds <= 0}
                            className="mt-5 h-11 w-full rounded bg-[#eaa06d] text-sm font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isVerifyingPhoneOtp ? "Verifying..." : "Verify OTP"}
                        </button>
                    </form>
                </div>
            }
        </div>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m5 12 4 4L19 6" />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6" />
            <path d="M12 16h.01" />
        </svg>
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

export default EditProfilePage;
