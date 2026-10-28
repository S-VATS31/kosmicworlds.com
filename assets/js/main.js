(() => {
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#primary-nav');
  if (!menu || !navigation) return;

  function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }

  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!expanded));
    navigation.classList.toggle('is-open', !expanded);
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  window.matchMedia('(min-width: 981px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });

})();
