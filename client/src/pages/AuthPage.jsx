// src/pages/AuthPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";

function AuthPage() {

    const navigate = useNavigate();
    const { login } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isLogin, setIsLogin] = useState(true);

    useEffect(() => {
        const token = searchParams.get("token");
        const rememberMe = searchParams.get("rememberMe") === "true";

        if (token) {
            login(token, null, rememberMe);
            setSearchParams({}, { replace: true });
            navigate("/", { replace: true });
        }
    }, [navigate, searchParams, setSearchParams, login]);

    return (

        <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-0 py-0 lg:px-4 lg:py-10">

            <div className="w-full min-h-screen lg:min-h-0 lg:max-w-5xl flex flex-col items-center justify-center gap-6">

                <div className="hidden lg:flex items-center gap-3">
                    <img src="/astrix_logo_pack/favicon/favicon.svg" alt="ASTRIX Logo" className="h-10 w-10 rounded-xl shadow-md" />
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
                        ASTRIX
                    </h1>
                </div>

                {
                    isLogin
                    ? <LoginForm />
                    : <SignupForm onSignupVerified={() => setIsLogin(true)} />
                }

                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="pb-6 lg:pb-0 text-sm text-gray-600 hover:text-black transition dark:text-neutral-300 dark:hover:text-white"
                >

                    {
                        isLogin
                        ? "Don't have an account? Signup"
                        : "Already have an account? Login"
                    }

                </button>

            </div>

        </div>
    );
}

export default AuthPage;
