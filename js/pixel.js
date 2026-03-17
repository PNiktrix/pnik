/**
 * pixel.js
 * Initialises Facebook Pixel with the ID from Config.
 * Loaded before analytics.js so fbq is available globally.
 */
const Pixel = {
  init() {
    if (!Config.PIXEL_ID || Config.PIXEL_ID === 'YOUR_PIXEL_ID') return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', Config.PIXEL_ID);
    window.fbq('track', 'PageView');
    /* eslint-enable */
    console.log('[Pixel] Initialized:', Config.PIXEL_ID);
  },
};

document.addEventListener('DOMContentLoaded', () => Pixel.init());
