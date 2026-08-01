/** Central Tobailey brand constants — keep in sync with app/globals.css. */
export const BRAND = {
  name: "Tobailey",
  tagline: "Your investments. Understood.",
  primary: "#5DB7FF",
  primaryHover: "#3AA3F5",
  primarySoft: "#E8F5FF",
  navy: "#0B1F3A",
  text: "#0B1F3A",
} as const;

export const BRAND_META = {
  title: BRAND.name,
  titleTemplate: `%s · ${BRAND.name}`,
  description: `${BRAND.name} — ${BRAND.tagline} Portfolio monitoring and decision support for private investors.`,
  shortName: BRAND.name,
} as const;
