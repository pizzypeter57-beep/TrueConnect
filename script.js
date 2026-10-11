// Choice section//
const cards = document.querySelectorAll('.choice-box');
cards.forEach((card) => {
    card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
    });
});

