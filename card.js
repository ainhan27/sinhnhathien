(() => {
  'use strict';

  const greeting = {
    recipient: 'Thu Hiền',
    message: 'Chúc mừng sinh nhật Thu Hiền! Chúc tuổi mới của bé luôn rực rỡ, bình an và gặt hái được mọi điều mình mong ước.\n\nMong rằng bước sang tuổi mới, mọi nỗ lực của Hiền sẽ được đền đáp bằng những thành quả ngọt ngào nhất. Happy Birthday!\n\nHôm nay và cả những ngày sau, bé hãy luôn mỉm cười theo cách của riêng mình nhé.',
    sender: 'Ái Nhân'
  };

  const dialog = document.getElementById('greetingCard');
  const openButton = document.getElementById('openCard');
  const closeButton = document.getElementById('closeCard');
  const status = document.getElementById('cardStatus');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopLayout = window.matchMedia('(min-width: 1100px)');
  const sceneElements = [...document.querySelectorAll('.bouquet-composition, .scene-footer')];
  const layoutAnimations = new Set();
  const album = document.getElementById('memoryAlbum');
  const albumToggle = document.getElementById('toggleAlbum');

  /* ---------- Nội dung thiệp ---------- */
  document.getElementById('cardRecipient').textContent = greeting.recipient;
  document.getElementById('cardSender').textContent = greeting.sender;
  document.getElementById('cardMessage').replaceChildren(
    ...greeting.message.split(/\n\s*\n/).map(text => {
      const p = document.createElement('span');
      p.className = 'message-paragraph';
      p.textContent = text;
      return p;
    })
  );

  /* ---------- Album ---------- */
  const albumObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      album.classList.add('is-revealed');
      albumObserver.unobserve(album);
    }
  }, { threshold: 0.08 });

  let albumRevealPromise;
  function revealAlbum() {
    if (albumRevealPromise) return albumRevealPromise;
    const photos = [...album.querySelectorAll('img')];
    photos.forEach(photo => { photo.loading = 'eager'; });
    albumRevealPromise = Promise.allSettled(photos.map(photo => photo.decode()))
      .then(() => {
        album.hidden = false;
        albumObserver.observe(album);
      });
    return albumRevealPromise;
  }

  albumToggle.addEventListener('click', () => {
    const expanded = album.classList.toggle('is-spread');
    albumToggle.setAttribute('aria-expanded', String(expanded));
    albumToggle.innerHTML = expanded
      ? 'Gấp album <span aria-hidden="true">♡</span>'
      : 'Xòe album <span aria-hidden="true">♡</span>';
  });

  document.getElementById('viewAlbum').addEventListener('click', async () => {
    await revealAlbum();
    album.classList.add('is-revealed');
    album.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' });
    albumToggle.focus({ preventScroll: true });
  });

  /* ---------- Hiệu ứng dàn lại bố cục khi mở/đóng thiệp ---------- */
  function reflowScene(changeLayout) {
    layoutAnimations.forEach(a => a.cancel());
    layoutAnimations.clear();
    const before = sceneElements.map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height };
    });
    changeLayout();
    if (motion.matches) return;
    sceneElements.forEach((el, i) => {
      const after = el.getBoundingClientRect();
      if (!after.width || !after.height) return;
      const dx = before[i].left - after.left - window.scrollX;
      const dy = before[i].top - after.top - window.scrollY;
      const scale = el.matches('.bouquet-composition')
        ? ` scale(${before[i].width / after.width}, ${before[i].height / after.height})` : '';
      const animation = el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)${scale}` }, { transform: 'none' }],
        { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
      layoutAnimations.add(animation);
      animation.onfinish = () => layoutAnimations.delete(animation);
    });
  }

  function revealCard() {
    const rect = dialog.getBoundingClientRect();
    if (!desktopLayout.matches || rect.top < 16 || rect.top > window.innerHeight * 0.35 || rect.bottom > window.innerHeight - 16) {
      dialog.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' });
    }
  }

  /* ---------- Mở / đóng thiệp ---------- */
  function setCardOpen(open) {
    if (dialog.open === open) return;
    reflowScene(() => {
      if (open) {
        status.textContent = '';
        document.body.classList.add('card-open');
        dialog.show();
      } else {
        dialog.close();
        document.body.classList.remove('card-open');
      }
      openButton.setAttribute('aria-expanded', String(open));
      openButton.querySelector('.envelope-action').textContent = open ? 'Gấp thiệp' : 'Mở thiệp';
    });
    if (open) {
      closeButton.focus({ preventScroll: true });
      revealAlbum();
      revealCard();
      document.dispatchEvent(new Event('bouquet:celebrate'));
    } else {
      openButton.focus({ preventScroll: true });
      const rect = openButton.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        openButton.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'center' });
      }
    }
  }

  motion.addEventListener('change', () => {
    if (motion.matches) {
      layoutAnimations.forEach(a => a.cancel());
      layoutAnimations.clear();
    }
  });

  /* ---------- Sự kiện từ bó hoa (script.js) ---------- */
  document.addEventListener('bouquet:ready', () => { openButton.hidden = false; });
  document.addEventListener('bouquet:rose', event => {
    const wish = document.getElementById('roseWish');
    wish.classList.remove('is-new');
    wish.textContent = event.detail.message;
    void wish.offsetWidth; // khởi động lại hiệu ứng khi hai bông có cùng lời chúc
    wish.classList.add('is-new');
  });

  openButton.addEventListener('click', () => setCardOpen(!dialog.open));
  closeButton.addEventListener('click', () => setCardOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.open && !event.defaultPrevented) {
      event.preventDefault();
      setCardOpen(false);
    }
  });
  dialog.addEventListener('close', () => {
    if (!document.body.classList.contains('card-open')) return;
    document.body.classList.remove('card-open');
    openButton.setAttribute('aria-expanded', 'false');
    openButton.querySelector('.envelope-action').textContent = 'Mở thiệp';
  });
})();