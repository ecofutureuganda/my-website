// main.js — simple interactive features: back-to-top and newsletter demo
document.addEventListener('DOMContentLoaded', function () {
    const back = document.getElementById('backToTop');
    const form = document.getElementById('newsletter-form');
    const email = document.getElementById('newsletter-email');

    // Show/hide back-to-top on scroll
    function toggleBack() {
        if (window.scrollY > 300) back.classList.add('visible');
        else back.classList.remove('visible');
    }
    toggleBack();
    window.addEventListener('scroll', toggleBack, { passive: true });

    back.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        back.blur();
    });

    // Newsletter (demo) — validate and store in localStorage
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const messageEl = form.querySelector('.form-message');
            const val = (email.value || '').trim();
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
            messageEl.classList.remove('error', 'success');
            if (!valid) {
                messageEl.textContent = 'Please enter a valid email address.';
                messageEl.classList.add('error');
                email.focus();
                return;
            }

            // Determine endpoint from data-endpoint or form.action; fallback to demo localStorage
            const endpoint = form.dataset.endpoint || form.action || '';

            if (!endpoint || endpoint.includes('your-id')) {
                // Demo fallback: store locally and inform user to configure endpoint
                const stored = JSON.parse(localStorage.getItem('ef_news') || '[]');
                stored.push({ email: val, time: Date.now() });
                localStorage.setItem('ef_news', JSON.stringify(stored));

                messageEl.textContent = 'Thanks! You’re subscribed (demo). Replace data-endpoint with your API URL to receive real submissions.';
                messageEl.classList.add('success');
                email.value = '';
                return;
            }

            // Attempt remote submit (Formspree or custom API)
            const submitBtn = form.querySelector('button[type="submit"]');
            const origLabel = submitBtn ? submitBtn.textContent : null;
            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.setAttribute('aria-busy', 'true');
                    submitBtn.textContent = 'Sending…';
                }
                messageEl.textContent = 'Sending…';
                // set hidden _replyto for non-JS fallback
                const hiddenN = form.querySelector('input[name="_replyto"]');
                if (hiddenN) hiddenN.value = val;
                // Send as FormData (multipart/form-data) for Formspree compatibility
                const formData = new FormData();
                formData.append('email', val);
                formData.append('_replyto', val);
                let res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: formData,
                });
                let ct = (res.headers.get('Content-Type') || '');
                let resJson = ct.includes('application/json') ? await res.json().catch(() => null) : null;
                console.debug('Newsletter submit response', res.status, resJson);

                // Retry with JSON if 405 Not Allowed
                if (res.status === 405) {
                    console.debug('Received 405, retrying newsletter submit with JSON payload');
                    const jsonBody = JSON.stringify({ email: val, _replyto: val });
                    try {
                        res = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                            body: jsonBody,
                        });
                        ct = (res.headers.get('Content-Type') || '');
                        resJson = ct.includes('application/json') ? await res.json().catch(() => null) : null;
                        console.debug('Newsletter submit retry response', res.status, resJson);
                    } catch (e) {
                        console.error('Newsletter submit retry error:', e);
                        messageEl.textContent = 'Subscription failed — please try again later.';
                        messageEl.classList.add('error');
                        return;
                    }
                }

                if (res.ok) {
                    messageEl.textContent = 'Thanks! You’re subscribed.';
                    messageEl.classList.add('success');
                    email.value = '';
                } else if (res.status === 422 && resJson && resJson.errors) {
                    const msg = resJson.errors.map(e => e.message || e).join(' ') || 'Validation error. Please check your input.';
                    messageEl.textContent = msg;
                    messageEl.classList.add('error');
                } else {
                    messageEl.textContent = (resJson && resJson.message) ? resJson.message : 'Subscription failed — please try again later.';
                    messageEl.classList.add('error');
                    console.error('Newsletter submit error:', res.status, resJson);
                }
            } catch (err) {
                messageEl.textContent = 'Subscription failed — please try again later.';
                messageEl.classList.add('error');
                console.error('Newsletter submit error:', err);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.removeAttribute('aria-busy');
                    if (origLabel !== null) submitBtn.textContent = origLabel;
                }
            }
        });
    }

    // Contact form submission (uses Formspree if data-endpoint is set)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const contactMsg = contactForm.querySelector('.contact-message');
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = (contactForm.querySelector('#name').value || '').trim();
            const emailVal = (contactForm.querySelector('#email').value || '').trim();
            const subject = (contactForm.querySelector('#subject').value || '').trim();
            const message = (contactForm.querySelector('#message').value || '').trim();
            contactMsg.classList.remove('error','success');
            if (!name || !emailVal || !message) {
                contactMsg.textContent = 'Please fill in your name, email and message.';
                contactMsg.classList.add('error');
                return;
            }
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
            if (!valid) {
                contactMsg.textContent = 'Please enter a valid email address.';
                contactMsg.classList.add('error');
                return;
            }

            const endpoint = contactForm.dataset.endpoint || contactForm.action || '';
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const origLabel = submitBtn ? submitBtn.textContent : null;
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.setAttribute('aria-busy','true'); submitBtn.textContent = 'Sending…'; }
                contactMsg.textContent = 'Sending…';

                if (!endpoint || endpoint.includes('your-id')) {
                    const stored = JSON.parse(localStorage.getItem('ef_contacts') || '[]');
                    stored.push({ name, email: emailVal, subject, message, time: Date.now() });
                    localStorage.setItem('ef_contacts', JSON.stringify(stored));
                    contactMsg.textContent = 'Thanks — message saved (demo). Configure data-endpoint to send real messages.';
                    contactMsg.classList.add('success');
                    contactForm.reset();
                    return;
                }

                // set hidden _replyto input if present (for non-JS fallback)
                const hiddenC = contactForm.querySelector('input[name="_replyto"]');
                if (hiddenC) hiddenC.value = emailVal;
                const formDataC = new FormData();
                formDataC.append('name', name);
                formDataC.append('email', emailVal);
                formDataC.append('_replyto', emailVal);
                formDataC.append('_subject', subject || 'Website contact form');
                formDataC.append('message', message);
                let res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: formDataC,
                });
                let ct = (res.headers.get('Content-Type') || '');
                let resJson = ct.includes('application/json') ? await res.json().catch(() => null) : null;
                // clone response text for debugging if needed
                let rawText = null;
                try { rawText = await res.clone().text(); } catch (e) { /* ignore */ }
                console.debug('Contact submit response', res.status, resJson || rawText);

                // If server responds 405 Not Allowed, retry with JSON payload (Formspree supports JSON)
                if (res.status === 405) {
                    console.debug('Received 405, retrying contact submit with JSON payload');
                    const jsonBody = JSON.stringify({ name, email: emailVal, _replyto: emailVal, _subject: subject || 'Website contact form', message });
                    try {
                        res = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                            body: jsonBody,
                        });
                        ct = (res.headers.get('Content-Type') || '');
                        resJson = ct.includes('application/json') ? await res.json().catch(() => null) : null;
                        rawText = null;
                        try { rawText = await res.clone().text(); } catch (e) { /* ignore */ }
                        console.debug('Contact submit retry response', res.status, resJson || rawText);
                    } catch (e) {
                        console.error('Contact submit retry error:', e);
                        contactMsg.textContent = 'Sending failed — please try again later.';
                        contactMsg.classList.add('error');
                        return;
                    }
                }

                if (res.ok) {
                    contactMsg.textContent = 'Message sent — thank you!';
                    contactMsg.classList.add('success');
                    contactForm.reset();
                } else {
                    contactMsg.textContent = (resJson && resJson.message) ? resJson.message : 'Sending failed — please try again later.';
                    contactMsg.classList.add('error');
                    console.error('Contact submit error:', res.status, resJson, rawText);
                }

                // If debug mode is enabled (?debug=1) show raw response details for troubleshooting
                try {
                    const debug = new URLSearchParams(window.location.search).get('debug') === '1';
                    if (debug) {
                        const pre = document.createElement('pre');
                        pre.className = 'debug-output';
                        pre.textContent = `Debug info:\nStatus: ${res.status}\n${rawText || JSON.stringify(resJson) || ''}`;
                        pre.style.whiteSpace = 'pre-wrap';
                        pre.style.fontSize = '12px';
                        pre.style.marginTop = '8px';
                        pre.style.background = 'rgba(0,0,0,0.04)';
                        pre.style.padding = '8px';
                        contactMsg.appendChild(pre);
                    }
                } catch (e) { /* ignore debug errors */ }
            } catch (err) {
                contactMsg.textContent = 'Sending failed — please try again later.';
                contactMsg.classList.add('error');
                console.error('Contact submit error:', err);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); if (origLabel !== null) submitBtn.textContent = origLabel; }
            }
        });
    }

    // Animated counters for impact stats
    (function () {
        const statEls = document.querySelectorAll('.stat-count');
        if (!statEls.length) return;

        const runCounter = (el, target) => {
            let start = 0;
            const duration = 1400;
            const increment = Math.ceil(Math.max(1, target / (duration / 20)));
            const step = () => {
                start = Math.min(target, start + increment);
                el.textContent = start.toLocaleString();
                if (start < target) requestAnimationFrame(step);
            };
            step();
        };

        const inView = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.target, 10) || 0;
                    runCounter(el, target);
                    observer.unobserve(el);
                }
            });
        };

        const io = new IntersectionObserver(inView, { threshold: 0.5 });
        statEls.forEach(el => io.observe(el));
    })();

// Keyboard toggle for focusable cards (Enter/Space)
document.querySelectorAll('.card[tabindex]').forEach(card => {
    card.setAttribute('role', 'button');
    if (!card.hasAttribute('aria-expanded')) card.setAttribute('aria-expanded', 'false');
    card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const expanded = card.classList.toggle('expanded');
            card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            if (expanded) card.querySelector('.card-inner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
});

});
