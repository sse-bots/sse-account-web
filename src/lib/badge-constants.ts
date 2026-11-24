export type VerificationKind =
  | "official"
  | "head"
  | "staff"
  | "creator"
  | "partner";

export interface AccountVerification {
  isVerified: boolean;
  kind: VerificationKind;
  label: string | null;
  note: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

export const VERIFICATION_KINDS: Array<{
  value: VerificationKind;
  title: string;
  color: string;
  defaultNote: string;
}> = [
  {
    value: "official",
    title: "Official Verified Account",
    color: "#1D9BF0",
    defaultNote:
      "This account is verified because it is an authentic, notable identity confirmed by SSE Admins & Heads.",
  },
  {
    value: "head",
    title: "Verified SSE Head",
    color: "#F59E0B",
    defaultNote: "Verified Head & Founder of SSE World.",
  },
  {
    value: "staff",
    title: "Verified SSE Staff",
    color: "#10B981",
    defaultNote:
      "Verified official administrator or staff member across SSE services.",
  },
  {
    value: "creator",
    title: "Verified Creator",
    color: "#1D9BF0",
    defaultNote:
      "Verified tournament host, bot developer, or community creator in SSE World.",
  },
  {
    value: "partner",
    title: "Verified Partner",
    color: "#8B5CF6",
    defaultNote: "Verified official partner community or collaborator.",
  },
];
