// MoreMe quote bank — Dude Perfect, The Rock / Project Rock, plus a few
// "house" lines that fit a Mount Vernon Inquiry student trying to train
// themselves right. The quote of the day picks deterministically off the
// date so it's stable for the whole day (no refresh roulette).

export type Quote = { text: string; by: string; tag?: "dp" | "rock" | "house" | "discipline" };

export const QUOTES: Quote[] = [
  // The user-supplied opener
  { text: "Discipline. Dedication. Domination. That's what happens in this house.", by: "House", tag: "house" },

  // The Rock / Project Rock
  { text: "Don't be afraid to be ambitious about your goals. Hard work never stops.", by: "Dwayne Johnson", tag: "rock" },
  { text: "It's you versus you.", by: "Dwayne Johnson", tag: "rock" },
  { text: "Success isn't always about greatness. It's about consistency.", by: "Dwayne Johnson", tag: "rock" },
  { text: "Be humble. Be hungry. And always be the hardest worker in the room.", by: "Dwayne Johnson", tag: "rock" },
  { text: "Just because you're not where you want to be today doesn't mean you won't be there one day.", by: "Dwayne Johnson", tag: "rock" },
  { text: "The wall is there to keep the other people out.", by: "Dwayne Johnson", tag: "rock" },

  // Dude Perfect — panda + brotherhood + the trick shot ethos
  { text: "Pandas don't ask why. They train.", by: "House", tag: "dp" },
  { text: "Routine before the highlight reel.", by: "House", tag: "dp" },
  { text: "Big shots come after small reps.", by: "House", tag: "dp" },
  { text: "Show up. Stack reps. Stay ready.", by: "House", tag: "dp" },

  // Discipline classics
  { text: "Discipline equals freedom.", by: "Jocko Willink", tag: "discipline" },
  { text: "You don't rise to the level of your goals; you fall to the level of your systems.", by: "James Clear", tag: "discipline" },
  { text: "What gets measured gets managed.", by: "Peter Drucker", tag: "discipline" },
  { text: "Motivation gets you started. Habit keeps you going.", by: "Jim Rohn", tag: "discipline" },
  { text: "Suffer the pain of discipline, or suffer the pain of regret.", by: "Jim Rohn", tag: "discipline" },
  { text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.", by: "Stephen King", tag: "discipline" },

  // House lines — Mount Vernon Inquiry + the Davis arc
  { text: "Inquire. Build. Ship. Repeat.", by: "House", tag: "house" },
  { text: "If it's not on the calendar, it's not real.", by: "House", tag: "house" },
  { text: "The bell catches you only if you're late to it.", by: "House", tag: "house" },
  { text: "Earn the screen. Don't pay it off later.", by: "House", tag: "house" },
  { text: "Read first. Then do.", by: "House", tag: "house" },
  { text: "The phone goes away first.", by: "House", tag: "house" },
];

// Stable per-day pick: hashes the YYYY-MM-DD into an index. Same quote all
// day, fresh one tomorrow.
export function quoteOfDay(dateISO: string, list: Quote[] = QUOTES): Quote {
  let h = 0;
  for (let i = 0; i < dateISO.length; i++) h = ((h << 5) - h + dateISO.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}
