// helpers.js
export function getChatID(user1, user2) {
    return [user1, user2].sort().join("_");
  }
  
  export function formatTimestamp(ts) {
    const messageDate = new Date(ts);
    const now = new Date();
  
    // Check if the message is from today.
    if (
      messageDate.getFullYear() === now.getFullYear() &&
      messageDate.getMonth() === now.getMonth() &&
      messageDate.getDate() === now.getDate()
    ) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  
    // Check if the message is from yesterday.
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
      messageDate.getFullYear() === yesterday.getFullYear() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getDate() === yesterday.getDate()
    ) {
      return `Yesterday, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  
    // Otherwise, return a formatted date and time string.
    return messageDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  