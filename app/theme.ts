/** Where the chosen ground is kept between visits. */
export const THEME_STORAGE_KEY = "color-palette-generator:theme";

/**
 * Runs before the first paint, so a stored choice is on the page rather than
 * flashing onto it. The HTML ships dark, so only light has to be applied here.
 * A plain module rather than the toggle's own: the layout that inlines this is
 * a server component, and cannot read a value across a `"use client"` boundary.
 */
export const THEME_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="light")document.documentElement.classList.remove("dark")}catch{}`;
