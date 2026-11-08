import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://p074to.github.io/",
    title: "rob's Personal",
    description: "Jr Rob Saluday's portfolio and writing.",
    author: "Jr Rob Saluday",
    profile: "https://github.com/P074TO",
    lang: "en",
    timezone: "Asia/Manila",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/P074TO/p074to.github.io/edit/main/",
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/P074TO/" },
    // { name: "x", url: "https://x.com/username" },
    { name: "linkedin", url: "https://www.linkedin.com/in/jr-rob-saluday-647963290/" },
    { name: "mail", url: "mailto:jrrobsaluday26@gmail.com" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
