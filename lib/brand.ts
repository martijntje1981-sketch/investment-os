/** Central Tobailey brand constants — keep in sync with app/globals.css. */
export const BRAND = {
  name: "Tobailey",
  tagline: "Your investments. Understood.",
  primary: "#5DB7FF",
  primaryHover: "#3A9FE8",
  primarySoft: "#E4F3FC",
  display: "#2B9FE0",
  strong: "#1B7FBF",
  navy: "#0B1F3A",
  deep: "#123052",
  ink: "#071525",
  /** Primary midnight-navy hero / CTA surface — navy, not black */
  navyHero: "#0B1F3A",
  /** Secondary dark card surface */
  navyCard: "#16324F",
  text: "#0B1F3A",
} as const;

export const FOUR_QUESTION_COLORS = {
  what_happened: {
    accent: "#2EB5F0",
    soft: "#C4ECFB",
    strong: "#075F8C",
    deep: "#054E74",
  },
  what_matters_now: {
    accent: "#2773C8",
    soft: "#D0DFF4",
    strong: "#1458A3",
    deep: "#0D3F7A",
  },
  am_i_on_track: {
    accent: "#1B4F9A",
    soft: "#CDD6EA",
    strong: "#133A76",
    deep: "#0E2B58",
  },
  whats_ahead: {
    accent: "#163A66",
    soft: "#D0D6E1",
    strong: "#102847",
    deep: "#0B1F3A",
  },
} as const;

export const BRAND_META = {
  title: BRAND.name,
  titleTemplate: `%s · ${BRAND.name}`,
  description: `${BRAND.name} — ${BRAND.tagline} Portfolio monitoring and decision support for private investors.`,
  shortName: BRAND.name,
} as const;
