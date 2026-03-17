// ============================================================================
// 4. GESTURE-DETECTOR.JS - Touch Gestures
// ============================================================================
class GestureDetector {
    constructor(element) {
        this.element = element;
        this.touchStart = { x: 0, y: 0 };
        this.touchEnd = { x: 0, y: 0 };
        this.callbacks = {
            swipeUp: null,
            swipeDown: null,
            swipeLeft: null,
            swipeRight: null,
            tap: null
        };
        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
        this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
    }

    handleTouchStart(e) {
        this.touchStart = {
            x: e.changedTouches[0].screenX,
            y: e.changedTouches[0].screenY,
            time: Date.now()
        };
    }

    handleTouchEnd(e) {
        this.touchEnd = {
            x: e.changedTouches[0].screenX,
            y: e.changedTouches[0].screenY,
            time: Date.now()
        };
        this.detectSwipe();
    }

    detectSwipe() {
        const deltaX = this.touchEnd.x - this.touchStart.x;
        const deltaY = this.touchEnd.y - this.touchStart.y;
        const deltaTime = this.touchEnd.time - this.touchStart.time;
        
        const minDistance = 50;
        const maxTime = 300;
        
        if (Math.abs(deltaX) < minDistance && Math.abs(deltaY) < minDistance) {
            if (deltaTime < 200 && this.callbacks.tap) {
                this.callbacks.tap();
            }
            return;
        }

        if (deltaTime > maxTime) return;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > minDistance && this.callbacks.swipeRight) {
                this.callbacks.swipeRight();
            } else if (deltaX < -minDistance && this.callbacks.swipeLeft) {
                this.callbacks.swipeLeft();
            }
        } else {
            if (deltaY > minDistance && this.callbacks.swipeDown) {
                this.callbacks.swipeDown();
            } else if (deltaY < -minDistance && this.callbacks.swipeUp) {
                this.callbacks.swipeUp();
            }
        }
    }

    on(gesture, callback) {
        if (this.callbacks.hasOwnProperty(gesture)) {
            this.callbacks[gesture] = callback;
        }
        return this;
    }
}
