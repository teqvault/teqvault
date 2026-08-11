if (window.lucide) lucide.createIcons();

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    mobileLinks.forEach(l => l.addEventListener('click', () => mobileMenu.classList.add('hidden')));
  }

  document.getElementById('year').textContent = new Date().getFullYear();
