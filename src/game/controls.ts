/**
 * Controls — tracks which movement keys are held down.
 *
 * Usage:
 *   const ctrl = new Controls();
 *   ctrl.attach();   // start listening
 *   ctrl.left        // true while A / ArrowLeft is held
 *   ctrl.detach();   // clean up when done
 */
export class Controls {
  left = false;
  right = false;
  up = false;
  down = false;

  private onKeyDown = (e: KeyboardEvent) => {
    // Prevent arrow keys from scrolling the page
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    switch (e.code) {
      case 'KeyA': case 'ArrowLeft':  this.left  = true; break;
      case 'KeyD': case 'ArrowRight': this.right = true; break;
      case 'KeyW': case 'ArrowUp':    this.up    = true; break;
      case 'KeyS': case 'ArrowDown':  this.down  = true; break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyA': case 'ArrowLeft':  this.left  = false; break;
      case 'KeyD': case 'ArrowRight': this.right = false; break;
      case 'KeyW': case 'ArrowUp':    this.up    = false; break;
      case 'KeyS': case 'ArrowDown':  this.down  = false; break;
    }
  };

  /** Start listening for keyboard events */
  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /** Stop listening for keyboard events */
  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  /** Release all keys (call on restart) */
  reset() {
    this.left = this.right = this.up = this.down = false;
  }
}
