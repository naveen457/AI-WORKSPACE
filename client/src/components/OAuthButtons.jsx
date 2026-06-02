import { API_BASE_URL } from "../api/api";

function OAuthButtons() {
    const googleAuthUrl = `${API_BASE_URL}/auth/google`;
    const githubAuthUrl = `${API_BASE_URL}/auth/github`;

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-gray-600 text-center dark:text-neutral-300">Or continue with</p>
            
            <div className="flex gap-3">
                <a
                    href={googleAuthUrl}
                    className="flex-1 h-11 rounded border border-gray-300 bg-white flex items-center justify-center gap-2 hover:bg-gray-50 transition dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                    
                    <span className="text-xs font-medium text-gray-700 dark:text-neutral-200">Google</span>
                </a>

                <a
                    href={githubAuthUrl}
                    className="flex-1 h-11 rounded border border-gray-300 bg-white flex items-center justify-center gap-2 hover:bg-gray-50 transition dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                    
                    <span className="text-xs font-medium text-gray-700 dark:text-neutral-200">GitHub</span>
                </a>

            </div>
        </div>
    );
}

export default OAuthButtons;
