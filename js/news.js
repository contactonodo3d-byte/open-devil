/* Presentation clock: independent of simulation days and the selected game speed. */
(function (G) {
  "use strict";
  G.createNewsFeed = function () {
    let seen, queue, current, elapsed, unread;
    function reset() { seen = new WeakSet(); queue = []; current = null; elapsed = 0; unread = 0; }
    reset();
    function advance() {
      if (!queue.length) return;
      queue.sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); });
      current = queue.shift(); elapsed = 0;
    }
    return {
      reset: reset,
      update: function (items, seconds, paused) {
        items.slice().reverse().forEach(function (item) {
          if (seen.has(item)) return;
          seen.add(item); unread++;
          // Companion jokes and repeated sector reports remain in the archive,
          // but do not crowd out distinct events in the compact summary.
          const family = function (id) { return (id || "").replace(/_funny$/, ""); };
          if (current && family(current.id) === family(item.id)) return;
          const index = queue.findIndex(function (queued) { return family(queued.id) === family(item.id); });
          if (index < 0) queue.push(item);
          else if ((item.priority || 0) > (queue[index].priority || 0)) queue[index] = item;
        });
        queue.sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); });
        queue = queue.slice(0, 24);
        if (!current) advance();
        else if (!paused) {
          elapsed += Math.max(0, Number.isFinite(seconds) ? seconds : 0);
          const readingTime = Math.max(12, Math.min(22, current.text.split(/\s+/).length * 0.4));
          if (elapsed >= readingTime) advance();
        }
        return { current: current, unread: unread, queued: queue.length };
      },
      markRead: function () { unread = 0; }
    };
  };
})(typeof window !== "undefined" ? window : global);
