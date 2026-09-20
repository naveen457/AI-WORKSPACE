import { Link, useLocation, useNavigate } from "react-router-dom";

function getInitials(user) {
  const first = user?.firstName?.trim()?.[0] || "";
  const last = user?.lastName?.trim()?.[0] || "";
  const email = user?.email?.trim()?.[0] || "";

  return `${first}${last}`.toUpperCase() || email.toUpperCase() || "U";
}

function ProfileAvatar({ user, className = "h-10 w-10", textClass = "text-sm" }) {
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
    <div
      className={`flex ${className} items-center justify-center rounded-full bg-[#eaa06d] ${textClass} font-bold text-white`}
    >
      {getInitials(user)}
    </div>
  );
}

function AppLayout({ user, onLogout, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    onLogout();
    navigate("/auth", { replace: true });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-gray-200 bg-white/95 dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex min-h-16 w-full items-center gap-4 px-5 lg:px-10">
          <Link to="/chat" className="flex items-center gap-2 text-[#e89a63]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e89a63]">
              <span className="block h-4 w-2 -skew-x-12 rounded-sm bg-white" />
            </span>
            <span className="text-lg font-bold tracking-wide">ASTRIX</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-700 dark:text-neutral-300 md:flex">
            <Link
              to="/chat"
              className={`transition ${
                isActive("/chat")
                  ? "text-[#d47f4f]"
                  : "hover:text-[#d47f4f]"
              }`}
            >
              Chat
            </Link>
            <Link
              to="/visualizer"
              className={`transition ${
                isActive("/visualizer")
                  ? "text-[#d47f4f]"
                  : "hover:text-[#d47f4f]"
              }`}
            >
              Visualizer
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("profile-menu")?.classList.toggle("hidden")
                  }
                  className="rounded-full shadow-sm transition hover:opacity-90"
                >
                  <ProfileAvatar user={user} />
                </button>

                <div
                  id="profile-menu"
                  className="absolute right-0 top-14 z-20 hidden w-56 rounded border border-gray-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
                >
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
              </div>
            ) : (
              <Link
                to="/auth"
                className="rounded bg-[#eaa06d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#df925e]"
              >
                Login / Signup
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </div>
  );
}

export default AppLayout;
