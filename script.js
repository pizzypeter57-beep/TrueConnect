// Choice section//
const cards = document.querySelectorAll('.choice-box');
cards.forEach((card) => {
    card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
    });
});

//Create account//
document.getElementsByClassName('signupform')[0].addEventListener('submit', e => {
    e.preventDefault();
    
    const form = e.target;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    window.location.href = 'verify.html';
});