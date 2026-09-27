/* Contact (SNT-105). A bare mailto: link does nothing on a computer with no mail app set up (most Windows
   machines that use webmail), so a click on any [data-contact] link opens a small card instead: the address in
   full, a Copy button, a link for those who do have a mail app, and the booking link. Without JavaScript the
   link is still a plain mailto:. No dependencies. */
(function () {
  'use strict';
  var links = document.querySelectorAll('a[data-contact]');
  if (!links.length) return;
  var EMAIL = 'leo@sentinel-lai.com';
  var CAL = 'https://cal.com/sentinel-ai/demo';
  var dlg = null, copyBtn = null, opener = null;

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'contact-card';
    dlg.setAttribute('aria-labelledby', 'contactTitle');
    dlg.innerHTML =
      '<button class="contact-x" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="eyebrow">Contact</div>' +
      '<h2 class="contact-h" id="contactTitle">Write to us.</h2>' +
      '<p class="contact-p">One address for everything: questions, security, privacy requests.</p>' +
      '<div class="contact-row"><span class="contact-addr" id="contactAddr">' + EMAIL + '</span>' +
      '<button class="btn btn-sm" type="button" data-copy>Copy</button></div>' +
      '<div class="contact-alt">' +
      '<a class="link-arrow" href="mailto:' + EMAIL + '">Open in your mail app</a>' +
      '<a class="link-arrow" href="' + CAL + '" target="_blank" rel="noopener">Or book a 20-minute call</a>' +
      '</div>' +
      '<p class="contact-note" role="status" aria-live="polite"></p>';
    document.body.appendChild(dlg);
    copyBtn = dlg.querySelector('[data-copy]');
    var note = dlg.querySelector('.contact-note');
    dlg.querySelector('.contact-x').addEventListener('click', close);
    // a click on the backdrop (outside the card's box) closes it
    dlg.addEventListener('click', function (e) {
      if (e.target !== dlg) return;
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    });
    dlg.addEventListener('close', function () { if (opener) opener.focus(); });
    copyBtn.addEventListener('click', function () {
      copy(EMAIL).then(function (ok) {
        if (ok) {
          copyBtn.textContent = 'Copied';
          note.textContent = 'The address is on your clipboard.';
        } else {
          selectAddr();
          note.textContent = 'Press Ctrl+C (or ⌘C) to copy the selected address.';
        }
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2200);
      });
    });
  }
  function selectAddr() {
    var r = document.createRange();
    r.selectNodeContents(dlg.querySelector('#contactAddr'));
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function open(from) {
    if (!dlg) build();
    opener = from;
    dlg.querySelector('.contact-note').textContent = '';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    copyBtn.focus();
  }
  function close() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }

  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      open(a);
    });
  });
})();
