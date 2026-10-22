import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Compass,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { ThemeToggle } from '../ThemeContext.jsx';

const navigation = [
  { to: '/home.html', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/discover.html', label: 'Discover', Icon: Compass },
  { to: '/likes.html', label: 'Likes', Icon: Heart },
  { to: '/messages.html', label: 'Messages', Icon: MessageCircle },
  { to: '/profile.html', label: 'My profile', Icon: UserRound },
];

function MemberBrand() {
  return (
    <Link className="member-brand" to="/home.html">
      <img src="/assets/logo.png" alt="" />
      <span>True<span>Connect</span></span>
    </Link>
  );
}

export function MemberLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    apiRequest('/auth/me')
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) navigate('/signin.html', { replace: true, state: { from: location.pathname } });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    const titles = {
      '/aboutyourself.html': 'Your profile setup',
      '/home.html': 'Your space',
      '/discover.html': 'Discover',
      '/likes.html': 'Likes',
      '/messages.html': 'Messages',
      '/profile.html': 'My profile',
    };
    document.title = `${titles[location.pathname] || 'Your space'} | TrueConnect`;
  }, [location.pathname]);

  async function signOut() {
    await apiRequest('/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
    navigate('/', { replace: true });
  }

  if (loading) return <main className="member-loading">Opening your space...</main>;
  if (!user) return null;

  const context = { user, setUser };
  return (
    <div className="member-shell">
      <aside className="member-sidebar">
        <MemberBrand />
        <p className="member-nav-label">YOUR SPACE</p>
        <nav className="member-navigation" aria-label="Member navigation">
          {navigation.map(({ to, label, Icon, end }) => (
            <NavLink className={({ isActive }) => `member-nav-link${isActive ? ' is-active' : ''}`} end={end} key={to} to={to}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="member-sidebar-bottom">
          <div className="member-identity"><span className="identity-avatar">{user.profile?.name?.[0] || user.email[0].toUpperCase()}</span><span><strong>{user.profile?.name || 'Your profile'}</strong><small>{user.email}</small></span></div>
          <button className="member-logout" onClick={signOut} type="button"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <div className="member-content">
        <header className="member-topbar"><MemberBrand /><span className="member-greeting">A space for your next hello</span><ThemeToggle /></header>
        <main className="member-main"><Outlet context={context} /></main>
      </div>
      <nav className="member-mobile-nav" aria-label="Member navigation">
        {navigation.map(({ to, label, Icon, end }) => (
          <NavLink aria-label={label} className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`} end={end} key={to} to={to}>
            <Icon size={20} strokeWidth={1.8} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function ViewHeading({ eyebrow, title, children }) {
  return (
    <div className="view-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      {children}
    </div>
  );
}

function EmptyState({ Icon, title, text, to, action }) {
  return (
    <div className="member-empty">
      <span className="empty-icon"><Icon size={23} strokeWidth={1.7} /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      {to && <Link className="text-action" to={to}>{action} <ArrowRight size={16} /></Link>}
    </div>
  );
}

export function DashboardView() {
  const { user } = useOutletContext();
  const profile = user.profile;
  const profileComplete = Boolean(profile?.age && profile?.city);
  return (
    <>
      <ViewHeading eyebrow="YOUR SPACE" title={`Good to see you, ${profile?.name || 'friend'}.`}>
        <Link className="button button-primary dashboard-discover-link" to="/discover.html">Explore people <ArrowRight size={17} /></Link>
      </ViewHeading>
      <section className="dashboard-welcome">
        <div><p className="eyebrow">A fresh start</p><h2>Make space for a real connection.</h2><p>Take your time, be yourself, and see who you meet along the way.</p><Link className="welcome-link" to="/discover.html">Go to Discover <ArrowRight size={16} /></Link></div>
        <div className="welcome-art" aria-label="Illustrative portraits">
          <img className="welcome-portrait-main" src="/assets/portraits/portrait-02.jpg" alt="Illustrative community portrait" />
          <img className="welcome-portrait-peek" src="/assets/portraits/portrait-03.jpg" alt="" />
          <span className="welcome-image-caption"><Sparkles size={13} /> Make room for possibility</span>
        </div>
      </section>
      <div className="dashboard-columns">
        <section className="dashboard-panel profile-progress">
          <div className="panel-heading"><div><p className="eyebrow">YOUR PROFILE</p><h2>{profileComplete ? 'Looking good' : 'A little more about you'}</h2></div><UserRound size={19} /></div>
          <p>{profileComplete ? 'Your basics are in place. You can update them any time.' : 'A few details help people get to know the real you.'}</p>
          <div className="progress-track"><span style={{ width: profileComplete ? '100%' : '42%' }} /></div>
          <Link className="text-action" to={profileComplete ? '/profile.html' : '/aboutyourself.html'}>{profileComplete ? 'Edit profile' : 'Complete your profile'} <ArrowRight size={16} /></Link>
        </section>
        <section className="dashboard-panel dashboard-privacy">
          <span className="privacy-icon"><Sparkles size={19} /></span>
          <p className="eyebrow">A SMALL REMINDER</p>
          <h2>Good things take their own time.</h2>
          <p>Only share what feels comfortable. A thoughtful conversation beats a perfect profile.</p>
        </section>
      </div>
      <section className="dashboard-shortcuts">
        <div><p className="eyebrow">KEEP EXPLORING</p><h2>Your next step</h2></div>
        <Link to="/likes.html"><Heart size={18} /><span>See who likes you</span><ArrowRight size={16} /></Link>
        <Link to="/messages.html"><MessageCircle size={18} /><span>Open your messages</span><ArrowRight size={16} /></Link>
      </section>
    </>
  );
}

export function ProfileSetupView() {
  const { user, setUser } = useOutletContext();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const { profile } = await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.get('name'),
          age: Number(form.get('age')),
          city: form.get('city'),
          intent: form.get('intent'),
        }),
      });
      setUser((current) => ({ ...current, profile }));
      navigate('/home.html');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="setup-wrap">
      <ViewHeading eyebrow="ONE LAST STEP" title="A little about you." />
      <p className="view-intro">Keep it simple. You can add more to your profile later.</p>
      <form className="member-form setup-form" onSubmit={handleSubmit}>
        <label htmlFor="profile-name">What should we call you?</label>
        <input autoComplete="given-name" defaultValue={user.profile?.name || ''} id="profile-name" name="name" placeholder="Your first name" required />
        <label htmlFor="profile-age">How old are you?</label>
        <input defaultValue={user.profile?.age || ''} id="profile-age" max={120} min={18} name="age" placeholder="18 or older" required type="number" />
        <label htmlFor="profile-city">Where are you based?</label>
        <input autoComplete="address-level2" defaultValue={user.profile?.city || ''} id="profile-city" name="city" placeholder="City" required />
        <label htmlFor="profile-intent">What are you hoping to find?</label>
        <select defaultValue={user.profile?.intent || ''} id="profile-intent" name="intent">
          <option value="">Still figuring it out</option>
          <option>Long-term partner</option><option>Fun and dates</option><option>Short-term, open to long</option>
          <option>Long-term, open to short</option><option>New friends</option><option>A relationship</option>
        </select>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save and continue'} <ArrowRight size={17} /></button>
      </form>
    </div>
  );
}

export function DiscoverView() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingId, setPendingId] = useState('');

  useEffect(() => {
    apiRequest('/discover')
      .then(({ members: discovered }) => setMembers(discovered))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  async function choose(member, action) {
    setPendingId(member.userId);
    setNotice('');
    try {
      const { matched } = await apiRequest('/likes', {
        method: 'POST',
        body: JSON.stringify({ targetId: member.userId, action }),
      });
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
      setNotice(matched ? `It's a match with ${member.name}!` : action === 'like' ? `You liked ${member.name}.` : 'Profile passed.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingId('');
    }
  }

  return (
    <>
      <ViewHeading eyebrow="MEET SOMEONE NEW" title="Discover." />
      <p className="view-intro">A few thoughtful introductions, from your local TrueConnect community.</p>
      {notice && <p className="member-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="member-loading-inline">Finding people...</p> : members.length ? (
        <div className="people-grid">
          {members.map((member) => (
            <article className="person-card" key={member.userId}>
              <div className="person-art"><span>{member.name[0].toUpperCase()}</span><small>TRUECONNECT MEMBER</small></div>
              <div className="person-details"><h2>{member.name}, {member.age}</h2><p><MapPin size={14} /> {member.city}</p>{member.intent && <span className="intent-tag">{member.intent}</span>}
                <div className="person-actions">
                  <button aria-label={`Pass on ${member.name}`} disabled={pendingId === member.userId} onClick={() => choose(member, 'pass')} type="button"><X size={19} /></button>
                  <button aria-label={`Like ${member.name}`} className="like-button" disabled={pendingId === member.userId} onClick={() => choose(member, 'like')} type="button"><Heart size={18} /> Like</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : !error && <EmptyState Icon={UsersRound} title="Your community is just getting started." text="When another member completes a profile, you'll find them here." to="/profile.html" action="View your profile" />}
    </>
  );
}

export function LikesView() {
  const [likes, setLikes] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingId, setPendingId] = useState('');
  useEffect(() => {
    apiRequest('/likes').then(({ likes: incoming }) => setLikes(incoming)).catch((requestError) => setError(requestError.message));
  }, []);

  async function likeBack(like) {
    setPendingId(like.userId);
    setError('');
    setNotice('');
    try {
      const { matched } = await apiRequest('/likes', {
        method: 'POST',
        body: JSON.stringify({ targetId: like.userId, action: 'like' }),
      });
      if (!matched) throw new Error('Your like was sent, but there is no mutual match yet.');
      setLikes((current) => current.map((item) => item.userId === like.userId ? { ...item, matched: true } : item));
      setNotice(`You and ${like.name} matched. You can start a conversation in Messages.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingId('');
    }
  }

  return (
    <>
      <ViewHeading eyebrow="A LITTLE SPARK" title="Likes." />
      <p className="view-intro">People who have shown interest in meeting you.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="member-notice" role="status">{notice}</p>}
      {likes.length ? <div className="likes-list">{likes.map((like) => (
        <article className="like-row" key={like.userId}>
          <span className="person-initial">{like.name[0].toUpperCase()}</span>
          <span className="like-person"><strong>{like.name}, {like.age}</strong><small><MapPin size={13} /> {like.city}</small></span>
          <span className="like-status">{like.matched ? 'It’s a match' : 'Likes you'}</span>
          {like.matched
            ? <Link className="icon-link" aria-label={`Message ${like.name}`} to="/messages.html"><MessageCircle size={18} /></Link>
            : <button className="like-back" disabled={pendingId === like.userId} onClick={() => likeBack(like)} type="button"><Heart size={15} />{pendingId === like.userId ? 'Matching...' : 'Like back'}</button>}
        </article>
      ))}</div> : !error && <EmptyState Icon={Heart} title="Your likes will show up here." text="As people discover your profile and send a like, you’ll see them here." to="/discover.html" action="Explore the community" />}
    </>
  );
}

export function MessagesView() {
  const { user } = useOutletContext();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/conversations').then(({ conversations: items }) => {
      setConversations(items);
      setActiveId(items[0]?.userId || '');
    }).catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    apiRequest(`/messages?with=${encodeURIComponent(activeId)}`)
      .then(({ messages: thread }) => setMessages(thread))
      .catch((requestError) => setError(requestError.message));
  }, [activeId]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    try {
      const { message } = await apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({ recipientId: activeId, body: draft }),
      });
      setMessages((current) => [...current, message]);
      setDraft('');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const activeConversation = conversations.find((conversation) => conversation.userId === activeId);
  return (
    <>
      <ViewHeading eyebrow="KEEP THE CONVERSATION GOING" title="Messages." />
      {error && <p className="form-error" role="alert">{error}</p>}
      {conversations.length ? (
        <section className="message-layout">
          <div className="conversation-list"><p className="eyebrow">MATCHES</p>{conversations.map((conversation) => <button className={`conversation-choice${activeId === conversation.userId ? ' is-active' : ''}`} key={conversation.userId} onClick={() => setActiveId(conversation.userId)} type="button"><span className="person-initial">{conversation.name[0].toUpperCase()}</span><span><strong>{conversation.name}</strong><small>{conversation.lastMessage || 'Say hello'}</small></span></button>)}</div>
          {activeConversation && <div className="message-thread"><header><span className="person-initial">{activeConversation.name[0].toUpperCase()}</span><span><strong>{activeConversation.name}</strong><small>{activeConversation.city}</small></span></header><div className="message-history">{messages.length ? messages.map((message) => <p className={`message-bubble${message.senderId === user.id ? ' is-mine' : ''}`} key={message.id}>{message.body}</p>) : <p className="thread-start">You matched. Start with a hello.</p>}</div><form className="message-compose" onSubmit={sendMessage}><input aria-label="Write a message" maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." value={draft} /><button aria-label="Send message" disabled={!draft.trim()} type="submit"><Send size={18} /></button></form></div>}
        </section>
      ) : !error && <EmptyState Icon={MessageCircle} title="Good conversations start with a match." text="When you and another member like each other, you can meet here and say hello." to="/discover.html" action="Discover people" />}
    </>
  );
}

export function ProfileView() {
  const { user, setUser } = useOutletContext();
  const navigate = useNavigate();
  const profile = user.profile || {};
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setSaved(false);
    try {
      const { profile: updated } = await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: form.get('name'), age: Number(form.get('age')), city: form.get('city'), intent: form.get('intent') }),
      });
      setUser((current) => ({ ...current, profile: updated }));
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function signOut() {
    await apiRequest('/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
    navigate('/', { replace: true });
  }
  return (
    <>
      <ViewHeading eyebrow="MAKE IT YOURS" title="My profile." />
      <p className="view-intro">These details help people get to know you. Keep them up to date.</p>
      <form className="member-form profile-edit-form" onSubmit={saveProfile}>
        <label htmlFor="edit-name">Name</label><input defaultValue={profile.name || ''} id="edit-name" name="name" required />
        <label htmlFor="edit-age">Age</label><input defaultValue={profile.age || ''} id="edit-age" max={120} min={18} name="age" required type="number" />
        <label htmlFor="edit-city">City</label><input defaultValue={profile.city || ''} id="edit-city" name="city" required />
        <label htmlFor="edit-intent">Looking for</label><select defaultValue={profile.intent || ''} id="edit-intent" name="intent"><option value="">Still figuring it out</option><option>Long-term partner</option><option>Fun and dates</option><option>Short-term, open to long</option><option>Long-term, open to short</option><option>New friends</option><option>A relationship</option></select>
        {error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="member-notice" role="status">Your profile has been saved.</p>}
        <button className="button button-primary" type="submit">Save changes <ArrowRight size={17} /></button>
      </form>
      <p className="account-email">Signed in as {user.email}</p>
      <button className="member-logout profile-signout" onClick={signOut} type="button"><LogOut size={16} /> Sign out</button>
    </>
  );
}