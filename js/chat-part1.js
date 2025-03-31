// chat-part1.js
import supabase from "./supabaseClient.js";
import { getChatID, formatTimestamp } from "./helpers.js";
import { getCurrentUser } from "./auth.js";
import { listenForTypingStatus } from "./chat-part2.js";

let currentChatListener = null;

/**
 * Ensures that a chat exists in the "chats" table for the given user pair.
 * If not, it creates a new chat record.
 */
async function ensureChatHasParticipants(uid1, uid2) {
  const chatID = getChatID(uid1, uid2);
  // Try to fetch the chat by its chat_id
  const { data: chat, error } = await supabase
    .from('chats')
    .select('*')
    .eq('chat_id', chatID)
    .single();

  if (!chat) {
    // Create a new chat record if not found.
    const { error: insertError } = await supabase
      .from('chats')
      .insert([{ chat_id: chatID, participant1: uid1, participant2: uid2 }]);
    if (insertError) {
      console.error("Error creating chat:", insertError);
      throw insertError;
    }
  }
}

/**
 * Adds a contact (friendUID) to the left sidebar.
 */
export function addContactToList(contactUID, displayName) {
  const contactsContainer = document.getElementById("contacts");
  const noFriendsMessage = contactsContainer.querySelector(".no-friends");
  if (noFriendsMessage) noFriendsMessage.remove();

  // Avoid duplicates
  if (contactsContainer.querySelector(`[data-contact="${contactUID}"]`)) return;

  const contactDiv = document.createElement("div");
  contactDiv.classList.add("contact");
  contactDiv.setAttribute("data-contact", contactUID);
  contactDiv.textContent = displayName || contactUID;
  contactDiv.addEventListener("click", () => selectChat(contactUID));
  contactsContainer.appendChild(contactDiv);
}

/**
 * Loads all conversations (chats) for the current user.
 * Assumes a "chats" table exists with participant1 and participant2 fields.
 */
export async function loadConversations() {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj) return;
  const currentUID = currentUserObj.id; // assuming Supabase user id is stored in "id"
  const contactsContainer = document.getElementById("contacts");
  contactsContainer.innerHTML = "";

  // Create search input and Start Chat button.
  const searchField = document.createElement("input");
  searchField.id = "contactSearch";
  searchField.placeholder = "Search contacts by username...";
  contactsContainer.appendChild(searchField);

  const startChatBtn = document.createElement("button");
  startChatBtn.id = "start-chat-btn";
  startChatBtn.textContent = "Start Chat";
  startChatBtn.onclick = startChatWithSearchedUser;
  contactsContainer.appendChild(startChatBtn);

  // Query chats where the current user is a participant.
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .or(`participant1.eq.${currentUID},participant2.eq.${currentUID}`)
    .order('last_message_timestamp', { ascending: false });

  if (error) {
    console.error("Error loading conversations:", error);
    return;
  }

  if (!chats || chats.length === 0) {
    const noFriends = document.createElement("div");
    noFriends.textContent = "No Friends";
    noFriends.classList.add("no-friends");
    contactsContainer.appendChild(noFriends);
  } else {
    // For each chat, determine the friend's UID and then fetch user details.
    for (let chat of chats) {
      const friendUID = chat.participant1 === currentUID ? chat.participant2 : chat.participant1;
      const { data: friendData, error: friendError } = await supabase
        .from('users')
        .select('*')
        .eq('id', friendUID)
        .single();
      let displayName = friendData ? friendData.username : friendUID;
      addContactToList(friendUID, displayName);
    }
  }

  // Filter contacts by search.
  searchField.addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    const contacts = contactsContainer.getElementsByClassName("contact");
    Array.from(contacts).forEach((contact) => {
      const text = contact.textContent.toLowerCase();
      contact.style.display = text.includes(filter) ? "block" : "none";
    });
  });
}

/**
 * Called when the user selects a friend from the contacts or search results.
 * Loads the conversation header and messages.
 */
export async function selectChat(friendUID) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj) return;
  const currentUID = currentUserObj.id;

  if (friendUID === currentUID) {
    alert("You cannot chat with yourself.");
    return;
  }

  // Save friend UID globally for typing status updates.
  window.chatWith = friendUID;

  // Ensure a chat record exists.
  await ensureChatHasParticipants(currentUID, friendUID);

  // Fetch friend's details from the "users" table.
  const { data: friendData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', friendUID)
    .single();
  if (error || !friendData) {
    alert("User does not exist!");
    return;
  }
  const displayName = friendData.username || friendUID;
  window.chatPartnerName = displayName;

  // Determine profile picture URL (check both casings).
  const profilePicURL = (friendData.profilePicture || friendData.profilepicture)
    ? (friendData.profilePicture || friendData.profilepicture)
    : "default-placeholder.png"; // update this path as needed

  // Update conversation header with the friend's name and profile picture.
  document.getElementById("conversation-header").innerHTML = `
    <span class="friend-name">${displayName}</span>
    <img src="${profilePicURL}" alt="Profile Picture" class="profile-pic">
  `;

  // Load messages for this chat.
  loadMessages();
  // Start listening for typing status.
  listenForTypingStatus(friendUID);
}


