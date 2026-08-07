import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generates a daily inspirational quote and creates a notification for every
// user in the app. Intended to be invoked by a scheduled workflow at 12:00 PM
// daily (set up in Dashboard → Workflows with a Scheduled trigger calling this
// function). Also callable manually by an admin from the admin panel.

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "William Butler Yeats" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (service-role) invocation, but if a user is present, require admin.
    const isAuthed = await base44.auth.isAuthenticated();
    if (isAuthed) {
      const user = await base44.auth.me();
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Forbidden: admin only" }, { status: 403 });
      }
    }

    // Pick today's quote deterministically based on day of year so it's stable within a day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quote = QUOTES[dayOfYear % QUOTES.length];
    const message = `"${quote.text}" — ${quote.author}`;

    // Fetch all users to notify
    const users = await base44.asServiceRole.entities.User.list("-created_date", 5000);
    if (!users || users.length === 0) {
      return Response.json({ created: 0, quote: message });
    }

    const batch = users.map((u) => ({
      user_id: u.id,
      title: "Daily Quote",
      message,
      read: false,
      type: "admin",
      scheduled_date: new Date().toISOString(),
    }));

    const created = await base44.asServiceRole.entities.Notification.bulkCreate(batch.slice(0, 500));

    return Response.json({ created: created.length, quote: message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}