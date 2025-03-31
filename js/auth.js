// auth.js
import supabase from "./supabaseClient.js";

let currentUser = null;

// Custom error messages mapping (expand as needed)
const errorMessages = {
  "Invalid login credentials": "Your credentials are invalid. Please check your email and password.",
  // Add more mappings if needed.
};

export async function login(email, password) {
  if (!email || !password) {
    alert("Email and Password required!");
    return;
  }
  try {
    console.log("Attempting login with email:", email);
    
    // Use signInWithPassword instead of signIn for Supabase v2
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("Sign in response:", data, error);
    
    if (error) {
      alert(errorMessages[error.message] || error.message);
      return null;
    }
    
    const { user } = data;
    // Check if email is verified (Supabase sets email_confirmed_at upon verification)
    if (!user.email_confirmed_at) {
      alert("Please verify your email before logging in. A verification email has been sent.");
      await supabase.auth.signOut();
      return null;
    }
    
    currentUser = user;
    console.log("Login successful, currentUser set:", currentUser);
    return user;
  } catch (error) {
    console.error("Error logging in:", error);
    alert(error.message);
  }
}

export async function deleteAccount() {
  if (!currentUser) {
    alert("No user is logged in.");
    return;
  }
  const confirmDelete = confirm(
    "Are you sure you want to delete your account? This action cannot be undone."
  );
  if (!confirmDelete) return;

  try {
    // Delete the user's record from your "users" table
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', currentUser.id);  // Assumes your table's user identifier is 'id'
    if (error) throw error;

    // Sign out the user
    await supabase.auth.signOut();
    alert("Your account has been deleted.");
    currentUser = null;
    location.reload();
  } catch (error) {
    console.error("Error deleting account:", error);
    alert("There was an error deleting your account: " + error.message);
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}