/** When to invite a visitor to create their login (owner 27/11/26). */
export function shouldInviteLogin(input: {
  visits: number;
  signedIn: boolean;
  dismissedThisVisit: boolean;
  onSignInForm: boolean;
}): boolean {
  return input.visits >= 2 && !input.signedIn && !input.dismissedThisVisit && !input.onSignInForm;
}
