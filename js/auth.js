// ===== Auth Logic =====

// Redirect to dashboard if already logged in
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = 'dashboard.html';
})();

// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(target + 'Form').classList.add('active');
  });
});

// Sign In
document.getElementById('signinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('signinBtn');
  const errEl = document.getElementById('signinError');
  const email = document.getElementById('signinEmail').value.trim();
  const password = document.getElementById('signinPassword').value;

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Signing in...';
  errEl.classList.add('hidden');

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errEl.textContent = error.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Sign In';
  } else {
    window.location.href = 'dashboard.html';
  }
});

// Sign Up
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('signupBtn');
  const errEl = document.getElementById('signupError');
  const successEl = document.getElementById('signupSuccess');
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Creating account...';
  errEl.classList.add('hidden');
  successEl.classList.add('hidden');

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });

  if (error) {
    errEl.textContent = error.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Create Account';
  } else {
    successEl.textContent = 'Account created! Check your email to confirm, then sign in.';
    successEl.classList.remove('hidden');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Create Account';
  }
});
