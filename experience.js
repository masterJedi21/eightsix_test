/* ════════════════════════════════════════════════════════════════
   Eight Six IT Engineering — cinematic experience layer
   GSAP + ScrollTrigger + Lenis + Three.js (hero only).
   Progressive enhancement: if this file (or the GSAP CDN) doesn't
   run, site.js provides the CSS-based fallback. Honors
   prefers-reduced-motion by never initializing.
   ════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    var docEl = document.documentElement;
    var loader = document.querySelector('.e86-loader');

    /* ───────────────────────────── Lenis smooth scrolling ── */
    var lenis = null;
    if (typeof window.Lenis !== 'undefined') {
        lenis = new window.Lenis({ lerp: 0.105, smoothWheel: true });
        window.E86_LENIS = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
        docEl.classList.add('e86-lenis');
    }

    /* Same-page anchors glide via Lenis */
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -92, duration: 1.2 });
        else target.scrollIntoView({ behavior: 'smooth' });
    });

    /* ───────────────────────────── Split text into masked words ── */
    function splitWords(el) {
        if (!el || el.dataset.split) return [];
        el.dataset.split = '1';
        var words = [];
        var shimmerSpans = Array.prototype.slice.call(el.querySelectorAll('.e86-shimmer'));
        (function walk(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (child) {
                if (child.nodeType === 3) {
                    if (!child.textContent.trim()) return;
                    var frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach(function (part) {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        var mask = document.createElement('span');
                        mask.className = 'e86-word-mask';
                        var w = document.createElement('span');
                        w.className = 'e86-word';
                        w.textContent = part;
                        if (child.parentElement && child.parentElement.closest('.e86-shimmer')) {
                            w.classList.add('e86-shimmer');
                        }
                        mask.appendChild(w);
                        frag.appendChild(mask);
                        words.push(w);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1 && !child.classList.contains('e86-word-mask')) {
                    walk(child);
                }
            });
        })(el);
        // background-clip:text breaks across nested inline-blocks —
        // the word spans carry the class now, so drop it on the wrapper
        shimmerSpans.forEach(function (s) { s.classList.remove('e86-shimmer'); });
        return words;
    }

    /* ───────────────────────────── Hero entrance ── */
    var heroWrap = document.querySelector('.hero-stagger');
    var heroItems = []; // [{el, words|null}]
    if (heroWrap) {
        Array.prototype.slice.call(heroWrap.children).forEach(function (child) {
            if (child.tagName === 'H1') {
                var w = splitWords(child);
                gsap.set(w, { yPercent: 115 });
                heroItems.push({ el: child, words: w });
            } else {
                gsap.set(child, { autoAlpha: 0, y: 28 });
                heroItems.push({ el: child, words: null });
            }
        });
    }

    var entered = false;
    function pageEnter() {
        if (entered) return;
        entered = true;
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        var pos = 0;
        heroItems.forEach(function (item) {
            if (item.words) {
                tl.to(item.words, { yPercent: 0, duration: 1.15, stagger: 0.045, ease: 'power4.out' }, pos);
                pos += 0.3;
            } else {
                tl.to(item.el, { autoAlpha: 1, y: 0, duration: 0.9, clearProps: 'transform' }, pos);
                pos += 0.1;
            }
        });
    }

    /* ───────────────────────────── Preloader & curtain in ── */
    if (loader) loader.style.animation = 'none'; // JS owns it now; CSS failsafe off
    if (loader && docEl.classList.contains('e86-loading')) {
        var fill = loader.querySelector('.e86-loader-fill');
        var pct = loader.querySelector('.e86-loader-pct');
        var inner = loader.querySelector('.e86-loader-inner');
        var prog = { v: 0 };
        gsap.timeline({
            onComplete: function () {
                loader.style.display = 'none';
                docEl.classList.remove('e86-loading');
            }
        })
            .to(prog, {
                v: 100, duration: 0.95, ease: 'power2.inOut',
                onUpdate: function () {
                    var n = Math.round(prog.v);
                    if (fill) fill.style.width = n + '%';
                    if (pct) pct.textContent = n + '%';
                }
            })
            .to(inner, { autoAlpha: 0, y: -24, duration: 0.3 }, '+=0.12')
            .to(loader, { yPercent: -100, duration: 0.75, ease: 'power4.inOut' })
            .add(pageEnter, '-=0.5');
    } else if (loader && docEl.classList.contains('e86-curtain')) {
        gsap.timeline({
            onComplete: function () {
                loader.style.display = 'none';
                gsap.set(loader, { yPercent: 0 });
                docEl.classList.remove('e86-curtain');
            }
        })
            .to(loader, { yPercent: -100, duration: 0.65, ease: 'power4.inOut', delay: 0.06 })
            .add(pageEnter, '-=0.45');
    } else {
        pageEnter();
    }

    /* ───────────────────────────── Page-transition wipe out ── */
    function internalLink(a) {
        if (a.target && a.target !== '_self') return false;
        if (a.hasAttribute('download')) return false;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#') return false;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
        if (a.host && a.host !== location.host) return false;
        return true;
    }
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || !internalLink(a)) return;
        var url = a.href;
        if (!loader) return; // let the browser navigate normally
        e.preventDefault();
        try { sessionStorage.setItem('e86t', '1'); } catch (err) { /* private mode */ }
        var inner = loader.querySelector('.e86-loader-inner');
        if (inner) inner.style.display = 'none';
        loader.style.display = 'flex';
        gsap.fromTo(loader, { yPercent: 100 }, {
            yPercent: 0, duration: 0.45, ease: 'power3.inOut',
            onComplete: function () { location.href = url; }
        });
    });
    window.addEventListener('pageshow', function (ev) {
        if (ev.persisted && loader) { // back/forward cache restore
            loader.style.display = 'none';
            gsap.set(loader, { yPercent: 0 });
            try { sessionStorage.removeItem('e86t'); } catch (err) { /* noop */ }
        }
    });

    /* ───────────────────────────── Headline word reveals on scroll ── */
    document.querySelectorAll('main h2').forEach(function (h) {
        if (h.closest('.hero-stagger') || h.querySelector('.underline')) return;
        h.removeAttribute('data-reveal'); // words replace the block reveal
        var words = splitWords(h);
        if (!words.length) return;
        gsap.set(words, { yPercent: 115 });
        gsap.to(words, {
            yPercent: 0, duration: 1.05, stagger: 0.04, ease: 'power4.out',
            scrollTrigger: { trigger: h, start: 'top 88%', once: true }
        });
    });

    /* ───────────────────────────── Generic scroll reveals ──
       Mirrors site.js auto-tagging so all pages animate, then lets
       GSAP own the motion. Explicit data-reveal attributes win. */
    function tag(el, kind, delay) {
        if (el.hasAttribute('data-reveal') || el.closest('[data-reveal]') || el.closest('[data-no-reveal]')) return;
        if (el.offsetParent === null) return;
        el.setAttribute('data-reveal', kind || 'up');
        if (delay) el.setAttribute('data-delay', String(delay));
    }
    (function autoTag() {
        var main = document.querySelector('main');
        if (!main) return;
        main.querySelectorAll('section h2').forEach(function (h) {
            var next = h.nextElementSibling;
            if (next && next.tagName === 'P') tag(next, 'up', 120);
            var prev = h.previousElementSibling;
            if (prev && prev.tagName !== 'SECTION' && prev.children.length < 8 && !prev.querySelector('h1,h2,h3')) {
                tag(prev, 'up');
            }
        });
        main.querySelectorAll('.grid').forEach(function (grid) {
            var i = 0;
            Array.prototype.forEach.call(grid.children, function (child) {
                if (child.querySelector && child.querySelector('.grid')) return;
                tag(child, 'up', (i % 9) * 80);
                i++;
            });
        });
        main.querySelectorAll('.space-y-3, .space-y-4').forEach(function (stack) {
            if (stack.closest('[data-reveal]')) return;
            var i = 0;
            Array.prototype.forEach.call(stack.children, function (child) {
                tag(child, 'up', (i % 8) * 90);
                i++;
            });
        });
        main.querySelectorAll('.glass-panel, .tool-card').forEach(function (p) { tag(p, 'up'); });
    })();

    var FROM = {
        up:    { autoAlpha: 0, y: 46 },
        down:  { autoAlpha: 0, y: -46 },
        left:  { autoAlpha: 0, x: -60 },
        right: { autoAlpha: 0, x: 60 },
        scale: { autoAlpha: 0, scale: 0.9 },
        blur:  { autoAlpha: 0, y: 30, filter: 'blur(10px)' }
    };
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        if (el.closest('[data-pin]') || el.closest('.hero-stagger')) return;
        var kind = el.getAttribute('data-reveal') || 'up';
        var from = FROM[kind] || FROM.up;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10) / 1000;
        gsap.set(el, from);
        var to = {
            autoAlpha: 1, x: 0, y: 0, scale: 1,
            duration: 1.15, delay: delay, ease: 'power3.out',
            clearProps: 'transform,filter',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        };
        if (kind === 'blur') to.filter = 'blur(0px)';
        gsap.to(el, to);
    });

    /* ───────────────────────────── Scrubbed parallax orbs ── */
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        gsap.fromTo(el, { y: speed * 220 }, {
            y: -speed * 220, ease: 'none',
            scrollTrigger: {
                trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.1
            }
        });
    });

    /* Scroll cue fades away as soon as the journey starts */
    var cue = document.querySelector('.e86-scroll-cue');
    if (cue) {
        gsap.to(cue, {
            autoAlpha: 0, ease: 'none',
            scrollTrigger: { start: 30, end: 220, scrub: true }
        });
    }

    /* ───────────────────────────── Velocity-reactive marquee ── */
    var tracks = gsap.utils.toArray('.e86-marquee-track');
    if (tracks.length) {
        var wrapX = gsap.utils.wrap(-50, 0);
        var marqueePos = 0;
        var lastY = window.scrollY;
        var skewTo = tracks.map(function (t) {
            return gsap.quickTo(t, 'skewX', { duration: 0.4, ease: 'power2.out' });
        });
        gsap.ticker.add(function (time, deltaMS) {
            var dt = Math.min(deltaMS / 1000, 0.05);
            var y = window.scrollY;
            var vel = (y - lastY) / Math.max(dt, 0.001);
            lastY = y;
            var speed = 4.2 + Math.min(Math.abs(vel) * 0.014, 26);
            marqueePos = wrapX(marqueePos - speed * dt);
            var skew = gsap.utils.clamp(-9, 9, vel * 0.004);
            tracks.forEach(function (t, i) {
                gsap.set(t, { xPercent: marqueePos });
                skewTo[i](skew);
            });
        });
    }

    /* ───────────────────────────── Pinned "How We Work" timeline ── */
    var pinSec = document.querySelector('[data-pin="steps"]');
    if (pinSec) {
        var mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', function () {
            var line = pinSec.querySelector('.e86-line-draw');
            var steps = gsap.utils.toArray(pinSec.querySelectorAll('.e86-step'));
            if (!steps.length) return;
            gsap.set(steps, { autoAlpha: 0, y: 80 });
            if (line) gsap.set(line, { scaleX: 0, transformOrigin: '0 50%' });
            var tl = gsap.timeline({
                scrollTrigger: {
                    trigger: pinSec, start: 'top top', end: '+=150%',
                    pin: true, scrub: 0.7, anticipatePin: 1
                }
            });
            if (line) tl.to(line, { scaleX: 1, ease: 'none', duration: steps.length }, 0.25);
            steps.forEach(function (s, i) {
                tl.to(s, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out' }, i + 0.05);
                var node = s.querySelector('.e86-step-node');
                if (node) {
                    tl.from(node, { scale: 0.3, rotate: -90, duration: 0.6, ease: 'back.out(2.2)' }, i + 0.1);
                }
            });
            return function () {
                gsap.set(steps, { clearProps: 'all' });
                if (line) gsap.set(line, { clearProps: 'all' });
            };
        });
        mm.add('(max-width: 1023px)', function () {
            var steps = gsap.utils.toArray(pinSec.querySelectorAll('.e86-step'));
            steps.forEach(function (s, i) {
                gsap.fromTo(s, { autoAlpha: 0, y: 44 }, {
                    autoAlpha: 1, y: 0, duration: 0.9, delay: (i % 4) * 0.12, ease: 'power3.out',
                    clearProps: 'transform',
                    scrollTrigger: { trigger: s, start: 'top 90%', once: true }
                });
            });
            return function () { gsap.set(steps, { clearProps: 'all' }); };
        });
    }

    /* FAQ height changes shift everything below — keep triggers honest */
    document.querySelectorAll('.e86-faq-q').forEach(function (q) {
        q.addEventListener('click', function () {
            setTimeout(function () { ScrollTrigger.refresh(); }, 500);
        });
    });

    /* ───────────────────────────── Custom cursor ── */
    if (window.matchMedia('(pointer: fine)').matches) {
        var dot = document.createElement('div');
        dot.className = 'e86-cursor-dot';
        var ring = document.createElement('div');
        ring.className = 'e86-cursor-ring';
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
        var dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' });
        var dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' });
        var ringX = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3.out' });
        var ringY = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3.out' });
        var cursorOn = false;
        window.addEventListener('pointermove', function (e) {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            if (!cursorOn) { cursorOn = true; docEl.classList.add('e86-cursor-active'); }
            dotX(e.clientX); dotY(e.clientY);
            ringX(e.clientX); ringY(e.clientY);
            var interactive = e.target.closest &&
                e.target.closest('a, button, input, select, textarea, label, [data-cursor], .e86-faq-q');
            ring.classList.toggle('is-link', !!interactive);
        }, { passive: true });
        document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
        document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
        docEl.addEventListener('mouseleave', function () {
            cursorOn = false;
            docEl.classList.remove('e86-cursor-active');
        });
    }

    /* ───────────────────────────── Three.js hero scene ── */
    var heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
        var webglOK = (function () {
            try {
                var c = document.createElement('canvas');
                return !!(window.WebGLRenderingContext &&
                    (c.getContext('webgl') || c.getContext('experimental-webgl')));
            } catch (e) { return false; }
        })();
        var fallback2D = function () {
            if (window.E86Particles2D) window.E86Particles2D(heroCanvas);
        };
        if (!webglOK) {
            fallback2D();
        } else {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
            s.onload = function () {
                try { initHero3D(heroCanvas); } catch (e) { fallback2D(); }
            };
            s.onerror = fallback2D;
            document.head.appendChild(s);
        }
    }

    function initHero3D(canvas) {
        var THREE = window.THREE;
        var wrap = canvas.parentElement;
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 8;

        var group = new THREE.Group();
        scene.add(group);

        // Soft round glow sprite shared by flashes, tracers and drone cores
        var sprite = (function () {
            var c = document.createElement('canvas');
            c.width = c.height = 64;
            var g = c.getContext('2d');
            var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
            return new THREE.CanvasTexture(c);
        })();
        function glowSprite(hex, scale, opacity) {
            var m = new THREE.Sprite(new THREE.SpriteMaterial({
                map: sprite, color: hex, transparent: true, opacity: opacity,
                blending: THREE.AdditiveBlending, depthWrite: false
            }));
            m.scale.set(scale, scale, 1);
            return m;
        }

        /* ══ Hex energy shield — the barrier, tilted low behind the copy ══ */
        var shieldG = new THREE.Group();
        shieldG.position.set(0, -2.5, 0.4);
        shieldG.rotation.x = -0.52;
        group.add(shieldG);

        var HEX = 0.27;                      // grid spacing radius
        var tilePos = [];
        (function () {
            for (var q = -9; q <= 9; q++) {
                for (var r = -7; r <= 7; r++) {
                    var x = 1.5 * HEX * q;
                    var y = Math.sqrt(3) * HEX * (r + q / 2);
                    if ((x * x) / (4.1 * 4.1) + (y * y) / (1.9 * 1.9) > 1) continue; // elliptical cut
                    var z = 0.55 - (x * x / 16 + y * y / 7); // gentle bulge toward camera
                    tilePos.push(new THREE.Vector3(x, y, z));
                }
            }
        })();
        var tileCount = tilePos.length;
        var hexGeo = new THREE.CircleGeometry(HEX * 0.88, 6);
        var hexMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.34,
            side: THREE.DoubleSide, depthWrite: false
        });
        var tiles = new THREE.InstancedMesh(hexGeo, hexMat, tileCount);
        var dummy = new THREE.Object3D();
        var baseCol = [];
        var pulse = new Float32Array(tileCount);     // blue ripple energy
        var threatPulse = new Float32Array(tileCount); // red impact energy
        var tmpCol = new THREE.Color();
        for (var ti = 0; ti < tileCount; ti++) {
            dummy.position.copy(tilePos[ti]);
            dummy.updateMatrix();
            tiles.setMatrixAt(ti, dummy.matrix);
            var shade = 0.75 + Math.random() * 0.5;
            baseCol.push(new THREE.Color(0x21407f).multiplyScalar(shade));
            tiles.setColorAt(ti, baseCol[ti]);
        }
        shieldG.add(tiles);
        // neighbor map for impact ripples
        var neighbors = [];
        for (var a = 0; a < tileCount; a++) {
            neighbors.push([]);
            for (var b = 0; b < tileCount; b++) {
                if (a !== b && tilePos[a].distanceTo(tilePos[b]) < HEX * 2.1) neighbors[a].push(b);
            }
        }

        /* ══ HUD targeting rings beneath the shield ══ */
        function ring(rIn, rOut, hex, opacity, thetaStart, thetaLen) {
            return new THREE.Mesh(
                new THREE.RingGeometry(rIn, rOut, 64, 1, thetaStart || 0, thetaLen || Math.PI * 2),
                new THREE.MeshBasicMaterial({
                    color: hex, transparent: true, opacity: opacity,
                    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                })
            );
        }
        var hud = new THREE.Group();
        hud.position.set(0, -2.55, 0.1);
        hud.rotation.x = -0.52;
        group.add(hud);
        hud.add(ring(2.55, 2.585, 0x4f6fc4, 0.22));
        hud.add(ring(3.05, 3.07, 0x4f6fc4, 0.13));
        var arcs = new THREE.Group();
        for (var ai = 0; ai < 3; ai++) {
            arcs.add(ring(2.78, 2.84, 0xf4c430, 0.3, ai * Math.PI * 2 / 3, Math.PI / 5));
        }
        hud.add(arcs);

        /* ══ Funnel drones — autonomous sentries on patrol orbits ══ */
        var funnelGeo = new THREE.OctahedronGeometry(0.16, 0);
        funnelGeo.scale(0.6, 2.2, 0.6); // elongated kite, funnel-like
        var funnels = [];
        for (var fi = 0; fi < 6; fi++) {
            var f = new THREE.Group();
            var body = new THREE.Mesh(funnelGeo, new THREE.MeshBasicMaterial({
                color: 0xaebfe8, wireframe: true, transparent: true, opacity: 0.55
            }));
            var eye = glowSprite(0xf4c430, 0.22, 0.65);
            f.add(body);
            f.add(eye);
            f.userData = {
                r: 3.4 + (fi % 3) * 0.85,
                speed: (0.22 + (fi % 2) * 0.07) * (fi % 2 ? 1 : -1),
                phase: fi * Math.PI / 3,
                yAmp: 0.5 + (fi % 3) * 0.3,
                yOff: -0.9 + (fi % 3) * 0.55,
                eye: eye,
                flash: 0
            };
            group.add(f);
            funnels.push(f);
        }

        /* ══ Threat tracers + intercept beams (pooled) ══ */
        function makeLine(hex, opacity) {
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
            var l = new THREE.Line(g, new THREE.LineBasicMaterial({
                color: hex, transparent: true, opacity: opacity,
                blending: THREE.AdditiveBlending, depthWrite: false
            }));
            l.visible = false;
            l.frustumCulled = false;
            return l;
        }
        function setLine(l, a, b) {
            var p = l.geometry.attributes.position;
            p.setXYZ(0, a.x, a.y, a.z);
            p.setXYZ(1, b.x, b.y, b.z);
            p.needsUpdate = true;
        }
        var threats = [];
        for (var thi = 0; thi < 3; thi++) {
            var line = makeLine(0xd62828, 0.85);
            var head = glowSprite(0xd62828, 0.3, 0.9);
            head.visible = false;
            group.add(line);
            group.add(head);
            threats.push({ line: line, head: head, active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, tile: 0 });
        }
        var beams = [];
        for (var bi = 0; bi < 3; bi++) {
            var bl = makeLine(0xf4c430, 0.9);
            group.add(bl);
            beams.push({ line: bl, life: 0 });
        }
        var flashes = [];
        for (var fl = 0; fl < 3; fl++) {
            var fs = glowSprite(0xf4c430, 0.6, 0.9);
            fs.visible = false;
            group.add(fs);
            flashes.push({ s: fs, life: 0 });
        }

        var spawnTimer = 1.6; // first attack arrives shortly after entrance
        var tmpV = new THREE.Vector3();
        function spawnThreat() {
            for (var i = 0; i < threats.length; i++) {
                if (threats[i].active) continue;
                var th = threats[i];
                th.tile = Math.floor(Math.random() * tileCount);
                th.to.copy(tilePos[th.tile]);
                shieldG.localToWorld(th.to);
                group.worldToLocal(th.to);
                var side = Math.random() < 0.5 ? -1 : 1;
                th.from.set(side * (5 + Math.random() * 4), 2.5 + Math.random() * 3.5, -3 + Math.random() * 3);
                th.t = 0;
                th.active = true;
                th.line.visible = true;
                th.head.visible = true;
                return;
            }
        }
        function impact(th) {
            threatPulse[th.tile] = 1;
            neighbors[th.tile].forEach(function (n) { pulse[n] = Math.max(pulse[n], 0.8); });
            // nearest funnel returns fire
            var best = null, bestD = 1e9;
            funnels.forEach(function (f) {
                var d = f.position.distanceToSquared(th.to);
                if (d < bestD) { bestD = d; best = f; }
            });
            for (var i = 0; i < beams.length; i++) {
                if (beams[i].life > 0) continue;
                beams[i].life = 1;
                setLine(beams[i].line, best.position, th.to);
                beams[i].line.visible = true;
                break;
            }
            for (var j = 0; j < flashes.length; j++) {
                if (flashes[j].life > 0) continue;
                flashes[j].life = 1;
                flashes[j].s.position.copy(th.to);
                flashes[j].s.visible = true;
                break;
            }
            if (best) best.userData.flash = 1;
        }

        /* ══ Pointer parallax + scroll-driven motion ══ */
        var tx = 0, ty = 0, mx = 0, my = 0, prog = 0;
        window.addEventListener('pointermove', function (e) {
            tx = e.clientX / window.innerWidth - 0.5;
            ty = e.clientY / window.innerHeight - 0.5;
        }, { passive: true });
        ScrollTrigger.create({
            trigger: wrap, start: 'top top', end: 'bottom top', scrub: true,
            onUpdate: function (self) { prog = self.progress; }
        });

        function resize() {
            var w = wrap.clientWidth, h = wrap.clientHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener('resize', resize);

        var running = true;
        new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) { running = entry.isIntersecting; });
        }, { threshold: 0 }).observe(wrap);
        document.addEventListener('visibilitychange', function () {
            running = !document.hidden;
        });

        var lastT = 0;
        var idleTimer = 0;
        var blue = new THREE.Color(0x6d8bdd);
        var red = new THREE.Color(0xd66a4a);
        function loop(t) {
            requestAnimationFrame(loop);
            if (!running) { lastT = t; return; }
            var dt = Math.min((t - lastT) / 1000 || 0.016, 0.05);
            lastT = t;

            mx += (tx - mx) * 0.045;
            my += (ty - my) * 0.045;
            group.rotation.y = mx * 0.22;
            group.rotation.x = my * 0.12 + prog * 0.3;
            group.position.y = -prog * 1.4;
            camera.position.z = 8 + prog * 1.6;
            canvas.style.opacity = String(1 - prog * 0.85);

            // shield breathes, HUD rotates
            shieldG.rotation.z = Math.sin(t * 0.00012) * 0.04;
            hud.rotation.z = t * 0.00008;
            arcs.rotation.z = -t * 0.0003;

            // funnels patrol
            funnels.forEach(function (f) {
                var u = f.userData;
                var ang = u.phase + t * 0.001 * u.speed;
                f.position.set(
                    Math.cos(ang) * u.r,
                    u.yOff + Math.sin(t * 0.0006 + u.phase * 3) * u.yAmp,
                    -1.2 + Math.sin(ang) * 1.6
                );
                f.rotation.z = Math.cos(ang) * (u.speed > 0 ? -0.5 : 0.5);
                f.rotation.x = 0.25;
                u.flash = Math.max(0, u.flash - dt * 2.5);
                u.eye.material.opacity = 0.5 + u.flash * 0.5;
                var es = 0.22 + u.flash * 0.3;
                u.eye.scale.set(es, es, 1);
            });

            // threats fly in
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
                spawnThreat();
                spawnTimer = 2.4 + Math.random() * 2.2;
            }
            threats.forEach(function (th) {
                if (!th.active) return;
                th.t += dt * 0.55;
                if (th.t >= 1) {
                    th.active = false;
                    th.line.visible = false;
                    th.head.visible = false;
                    impact(th);
                    return;
                }
                tmpV.lerpVectors(th.from, th.to, th.t);
                th.head.position.copy(tmpV);
                var tail = tmpV.clone().addScaledVector(th.to.clone().sub(th.from).normalize(), -0.8);
                setLine(th.line, tail, tmpV);
                th.line.material.opacity = 0.3 + th.t * 0.55;
            });

            // intercept beams + impact flashes decay
            beams.forEach(function (b) {
                if (b.life <= 0) return;
                b.life -= dt * 4.5;
                b.line.material.opacity = Math.max(0, b.life) * 0.9;
                if (b.life <= 0) b.line.visible = false;
            });
            flashes.forEach(function (f) {
                if (f.life <= 0) return;
                f.life -= dt * 3;
                var sc = 0.5 + (1 - f.life) * 1.1;
                f.s.scale.set(sc, sc, 1);
                f.s.material.opacity = Math.max(0, f.life) * 0.9;
                if (f.life <= 0) f.s.visible = false;
            });

            // idle shimmer keeps the surface alive between attacks
            idleTimer -= dt;
            if (idleTimer <= 0) {
                pulse[Math.floor(Math.random() * tileCount)] = 0.45;
                idleTimer = 0.5 + Math.random() * 0.7;
            }

            // recolor tiles from pulse energies
            for (var i = 0; i < tileCount; i++) {
                pulse[i] *= Math.exp(-dt * 2.2);
                threatPulse[i] *= Math.exp(-dt * 2.8);
                tmpCol.copy(baseCol[i]);
                if (pulse[i] > 0.01) tmpCol.lerp(blue, Math.min(pulse[i], 1));
                if (threatPulse[i] > 0.01) tmpCol.lerp(red, Math.min(threatPulse[i], 1));
                tiles.setColorAt(i, tmpCol);
            }
            tiles.instanceColor.needsUpdate = true;

            renderer.render(scene, camera);
        }
        requestAnimationFrame(loop);
    }

    /* Recalculate trigger positions once everything (images) settles */
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
