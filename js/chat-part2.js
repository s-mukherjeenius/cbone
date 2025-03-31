// chat-part2.js
import supabase from "./supabaseClient.js";
import { getChatID } from "./helpers.js";
import { getCurrentUser } from "./auth.js";

export function updateTypingStatus(friendUID, isTyping) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !friendUID) return;
  const currentUID = currentUserObj.id;
  const chatID = getChatID(currentUID, friendUID);

  if (isTyping) {
    // Upsert the typing record into the "typing" table
    supabase
      .from('typing')
      .upsert({ chat_id: chatID, user_id: currentUID, is_typing: true })
      .then(({ error }) => {
        if (error) {
          console.error("Error updating typing status:", error);
        }
      });
  } else {
    // Delete the typing record for the current user
    supabase
      .from('typing')
      .delete()
      .eq('chat_id', chatID)
      .eq('user_id', currentUID)
      .then(({ error }) => {
        if (error) {
          console.error("Error removing typing status:", error);
        }
      });
  }
}

export function listenForTypingStatus(friendUID) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !friendUID) return;
  const currentUID = currentUserObj.id;
  const chatID = getChatID(currentUID, friendUID);
  const typingIndicator = document.getElementById("typingIndicator");

  // Create a realtime channel for the "typing" table changes for this chat.
  const channel = supabase.channel(`typing-channel-${chatID}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'typing',
        filter: `chat_id=eq.${chatID}`
      },
      payload => {
        // If a record is inserted by someone other than current user and they are typing.
        if (payload.new && payload.new.user_id !== currentUID && payload.new.is_typing) {
          typingIndicator.textContent = window.chatPartnerName 
            ? `${window.chatPartnerName} is typing...`
            : "Someone is typing...";
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'typing',
        filter: `chat_id=eq.${chatID}`
      },
      payload => {
        // When a typing record is deleted, clear the typing indicator.
        typingIndicator.textContent = "";
      }
    )
    .subscribe();

  return channel;
}