function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.6Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.2-2.5c-.9.6-2 1-3.5 1a5.9 5.9 0 0 1-5.5-4.1H3.2v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 14.1a6 6 0 0 1 0-3.9V7.6H3.2a10 10 0 0 0 0 9.1l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.8 5.6l3.3 2.6A5.9 5.9 0 0 1 12 6Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  intent,
  returnTo,
}: {
  intent: "signin" | "register";
  returnTo?: string;
}) {
  const params = new URLSearchParams({ intent });
  if (returnTo) params.set("returnTo", returnTo);

  return (
    <a
      className="google-auth-button"
      href={`/api/auth/google/start?${params.toString()}`}
    >
      <GoogleMark />
      Continue with Google
    </a>
  );
}
