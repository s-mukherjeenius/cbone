///test test test test test test 


import { login, deleteAccount, setCurrentUser } from "./auth.js";
import {
  loadConversations,
  selectChat,
  startChatWithSearchedUser,
  sendMessage,
  clearChat,
} from "./chat-part1.js";
import { updateTypingStatus, listenForTypingStatus } from "./chat-part2.js";
import supabase from "./supabaseClient.js"; // needed for realtime subscription

let messagesSubscription = null;

function subscribeToIncomingMessages(currentUID) {
  // Unsubscribe if an existing subscription exists
  if (messagesSubscription) {
    messagesSubscription.unsubscribe();
  }

  // Subscribe to INSERT events on the "messages" table where sender is NOT the current user.
  messagesSubscription = supabase
    .channel(`incoming-messages-${currentUID}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        // Filter for messages not sent by the current user.
        filter: `sender=neq.${currentUID}`,
      },
      (payload) => {
        console.log("New incoming message detected:", payload);
        // Refresh the contacts list if a new message from another user is received.
        loadConversations();
      }
    )
    .subscribe();
}

// Attach functions to window so they are globally available
window.register = function () {
  window.location.href = "register.html";
};

window.login = async function () {
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  console.log("Login button clicked with email:", email);

  try {
    // Call the login function from auth.js
    const user = await login(email, password);

    if (user) {
      console.log("Login successful. User:", user);
      setCurrentUser(user);

      // Hide authentication section and show chat section
      const authSection = document.getElementById("auth-section");
      const chatSection = document.getElementById("chat-section");
      authSection.style.display = "none";
      chatSection.style.display = "block";
      console.log(
        "Chat section displayed. Computed style:",
        window.getComputedStyle(chatSection).display
      );

      // Set current user display name
      const displayName =
        user.user_metadata && user.user_metadata.username
          ? user.user_metadata.username
          : user.email;
      document.getElementById("currentUser").textContent = displayName;
      console.log("Current user display name set to:", displayName);

      // Load conversations (populate contacts sidebar)
      await loadConversations();
      console.log("Conversations loaded.");

      // Subscribe to incoming messages for refreshing contacts only on new messages from others
      subscribeToIncomingMessages(user.id);
      console.log("Subscribed to incoming messages realtime updates.");
    }
  } catch (error) {
    console.error("Login failed:", error);
    alert("Login failed: " + error.message);
  }
};

window.deleteAccount = deleteAccount;
window.selectChat = selectChat;
window.startChatWithSearchedUser = startChatWithSearchedUser;
window.sendMessage = function () {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();

  if (message === "") {
    alert("Message cannot be empty.");
    return;
  }

  sendMessage(message);
  input.value = "";

  if (window.chatWith) {
    updateTypingStatus(window.chatWith, false);
  }
};
window.clearChat = clearChat;

// Attach typing event listener to the message input field.
const messageInput = document.getElementById("messageInput");
let typingTimeout;
let isTyping = false;

messageInput.addEventListener("input", () => {
  if (!window.chatWith) return;

  if (!isTyping) {
    updateTypingStatus(window.chatWith, true);
    isTyping = true;
    console.log("User started typing...");
  }

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    updateTypingStatus(window.chatWith, false);
    isTyping = false;
    console.log("User stopped typing.");
  }, 2000);
});

// Handle email confirmation if token_hash is present in the URL.
const params = new URLSearchParams(window.location.search);
const token = params.get("token_hash");

if (token) {
  supabase.auth
    .verifyEmail({ token: token })
    .then(({ data, error }) => {
      if (error) {
        console.error("Email confirmation error:", error);
        alert("Email confirmation failed.");
      } else {
        console.log("Email confirmed:", data);
        alert("Email confirmed successfully!");
        // Redirect to login or appropriate page after confirmation.
        window.location.href = "https://s-mukherjeenius.github.io/cbone/"; // Change to your desired redirect URL
      }
    })
    .catch((err) => {
      console.error("Error during email verification:", err);
      alert("An error occurred during email verification.");
    });
}

// Handle hash based routing if present
if (window.location.hash) {
  const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the '#'
  const accessToken = hashParams.get('access_token');
  const expiresIn = hashParams.get('expires_at');
  const refreshToken = hashParams.get('refresh_token');
  const tokenType = hashParams.get('token_type');

  if (accessToken && expiresIn && refreshToken && tokenType) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType,
      expires_in: parseInt(expiresIn) - Math.floor(Date.now() / 1000), // Calculate remaining time
    }).then(({ error }) => {
      if (error) {
        console.error('Error setting session:', error);
        alert('Authentication failed.');
      } else {
        console.log('Session set successfully.');
        window.location.href = 'https://s-mukherjeenius.github.io/cbone/'; // Redirect to your app's home page
      }
    });
  }
}
