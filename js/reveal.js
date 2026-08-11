const obs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) e.target.classList.add('active');
}), { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(r => obs.observe(r));
