/**
 * ab-testing.js
 * Simple A/B testing framework — assigns variant once per session.
 * Results are logged to Analytics for comparison.
 *
 * Usage:
 *   const variant = ABTesting.assign('hero_cta', ['Explore Collection', 'Shop Now']);
 *   document.getElementById('heroCta').textContent = variant;
 */
const ABTesting = (() => {
  const KEY = 'pniktrix_ab';
  const _assignments = Utils.storageGet(KEY, {});

  /**
   * Assign a variant for a given experiment.
   * @param {string}   experimentId
   * @param {string[]} variants
   * @returns {string} assigned variant
   */
  function assign(experimentId, variants) {
    if (_assignments[experimentId]) return _assignments[experimentId];
    const picked = variants[Math.floor(Math.random() * variants.length)];
    _assignments[experimentId] = picked;
    Utils.storageSet(KEY, _assignments);
    Analytics._send('ABAssign', { experiment: experimentId, variant: picked });
    return picked;
  }

  function getAssignment(experimentId) {
    return _assignments[experimentId] || null;
  }

  function reset() {
    Object.keys(_assignments).forEach(k => delete _assignments[k]);
    Utils.storageSet(KEY, {});
  }

  return { assign, getAssignment, reset };
})();
