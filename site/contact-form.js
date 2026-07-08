// Sentinel demo-form behaviour for the static landing page.
// 1) Any "Book a demo" trigger smooth-scrolls to the #demo form.
// 2) The form validates client-side, then delivers the lead by email to
//    CONTACT_EMAIL via FormSubmit's AJAX endpoint (works from a static site,
//    no backend). If that fails (offline, blocked), it falls back to a
//    prefilled mailto: link so the lead is never lost.
//
// NOTE: FormSubmit requires a ONE-TIME activation — the first submission
// triggers a confirmation email to CONTACT_EMAIL; click the link in it once
// and every subsequent submission is delivered normally.
(function () {
  var CONTACT_EMAIL = 'leo@sentinel-lai.com';
  var ENDPOINT = 'https://formsubmit.co/ajax/' + CONTACT_EMAIL;

  function scrollToDemo(e) {
    var demo = document.getElementById('demo');
    if (!demo) return;
    if (e) e.preventDefault();
    demo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Wire every "Book a demo" button/link (except the form's own submit) to the form.
  document.querySelectorAll('a, button').forEach(function (el) {
    if (el.closest && el.closest('#demoForm')) return;
    if ((el.textContent || '').trim().toLowerCase() === 'book a demo') {
      el.addEventListener('click', scrollToDemo);
    }
  });

  var form = document.getElementById('demoForm');
  if (!form) return;

  function val(id) {
    var f = document.getElementById(id);
    return f ? f.value.trim() : '';
  }

  function showSuccess() {
    form.classList.add('hide');
    var success = document.getElementById('demoSuccess');
    if (success) success.classList.add('show');
    var demo = document.getElementById('demo');
    if (demo) demo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showError() {
    var err = document.getElementById('demoErr');
    if (!err) {
      err = document.createElement('p');
      err.id = 'demoErr';
      err.setAttribute('role', 'alert');
      err.style.cssText = 'margin-top:12px;font-size:.85rem;color:#c0563c';
      form.appendChild(err);
    }
    err.innerHTML = 'Something went wrong sending your request. Please email us directly at ' +
      '<a href="' + mailtoHref() + '" style="color:#3a48c7;text-decoration:underline">' + CONTACT_EMAIL + '</a>' +
      ' &#8212; your details are pre-filled in the draft.';
  }

  function mailtoHref() {
    var body =
      'Name: ' + val('sf-first') + ' ' + val('sf-last') + '\n' +
      'Work email: ' + val('sf-email') + '\n' +
      'Company: ' + val('sf-company') + '\n' +
      'Legal team size: ' + val('sf-team') + '\n' +
      'Contracts reviewed / week: ' + val('sf-vol') + '\n\n' +
      (val('sf-msg') || '');
    return 'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent('Sentinel demo request — ' + (val('sf-company') || val('sf-email'))) +
      '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;

    ['sf-first', 'sf-last', 'sf-email', 'sf-company'].forEach(function (id) {
      var f = document.getElementById(id);
      if (!f) return;
      if (!f.value.trim()) { ok = false; f.style.borderColor = '#c0563c'; }
      else { f.style.borderColor = ''; }
    });

    var email = document.getElementById('sf-email');
    if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
      ok = false; email.style.borderColor = '#c0563c';
    }

    if (!ok) return;

    var btn = form.querySelector('.sf-btn');
    var btnLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; btn.style.opacity = '0.7'; }

    var payload = {
      name: val('sf-first') + ' ' + val('sf-last'),
      email: val('sf-email'),
      company: val('sf-company'),
      'legal team size': val('sf-team') || '—',
      'contracts reviewed per week': val('sf-vol') || '—',
      message: val('sf-msg') || '—',
      _subject: 'Sentinel demo request — ' + (val('sf-company') || val('sf-email')),
      _template: 'table',
      _captcha: 'false'
    };

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      // FormSubmit answers 200 even pre-activation; only success:"true"
      // means the lead was actually delivered
      if (String(data.success) !== 'true') throw new Error(data.message || 'not delivered');
      showSuccess();
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = btnLabel; btn.style.opacity = ''; }
      showError();
    });
  });
})();
