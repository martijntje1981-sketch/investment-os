/**
 * Centralized Perspectives creator allowlist.
 * Official YouTube channel RSS only:
 * https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
 *
 * Trusted status is granted only via exact channel ID.
 * Display publisher names must match the real channel when known.
 */

import type { AssociatedPerson } from "@/lib/services/perspectives/normalizePerspectiveVideo";

export type PerspectiveCategoryId =
  "macro" | "bitcoin" | "investing" | "technology";

export type PerspectiveCreator = {
  id: string;
  /** Trusted-creator display label (may equal channel display name). */
  name: string;
  /**
   * Publisher name shown as channel owner when feed author is missing.
   * Prefer the real YouTube channel title, not a featured guest name.
   */
  channelDisplayName?: string;
  channelId: string;
  feedUrl: string;
  category: PerspectiveCategoryId;
  avatarUrl: string | null;
  preferTitleKeywords?: string[];
  /** Optional guests who may appear on this channel — never replaces owner. */
  associatedPeople?: AssociatedPerson[];
  active?: boolean;
};

export const PERSPECTIVE_CATEGORY_ORDER: PerspectiveCategoryId[] = [
  "macro",
  "bitcoin",
  "investing",
  "technology",
];

export const PERSPECTIVE_CATEGORY_LABELS: Record<
  PerspectiveCategoryId,
  string
> = {
  macro: "Macro & Economy",
  bitcoin: "Bitcoin & Digital Assets",
  investing: "Investing & Markets",
  technology: "Technology & AI",
};

