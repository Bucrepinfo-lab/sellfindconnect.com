export type EventType = "PAYMENT_RECEIVED"|"INVOICE_ISSUED"|"DUNNING_REMINDER"|"DUNNING_OVERDUE"|"DUNNING_FINAL"|"SUBSCRIPTION_TRIAL_ENDING"|"NEW_INQUIRY"|"NEW_MESSAGE"|"SLA_DUE_SOON"|"SLA_BREACHED"|"ADVERT_EXPIRING"|"ADVERT_EXPIRED"|"PROFILE_APPROVED"|"PROFILE_REJECTED"|"DELETION_SCHEDULED"|"DELETION_CANCELLED"|"EXPORT_READY"|"MFA_CODE";

export interface Template { subject: string; body: string; }

export const TEMPLATES: Record<EventType, Template> = {
  PAYMENT_RECEIVED:          { subject: "Payment received - {{invoiceNumber}}", body: "Hi {{name}}, we received your payment of {{amount}} for invoice
clear
$repo = "C:\Users\user\Documents\Telpen Adverts"
Set-Content "$repo\packages\domain\src\notification-templates.ts" -Encoding UTF8 -Value @'
export type EventType = "PAYMENT_RECEIVED"|"INVOICE_ISSUED"|"DUNNING_REMINDER"|"DUNNING_OVERDUE"|"DUNNING_FINAL"|"SUBSCRIPTION_TRIAL_ENDING"|"NEW_INQUIRY"|"NEW_MESSAGE"|"SLA_DUE_SOON"|"SLA_BREACHED"|"ADVERT_EXPIRING"|"ADVERT_EXPIRED"|"PROFILE_APPROVED"|"PROFILE_REJECTED"|"DELETION_SCHEDULED"|"DELETION_CANCELLED"|"EXPORT_READY"|"MFA_CODE";
export interface Template { subject: string; body: string; }
export const TEMPLATES: Record<EventType,Template> = {
  PAYMENT_RECEIVED:          { subject: "Payment received - {{invoiceNumber}}", body: "Hi {{name}}, we received your payment of {{amount}} for invoice {{invoiceNumber}}." },
  INVOICE_ISSUED:            { subject: "Invoice {{invoiceNumber}} from SellFindConnect", body: "Hi {{name}}, invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}." },
  DUNNING_REMINDER:          { subject: "Payment reminder - {{invoiceNumber}}", body: "Hi {{name}}, invoice {{invoiceNumber}} ({{amount}}) is {{daysOverdue}} day(s) overdue." },
  DUNNING_OVERDUE:           { subject: "Overdue: {{invoiceNumber}}", body: "Hi {{name}}, invoice {{invoiceNumber}} is {{daysOverdue}} days overdue. Your account may be restricted." },
  DUNNING_FINAL:             { subject: "Final notice - {{invoiceNumber}}", body: "Hi {{name}}, final notice for invoice {{invoiceNumber}}. Account suspended in 7 days if unpaid." },
  SUBSCRIPTION_TRIAL_ENDING: { subject: "Trial ends in {{daysLeft}} days", body: "Hi {{name}}, your free trial ends on {{endDate}}. Subscribe to keep your profile live." },
  NEW_INQUIRY:               { subject: "New inquiry from {{senderName}}", body: "Hi {{name}}, {{senderName}} sent an inquiry about {{advertTitle}}. Reply within {{slaHours}} hours." },
  NEW_MESSAGE:               { subject: "New message from {{senderName}}", body: "Hi {{name}}, new message from {{senderName}} in conversation {{conversationRef}}." },
  SLA_DUE_SOON:              { subject: "Response due soon - {{conversationRef}}", body: "Hi {{name}}, response to {{senderName}} due in {{hoursLeft}} hour(s)." },
  SLA_BREACHED:              { subject: "SLA breached - {{conversationRef}}", body: "Hi {{name}}, SLA breached for conversation {{conversationRef}}. This may affect your rating." },
  ADVERT_EXPIRING:           { subject: "Advert expires in {{daysLeft}} days", body: "Hi {{name}}, your advert {{advertTitle}} expires on {{expiryDate}}. Renew to keep it visible." },
  ADVERT_EXPIRED:            { subject: "Your advert has expired", body: "Hi {{name}}, your advert {{advertTitle}} has expired. Republish to restore it." },
  PROFILE_APPROVED:          { subject: "Your profile is live", body: "Hi {{name}}, your business profile is approved and now live on SellFindConnect." },
  PROFILE_REJECTED:          { subject: "Profile update requires changes", body: "Hi {{name}}, your profile update was not approved. Reason: {{reason}}. Please update and resubmit." },
  DELETION_SCHEDULED:        { subject: "Account deletion scheduled", body: "Hi {{name}}, your account will be permanently deleted on {{scheduledDate}}. Cancel at Settings > Data and Privacy." },
  DELETION_CANCELLED:        { subject: "Account deletion cancelled", body: "Hi {{name}}, your account deletion has been cancelled. Your account is fully active." },
  EXPORT_READY:              { subject: "Your data export is ready", body: "Hi {{name}}, your data export is ready. Download at {{downloadUrl}} (available 7 days)." },
  MFA_CODE:                  { subject: "Your verification code", body: "Your SellFindConnect code is {{code}}. Expires in 10 minutes. Do not share." },
};
export const resolveTemplate = (e: EventType, v: Record<string,string>): Template => {
  const t = TEMPLATES[e];
  const r = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_,k) => v[k] ?? "{{"+k+"}}");
  return { subject: r(t.subject), body: r(t.body) };
};
