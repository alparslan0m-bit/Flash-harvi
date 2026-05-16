const { createClient } = require("@supabase/supabase-js");

const url = "https://bctciifhdgbikgvczbiv.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdGNpaWZoZGdiaWtndmN6Yml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODc1NDYsImV4cCI6MjA5NDQ2MzU0Nn0.AJUAfwZeuXZ9De_2bs1SKtBLfu8A2KhLzNUX5JSEWhU";

const supabase = createClient(url, key);

async function main() {
  console.log("Checking card_sessions...");
  const { data, error } = await supabase.from("card_sessions").select("*");
  if (error) {
    console.error("Error fetching card_sessions:", error.message);
  } else {
    console.log("Card Sessions Count:", data.length);
    console.log(data);
  }

  console.log("\nChecking auth users...");
  // Try to find if user inserted anything
  // If we can't see sessions, maybe RLS blocks it.
  // We'll use the anon key so RLS *will* block it unless we provide a token.
}

main();
