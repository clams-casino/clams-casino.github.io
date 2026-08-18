/* Justified photo gallery (Google Photos style) for the Misc section.
 *
 * Items declare their aspect ratio up front via data-ar, so the layout can be
 * computed before any image has loaded. Items are absolutely positioned inside
 * the container, which means every row ends flush with the container's right
 * edge and the page margins are always respected exactly.
 *
 * Two optional attributes control emphasis:
 *
 *   data-rows="2"   the item spans that many rows. It anchors the left of a
 *                   band, and the following items are packed into that many
 *                   sub-rows beside it. Good for tall photos, which otherwise
 *                   come out narrow in an ordinary row.
 *   data-full-row   the item is the only one in its row. On its own that means
 *                   the full container width; inside a band it means the rest
 *                   of the width left over beside the spanning feature.
 *   data-scale="1.4"  makes the ordinary row the item lands in that much
 *                   taller. Has no effect on an item that spans rows.
 *
 * data-rows wins if an item carries both it and data-full-row.
 */
(function () {
  'use strict';

  var GAP = 6;

  // Below this the sub-images inside a band get too small to be worth it, so
  // spanning items fall back to ordinary ones.
  var MIN_BAND_WIDTH = 620;

  // How far above its target a row may stretch before it counts as starved.
  var STARVED_ROW = 1.8;

  function baseRowHeight(width) {
    if (width < 420) return 120;
    if (width < 620) return 155;
    if (width < 800) return 190;
    return 225;
  }

  function ratio(el) {
    return parseFloat(el.getAttribute('data-ar')) || 1;
  }

  function scaleOf(el) {
    return parseFloat(el.getAttribute('data-scale')) || 1;
  }

  function spanOf(el) {
    return Math.max(1, Math.round(parseFloat(el.getAttribute('data-rows')) || 1));
  }

  function isSolo(el) {
    return el.hasAttribute('data-full-row');
  }

  /* --------------------------------------------------------------- planning */

  /* data-rows cannot always be honoured. Say so rather than silently dropping
     it, otherwise the attribute just looks broken. The layout re-runs on every
     resize, so each distinct complaint is only ever printed once. */
  var warned = {};

  function warnSpan(item, reason) {
    if (!window.console || !console.warn) return;
    var media = item.querySelector('img, source');
    var src = media ? media.getAttribute('src') : '(unknown)';
    var message = 'gallery: data-rows="' + spanOf(item) + '" ignored for ' +
                  src + ' — ' + reason;
    if (warned[message]) return;
    warned[message] = true;
    console.warn(message);
  }

  /* Decide up front which items actually anchor a band. An item only qualifies
     if the container is wide enough, there is room beside it, and enough items
     follow to fill its sub-rows. Deciding this before packing matters: a
     spanning item that turns out not to qualify has to pack into the preceding
     row like any other item, rather than being stranded in a row of its own. */
  function findAnchors(items, containerWidth, base) {
    var anchors = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var span = spanOf(item);
      if (span < 2) {
        anchors[i] = false;
        continue;
      }

      // Too narrow to split into a band at all: expected on phones, so quiet.
      if (containerWidth < MIN_BAND_WIDTH) {
        anchors[i] = false;
        continue;
      }

      if (items.length - i - 1 < span) {
        anchors[i] = false;
        warnSpan(item, 'it needs at least ' + span +
                 ' more photos after it to fill the rows beside it');
        continue;
      }

      var height = span * base + (span - 1) * GAP;
      if (containerWidth - ratio(item) * height - GAP < base) {
        anchors[i] = false;
        warnSpan(item, 'it is too wide to span ' + span +
                 ' rows and still leave room beside it');
        continue;
      }

      anchors[i] = true;
    }
    return anchors;
  }

  /* Greedily take items for one justified row of the given width, aiming for
     `target` height. Stops before an item that anchors a band or claims a row
     to itself, and stops right after taking one that claims a row. */
  function takeRow(items, anchors, start, width, target) {
    var picked = [];
    var arSum = 0;
    var i = start;

    function heightWith(count, sum) {
      return (width - GAP * (count - 1)) / sum;
    }

    while (i < items.length) {
      var item = items[i];
      if (picked.length && (anchors[i] || isSolo(item))) break;

      if (isSolo(item)) {
        picked.push(item);
        arSum += ratio(item);
        i++;
        break;
      }

      var withIt = heightWith(picked.length + 1, arSum + ratio(item));

      // Adding an item always shrinks the row. Keep it only while that brings
      // the height closer to the target than stopping short does.
      if (picked.length && withIt < target) {
        var without = heightWith(picked.length, arSum);
        if (Math.abs(withIt - target) > Math.abs(without - target)) break;
      }

      picked.push(item);
      arSum += ratio(item);
      i++;

      if (heightWith(picked.length, arSum) <= target) break;
    }

    return {
      items: picked,
      ar: arSum,
      next: i,
      solo: picked.length === 1 && isSolo(picked[0])
    };
  }

  /* A band is a row-spanning feature on the left plus N sub-rows beside it.
     Only called for items findAnchors has already cleared, so it cannot fail. */
  function takeBand(items, anchors, start, containerWidth, base) {
    var feature = items[start];
    var span = spanOf(feature);

    // Estimate the band's geometry to pick sub-row members; the exact heights
    // are solved for later, once the members are known.
    var estimatedHeight = span * base + (span - 1) * GAP;
    var rest = containerWidth - ratio(feature) * estimatedHeight - GAP;

    var rows = [];
    var i = start + 1;
    for (var r = 0; r < span; r++) {
      var row = takeRow(items, anchors, i, rest, base);
      rows.push(row);
      i = row.next;
    }

    return { type: 'band', feature: feature, rows: rows, next: i };
  }

  /* Every row is stretched to the full width, so a row left holding one narrow
     item blows up. That happens at the end of the gallery, and also just before
     a band, since the row has to stop early to let the feature anchor. Walk the
     pairs from the bottom up and hand items down, but only while doing so
     lowers the taller of the two — otherwise it just moves the problem up. */
  function balance(blocks, containerWidth, base) {
    function heightOf(count, ar) {
      return (containerWidth - GAP * (count - 1)) / ar;
    }

    for (var b = blocks.length - 1; b > 0; b--) {
      var later = blocks[b];
      var earlier = blocks[b - 1];
      if (later.type !== 'row' || earlier.type !== 'row') continue;
      // A row claimed by a single item is not up for renegotiation.
      if (later.solo || earlier.solo) continue;

      while (earlier.items.length > 1) {
        var candidate = earlier.items[earlier.items.length - 1];
        var ar = ratio(candidate);
        var worstNow = Math.max(heightOf(later.items.length, later.ar),
                                heightOf(earlier.items.length, earlier.ar));
        var worstAfter = Math.max(heightOf(later.items.length + 1, later.ar + ar),
                                  heightOf(earlier.items.length - 1, earlier.ar - ar));
        if (worstAfter >= worstNow) break;

        earlier.items.pop();
        earlier.ar -= ar;
        later.items.unshift(candidate);
        later.ar += ar;
        later.scale = Math.max(later.scale, scaleOf(candidate));
      }

      // Handing items down cannot help when it only swaps which row is left
      // stranded. If this row is still badly over-stretched, fold it into the
      // one above instead — still full width, just no longer a blow-up.
      var starved = heightOf(later.items.length, later.ar);
      if (starved <= base * STARVED_ROW) continue;

      var merged = heightOf(earlier.items.length + later.items.length,
                            earlier.ar + later.ar);
      var worst = Math.max(starved, heightOf(earlier.items.length, earlier.ar));
      if (Math.abs(merged - base) < Math.abs(worst - base)) {
        earlier.items = earlier.items.concat(later.items);
        earlier.ar += later.ar;
        earlier.scale = Math.max(earlier.scale, later.scale);
        blocks.splice(b, 1);
      }
    }
  }

  function plan(items, containerWidth, base) {
    var anchors = findAnchors(items, containerWidth, base);
    var blocks = [];
    var i = 0;

    while (i < items.length) {
      if (anchors[i]) {
        var band = takeBand(items, anchors, i, containerWidth, base);
        blocks.push(band);
        i = band.next;
        continue;
      }

      var scale = scaleOf(items[i]);
      var row = takeRow(items, anchors, i, containerWidth, base * scale);

      // A row has to stop short to let the next item anchor a band, which can
      // leave it too empty to fill the width without ballooning. The balance
      // pass repairs that by borrowing from the row above — but only if the
      // block above is a row. Pinned between two bands there is nothing to
      // borrow from, and the span is the thing that has to give.
      var above = blocks[blocks.length - 1];
      var rescuable = above && above.type === 'row' && !above.solo &&
                      above.items.length > 1;

      if (anchors[row.next] && !rescuable &&
          (containerWidth - GAP * (row.items.length - 1)) / row.ar >
            base * scale * STARVED_ROW) {
        warnSpan(items[row.next], 'the row above it would be left too empty');
        anchors[row.next] = false;
        row = takeRow(items, anchors, i, containerWidth, base * scale);
      }

      for (var k = 0; k < row.items.length; k++) {
        scale = Math.max(scale, scaleOf(row.items[k]));
      }
      blocks.push({
        type: 'row',
        items: row.items,
        ar: row.ar,
        scale: scale,
        solo: row.solo
      });
      i = row.next;
    }

    balance(blocks, containerWidth, base);
    return blocks;
  }

  /* ------------------------------------------------------------- positioning */

  function place(item, left, top, width, height) {
    item.style.left = left + 'px';
    item.style.top = top + 'px';
    item.style.width = width + 'px';
    item.style.height = height + 'px';
  }

  /* Lay out one justified row between x and the container's right edge. The
     last item is snapped to that edge so the right margin always lines up. */
  function placeRow(row, left, right, top, height) {
    var x = left;
    for (var i = 0; i < row.items.length; i++) {
      var item = row.items[i];
      var width = ratio(item) * height;
      var a = Math.round(x);
      var b = (i === row.items.length - 1) ? right : Math.round(x + width);
      place(item, a, top, b - a, height);
      x += width + GAP;
    }
  }

  /* Solve a band exactly. With C the container width, g the gap, f the
     feature's ratio, and each sub-row i holding k_i items of aspect sum S_i:
     the sub-rows all span the same width R = C - f*H - g, so their heights are
     h_i = (R - (k_i-1)g)/S_i and must stack to H = sum(h_i) + (N-1)g. Solving
     for H gives the expression below, and the whole band lands flush. */
  function placeBand(band, containerWidth, top) {
    var feature = band.feature;
    var n = band.rows.length;
    var reciprocal = 0;
    var gapTerm = 0;

    for (var i = 0; i < n; i++) {
      reciprocal += 1 / band.rows[i].ar;
      gapTerm += (band.rows[i].items.length - 1) * GAP / band.rows[i].ar;
    }

    var height = (reciprocal * (containerWidth - GAP) - gapTerm + (n - 1) * GAP) /
                 (1 + reciprocal * ratio(feature));
    var featureWidth = ratio(feature) * height;
    var rest = containerWidth - featureWidth - GAP;

    var roundedHeight = Math.round(height);
    var roundedWidth = Math.round(featureWidth);
    place(feature, 0, top, roundedWidth, roundedHeight);

    var left = roundedWidth + GAP;
    var y = top;
    for (var r = 0; r < n; r++) {
      var row = band.rows[r];
      var rowHeight = (rest - GAP * (row.items.length - 1)) / row.ar;
      var a = Math.round(y);
      // Snap the final sub-row to the feature's bottom edge.
      var b = (r === n - 1) ? top + roundedHeight : Math.round(y + rowHeight);
      placeRow(row, left, containerWidth, a, b - a);
      y += rowHeight + GAP;
    }

    return top + roundedHeight + GAP;
  }

  function layout(gallery, items) {
    var containerWidth = Math.floor(gallery.getBoundingClientRect().width);
    if (!containerWidth) return;

    var base = baseRowHeight(containerWidth);
    var blocks = plan(items, containerWidth, base);
    var top = 0;

    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b];
      if (block.type === 'band') {
        top = placeBand(block, containerWidth, top);
      } else {
        var height = Math.round(
          (containerWidth - GAP * (block.items.length - 1)) / block.ar);
        placeRow(block, 0, containerWidth, top, height);
        top += height + GAP;
      }
    }

    gallery.style.height = Math.max(0, top - GAP) + 'px';
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    var gallery = document.getElementById('misc-gallery');
    if (!gallery) return;

    var items = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-item'));
    if (!items.length) return;

    gallery.classList.add('is-justified');

    var relayout = (function () {
      var pending = false;
      return function () {
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(function () {
          pending = false;
          layout(gallery, items);
        });
      };
    })();

    relayout();
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(gallery);

    // Videos autoplay on their own via the markup. All this does is stop the
    // loops from decoding while they are scrolled out of view, and pick them
    // up again on the way back.
    var videos = gallery.querySelectorAll('video');
    if (!videos.length || !window.IntersectionObserver) return;

    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        video.dataset.onscreen = entry.isIntersecting ? 'yes' : '';
        if (entry.isIntersecting) {
          var started = video.play();
          if (started && started.catch) started.catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { rootMargin: '200px' });

    Array.prototype.forEach.call(videos, function (video) {
      // The autoplay attribute can kick in after the observer has already
      // decided the tile is offscreen, so re-check on every play.
      video.addEventListener('play', function () {
        if (!video.dataset.onscreen) video.pause();
      });
      watcher.observe(video);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
