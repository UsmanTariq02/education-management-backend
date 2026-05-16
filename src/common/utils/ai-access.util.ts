export function isTrialAiAccessible(subscriptionStatus?: string | null, trialEndsAt?: Date | string | null): boolean {
  if (subscriptionStatus !== 'TRIAL') {
    return false;
  }

  if (!trialEndsAt) {
    return true;
  }

  const trialEndDate = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  return trialEndDate.getTime() > Date.now();
}
