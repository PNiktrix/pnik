// ============================================================
// tally.js — FormPopupController
// ============================================================
// Controls the Google Form popup overlay.
// Opens a bottom-sheet style popup with the embedded
// Google Form inside. Data goes directly to Google Sheets.
// Browser autofill works natively.
// ============================================================

class TallyController {
  constructor(repo, cart) {
    this.repo    = repo;
    this.cart    = cart;
    this._overlay = document.getElementById("gform-overlay");
  }

  open() {
    PixelTracker.lead();
    this._overlay.classList.add("show");
    // Prevent body scroll while popup is open
    document.body.style.overflow = "hidden";
  }

  close() {
    this._overlay.classList.remove("show");
    document.body.style.overflow = "";
  }
}
