// Background photography (Unsplash CDN). Each image is layered over a gradient in CSS,
// so the UI still looks intentional if an image is blocked or offline.
// To use your own photos, drop files in /public/images and point these to "/images/<file>".
const u = (id, w = 1800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMAGES = {
  login: u("photo-1519494026892-80bbd2d6fd0d"),      // hospital corridor
  hero: u("photo-1538108149393-fbbd81895907"),       // hospital building
  sidebar: u("photo-1576091160399-112ba8d25d1d", 900), // clinician with stethoscope
  patients: u("photo-1584515933487-779824d29309", 1400),
  doctors: u("photo-1612349317150-e413f6a5b16d", 1400),
};

export const bg = (url, overlay = "linear-gradient(100deg, rgba(7,47,55,.92), rgba(7,47,55,.55))") => ({
  backgroundImage: `${overlay}, url("${url}"), linear-gradient(120deg, #0A4550, #0F5F6B)`,
});
