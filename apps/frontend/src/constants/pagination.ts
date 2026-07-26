/**
 * Shared pagination sizes for entity dropdown / select components.
 *
 * `DROPDOWN_PAGE_SIZE` is the default page size a dropdown fetches per request;
 * `DROPDOWN_MAX_PAGE_SIZE` mirrors the BE dropdown DTO `@Max(100)` ceiling used
 * by "load all" fetches. Centralised so the value is defined once instead of
 * being repeated as a literal in every Base*Dropdown default.
 */
/** Default page size for entity dropdown/select components. */
export const DROPDOWN_PAGE_SIZE = 50;
/** BE dropdown DTO `@Max(100)` — largest per_page a dropdown fetch may request. */
export const DROPDOWN_MAX_PAGE_SIZE = 100;
