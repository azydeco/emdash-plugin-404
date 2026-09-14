/**
 * Site-side entry. The emdash integration imports `blockComponents` from every
 * descriptor that declares `componentsEntry`, so the export must exist even
 * though this plugin contributes no Portable Text blocks.
 */
export const blockComponents = {};

export { default as Custom404 } from "./Custom404.astro";
