export function googleAuthStatusMessage(status: string | null) {
  switch (status) {
    case "cancelled":
      return "Google sign-in was cancelled. You can try again or use your email.";
    case "invalid_session":
      return "Your Google sign-in session expired. Please try again.";
    case "account_conflict":
      return "That Google account is linked to a different Ysello account. Sign in another way or contact support.";
    case "email_unverified":
      return "Google has not verified that email address, so it cannot be used to sign in.";
    case "suspended":
      return "This account is suspended. Contact support for help.";
    case "unavailable":
      return "Google sign-in is temporarily unavailable. Please use your email and password.";
    case "failed":
      return "Google could not complete sign-in. Please try again.";
    default:
      return null;
  }
}
