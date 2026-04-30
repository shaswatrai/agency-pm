import type { ProjectType } from "@/types/domain";

/**
 * Bundled project templates per PRD §5.11.1. Each template:
 *   - declares a parentType (the broader project_type enum)
 *   - declares a subType (granular discriminator stored on Project)
 *   - lists named phases with 2-4 representative starter tasks
 *   - has a default duration + budget the dialog pre-fills
 *
 * Skeleton tasks are intentionally lean (not the full 45-180 from
 * the PRD) so the new project doesn't visually overwhelm the user
 * day-one. Teams add detail on top.
 */

export interface TemplateTask {
  title: string;
  estimatedHours: number;
  taskType?:
    | "feature"
    | "bug"
    | "improvement"
    | "research"
    | "content"
    | "design"
    | "qa"
    | "devops"
    | "other";
  storyPoints?: number;
  priority?: "low" | "medium" | "high" | "urgent";
}

export interface TemplatePhase {
  name: string;
  tasks: TemplateTask[];
}

export interface ProjectTemplate {
  id: string;
  parentType: ProjectType;
  subType: string;
  displayName: string;
  description: string;
  phases: TemplatePhase[];
  /** Default project duration in weeks (median of PRD range). */
  estimatedWeeks: number;
  /** Default budget in USD. */
  defaultBudget: number;
  /** Recurring retainers signal a different invoice + phase cadence. */
  isRecurring: boolean;
}

