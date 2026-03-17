// ============================================================================
// 3. ANIMATIONS.JS - Animation Helpers
// ============================================================================
class Animations {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        setTimeout(() => {
            element.style.opacity = '1';
        }, 10);
    }

    static slideUp(element, duration = 400) {
        element.style.transform = 'translateY(100px)';
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease`;
        setTimeout(() => {
            element.style.transform = 'translateY(0)';
            element.style.opacity = '1';
        }, 10);
    }

    static scaleIn(element, duration = 300) {
        element.style.transform = 'scale(0.95)';
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease`;
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.opacity = '1';
        }, 10);
    }

    static pulse(element) {
        element.style.animation = 'pulse 0.6s ease-in-out';
    }

    static addKeyframes() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }
}

Animations.addKeyframes();
