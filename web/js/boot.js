/* Boot after every module has registered its views and actions. */
(function () {
  'use strict';
  function go() {
    window.A.boot();
  }
  if (document.fonts && document.fonts.ready) {
    var done = false,
      once = function () {
        if (!done) {
          done = true;
          go();
        }
      };
    document.fonts.ready.then(once);
    setTimeout(once, 350);
  } else go();
})();
