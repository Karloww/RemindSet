import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Coins, ShoppingBag, Palette, Upload, UserCheck, Bell, GraduationCap, Presentation } from "lucide-react";

export default function HowToUse() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">How to Use RemindSet</h1>
        <p className="text-muted-foreground text-sm mt-1">A quick guide to getting the most out of the app.</p>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-2xl p-6">
        <h2 className="text-lg font-bold">What is RemindSet?</h2>
        <p className="text-sm text-primary-foreground/90 mt-1">
          RemindSet helps students who missed an onsite class catch up. Teachers create classrooms, share a class code, and upload lessons for enrolled students.
          Students earn points by completing lessons, and spend those points in the Shop to customize their app.
        </p>
      </div>

      <Section icon={GraduationCap} title="For Students" color="text-primary">
        <Step n={1} title="Join a Class" desc="Use a class code from your teacher to join their classroom. You'll get access to all lessons they upload." />
        <Step n={2} title="View & Complete" desc="Open a lesson, read the description, and download the attached file. When you're done, tap “Mark as Completed” to earn points." />
        <Step n={3} title="Earn Points" desc="Every lesson you complete gives you points. The more lessons you finish, the more you earn." />
        <Step n={4} title="Shop & Customize" desc="Spend points in the Shop on color themes, app backgrounds, profile covers, and profile icons. Apply them in Customize Theme to restyle your whole app." />
      </Section>

      <Section icon={Presentation} title="For Teachers" color="text-amber-600">
        <Step n={1} title="Create a Classroom" desc="Set up a class with a subject title and year/section, then generate a class code to share with students." />
        <Step n={2} title="Upload Lessons" desc="Inside your classroom, upload lesson plans with files. All enrolled students automatically receive the lesson and a notification." />
        <Step n={3} title="Track Progress" desc="See which students completed each lesson and get notified when they do — all from the classroom detail page." />
      </Section>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> The Customize Theme feature</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Feature icon={Palette} title="Color Theme" desc="Restyle the entire interface — buttons, highlights, accents." />
          <Feature icon={BookOpen} title="Background" desc="Set a gradient or image backdrop behind the whole app." />
          <Feature icon={UserCheck} title="Cover Photo" desc="Pick a banner image for your profile page." />
          <Feature icon={GraduationCap} title="Profile Icon" desc="Choose an emoji avatar shown across the app." />
        </div>
        <p className="text-sm text-muted-foreground">
          Items are limited by rarity: <span className="font-medium text-slate-600">Common</span>, <span className="font-medium text-blue-600">Rare</span>, <span className="font-medium text-purple-600">Epic</span>, and <span className="font-medium text-amber-600">Legendary</span>. Rarer items cost more points.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Bell className="w-5 h-5 text-primary" /> Notifications</h3>
        <p className="text-sm text-muted-foreground">When a teacher assigns you a lesson, you'll get a notification. Tap the bell icon in the top bar to view them.</p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">Back to Home</Link>
        <span className="text-muted-foreground">•</span>
        <Link to="/classrooms" className="text-sm font-medium text-primary hover:underline">Go to Classes</Link>
        <span className="text-muted-foreground">•</span>
        <Link to="/shop" className="text-sm font-medium text-primary hover:underline">Visit Shop</Link>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h2 className="font-semibold flex items-center gap-2 mb-4"><Icon className={`w-5 h-5 ${color}`} /> {title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{n}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
      <div className="rounded-lg bg-primary/10 text-primary p-2 shrink-0"><Icon className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}