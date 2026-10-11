// Choice section//
const cards = document.querySelectorAll('.choice-box');
cards.forEach((card) => {
    card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
    });
});

//Create account//
const signupForm = document.querySelector('.signupform');
if (signupForm) {
    signupForm.addEventListener('submit', e => {
        e.preventDefault();

        if (!signupForm.checkValidity()) {
            signupForm.reportValidity();
            return;
        }
        window.location.href = 'verify.html';
    });
}

//login//
const signInForm = document.querySelector('.signinform');
if (signInForm) {
    signInForm.addEventListener('submit', e => {
        e.preventDefault();

        if (!signInForm.checkValidity()) {
            signInForm.reportValidity();
            return;
        }
        window.location.href = 'home.html';
    });
}

// ---------- Verification code boxes ----------
const otpBox = document.querySelector('#otp');
if (otpBox) {
  const cells = [...otpBox.querySelectorAll('input')];

  cells.forEach((cell, i) => {
    cell.addEventListener('input', () => {
      cell.value = cell.value.replace(/\D/g, '');          // digits only
      if (cell.value && cells[i + 1]) cells[i + 1].focus(); // move forward
      if (cells.every(c => c.value)) {
        console.log('Code entered:', cells.map(c => c.value).join(''));
        // later: check the code, then go to the next page
      }
    });

    cell.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !cell.value && cells[i - 1]) {
        cells[i - 1].focus();                               // move back
      }
    });

    cell.addEventListener('paste', e => {
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!digits) return;
      e.preventDefault();
      [...digits].forEach((d, k) => cells[k].value = d);
      cells[Math.min(digits.length, 5)].focus();
    });
  });

  cells[0].focus();   // start in the first box
}