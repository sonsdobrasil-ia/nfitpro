export function fireConfetti() {
  if (typeof document === "undefined") return;
  const colors = ["#FF6B35", "#2EC4B6", "#FFD23F", "#2B2B2B"];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.left = Math.random() * 100 + "vw";
    el.style.background = colors[i % colors.length];
    el.style.animationDelay = Math.random() * 0.5 + "s";
    el.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}
