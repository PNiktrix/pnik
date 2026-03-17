/**
 * auth.js
 * Lightweight client-side user session manager.
 * Stores a guest profile in localStorage (no passwords).
 * Replace with a real auth provider (Firebase, Supabase, etc.) when scaling.
 */
const Auth = (() => {
  const KEY = 'pniktrix_user';

  function getUser()     { return Utils.storageGet(KEY, null); }
  function isLoggedIn()  { return getUser() !== null; }

  /**
   * Create/update a guest profile (collected from contact form or checkout).
   * @param {Object} profile - { name, email, phone? }
   */
  function setUser(profile) {
    const existing = getUser() || {};
    Utils.storageSet(KEY, { ...existing, ...profile, updatedAt: new Date().toISOString() });
  }

  function logout() { localStorage.removeItem(KEY); }

  /**
   * Pre-fill known user data into forms.
   */
  function prefillForms() {
    const user = getUser();
    if (!user) return;
    const nameEl  = document.querySelector('input[name="name"]');
    const emailEl = document.querySelector('input[name="email"]');
    if (nameEl  && user.name)  nameEl.value  = user.name;
    if (emailEl && user.email) emailEl.value = user.email;
  }

  document.addEventListener('DOMContentLoaded', prefillForms);

  return { getUser, isLoggedIn, setUser, logout };
})();
