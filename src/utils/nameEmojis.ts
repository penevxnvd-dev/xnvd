/**
 * Returns the emoji for a given name
 * @param name - The full name of the person
 * @returns The emoji string or empty string if no emoji is assigned
 */
export function getNameEmoji(name: string): string {
  if (!name) return '';
  
  // Remove any existing emoji and "11:11" from the name before checking
  const nameWithoutEmoji = name.replace(/^[🕊️🐙]\s*/u, '').replace(/\s*11:11\s*/g, '').trim();
  
  // Normalize the name for comparison (remove extra spaces, convert to lowercase)
  const normalizedName = nameWithoutEmoji.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Check for "Краси Кътев" - NO EMOJI, just add "11:11"
  if (normalizedName.includes('краси') && normalizedName.includes('кътев')) {
    return ''; // No emoji for Краси Кътев
  }
  
  // Check for "Лазар Бундев"
  if (normalizedName.includes('лазар') && normalizedName.includes('бундев')) {
    return '🕊️';
  }
  
  // Check for "Герги Пенев" or "Георги Пенев"
  if ((normalizedName.includes('герги') || normalizedName.includes('георги')) && normalizedName.includes('пенев')) {
    return '🐙';
  }
  
  return '';
}

/**
 * Formats a name with its emoji and special formatting
 * @param name - The full name of the person
 * @returns The formatted name with emoji prefix and special formatting
 */
export function formatNameWithEmoji(name: string): string {
  if (!name) return '';
  
  // Remove any existing emoji from the name before processing
  const nameWithoutEmoji = name.replace(/^[🕊️🐙]\s*/u, '').trim();
  const normalizedName = nameWithoutEmoji.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // For "Краси Кътев", add "11:11" but NO emoji
  if (normalizedName.includes('краси') && normalizedName.includes('кътев')) {
    // Check if "11:11" is already in the name
    if (!nameWithoutEmoji.includes('11:11')) {
      return `${nameWithoutEmoji} 11:11`;
    }
    return nameWithoutEmoji;
  }
  
  // For other names, check if they already have an emoji
  if (/^[🕊️🐙]\s/u.test(name.trim())) {
    return name;
  }
  
  const emoji = getNameEmoji(nameWithoutEmoji);
  if (!emoji) return nameWithoutEmoji;
  
  return `${emoji} ${nameWithoutEmoji}`;
}

/**
 * Formats a name without "11:11" and returns whether "11:11" should be shown separately
 * @param name - The full name of the person
 * @returns Object with displayName (without "11:11") and shouldShowElevenEleven flag
 */
export function formatNameWithoutElevenEleven(name: string): { displayName: string; shouldShowElevenEleven: boolean } {
  if (!name) return { displayName: '', shouldShowElevenEleven: false };
  
  // Remove "11:11" from the name
  const nameWithoutElevenEleven = name.replace(/\s*11:11\s*/g, '').trim();
  const normalizedName = nameWithoutElevenEleven.toLowerCase().replace(/\s+/g, ' ').trim();
  const isKrasiKutev = normalizedName.includes('краси') && normalizedName.includes('кътев');
  
  // Format name with emoji but without "11:11"
  const nameWithoutEmoji = nameWithoutElevenEleven.replace(/^[🕊️🐙]\s*/u, '').trim();
  const emoji = nameWithoutElevenEleven.match(/^[🕊️🐙]/u)?.[0] || '';
  const displayName = emoji ? `${emoji} ${nameWithoutEmoji}` : nameWithoutEmoji;
  
  return {
    displayName,
    shouldShowElevenEleven: isKrasiKutev
  };
}

