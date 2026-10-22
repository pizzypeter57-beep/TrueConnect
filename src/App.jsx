import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Heart,
  Handshake,
  Martini,
  Repeat2,
  ShieldCheck,
  Sprout,
  UsersRound,
} from 'lucide-react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from './api.js';
import { ThemeToggle } from './ThemeContext.jsx';
import {
  DashboardView,
  DiscoverView,
  LikesView,
  MemberLayout,
  MessagesView,
  ProfileSetupView,
  ProfileView,
} from './views/MemberApp.jsx';

const intentOptions = [
  { label: 'Long-term partner', Icon: Heart },
  { label: 'Fun and dates', Icon: Martini },
  { label: 'Short-term, open to long', Icon: Sprout },
  { label: 'Long-term, open to short', Icon: Repeat2 },
  { label: 'New friends', Icon: Handshake },
  { label: 'Still figuring it out', Icon: CircleHelp },
  { label: 'A relationship', Icon: UsersRound },
  { label: '18+ connections', Icon: ShieldCheck },
];

const portraitStories = [
  { image: 'portrait-01.jpg', caption: 'The first hello' },
  { image: 'portrait-02.jpg', caption: 'A little more you' },
  { image: 'portrait-03.jpg', caption: 'Good conversations' },
  { image: 'portrait-05.jpg', caption: 'Room for possibility' },
];

function Brand({ dark = false }) {
  return (
    <Link className={`brand${dark ? ' brand-dark' : ''}`} to="/" aria-label="TrueConnect home">
      <img src="/assets/logo.png" alt="" />
      <span>True<span className="brand-light">Connect</span></span>
    </Link>
  );
}

function SiteHeader({ dark = false, action }) {
  return (
    <header className={`site-header${dark ? ' site-header-dark' : ''}`}>
      <Brand dark={dark} />
      <div className="header-actions">{action}<ThemeToggle /></div>
    </header>
  );
}

function PageTitle({ title }) {
  useEffect(() => {
    document.title = `${title} | TrueConnect`;
  }, [title]);
  return null;
}

function PortraitGallery() {
  return (
    <section className="portrait-gallery" aria-labelledby="portrait-gallery-title">
      <div className="portrait-gallery-heading">
        <div><p className="eyebrow">A COMMUNITY OF ONE-OF-A-KINDS</p><h2 id="portrait-gallery-title">Come as you are.</h2></div>
        <p>Different faces. Different stories. One good place to start.</p>
      </div>
      <div className="portrait-gallery-grid">
        {portraitStories.map(({ image, caption }) => (
          <figure className="portrait-gallery-item" key={image}>
            <img alt="Illustrative community portrait" loading="lazy" src={`/assets/portraits/${image}`} />
            <figcaption>{caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Landing() {
  return (
    <main className="landing-page">
      <PageTitle title="Meet your kind of people" />
      <SiteHeader action={<Link className="header-link" to="/signin.html">Sign in <ArrowRight size={16} /></Link>} />
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> A little closer to something real</p>
          <h1>Meet your<br /><span>kind of people.</span></h1>
          <p className="landing-description">Good conversations. Genuine chemistry. A connection that feels like you.</p>
          <div className="landing-actions">
            <Link className="button button-primary" to="/choice.html">Find your connection <ArrowRight size={18} /></Link>
            <p>Already have an account? <Link to="/signin.html">Sign in</Link></p>
          </div>
          <div className="landing-note"><Heart size={16} fill="currentColor" /> Meet at your own pace</div>
        </div>
        <div className="portrait-stage" aria-label="People finding connection">
          <div className="portrait portrait-back"><img src="/assets/portraits/portrait-04.jpg" alt="Illustrative portrait from the TrueConnect community" /></div>
          <div className="portrait portrait-front"><img src="/assets/portraits/portrait-06.jpg" alt="Illustrative community member smiling" /></div>
          <div className="portrait-tag tag-chat"><span className="tag-dot" /> Good conversation</div>
          <div className="portrait-tag tag-connection"><Heart size={15} fill="currentColor" /> Real connection</div>
          <div className="stage-caption"><span>01</span><span className="caption-line" /><span>Start with a hello</span></div>
        </div>
      </section>
      <PortraitGallery />
      <footer className="landing-footer"><span>TrueConnect</span><span>More meaningful, one hello at a time.</span></footer>
    </main>
  );
}

function Choice() {
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();
  return (
    <main className="flow-page">
      <PageTitle title="What brings you here?" />
      <SiteHeader dark action={<Link className="text-link" to="/">Exit <span aria-hidden="true">×</span></Link>} />
      <section className="flow-content choice-content">
        <Link className="back-link" to="/" aria-label="Back to home"><ArrowLeft size={18} /></Link>
        <div className="step-label"><span>01</span><span className="step-track"><span /></span><span>03</span></div>
        <p className="eyebrow">First things first</p>
        <h1>What brings<br />you here?</h1>
        <p className="flow-description">Choose what feels right. You can always change it later.</p>
        <div className="intent-grid">
          {intentOptions.map(({ label, Icon }) => (
            <button
              aria-pressed={selected === label}
              className={`intent-option${selected === label ? ' is-selected' : ''}`}
              key={label}
              onClick={() => setSelected(label)}
              type="button"
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{label}</span>
              <span className="option-check"><Check size={14} /></span>
            </button>
          ))}
        </div>
        <button className="button button-primary flow-next" disabled={!selected} onClick={() => navigate('/signup.html', { state: { intent: selected } })} type="button">Continue <ArrowRight size={18} /></button>
      </section>
    </main>
  );
}

function AuthLayout({ title, description, children, footnote }) {
  return (
    <main className="auth-page">
      <PageTitle title={title} />
      <aside className="auth-aside">
        <SiteHeader dark />
        <div className="auth-aside-copy">
          <p className="eyebrow">A better kind of hello</p>
          <p className="aside-quote">“The best connections start when you can just be yourself.”</p>
          <div className="aside-rule" />
          <span>Make room for something real.</span>
        </div>
        <span className="aside-index">TRUECONNECT · EST. FOR CONNECTION</span>
      </aside>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <div className="mobile-brand"><Brand dark /><ThemeToggle /></div>
          <p className="eyebrow">Your next chapter</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          {footnote && <p className="auth-footnote">{footnote}</p>}
        </div>
      </section>
    </main>
  );
}

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError('');
    setSubmitting(true);
    const email = String(formData.get('email'));
    try {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          email,
          password: formData.get('password'),
          intent: location.state?.intent || '',
        }),
      });
      navigate('/verify.html', { state: { email, developmentCode: result.developmentCode } });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout title="Create your account" description="A few details, then you're on your way." footnote="By continuing, you agree to meet people with kindness.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="full-name">Full name</label>
        <input autoComplete="name" defaultValue={location.state?.name || ''} id="full-name" name="name" placeholder="Your name" required />
        <label htmlFor="signup-email">Email address</label>
        <input autoComplete="email" id="signup-email" name="email" placeholder="you@example.com" required type="email" />
        <label htmlFor="signup-password">Password</label>
        <input autoComplete="new-password" id="signup-password" minLength={8} name="password" placeholder="At least 8 characters" required type="password" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary auth-submit" disabled={submitting} type="submit">{submitting ? 'Creating account...' : 'Create account'} <ArrowRight size={17} /></button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/signin.html">Sign in</Link></p>
    </AuthLayout>
  );
}

function Signin() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') }),
      });
      navigate('/home.html');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout title="Welcome back" description="Good to see you again. Pick up where you left off.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="signin-email">Email address</label>
        <input autoComplete="email" id="signin-email" name="email" placeholder="you@example.com" required type="email" />
        <label htmlFor="signin-password">Password</label>
        <input autoComplete="current-password" id="signin-password" minLength={8} name="password" placeholder="Your password" required type="password" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary auth-submit" disabled={submitting} type="submit">{submitting ? 'Signing in...' : 'Sign in'} <ArrowRight size={17} /></button>
      </form>
      <p className="auth-switch">New to TrueConnect? <Link to="/choice.html">Create an account</Link></p>
    </AuthLayout>
  );
}

