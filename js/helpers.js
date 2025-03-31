// helpers.js

export function getChatID(user1, user2) {
  return [user1, user2].sort().join("_");
}

export function formatTimestamp(ts) {
  const messageDate = new Date(ts);
  const now = new Date();

  // Options for time-only format in Indian Standard Time
  const optionsTime = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' };
  // Options for full date/time format in Indian Standard Time
  const optionsFull = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' };

  // Check if the message is from today.
  if (
    messageDate.getFullYear() === now.getFullYear() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getDate() === now.getDate()
  ) {
    return messageDate.toLocaleTimeString("en-IN", optionsTime);
  }

  // Check if the message is from yesterday.
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    messageDate.getFullYear() === yesterday.getFullYear() &&
    messageDate.getMonth() === yesterday.getMonth() &&
    messageDate.getDate() === yesterday.getDate()
  ) {
    return `Yesterday, ${messageDate.toLocaleTimeString("en-IN", optionsTime)}`;
  }

  // Otherwise, return a formatted date and time string.
  return messageDate.toLocaleString("en-IN", optionsFull);
}