function feed(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/**
 * Mark Moss podcast channel (Market Disruptors).
 * Do not invent a different UC… ID — show the real publisher name.
 */
export const PERSPECTIVE_CREATORS: PerspectiveCreator[] = [
  {
    id: "lyn-alden",
    name: "Lyn Alden",
    channelId: "UC26OTzxt9ixdrr3qdUJrYBQ",
    feedUrl: feed("UC26OTzxt9ixdrr3qdUJrYBQ"),
    category: "macro",
    avatarUrl:
      "https://yt3.googleusercontent.com/hif-3StCK1xU0uCXtM19q88WO_QT_dj_iBeO3kTh7q1k_Cdd5NU4WU35Sw1LYfDmbVjh_V7d=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "michael-howell",
    name: "Michael Howell",
    channelId: "UCpplCu5ZT_ahY4wdOUCbRMg",
    feedUrl: feed("UCpplCu5ZT_ahY4wdOUCbRMg"),
    category: "macro",
    avatarUrl:
      "https://yt3.googleusercontent.com/wHlKNMtTptetQLIGWYOlDyUstC9ZwlMaDa6KYOWLYu2BXb3RNJNLmyv9cowkupRI30QoXc7x=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "luke-gromen",
    name: "Luke Gromen",
    channelId: "UC3dgTGurzmoefBchduxs4Gg",
    feedUrl: feed("UC3dgTGurzmoefBchduxs4Gg"),
    category: "macro",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_kOc20Cvn_WDZB_0C59dvIEYsRpvosLvD38FaVDwLkcgQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "raoul-pal",
    name: "Raoul Pal",
    channelId: "UCwSVtQvURxiyn1CQeyoExZg",
    feedUrl: feed("UCwSVtQvURxiyn1CQeyoExZg"),
    category: "macro",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_lBG4Q2j7htJbxg-phr_qVcAKlNOGbhJhWBe0SkBAuX3EdiRFA_mJUmpSD86gxTbRG5GQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "jeff-snider",
    name: "Jeff Snider",
    channelId: "UCrXNkk4IESnqU-8GMad2vyA",
    feedUrl: feed("UCrXNkk4IESnqU-8GMad2vyA"),
    category: "macro",
    avatarUrl:
      "https://yt3.googleusercontent.com/Hrl4HOfgZJUI-JUqKusOhYhpK6t7piJEy9sd4qWlIQx-ag3aTJ122FtBehWWwaDzMKN4mY0uqQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "brent-johnson",
    name: "Brent Johnson",
    channelId: "UChvlmVy6Q0a9uC1jRFRpp8Q",
    feedUrl: feed("UChvlmVy6Q0a9uC1jRFRpp8Q"),
    category: "macro",
    avatarUrl:
      "https://yt3.googleusercontent.com/BzyWzth6PsGAZFh0yZV7cO9FLWOjVzOavoOzXsdGr4fvQphkNtJZpMV0EOb-ev1MthJXyGHq2w=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "mark-moss",
    name: "Market Disruptors Podcast",
    channelDisplayName: "Market Disruptors Podcast",
    channelId: "UCdb3vYKZ60hZM5FtC-WlYPA",
    feedUrl: feed("UCdb3vYKZ60hZM5FtC-WlYPA"),
    category: "bitcoin",
    avatarUrl:
      "https://yt3.googleusercontent.com/BAyTvBguc_Y7SGiaM2ywN0e5X96FbljVAo08ghyicAsakYd4QoUTftnh5gZ7Q5m_2m5jfq4_=s176-c-k-c0x00ffffff-no-rj",
    associatedPeople: [
      {
        name: "Mark Moss",
        matchKeywords: ["mark moss"],
      },
    ],
  },
  {
    id: "preston-pysh",
    name: "Preston Pysh",
    channelId: "UCLTdCY-fNXc1GqzIuflK-OQ",
    feedUrl: feed("UCLTdCY-fNXc1GqzIuflK-OQ"),
    category: "bitcoin",
    avatarUrl:
      "https://yt3.googleusercontent.com/ciskhvXBrXqrcHsiL7V_27KkkzT3J1mUd599fyYac6E5jJ8KuYkjQG5PpvNZRdXcPktJTBb5=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "natalie-brunell",
    name: "Natalie Brunell",
    channelId: "UCru3nlhzHrbgK21x0MdB_eg",
    feedUrl: feed("UCru3nlhzHrbgK21x0MdB_eg"),
    category: "bitcoin",
    avatarUrl:
      "https://yt3.googleusercontent.com/yK-Sysbsv-i1PMNDLsY7S8-yrvL_MxhmdYgIu_BvlpsiugCdbQRzTMjXxvFUVEd7l1TCH1MM1g=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "matthew-kratter",
    name: "Matthew Kratter",
    channelId: "UC6bLjiZqVHI4fJBswhcasgw",
    feedUrl: feed("UC6bLjiZqVHI4fJBswhcasgw"),
    category: "bitcoin",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_k-2tgwBq_wei-bkauv-SMULecnYPE-Ib9OWVwG61Q=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "bitcoin-magazine",
    name: "Bitcoin Magazine",
    channelId: "UCtOV5M-T3GcsJAq8QKaf0lg",
    feedUrl: feed("UCtOV5M-T3GcsJAq8QKaf0lg"),
    category: "bitcoin",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_ndOrJurR3l7MFt8EhzA4AHo7yfkosq7K_au9vmgyqljAg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "swan-bitcoin",
    name: "Swan Bitcoin",
    channelId: "UCl4takhOQtiyprismCPsa2Q",
    feedUrl: feed("UCl4takhOQtiyprismCPsa2Q"),
    category: "bitcoin",
    avatarUrl:
      "https://yt3.googleusercontent.com/El4X8GExD0pVQ8MtIOFMHjvwvlUBJ2a51SBB383z6eN8Lf3VscqIJPTn4ZlBVXoecKbijQQgdw=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "aswath-damodaran",
    name: "Aswath Damodaran",
    channelId: "UCLvnJL8htRR1T9cbSccaoVw",
    feedUrl: feed("UCLvnJL8htRR1T9cbSccaoVw"),
    category: "investing",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_nLeDwg82IPX-atK3fzEvmAgDRHElrHDfVyTs-6kB_ihg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "ben-felix",
    name: "Ben Felix",
    channelId: "UCDXTQ8nWmx_EhZ2v-kp7QxA",
    feedUrl: feed("UCDXTQ8nWmx_EhZ2v-kp7QxA"),
    category: "investing",
    avatarUrl:
      "https://yt3.googleusercontent.com/Q9La9g5drY7i94tdJrwo3gqaeFGDU7FI1o4-yTgAon1tYJ9Xgka-lREKzQic3UrW-afzm81w=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "patrick-boyle",
    name: "Patrick Boyle",
    channelId: "UCASM0cgfkJxQ1ICmRilfHLw",
    feedUrl: feed("UCASM0cgfkJxQ1ICmRilfHLw"),
    category: "investing",
    avatarUrl:
      "https://yt3.googleusercontent.com/cq4tU8wKdp_Y7yZIBxwAsSzecE-3VYDLkRXGo08-FuFwP_fwl7aMDTWY-_OEWGSw5iWDu-S29w=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "plain-bagel",
    name: "The Plain Bagel",
    channelId: "UCFCEuCsyWP0YkP3CZ3Mr01Q",
    feedUrl: feed("UCFCEuCsyWP0YkP3CZ3Mr01Q"),
    category: "investing",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_lP44aDeBvzShX0gPVRsL9UYY7_VlGf0CG0I9PDaHib0Vw=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "new-money",
    name: "New Money",
    channelId: "UC8DPohRK_4FfI-j9g23vOjQ",
    feedUrl: feed("UC8DPohRK_4FfI-j9g23vOjQ"),
    category: "investing",
    avatarUrl:
      "https://yt3.googleusercontent.com/ebNpXeB1Jmc66Wr5gqwyykBbJEiGb1RznYP7ELAXaGhgBw89Mm15fqirbemdifjxEAuNSjssMEg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "all-in",
    name: "All-In Podcast",
    channelId: "UCESLZhusAkFfsNsApnjF_Cg",
    feedUrl: feed("UCESLZhusAkFfsNsApnjF_Cg"),
    category: "technology",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_muNFL-sKuOPm72UvG-ofixqx70KVyRS4365-fTtxH_cg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "bg2-pod",
    name: "BG2 Pod",
    channelId: "UC-yRDvpR99LUc5l7i7jLzew",
    feedUrl: feed("UC-yRDvpR99LUc5l7i7jLzew"),
    category: "technology",
    avatarUrl:
      "https://yt3.googleusercontent.com/bS9Y3oqWYr2hamegxQTpSEKiSxwKdVdZt0u6d2JboYqaws7mTpDsNxH6C-CHjUKEihAXzgNAHg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    id: "lex-fridman",
    name: "Lex Fridman",
    channelId: "UCSHZKyawb77ixDdsGog4iWA",
    feedUrl: feed("UCSHZKyawb77ixDdsGog4iWA"),
    category: "technology",
    avatarUrl:
      "https://yt3.googleusercontent.com/ytc/AIdro_ljfMy9kUR1PH9VRf-XsTsPqFMgORC_zodOQVEAm4hx36lC=s176-c-k-c0x00ffffff-no-rj",
    preferTitleKeywords: [
      "agi",
      "llm",
      "gpt",
      "openai",
      "deepmind",
      "machine learning",
      "neural",
      "robot",
      "nvidia",
      "anthropic",
      "artificial intelligence",
    ],
    associatedPeople: [
      {
        name: "Michael Saylor",
        matchKeywords: ["michael saylor", "saylor"],
      },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    channelId: "UCBHcMCGaiJhv-ESTcWGJPcw",
    feedUrl: feed("UCBHcMCGaiJhv-ESTcWGJPcw"),
    category: "technology",
    avatarUrl:
      "https://yt3.googleusercontent.com/o_D0Uvz2mWrVGrfCBYBzCHABAO2lgLqS3T4pfOM1JH2JJoG_W5gaxQQ3hV7fLEQOvxDsu8vGvQ=s176-c-k-c0x00ffffff-no-rj",
  },
];

export function getPerspectiveCreatorById(
  id: string,
): PerspectiveCreator | undefined {
  return PERSPECTIVE_CREATORS.find((creator) => creator.id === id);
}

export function getActivePerspectiveCreators(): PerspectiveCreator[] {
  return PERSPECTIVE_CREATORS.filter((creator) => creator.active !== false);
}