const taskFor = (
  title: string,
  hours: number,
  type?: TemplateTask["taskType"],
): TemplateTask => ({ title, estimatedHours: hours, taskType: type });

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "wordpress_standard",
    parentType: "web_dev",
    subType: "wordpress_standard",
    displayName: "WordPress website (standard)",
    description: "8-phase WordPress build for content-heavy marketing sites with bundled theme + ACF blocks.",
    estimatedWeeks: 10,
    defaultBudget: 45000,
    isRecurring: false,
    phases: [
      { name: "Discovery & planning", tasks: [taskFor("Stakeholder kickoff workshop", 4, "research"), taskFor("Sitemap + content inventory", 8, "research"), taskFor("Tech stack + hosting decision", 3, "devops")] },
      { name: "Information architecture", tasks: [taskFor("URL structure + URL redirects map", 6, "research"), taskFor("CMS taxonomy + content models (ACF)", 8, "design")] },
      { name: "UI design", tasks: [taskFor("Homepage + 2 templates concepts", 16, "design"), taskFor("Component library snapshot", 10, "design"), taskFor("Client review round 1", 4, "design")] },
      { name: "Theme development", tasks: [taskFor("Theme scaffold + ACF blocks", 24, "feature"), taskFor("Page templates implementation", 32, "feature"), taskFor("Forms + integrations", 12, "feature")] },
      { name: "Content integration", tasks: [taskFor("Migrate existing content", 16, "content"), taskFor("Build out remaining pages", 24, "content")] },
      { name: "QA & testing", tasks: [taskFor("Cross-browser + mobile QA pass", 12, "qa"), taskFor("Accessibility audit (WCAG 2.1 AA)", 8, "qa"), taskFor("Performance pass (Lighthouse)", 6, "qa")] },
      { name: "Staging review", tasks: [taskFor("Client UAT round", 6, "qa"), taskFor("Revisions punch list", 12, "feature")] },
      { name: "Launch & post-launch", tasks: [taskFor("DNS cutover + smoke test", 4, "devops"), taskFor("Post-launch monitoring + hypercare", 8, "devops")] },
    ],
  },
  {
    id: "react_custom",
    parentType: "web_dev",
    subType: "react_custom",
    displayName: "Custom web app (React/Next.js)",
    description: "10-phase build for a full custom React/Next.js application with backend, auth, and bespoke UI.",
    estimatedWeeks: 18,
    defaultBudget: 220000,
    isRecurring: false,
    phases: [
      { name: "Discovery & product strategy", tasks: [taskFor("Product brief + success metrics", 8, "research"), taskFor("User research interviews", 16, "research"), taskFor("Competitive teardown", 6, "research")] },
      { name: "UX & flows", tasks: [taskFor("End-to-end flow diagram", 10, "design"), taskFor("Wireframes — primary screens", 24, "design")] },
      { name: "UI design", tasks: [taskFor("Visual design system + tokens", 16, "design"), taskFor("Hi-fi key screens", 32, "design")] },
      { name: "Architecture & infra", tasks: [taskFor("System architecture + data model", 12, "devops"), taskFor("CI/CD + preview environments", 8, "devops"), taskFor("Auth + RBAC strategy", 6, "devops")] },
      { name: "Frontend development", tasks: [taskFor("Design system primitives", 32, "feature"), taskFor("Routes + page shells", 40, "feature"), taskFor("Forms + state management", 24, "feature")] },
      { name: "Backend development", tasks: [taskFor("API endpoints + validation", 40, "feature"), taskFor("Auth + session management", 16, "feature"), taskFor("Background jobs + scheduling", 12, "feature")] },
      { name: "Integrations", tasks: [taskFor("3rd-party API clients", 16, "feature"), taskFor("Email + transactional flows", 8, "feature")] },
      { name: "QA & testing", tasks: [taskFor("E2E test coverage", 24, "qa"), taskFor("Load + perf testing", 12, "qa")] },
      { name: "Staging review", tasks: [taskFor("Client UAT round", 8, "qa"), taskFor("Final accessibility pass", 8, "qa")] },
      { name: "Launch & post-launch", tasks: [taskFor("Production cutover", 6, "devops"), taskFor("Post-launch iteration sprint 1", 32, "feature")] },
    ],
  },
  {
    id: "shopify_ecom",
    parentType: "web_dev",
    subType: "shopify_ecom",
    displayName: "E-commerce (Shopify / WooCommerce)",
    description: "9-phase e-commerce build with a custom theme, payment + inventory integrations.",
    estimatedWeeks: 13,
    defaultBudget: 120000,
    isRecurring: false,
    phases: [
      { name: "Discovery & planning", tasks: [taskFor("Catalog + variant complexity audit", 6, "research"), taskFor("Payment gateway + tax decisions", 4, "devops")] },
      { name: "IA & merchandising", tasks: [taskFor("Collection + tag taxonomy", 8, "design"), taskFor("PDP + checkout flow definition", 10, "design")] },
      { name: "UI design", tasks: [taskFor("Storefront concepts", 20, "design"), taskFor("PDP + cart + checkout designs", 16, "design")] },
      { name: "Theme development", tasks: [taskFor("Theme scaffold + Liquid sections", 28, "feature"), taskFor("Cart + checkout customization", 16, "feature")] },
      { name: "Integrations", tasks: [taskFor("Inventory + ERP sync", 24, "feature"), taskFor("Email/SMS marketing setup", 8, "feature")] },
      { name: "Content + product upload", tasks: [taskFor("Product import (bulk)", 12, "content"), taskFor("Storefront content authoring", 16, "content")] },
      { name: "QA & testing", tasks: [taskFor("Test orders end-to-end", 8, "qa"), taskFor("Performance + Core Web Vitals", 6, "qa")] },
      { name: "Staging review", tasks: [taskFor("Client UAT", 6, "qa"), taskFor("Soft-launch dry run", 4, "qa")] },
      { name: "Launch & post-launch", tasks: [taskFor("Domain + SSL switch", 4, "devops"), taskFor("Post-launch optimization sprint", 16, "feature")] },
    ],
  },
  {
    id: "rn_mobile_app",
    parentType: "app_dev",
    subType: "rn_mobile_app",
    displayName: "Mobile app (React Native)",
    description: "11-phase iOS + Android app built on a shared React Native codebase.",
    estimatedWeeks: 22,
    defaultBudget: 280000,
    isRecurring: false,
    phases: [
      { name: "Discovery & research", tasks: [taskFor("User interviews + jobs-to-be-done", 16, "research"), taskFor("Competitive landscape audit", 8, "research")] },
      { name: "Product strategy", tasks: [taskFor("MVP scope + cut list", 8, "research"), taskFor("Roadmap + release plan", 6, "research")] },
      { name: "UX design", tasks: [taskFor("App information architecture", 10, "design"), taskFor("Wireflows for primary journeys", 24, "design")] },
      { name: "UI design", tasks: [taskFor("Visual system + components", 24, "design"), taskFor("Hi-fi screen designs", 40, "design")] },
      { name: "Architecture & setup", tasks: [taskFor("RN project scaffold + CI", 16, "devops"), taskFor("Auth + data fetching layer", 12, "feature")] },
      { name: "Sprint development (iterative)", tasks: [taskFor("Sprint 1: core flows", 80, "feature"), taskFor("Sprint 2: secondary flows", 80, "feature"), taskFor("Sprint 3: polish + edge cases", 60, "feature")] },
      { name: "QA & testing", tasks: [taskFor("Device coverage matrix QA", 24, "qa"), taskFor("Crash + perf instrumentation", 8, "qa")] },
      { name: "Beta testing", tasks: [taskFor("TestFlight + Play Internal rollout", 8, "qa"), taskFor("Beta feedback triage", 16, "feature")] },
      { name: "App store submission", tasks: [taskFor("App Store + Play Store assets", 12, "content"), taskFor("Submission + review responses", 8, "devops")] },
      { name: "Launch", tasks: [taskFor("Phased production rollout", 4, "devops"), taskFor("Marketing-site sync", 4, "content")] },
      { name: "Post-launch iterations", tasks: [taskFor("v1.1 hot fixes", 24, "bug"), taskFor("Analytics review + roadmap update", 8, "research")] },
    ],
  },
  {
    id: "native_ios_android",
    parentType: "app_dev",
    subType: "native_ios_android",
    displayName: "Native iOS + Android",
    description: "Two-codebase native build for performance-critical or platform-bound apps.",
    estimatedWeeks: 28,
    defaultBudget: 360000,
    isRecurring: false,
    phases: [
      { name: "Discovery & research", tasks: [taskFor("Platform feature parity audit", 12, "research"), taskFor("User interviews", 16, "research")] },
      { name: "Product strategy", tasks: [taskFor("Per-platform roadmap", 8, "research")] },
      { name: "UX design", tasks: [taskFor("Information architecture", 12, "design"), taskFor("Wireflows", 28, "design")] },
      { name: "UI design", tasks: [taskFor("iOS HIG-aligned designs", 32, "design"), taskFor("Material 3 designs (Android)", 32, "design")] },
      { name: "Architecture & setup", tasks: [taskFor("Swift / Kotlin project scaffolds", 24, "devops"), taskFor("Shared API client spec", 12, "feature")] },
      { name: "iOS development", tasks: [taskFor("iOS sprint 1: core", 80, "feature"), taskFor("iOS sprint 2: secondary", 80, "feature")] },
      { name: "Android development", tasks: [taskFor("Android sprint 1: core", 80, "feature"), taskFor("Android sprint 2: secondary", 80, "feature")] },
      { name: "QA & testing", tasks: [taskFor("Per-platform device QA", 32, "qa"), taskFor("Accessibility audit (both)", 12, "qa")] },
      { name: "Beta testing", tasks: [taskFor("TestFlight + Play Internal rollout", 8, "qa")] },
      { name: "App store submission", tasks: [taskFor("Store assets + metadata", 12, "content"), taskFor("Submissions", 8, "devops")] },
      { name: "Launch & post-launch", tasks: [taskFor("Phased rollout", 6, "devops"), taskFor("v1.1 iteration sprint", 40, "feature")] },
    ],
  },
  {
    id: "seo_retainer",
    parentType: "digital_marketing",
    subType: "seo_retainer",
    displayName: "SEO retainer (monthly)",
    description: "Recurring 6-phase SEO program — audit, technical, on-page, content, link building, reporting.",
    estimatedWeeks: 4,
    defaultBudget: 6000,
    isRecurring: true,
    phases: [
      { name: "Initial audit", tasks: [taskFor("Site crawl + technical audit", 8, "research"), taskFor("Backlink + competitor audit", 6, "research")] },
      { name: "Technical SEO", tasks: [taskFor("Schema + sitemap fixes", 6, "feature"), taskFor("Core Web Vitals improvements", 6, "feature")] },
      { name: "On-page optimization", tasks: [taskFor("Meta + content updates (top 20 pages)", 12, "content")] },
      { name: "Content strategy", tasks: [taskFor("Editorial calendar (next 4 weeks)", 4, "research"), taskFor("Brief 2 cornerstone articles", 8, "content")] },
      { name: "Link building", tasks: [taskFor("Outreach (10 prospects)", 6, "content"), taskFor("Guest post placements", 8, "content")] },
      { name: "Monthly reporting", tasks: [taskFor("Rankings + traffic report", 4, "research"), taskFor("Strategy review call prep", 2, "research")] },
    ],
  },
  {
    id: "ppc",
    parentType: "digital_marketing",
    subType: "ppc",
    displayName: "PPC campaign management",
    description: "Recurring 5-phase paid-search engagement covering Google + Meta with monthly optimization cycles.",
    estimatedWeeks: 4,
    defaultBudget: 5500,
    isRecurring: true,
    phases: [
      { name: "Account audit & setup", tasks: [taskFor("Account + tracking audit", 6, "research"), taskFor("Conversion + goal config", 4, "feature")] },
      { name: "Campaign planning", tasks: [taskFor("Keyword + audience research", 6, "research"), taskFor("Budget allocation by campaign", 3, "research")] },
      { name: "Creative & copy", tasks: [taskFor("Ad copy variants", 6, "content"), taskFor("Creative production (3 sets)", 8, "design")] },
      { name: "Campaign execution", tasks: [taskFor("Launch + bid strategy review", 4, "feature"), taskFor("A/B test setup", 3, "feature")] },
      { name: "Reporting & optimization", tasks: [taskFor("Weekly perf review", 4, "research"), taskFor("Monthly client deck", 4, "content")] },
    ],
  },
  {
    id: "social_media",
    parentType: "digital_marketing",
    subType: "social_media",
    displayName: "Social media management",
    description: "Recurring 4-phase social program — strategy, content, scheduling, reporting.",
    estimatedWeeks: 4,
    defaultBudget: 3500,
    isRecurring: true,
    phases: [
      { name: "Strategy & calendar", tasks: [taskFor("Monthly content pillars", 4, "research"), taskFor("Editorial calendar (4 weeks)", 4, "research")] },
      { name: "Content production", tasks: [taskFor("Photo + video shoot day", 12, "content"), taskFor("Static + carousel design (16 posts)", 16, "design")] },
      { name: "Scheduling & community", tasks: [taskFor("Schedule via Buffer/Hootsuite", 4, "content"), taskFor("Daily community management", 16, "content")] },
      { name: "Reporting", tasks: [taskFor("Monthly performance deck", 4, "content")] },
    ],
  },
  {
    id: "brand_identity",
    parentType: "branding",
    subType: "brand_identity",
    displayName: "Brand identity package",
    description: "7-phase brand build — discovery, research, concepts, logo, identity system, guidelines, delivery.",
    estimatedWeeks: 8,
    defaultBudget: 65000,
    isRecurring: false,
    phases: [
      { name: "Discovery", tasks: [taskFor("Brand workshop", 8, "research"), taskFor("Stakeholder interviews", 6, "research")] },
      { name: "Research & moodboarding", tasks: [taskFor("Competitive landscape", 6, "research"), taskFor("Three moodboard directions", 12, "design")] },
      { name: "Concept development", tasks: [taskFor("Two distinct logo concepts", 24, "design"), taskFor("Concept presentation", 4, "design")] },
      { name: "Logo design", tasks: [taskFor("Logo refinement + variants", 24, "design"), taskFor("Color + typography exploration", 16, "design")] },
      { name: "Brand identity system", tasks: [taskFor("Application library (cards, social, email)", 24, "design"), taskFor("Photography + iconography style", 12, "design")] },
      { name: "Brand guidelines document", tasks: [taskFor("Guidelines doc layout + writing", 24, "content")] },
      { name: "Asset delivery", tasks: [taskFor("Final asset bundle + handoff", 8, "design"), taskFor("Brand launch kit (internal)", 6, "content")] },
    ],
  },
  {
    id: "maintenance_retainer",
    parentType: "maintenance",
    subType: "maintenance_retainer",
    displayName: "Website maintenance retainer",
    description: "Recurring 3-phase maintenance program — triage, implementation, release.",
    estimatedWeeks: 4,
    defaultBudget: 3000,
    isRecurring: true,
    phases: [
      { name: "Triage", tasks: [taskFor("Inbox triage + scoping", 4, "qa"), taskFor("Prioritization w/ client", 2, "research")] },
      { name: "Implementation", tasks: [taskFor("Bug fixes batch", 12, "bug"), taskFor("Small feature work", 12, "feature")] },
      { name: "QA & release", tasks: [taskFor("Regression QA pass", 4, "qa"), taskFor("Monthly release notes", 2, "content")] },
    ],
  },
];

export const TEMPLATES_BY_PARENT: Record<ProjectType, ProjectTemplate[]> = {
  web_dev: PROJECT_TEMPLATES.filter((t) => t.parentType === "web_dev"),
  app_dev: PROJECT_TEMPLATES.filter((t) => t.parentType === "app_dev"),
  digital_marketing: PROJECT_TEMPLATES.filter(
    (t) => t.parentType === "digital_marketing",
  ),
  branding: PROJECT_TEMPLATES.filter((t) => t.parentType === "branding"),
  maintenance: PROJECT_TEMPLATES.filter((t) => t.parentType === "maintenance"),
  other: [],
};

export function getTemplate(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}
