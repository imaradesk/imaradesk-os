// Starter articles offered on an empty knowledge base. "Use" opens the article drawer
// prefilled (also reachable as /knowledgebase/articles/?new=1&template=<id>).
export const ARTICLE_TEMPLATES = [
  {
    id: 'contact-support',
    title: 'How to contact support',
    summary: 'All the ways to reach our support team, and what to include so we can help faster.',
    tags: 'support, contact, help',
    icon: 'Headphones',
    content: `<h2>Ways to reach us</h2>
<ul>
<li><strong>Support portal</strong> – submit a ticket any time and track its progress.</li>
<li><strong>Email</strong> – write to our support address and a ticket is created automatically.</li>
</ul>
<h2>What to include</h2>
<p>To help us resolve your request quickly, please share:</p>
<ol>
<li>A short description of the problem and when it started.</li>
<li>Steps to reproduce it, if any.</li>
<li>Screenshots or error messages.</li>
</ol>
<h2>Response times</h2>
<p>We aim to reply to every request within one business day. Urgent issues are prioritised.</p>`,
  },
  {
    id: 'reset-password',
    title: 'How do I reset my password?',
    summary: 'Reset a forgotten password from the sign-in page in a few steps.',
    tags: 'account, password, login',
    icon: 'Lock',
    content: `<p>If you have forgotten your password, you can reset it yourself.</p>
<ol>
<li>Go to the sign-in page and select <strong>Forgot password</strong>.</li>
<li>Enter the email address on your account.</li>
<li>Open the reset email and follow the link. It expires after 60 minutes.</li>
<li>Choose a new password and sign in.</li>
</ol>
<h2>Didn't get the email?</h2>
<p>Check your spam folder, and make sure you used the address your account was created with. If it still doesn't arrive, contact support.</p>`,
  },
  {
    id: 'track-ticket',
    title: 'How do I check the status of my ticket?',
    summary: 'Follow your request from submission to resolution in the support portal.',
    tags: 'tickets, portal, status',
    icon: 'Ticket',
    content: `<p>Every request you send us gets a ticket number. You can follow its progress at any time.</p>
<ol>
<li>Open the support portal and select <strong>Track ticket</strong>.</li>
<li>Enter your ticket number and email address.</li>
<li>You'll see the current status and every reply from our team.</li>
</ol>
<h2>What the statuses mean</h2>
<ul>
<li><strong>Open</strong> – we've received your request.</li>
<li><strong>In progress</strong> – an agent is working on it.</li>
<li><strong>Resolved</strong> – we think it's fixed. Reply if it isn't and the ticket reopens.</li>
</ul>`,
  },
]

export const ARTICLE_TEMPLATE_MAP = Object.fromEntries(ARTICLE_TEMPLATES.map((t) => [t.id, t]))

// Starter categories offered on an empty categories page (icons are from CATEGORY_ICONS).
export const CATEGORY_TEMPLATES = [
  { id: 'getting-started', name: 'Getting started', description: 'Set-up guides and first steps for new customers.', icon: 'Rocket' },
  { id: 'account', name: 'Account & login', description: 'Signing in, passwords, profiles and security.', icon: 'Lock' },
  { id: 'troubleshooting', name: 'Troubleshooting', description: 'Fixes for common errors and known issues.', icon: 'Wrench' },
  { id: 'how-to', name: 'How-to guides', description: 'Step-by-step instructions for everyday tasks.', icon: 'BookOpen' },
  { id: 'policies', name: 'Policies & FAQs', description: 'Terms, privacy, returns and frequently asked questions.', icon: 'Shield' },
]