function Verify() {
  const location = useLocation();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef([]);
  const email = location.state?.email;
  const developmentCode = location.state?.developmentCode;
  const code = digits.join('');

  function updateDigit(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, index) => pasted[index] ?? ''));
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
      navigate('/verified.html');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Check your email" description={<>We sent a 6-digit code to <strong className="email-value">{email || 'your inbox'}</strong>.</>}>
      <form className="auth-form verify-form" onSubmit={handleSubmit}>
        <label htmlFor="code-0">Your verification code</label>
        <div className="code-inputs" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              aria-label={`Verification digit ${index + 1}`}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              inputMode="numeric"
              key={index}
              maxLength={1}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
              }}
              ref={(element) => { inputRefs.current[index] = element; }}
              value={digit}
            />
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {developmentCode && <p className="local-code-note">Local development code: <strong>{developmentCode}</strong></p>}
        <button className="button button-primary auth-submit" disabled={code.length !== 6 || submitting} type="submit">{submitting ? 'Checking...' : 'Verify email'} <ArrowRight size={17} /></button>
      </form>
      <p className="auth-switch">Wrong email? <Link to="/signup.html">Go back</Link></p>
      <p className="demo-note">For this local preview, the verification code is shown above. Email delivery is not configured.</p>
    </AuthLayout>
  );
}

function Verified() {
  return (
    <AuthLayout title="You're verified" description="Your email is confirmed. Let's make this profile yours.">
      <div className="verified-mark"><Check size={34} strokeWidth={2.2} /></div>
      <Link className="button button-primary auth-submit link-button" to="/aboutyourself.html">Set up your profile <ArrowRight size={17} /></Link>
    </AuthLayout>
  );
}

function NotFound() {
  return (
    <main className="flow-page not-found">
      <SiteHeader dark />
      <section className="home-content">
        <p className="eyebrow">Lost your way?</p>
        <h1>This page isn't here.</h1>
        <Link className="button button-primary" to="/">Back to TrueConnect <ArrowLeft size={18} /></Link>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Landing />} path="/" />
      <Route element={<Choice />} path="/choice.html" />
      <Route element={<Signin />} path="/signin.html" />
      <Route element={<Signup />} path="/signup.html" />
      <Route element={<Verify />} path="/verify.html" />
      <Route element={<Verified />} path="/verified.html" />
      <Route element={<MemberLayout />}>
        <Route element={<ProfileSetupView />} path="/aboutyourself.html" />
        <Route element={<DashboardView />} path="/home.html" />
        <Route element={<DiscoverView />} path="/discover.html" />
        <Route element={<LikesView />} path="/likes.html" />
        <Route element={<MessagesView />} path="/messages.html" />
        <Route element={<ProfileView />} path="/profile.html" />
      </Route>
      <Route element={<NotFound />} path="*" />
    </Routes>
  );
}