/**
 * Searches for a user by their "username" in the "users" table.
 */
export function startChatWithSearchedUser() {
  const searchValue = document.getElementById("contactSearch").value.trim();
  if (searchValue === "") {
    alert("Please enter a username to start chat.");
    return;
  }

  supabase
    .from('users')
    .select('*')
    .eq('username', searchValue)
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        alert("User not found.");
      } else {
        selectChat(data.id);
      }
    })
    .catch((error) => {
      console.error("Error searching user:", error);
      alert("Error searching user: " + error.message);
    });
}

/**
 * Loads all messages for the selected chat.
 */
export async function loadMessages() {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !window.chatWith) return;
  const currentUID = currentUserObj.id;
  const chatID = getChatID(currentUID, window.chatWith);

  // Query messages for this chat.
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatID)
    .order('timestamp', { ascending: true });
  if (error) {
    console.error("Error loading messages:", error);
    return;
  }

  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";
  messages.forEach((msg) => {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    // Create the bubble container.
    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("bubble");

    // For incoming messages, show the sender's name above the bubble.
    if (msg.sender !== currentUID) {
      const usernameHeader = document.createElement("div");
      usernameHeader.classList.add("username-header");
      usernameHeader.textContent = window.chatPartnerName || msg.sender;
      bubbleDiv.appendChild(usernameHeader);
    }

    // Create the message text element.
    const messageTextDiv = document.createElement("div");
    messageTextDiv.classList.add("message-text");
    messageTextDiv.textContent = msg.text;
    bubbleDiv.appendChild(messageTextDiv);

    messageDiv.appendChild(bubbleDiv);

    // Create and append the timestamp.
    const timeSpan = document.createElement("span");
    timeSpan.classList.add("timestamp");
    timeSpan.textContent = formatTimestamp(msg.timestamp);
    messageDiv.appendChild(timeSpan);

    // Add alignment classes.
    messageDiv.classList.add(msg.sender === currentUID ? "user" : "other");

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  // Set up a realtime subscription for new messages using Supabase channels.
  if (currentChatListener) {
    currentChatListener.unsubscribe();
  }
  currentChatListener = supabase.channel(`messages-channel-${chatID}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatID}`
      },
      payload => {
        const msg = payload.new;
        const chatBox = document.getElementById("chat-box");
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");

        const bubbleDiv = document.createElement("div");
        bubbleDiv.classList.add("bubble");

        if (msg.sender !== currentUID) {
          const usernameHeader = document.createElement("div");
          usernameHeader.classList.add("username-header");
          usernameHeader.textContent = window.chatPartnerName || msg.sender;
          bubbleDiv.appendChild(usernameHeader);
        }

        const messageTextDiv = document.createElement("div");
        messageTextDiv.classList.add("message-text");
        messageTextDiv.textContent = msg.text;
        bubbleDiv.appendChild(messageTextDiv);

        messageDiv.appendChild(bubbleDiv);

        const timeSpan = document.createElement("span");
        timeSpan.classList.add("timestamp");
        timeSpan.textContent = formatTimestamp(msg.timestamp);
        messageDiv.appendChild(timeSpan);

        messageDiv.classList.add(msg.sender === currentUID ? "user" : "other");
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    )
    .subscribe();
}

/**
 * Sends a message by inserting a new record into the "messages" table.
 */
export async function sendMessage(message) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !window.chatWith) return;
  const currentUID = currentUserObj.id;
  if (message.trim() === "") return;

  const chatID = getChatID(currentUID, window.chatWith);
  const { error } = await supabase
    .from('messages')
    .insert([
      {
        chat_id: chatID,
        sender: currentUID,
        text: message,
        // Use ISO string format for timestamp
        timestamp: new Date().toISOString()
      }
    ]);
  if (error) {
    console.error("Error sending message:", error);
  }
}

/**
 * Clears the entire chat by deleting all messages for the given chat.
 */
export async function clearChat() {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !window.chatWith) return;
  const currentUID = currentUserObj.id;
  const chatID = getChatID(currentUID, window.chatWith);

  if (confirm("Are you sure you want to delete all messages?")) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatID);
    if (error) {
      console.error("Error deleting chat:", error);
    } else {
      document.getElementById("chat-box").innerHTML = "";
      alert("Chat history cleared.");
    }
  }
}