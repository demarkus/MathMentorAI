export type Plan = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  featured?: boolean;
};

/** The public plans shown on /pricing and offered on the /beta form. */
export const PLANS: Plan[] = [
  {
    id: "parent-beta",
    name: "Parent Beta",
    price: "R199",
    cadence: "for 4 weeks",
    description: "A guided 4-week beta for one learner, with a parent progress view.",
    features: [
      "Full Grade 9 & 10 algebra practice",
      "Diagnostic to find weak topics",
      "Weekly progress snapshots",
      "Priority beta support",
    ],
    featured: true,
  },
  {
    id: "learner-monthly",
    name: "Learner Monthly",
    price: "R149",
    cadence: "/month",
    description: "Independent, self-paced practice for one learner.",
    features: [
      "Unlimited topic practice",
      "Hints before full solutions",
      "Personal progress dashboard",
      "Cancel anytime",
    ],
  },
  {
    id: "teacher-basic",
    name: "Teacher Basic",
    price: "R79",
    cadence: "/month",
    description: "Worksheet and memo generation for a single class.",
    features: [
      "TeacherMate worksheet generator",
      "Auto-generated memos",
      "Printable resources",
      "One grade group",
    ],
  },
  {
    id: "teacher-pro",
    name: "Teacher Pro",
    price: "R149",
    cadence: "/month",
    description: "The full teacher toolkit across both grades.",
    features: [
      "Everything in Teacher Basic",
      "Grade 9 & 10 coverage",
      "Tests and revision packs",
      "Saved resource library",
    ],
  },
  {
    id: "tutor-centre",
    name: "Tutor Centre",
    price: "from R499",
    cadence: "/month",
    description: "Multi-learner tutoring centres and small schools.",
    features: [
      "Multiple learners and tutors",
      "Teacher + learner tools",
      "Bulk worksheet generation",
      "Centre onboarding support",
    ],
  },
];

export function isPlanId(value: unknown): boolean {
  return PLANS.some((plan) => plan.id === value);
}

export function planName(id: string): string {
  return PLANS.find((plan) => plan.id === id)?.name ?? id;
}

export const BETA_ROLES = [
  { value: "learner", label: "Learner" },
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
  { value: "tutor", label: "Tutor" },
  { value: "school_admin", label: "School admin" },
] as const;

export type BetaRole = (typeof BETA_ROLES)[number]["value"];

export function isBetaRole(value: unknown): value is BetaRole {
  return BETA_ROLES.some((role) => role.value === value);
}
