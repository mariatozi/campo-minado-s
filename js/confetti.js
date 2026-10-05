/**
 * Confetti simples em canvas, sem dependências externas.
 * Suporta múltiplas "explosões" simultâneas (emitters), cada uma com seu
 * próprio tempo de vida, para permitir tanto a chuva de confetes da vitória
 * quanto pequenos estouros a cada acerto.
 *
 * Uso:
 *   Confetti.launch({ durationMs, particleCount })       -> chuva de confetes (vitória)
 *   Confetti.burst({ x, y, count, durationMs, fadeMs })  -> estouro pontual (acerto)
 */
(function (window) {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");

  const COLORS = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#f78c6b", "#a06cd5"];

  let emitters = [];
  let rafId = null;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function makeRainParticle() {
    return {
      x: randomBetween(0, canvas.width),
      y: randomBetween(-canvas.height * 0.3, 0),
      vx: randomBetween(-2, 2),
      vy: randomBetween(2, 5.5),
      size: randomBetween(6, 12),
      color: randomColor(),
      rotation: randomBetween(0, Math.PI * 2),
      vr: randomBetween(-0.2, 0.2),
      shape: Math.random() > 0.5 ? "rect" : "circle",
      gravity: 0,
      wrap: true,
    };
  }

  function makeBurstParticle(x, y) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(3, 9);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: randomBetween(4, 8),
      color: randomColor(),
      rotation: randomBetween(0, Math.PI * 2),
      vr: randomBetween(-0.3, 0.3),
      shape: Math.random() > 0.5 ? "rect" : "circle",
      gravity: 0.25,
      wrap: false,
    };
  }

  function drawParticle(p, alphaMul) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, alphaMul);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function tick(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    emitters.forEach((emitter) => {
      const age = now - emitter.startTime;
      const alphaMul =
        age > emitter.durationMs
          ? Math.max(0, 1 - (age - emitter.durationMs) / emitter.fadeMs)
          : 1;

      emitter.particles.forEach((p) => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;

        if (p.wrap && p.y > canvas.height + 20) {
          p.y = randomBetween(-40, -10);
          p.x = randomBetween(0, canvas.width);
        }

        drawParticle(p, alphaMul);
      });
    });

    emitters = emitters.filter(
      (e) => now - e.startTime < e.durationMs + e.fadeMs
    );

    if (emitters.length > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function ensureLoopRunning() {
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function launch(options) {
    const opts = options || {};
    const durationMs = opts.durationMs || 3000;
    const particleCount = opts.particleCount || 180;

    emitters.push({
      particles: Array.from({ length: particleCount }, makeRainParticle),
      startTime: performance.now(),
      durationMs,
      fadeMs: 900,
    });
    ensureLoopRunning();
  }

  function burst(options) {
    const opts = options || {};
    const x = opts.x != null ? opts.x : canvas.width / 2;
    const y = opts.y != null ? opts.y : canvas.height / 2;
    const count = opts.count || 16;

    emitters.push({
      particles: Array.from({ length: count }, () => makeBurstParticle(x, y)),
      startTime: performance.now(),
      durationMs: opts.durationMs || 250,
      fadeMs: opts.fadeMs || 450,
    });
    ensureLoopRunning();
  }

  window.Confetti = { launch, burst };
})(window);
