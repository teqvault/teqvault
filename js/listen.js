document.getElementById('year').textContent = new Date().getFullYear();

        // Each track's YouTube player only loads when tapped — keeps the
        // initial page light for people on limited/expensive data plans,
        // which matters given who this page is specifically built for.
        document.querySelectorAll('.track-toggle').forEach((button) => {
            button.addEventListener('click', () => {
                const item = button.closest('.track-item');
                const slot = item.querySelector('.player-slot');
                const videoId = item.dataset.video;

                if (slot.dataset.loaded === 'true') {
                    slot.innerHTML = '';
                    slot.dataset.loaded = 'false';
                    button.classList.remove('is-playing');
                    return;
                }

                // Close any other open player first
                document.querySelectorAll('.player-slot').forEach((s) => {
                    s.innerHTML = '';
                    s.dataset.loaded = 'false';
                });
                document.querySelectorAll('.track-toggle').forEach((b) => b.classList.remove('is-playing'));

                slot.innerHTML = `
                    <div class="aspect-video">
                        <iframe
                            width="100%" height="100%"
                            src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                            title="YouTube video player"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>
                `;
                slot.dataset.loaded = 'true';
                button.classList.add('is-playing');
            });
        });
